import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonInput, IonToggle, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, close, createOutline } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { AccountFields } from '../../application/use-cases/accounts';
import { AddRecurringExpenseInput } from '../../application/use-cases/add-recurring-expense';
import { SavingsGoalFields } from '../../application/use-cases/add-savings-goal';
import { DebtFields } from '../../application/use-cases/debts';
import { GOALS, OnboardingGoal } from '../../application/use-cases/user-profile';
import { Account, AccountType, CASH_ACCOUNT_ID } from '../../domain/account';
import { Currency } from '../../domain/currency';
import { Debt } from '../../domain/debts';
import { RecurringExpense } from '../../domain/recurring-expense';
import { SavingsGoal } from '../../domain/savings';
import { MetaModalComponent } from '../ahorro/meta.modal';
import { accountTypeLabel } from '../cuentas/account-choices';
import { CuentaModalComponent } from '../cuentas/cuenta.modal';
import { CurrencyState } from '../currency-state';
import { DeudaModalComponent } from '../deudas/deuda.modal';
import { NuevoGastoFijoModalComponent } from '../fijos/nuevo-gasto-fijo.modal';
import { formatMoney, parseAmount, parseBalance, currentMonth } from '../format';
import { defaultNames, errorText, Lang, language, LANGUAGES, previewLanguage, setLanguage, spanishNames, t, tn } from '../i18n';
import { TourService } from '../tour/tour.service';
import { IntroComponent } from './intro.component';
import { CloudBackupService } from '../cloud/cloud-backup.service';

type Step = 'intro' | 'nombre' | 'idioma' | 'objetivo' | 'dinero' | 'sueldo' | 'fijos' | 'deudas' | 'metas' | 'limite' | 'resumen' | 'listo';
/** Preguntas en orden; cuentan para "Paso X de N". La entrada, el resumen y el final no. */
const QUESTIONS: Step[] = ['nombre', 'idioma', 'objetivo', 'dinero', 'sueldo', 'fijos', 'deudas', 'metas', 'limite'];
const STEPS: Step[] = ['intro', ...QUESTIONS, 'resumen', 'listo'];

/** Pagos fijos que se ofrecen de un toque; el nombre sale de es.json y la categoría, si existe, ya va elegida. */
const COMMON_FIXED: { key: string; categoryId: string }[] = [
  { key: 'rent', categoryId: 'cat-alquiler' },
  { key: 'power', categoryId: 'cat-luz' },
  { key: 'internet', categoryId: 'cat-internet' },
  { key: 'water', categoryId: 'cat-agua' },
  { key: 'phone', categoryId: 'cat-telefono' },
];

interface DraftAccountRow {
  tempId: string;
  fields: AccountFields;
}
interface DraftDebt {
  fields: DebtFields;
  asFixed: boolean;
}

let draftSeq = 0;
const tempId = () => `nueva-${++draftSeq}`;

/**
 * Primera vez: entrada animada y preguntas iniciales (una por pantalla). Usa los mismos formularios que las
 * pantallas reales, en modo borrador: nada se guarda hasta confirmar en "Esto es lo que vamos a crear".
 */
@Component({
  selector: 'app-bienvenida',
  templateUrl: 'bienvenida.page.html',
  styleUrls: ['bienvenida.page.scss'],
  imports: [IonContent, IonIcon, IonInput, IonToggle, IntroComponent],
})
export class BienvenidaPage {
  private readonly container = inject(APP_CONTAINER);
  private readonly router = inject(Router);
  private readonly modals = inject(ModalController);
  private readonly tour = inject(TourService);
  protected readonly currencyState = inject(CurrencyState);
  protected readonly cloud = inject(CloudBackupService);
  protected readonly t = t;
  protected readonly tn = tn;
  protected readonly money = formatMoney;

  protected readonly step = signal<Step>('intro');
  protected readonly stepNumber = computed(() => QUESTIONS.indexOf(this.step()) + 1);
  protected readonly total = QUESTIONS.length;
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  // Respuestas (borrador).
  protected readonly firstName = signal('');
  protected readonly lastName = signal('');
  protected readonly languages = LANGUAGES;
  protected readonly language = language;
  protected readonly currency = signal<Currency>(this.currencyState.currency());
  protected readonly goals = GOALS;
  protected readonly goal = signal<OnboardingGoal | null>(null);
  protected readonly cash = signal('');
  protected readonly accounts = signal<DraftAccountRow[]>([]);
  /** null: sin responder; true: cambia mucho (no se crea fijo); false: estable. */
  protected readonly salaryVaries = signal<boolean | null>(null);
  protected readonly salary = signal<AddRecurringExpenseInput[] | null>(null);
  protected readonly fixed = signal<AddRecurringExpenseInput[][]>([]);
  protected readonly commonFixed = COMMON_FIXED;
  protected readonly debts = signal<DraftDebt[]>([]);
  protected readonly savingGoals = signal<SavingsGoalFields[]>([]);
  protected readonly limit = signal('');

