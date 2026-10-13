import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonToggle } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBack, chevronDown, documentOutline, downloadOutline, helpCircleOutline } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import {
  Cell,
  ColumnMap,
  fold,
  guessColumns,
  IMPORT_FIELDS,
  ImportField,
  ImportRecord,
  ImportRow,
  ImportWords,
  readImportRows,
  REQUIRED_FIELDS,
  Resolution,
  RowProblem,
} from '../../application/use-cases/import-transactions';
import { SPANISH } from '../../application/text';
import { Category, isExpenseType } from '../../domain/category';
import { Account } from '../../domain/account';
import { fileDate, pickFile, saveBinaryFile } from '../file-io';
import { formatDay, todayIso } from '../format';
import { errorText, t, tList, tn } from '../i18n';
import { lookup } from '../../application/text';
import { MonthState } from '../month-state';
import { SelectFieldComponent, SelectOption } from '../select/select-field.component';
import { SuccessCheckComponent } from '../success-check.component';

type Step = 'start' | 'columns' | 'review' | 'done';
const CREATE = '__crear__';

/** Lista de palabras de es.json más las del idioma actual: así un archivo en español sirve con la app en otro idioma. */
function words(key: string): string[] {
  const spanish = lookup(SPANISH, key);
  return [...tList(key), ...(Array.isArray(spanish) ? spanish : [])];
}

/** Ajustes › Datos y respaldo › Importar desde Excel (.xlsx o .csv), con plantilla, revisión y deshacer. */
@Component({
  selector: 'app-importar',
  templateUrl: 'importar.page.html',
  styleUrls: ['ajustes.page.scss', 'importar.page.scss'],
  imports: [RouterLink, IonContent, IonIcon, IonToggle, SelectFieldComponent, SuccessCheckComponent],
})
export class ImportarPage implements OnInit {
  private readonly container = inject(APP_CONTAINER);
  private readonly monthState = inject(MonthState);
  protected readonly t = t;
  protected readonly tn = tn;
  protected readonly fields = IMPORT_FIELDS;

  protected readonly step = signal<Step>('start');
  protected readonly showFormat = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly status = signal('');
  protected readonly lastImport = signal<ImportRecord | null>(null);

  private table: Cell[][] = [];
  protected readonly fileName = signal('');
  protected readonly headers = signal<string[]>([]);
  protected readonly columns = signal<ColumnMap | null>(null);
  protected readonly rows = signal<ImportRow[]>([]);
  protected readonly problems = signal<RowProblem[]>([]);
  protected readonly pending = signal<number[]>([]);
  protected readonly duplicates = signal<Set<number>>(new Set());
  protected readonly skipDuplicates = signal(true);
  protected readonly showProblems = signal(false);
  protected readonly newCategories = signal<{ name: string; income: boolean; choice: string }[]>([]);
  protected readonly newAccounts = signal<{ name: string; choice: string }[]>([]);
  private readonly categories = signal<Category[]>([]);
  private readonly accounts = signal<Account[]>([]);
  protected readonly imported = signal(0);

  protected readonly columnOptions = computed<SelectOption<number>[]>(() => [
    { value: -1, label: t('import.noColumn') },
    ...this.headers().map((h, i) => ({ value: i, label: h || t('import.columnN', { n: i + 1 }) })),
  ]);
  protected readonly canContinue = computed(() => {
    const map = this.columns();
    return !!map && REQUIRED_FIELDS.every((f) => map[f] !== null);
  });
  protected readonly toImport = computed(() =>
    this.rows().filter((r) => !(this.skipDuplicates() && this.duplicates().has(r.line))),
  );

  constructor() {
    addIcons({ chevronBack, chevronDown, documentOutline, downloadOutline, helpCircleOutline });
  }

  async ngOnInit() {
    this.lastImport.set(await this.container.importTransactions.last());
  }

  protected fieldLabel(field: ImportField) {
    return t(`import.columns.${field}`);
  }

  protected required(field: ImportField) {
    return REQUIRED_FIELDS.includes(field);
  }

  protected lastLabel(record: ImportRecord) {
    return tn('import.lastImport', record.transactionIds.length, { date: formatDay(record.date) });
  }

  protected categoryOptions(income: boolean): SelectOption<string>[] {
    return [
      { value: CREATE, label: t('import.create') },
      ...this.categories()
        .filter((c) => (income ? c.type === 'ingreso' : isExpenseType(c.type)))
        .map((c) => ({ value: c.id, label: c.name })),
    ];
  }

  protected accountOptions(): SelectOption<string>[] {
    return [
      { value: CREATE, label: t('import.createAccount') },
      ...this.accounts()
        .filter((a) => !a.archived)
        .map((a) => ({ value: a.id, label: a.name })),
    ];
  }

  protected problemText(p: RowProblem) {
    return t('import.problem', { line: p.line, reason: t(p.key) });
  }

