import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { IonContent, IonIcon, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmark, close } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { CopyCandidate } from '../../application/use-cases/copy-month';
import { Account, CASH_ACCOUNT_ID } from '../../domain/account';
import { Category } from '../../domain/category';
import { addMonths, MonthKey } from '../../domain/month';
import { accountOptions } from '../cuentas/account-choices';
import { amountToInput, formatDay, formatMoney, monthLabel, parseAmount } from '../format';
import { errorText, t, tn } from '../i18n';
import { SelectFieldComponent } from '../select/select-field.component';

interface Row {
  candidate: CopyCandidate;
  title: string;
  sub: string;
  picked: boolean;
  amount: string;
  /** Su cuenta ya no existe o está archivada: la copia va a la que se elija abajo. */
  needsAccount: boolean;
}

/** Cuántos meses atrás se ofrecen como origen. */
const MONTHS_BACK = 12;

/**
 * "Copiar de otro mes": elige el mes de origen y qué movimientos copiar al mes que se ve. Por defecto van marcados
 * los gastos; los ingresos se marcan a mano y los pagos de Fijos no se copian. Devuelve las copias (role 'saved').
 */
@Component({
  selector: 'app-copiar-modal',
  templateUrl: 'copiar.modal.html',
  styleUrls: ['copiar.modal.scss'],
  imports: [IonContent, IonIcon, SelectFieldComponent],
})
export class CopiarModalComponent implements OnInit {
  private readonly container = inject(APP_CONTAINER);
  private readonly modalCtrl = inject(ModalController);
  protected readonly t = t;
  protected readonly tn = tn;

  /** Mes al que se copia (el que se está viendo). */
  @Input({ required: true }) to!: MonthKey;

  protected readonly from = signal<MonthKey>('');
  protected readonly rows = signal<Row[] | null>(null);
  private readonly categories = signal<Category[]>([]);
  private readonly accounts = signal<Account[]>([]);
  protected readonly accountId = signal(CASH_ACCOUNT_ID);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly toLabel = computed(() => monthLabel(this.to));
  protected readonly monthOptions = computed(() =>
    Array.from({ length: MONTHS_BACK }, (_, i) => addMonths(this.to, -(i + 1))).map((m) => ({ value: m, label: monthLabel(m) })),
  );
  protected readonly accountOptions = computed(() => accountOptions(this.accounts().filter((a) => !a.archived)));
  protected readonly copyable = computed(() => (this.rows() ?? []).filter((r) => !r.candidate.fromFixed));
  protected readonly fixedCount = computed(() => (this.rows() ?? []).filter((r) => r.candidate.fromFixed).length);
  protected readonly picked = computed(() => this.copyable().filter((r) => r.picked));
  protected readonly needsAccount = computed(() => this.picked().some((r) => r.needsAccount));
  protected readonly valid = computed(() => this.picked().every((r) => parseAmount(r.amount) !== null));

  /** "Copiar 12 gastos · RD$18,450", o "movimientos" si van también ingresos. */
  protected readonly saveLabel = computed(() => {
    const list = this.picked();
    const total = list.reduce((s, r) => s + (parseAmount(r.amount) ?? 0) * (r.candidate.income ? -1 : 1), 0);
    const key = list.some((r) => r.candidate.income) ? 'copy.saveMoves' : 'copy.saveExpenses';
    return tn(key, list.length, { amount: formatMoney(Math.abs(total)) });
  });

  constructor() {
    addIcons({ checkmark, close });
  }

  async ngOnInit() {
    const [categories, accounts] = await Promise.all([this.container.categories.list(), this.container.accounts.list()]);
    this.categories.set(categories);
    this.accounts.set(accounts);
    await this.load(addMonths(this.to, -1));
  }

  protected async load(month: MonthKey) {
    this.from.set(month);
    this.rows.set(null);
    this.error.set(null);
    try {
      const names = new Map(this.categories().map((c) => [c.id, c.name]));
      const usable = new Set(this.accounts().filter((a) => !a.archived).map((a) => a.id));
      const candidates = await this.container.copyFromMonth.candidates(month);
      this.rows.set(
        candidates.map((candidate) => {
          const tx = candidate.transaction;
          const category = names.get(tx.categoryId) ?? t('common.noCategory');
          return {
            candidate,
            title: tx.note || category,
            sub: `${category} · ${formatDay(tx.date)}`,
            picked: !candidate.fromFixed && !candidate.income,
            amount: amountToInput(tx.amount),
            needsAccount: !usable.has(tx.accountId ?? CASH_ACCOUNT_ID),
          };
        }),
      );
    } catch (e) {
      console.error(e);
      this.error.set(t('copy.loadFailed'));
      this.rows.set([]);
    }
  }

  protected toggle(row: Row) {
    this.update(row, { picked: !row.picked });
  }

  protected setAmount(row: Row, amount: string) {
    this.update(row, { amount });
  }

  private update(row: Row, change: Partial<Row>) {
    this.rows.update((list) => (list ?? []).map((r) => (r === row ? { ...r, ...change } : r)));
  }

  protected cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  protected async save() {
    this.saving.set(true);
    this.error.set(null);
    try {
      const created = await this.container.copyFromMonth.execute(
        this.from(),
        this.to,
        this.picked().map((r) => ({
          transactionId: r.candidate.transaction.id,
          amount: parseAmount(r.amount) ?? 0,
          accountId: r.needsAccount ? this.accountId() : undefined,
        })),
      );
      await this.modalCtrl.dismiss(created, 'saved');
    } catch (e) {
      this.error.set(errorText(e, 'common.saveFailed'));
      this.saving.set(false);
    }
  }
}