  protected readonly currencies = computed<{ code: Currency; label: string }[]>(() => [
    { code: 'DOP', label: t('ajustes.currencyDOP') },
    { code: 'USD', label: t('ajustes.currencyUSD') },
  ]);
  /** Las cuentas nuevas como Account, para elegirlas en el formulario de fijos. */
  private readonly draftAccountList = computed<Account[]>(() =>
    this.accounts().map((a) => ({ id: a.tempId, archived: false, ...a.fields })),
  );
  protected readonly cashCents = computed(() => parseBalance(this.cash()));
  protected readonly limitCents = computed(() => (this.limit().trim() ? parseAmount(this.limit()) : null));
  protected readonly nothingToCreate = computed(
    () =>
      !this.accounts().length && !this.salary() && !this.fixed().length && !this.debts().length && !this.savingGoals().length,
  );

  constructor() {
    addIcons({ add, close, createOutline });
  }

  protected next() {
    this.error.set(null);
    const i = STEPS.indexOf(this.step());
    this.step.set(STEPS[Math.min(i + 1, STEPS.length - 1)]);
    document.querySelector('app-bienvenida ion-content')?.scrollIntoView();
  }

  protected back() {
    this.error.set(null);
    const i = STEPS.indexOf(this.step());
    if (i > 1) this.step.set(STEPS[i - 1]);
  }

  /** El nombre es la única pregunta sin "Omitir". */
  protected saveName() {
    if (!this.firstName().trim()) {
      this.error.set(t('onboarding.nameRequired'));
      return;
    }
    if (this.firstName().trim().length > 40 || this.lastName().trim().length > 40) {
      this.error.set(t('errors.nameLength', { max: 40 }));
      return;
    }
    this.next();
  }