  /** Lee el archivo con SheetJS (se carga solo aquí) y pasa a revisar o, si no reconoce las columnas, a elegirlas. */
  protected async pick() {
    const file = await pickFile('.xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    if (!file) return;
    this.error.set(null);
    this.busy.set(true);
    try {
      const XLSX = await import('xlsx');
      const book = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const skip = new Set(words('import.instructionsSheet').map(fold));
      const name = book.SheetNames.find((n) => !skip.has(fold(n))) ?? book.SheetNames[0];
      this.table = XLSX.utils.sheet_to_json<Cell[]>(book.Sheets[name], { header: 1, raw: true, defval: '' });
      if (this.table.length < 2) throw new Error('vacío');
      this.fileName.set(file.name);
      this.headers.set(this.table[0].map((h) => String(h ?? '').trim()));
      const aliases = Object.fromEntries(
        IMPORT_FIELDS.map((f) => [f, [...words(`import.aliases.${f}`), this.fieldLabel(f)]]),
      ) as Record<ImportField, string[]>;
      this.columns.set(guessColumns(this.table[0], aliases));
      if (this.canContinue()) await this.review();
      else this.step.set('columns');
    } catch (e) {
      console.error(e);
      this.error.set(t('import.readFailed'));
    } finally {
      this.busy.set(false);
    }
  }

  protected setColumn(field: ImportField, index: number) {
    this.columns.update((map) => ({ ...map!, [field]: index === -1 ? null : index }));
  }

  protected async review() {
    const importWords: ImportWords = {
      expense: words('import.words.expense'),
      income: words('import.words.income'),
      pending: words('import.words.pending'),
    };
    const { rows, problems, pending } = readImportRows(this.table, this.columns()!, importWords);
    this.rows.set(rows);
    this.problems.set(problems);
    this.pending.set(pending);
    const [missing, duplicates, categories, accounts] = await Promise.all([
      this.container.importTransactions.missing(rows),
      this.container.importTransactions.duplicates(rows),
      this.container.categories.list(),
      this.container.accounts.list(),
    ]);
    this.categories.set(categories);
    this.accounts.set(accounts);
    this.duplicates.set(new Set(duplicates));
    this.newCategories.set(missing.categories.map((c) => ({ ...c, choice: CREATE })));
    this.newAccounts.set(missing.accounts.map((name) => ({ name, choice: CREATE })));
    this.step.set('review');
  }

  protected chooseCategory(name: string, choice: string) {
    this.newCategories.update((list) => list.map((c) => (c.name === name ? { ...c, choice } : c)));
  }

  protected chooseAccount(name: string, choice: string) {
    this.newAccounts.update((list) => list.map((a) => (a.name === name ? { ...a, choice } : a)));
  }

  protected async import() {
    this.busy.set(true);
    this.error.set(null);
    const resolve = (choice: string): Resolution => (choice === CREATE ? { create: true } : { use: choice });
    try {
      const record = await this.container.importTransactions.execute(
        {
          rows: this.toImport(),
          categories: Object.fromEntries(this.newCategories().map((c) => [fold(c.name), resolve(c.choice)])),
          accounts: Object.fromEntries(this.newAccounts().map((a) => [fold(a.name), resolve(a.choice)])),
        },
        crypto.randomUUID(),
        todayIso(),
      );
      this.imported.set(record.transactionIds.length);
      this.lastImport.set(record);
      this.monthState.notifyChange();
      this.step.set('done');
    } catch (e) {
      console.error(e);
      this.error.set(errorText(e, 'import.failed'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async undo() {
    this.busy.set(true);
    try {
      const count = await this.container.importTransactions.undoLast();
      this.status.set(tn('import.undone', count));
      this.lastImport.set(await this.container.importTransactions.last());
      this.monthState.notifyChange();
      this.step.set('start');
    } catch (e) {
      console.error(e);
      this.error.set(t('import.undoFailed'));
    } finally {
      this.busy.set(false);
    }
  }

  protected restart() {
    this.step.set('start');
    this.error.set(null);
    this.status.set('');
  }

  /** Plantilla con las columnas en el idioma de la app, una fila de ejemplo y una hoja de instrucciones. */
  protected async downloadTemplate() {
    this.busy.set(true);
    try {
      const XLSX = await import('xlsx');
      const example = tList('import.example');
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([IMPORT_FIELDS.map((f) => this.fieldLabel(f)), example]), t('import.dataSheet'));
      const instructions = [
        [t('import.colColumn'), t('import.colRequired'), t('import.colExample'), t('import.colNotes')],
        ...IMPORT_FIELDS.map((f, i) => [
          this.fieldLabel(f),
          this.required(f) ? t('import.yes') : t('import.no'),
          example[i] ?? '',
          t(`import.notes.${f}`),
        ]),
      ];
      XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(instructions), tList('import.instructionsSheet')[0]);
      const base64 = XLSX.write(book, { type: 'base64', bookType: 'xlsx' }) as string;
      const where = await saveBinaryFile(
        `kuarto-plantilla-${fileDate()}.xlsx`,
        base64,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      this.status.set(where ? t('import.templateSaved', { where }) : t('import.templateDownloaded'));
    } catch (e) {
      console.error(e);
      this.error.set(t('import.templateFailed'));
    } finally {
      this.busy.set(false);
    }
  }
}