  /** Opcional: entra con Google y llena nombre y apellido con los de la cuenta. */
  protected async withGoogle() {
    this.busy.set(true);
    this.error.set(null);
    try {
      const [first, ...rest] = (await this.cloud.signIn()).trim().split(/\s+/);
      if (first) this.firstName.set(first);
      if (rest.length) this.lastName.set(rest.join(' '));
    } catch (e) {
      console.error(e);
      this.error.set(t('onboarding.googleFailed'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async pickLanguage(code: Lang) {
    await previewLanguage(code);
  }

  protected pickCurrency(code: Currency) {
    this.currency.set(code);
    this.currencyState.preview(code);
  }

  protected pickGoal(goal: OnboardingGoal) {
    this.goal.set(goal);
    this.next();
  }

  // ---------- cuentas (mismo formulario de Dinero, en borrador)
  protected async addAccount(type: AccountType, edit?: DraftAccountRow) {
    const view = edit
      ? { account: { id: edit.tempId, archived: false, ...edit.fields }, balance: edit.fields.initialBalance }
      : undefined;
    const fields = await this.openDraft<AccountFields>(CuentaModalComponent, { view, presetType: type });
    if (!fields) return;
    if (edit) this.accounts.update((list) => list.map((a) => (a === edit ? { ...a, fields } : a)));
    else this.accounts.update((list) => [...list, { tempId: tempId(), fields }]);
  }

  protected accountLabel(a: DraftAccountRow) {
    return `${a.fields.name} · ${accountTypeLabel(a.fields.type)}`;
  }

  protected saveCash() {
    if (this.cashCents() === null) {
      this.error.set(t('onboarding.cashInvalid'));
      return;
    }
    this.next();
  }

  // ---------- sueldo y fijos (mismo formulario de Fijos, en borrador)
  protected setSalaryVaries(varies: boolean) {
    this.salaryVaries.set(varies);
    if (varies) this.salary.set(null);
    else if (!this.salary()) void this.editSalary();
  }

  protected async editSalary() {
    const current = this.salary();
    const inputs = await this.openDraft<AddRecurringExpenseInput[]>(NuevoGastoFijoModalComponent, {
      presetKind: 'ingreso',
      presetName: current?.length === 1 ? current[0].name : t('onboarding.salaryName'),
      presetCategoryId: current?.[0]?.categoryId ?? 'cat-salario',
      expense: current?.length === 1 ? this.asExpense(current[0]) : undefined,
      draftAccounts: this.draftAccountList(),
    });
    if (inputs) this.salary.set(inputs);
    else if (!current) this.salaryVaries.set(null);
  }

  protected async addFixed(key?: string, categoryId?: string, edit?: AddRecurringExpenseInput[]) {
    const inputs = await this.openDraft<AddRecurringExpenseInput[]>(NuevoGastoFijoModalComponent, {
      presetKind: 'gasto',
      presetName: edit ? undefined : key ? t(`onboarding.fixedNames.${key}`) : undefined,
      presetCategoryId: edit ? undefined : categoryId,
      expense: edit?.length === 1 ? this.asExpense(edit[0]) : undefined,
      draftAccounts: this.draftAccountList(),
    });
    if (!inputs) return;
    if (edit) this.fixed.update((list) => list.map((g) => (g === edit ? inputs : g)));
    else this.fixed.update((list) => [...list, inputs]);
  }

  protected removeFixed(group: AddRecurringExpenseInput[]) {
    this.fixed.update((list) => list.filter((g) => g !== group));
  }

  /** Un fijo en borrador como RecurringExpense, para abrir el formulario en modo edición. */
  private asExpense(input: AddRecurringExpenseInput): RecurringExpense {
    return { id: 'borrador', active: true, frequency: 1, ...input, accountId: input.accountId ?? null } as RecurringExpense;
  }

  protected groupLabel(group: AddRecurringExpenseInput[]) {
    const total = group.reduce((s, r) => s + r.amount, 0);
    return group.length === 1 ? `${group[0].name} · ${formatMoney(total)}` : t('onboarding.payments', { name: group[0].name, count: group.length, amount: formatMoney(total) });
  }

  // ---------- deudas y metas (mismos formularios de Planes, en borrador)
  protected async addDebt(edit?: DraftDebt) {
    const debt = edit ? ({ id: 'borrador', ...edit.fields } as Debt) : undefined;
    const fields = await this.openDraft<DebtFields>(DeudaModalComponent, { debt });
    if (!fields) return;
    const asFixed = fields.direction === 'debo' && !!fields.termMonths;
    if (edit) this.debts.update((list) => list.map((d) => (d === edit ? { fields, asFixed: asFixed && d.asFixed } : d)));
    else this.debts.update((list) => [...list, { fields, asFixed }]);
  }

  protected setDebtFixed(debt: DraftDebt, asFixed: boolean) {
    this.debts.update((list) => list.map((d) => (d === debt ? { ...d, asFixed } : d)));
  }

  protected removeDebt(debt: DraftDebt) {
    this.debts.update((list) => list.filter((d) => d !== debt));
  }

  protected async addGoal(edit?: SavingsGoalFields) {
    const goal = edit ? ({ id: 'borrador', ...edit } as SavingsGoal) : undefined;
    const fields = await this.openDraft<SavingsGoalFields>(MetaModalComponent, { goal });
    if (!fields) return;
    if (edit) this.savingGoals.update((list) => list.map((g) => (g === edit ? fields : g)));
    else this.savingGoals.update((list) => [...list, fields]);
  }

  protected removeGoal(goal: SavingsGoalFields) {
    this.savingGoals.update((list) => list.filter((g) => g !== goal));
  }

  protected removeAccount(account: DraftAccountRow) {
    this.accounts.update((list) => list.filter((a) => a !== account));
    // Los fijos que iban a esa cuenta pasan a Efectivo.
    const fix = (r: AddRecurringExpenseInput) => (r.accountId === account.tempId ? { ...r, accountId: CASH_ACCOUNT_ID } : r);
    this.fixed.update((list) => list.map((g) => g.map(fix)));
    this.salary.update((s) => s?.map(fix) ?? null);
  }

  protected saveLimit() {
    if (this.limit().trim() && this.limitCents() === null) {
      this.error.set(t('onboarding.limitInvalid'));
      return;
    }
    this.next();
  }

  private async openDraft<T>(component: unknown, props: Record<string, unknown>): Promise<T | null> {
    const modal = await this.modals.create({ component: component as never, componentProps: { ...props, draft: true } });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<T>();
    return role === 'draft' ? (data ?? null) : null;
  }

  /** Guarda todo lo respondido de una vez. */
  protected async confirm() {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.container.completeOnboarding.execute(
        {
          firstName: this.firstName(),
          lastName: this.lastName(),
          currency: this.currency(),
          goal: this.goal(),
          cash: this.cashCents() ?? 0,
          accounts: this.accounts(),
          recurring: [...(this.salary() ? [this.salary()!] : []), ...this.fixed()],
          debts: this.debts(),
          goals: this.savingGoals(),
          monthlyLimit: this.limitCents(),
        },
        currentMonth(),
      );
      await setLanguage(this.container.settings, language());
      await this.container.localizeDefaults.execute([spanishNames()], defaultNames());
      await this.currencyState.change(this.currency());
      this.step.set('listo');
    } catch (e) {
      console.error(e);
      this.error.set(errorText(e, 'common.saveFailed'));
    } finally {
      this.busy.set(false);
    }
  }

  /** Con `withTour`, al entrar a la app empieza el recorrido. */
  protected async finish(withTour: boolean) {
    await this.router.navigateByUrl('/tabs/inicio', { replaceUrl: true });
    if (withTour) this.tour.start();
  }
}
