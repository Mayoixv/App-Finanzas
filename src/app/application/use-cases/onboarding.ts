import { CASH_ACCOUNT_ID } from '../../domain/account';
import { Currency } from '../../domain/currency';
import { Cents } from '../../domain/money';
import { MonthKey } from '../../domain/month';
import { IRecurringExpenseRepository, ISettingsRepository, ITransactionRepository } from '../ports/repositories';
import { AccountFields, AdjustAccountBalance, SaveAccount } from './accounts';
import { AddRecurringExpenseInput, AddRecurringExpenses } from './add-recurring-expense';
import { AddSavingsGoal, SavingsGoalFields } from './add-savings-goal';
import { CurrencySettings } from './currency-settings';
import { AddDebtAsFixed, DebtFields, SaveDebt } from './debts';
import { OnboardingGoal, UserProfile } from './user-profile';

const KEY = 'onboarding_done';

/** La bienvenida se muestra una sola vez, y nunca a quien ya tiene datos (por ejemplo, tras actualizar la app). */
export class Onboarding {
  constructor(
    private readonly settings: ISettingsRepository,
    private readonly transactions: ITransactionRepository,
    private readonly recurring: IRecurringExpenseRepository,
  ) {}

  async needed(): Promise<boolean> {
    if (await this.settings.get(KEY)) return false;
    const hasData =
      (await this.transactions.listAll()).length > 0 || (await this.recurring.list()).length > 0;
    if (hasData) await this.finish();
    return !hasData;
  }

  finish(): Promise<void> {
    return this.settings.set(KEY, '1');
  }
}

/** Una cuenta de las preguntas iniciales: aún no existe, así que los fijos la nombran por `tempId`. */
export interface DraftAccount {
  tempId: string;
  fields: AccountFields;
}

/** Todo lo que se responde en las preguntas iniciales. Nada se guarda hasta `CompleteOnboarding`. */
export interface OnboardingPlan {
  firstName: string;
  lastName: string;
  currency: Currency;
  goal: OnboardingGoal | null;
  /** Efectivo de hoy (0 si no lo dio). */
  cash: Cents;
  accounts: DraftAccount[];
  /** Sueldo y pagos fijos; `accountId` puede ser el `tempId` de una cuenta nueva. Cada lista es un formulario. */
  recurring: AddRecurringExpenseInput[][];
  debts: { fields: DebtFields; asFixed: boolean }[];
  goals: SavingsGoalFields[];
  monthlyLimit: Cents | null;
}

/** Guarda de una vez lo de las preguntas iniciales: perfil, cuentas, fijos, deudas y metas. */
export class CompleteOnboarding {
  constructor(
    private readonly onboarding: Onboarding,
    private readonly profile: UserProfile,
    private readonly currency: CurrencySettings,
    private readonly saveAccount: SaveAccount,
    private readonly adjustBalance: AdjustAccountBalance,
    private readonly addRecurring: AddRecurringExpenses,
    private readonly saveDebt: SaveDebt,
    private readonly debtAsFixed: AddDebtAsFixed,
    private readonly addGoal: AddSavingsGoal,
  ) {}

  async execute(plan: OnboardingPlan, month: MonthKey): Promise<void> {
    await this.profile.setName(plan.firstName);
    await this.profile.setLastName(plan.lastName);
    await this.profile.setGoal(plan.goal);
    await this.profile.setMonthlyLimit(plan.monthlyLimit);
    await this.currency.set(plan.currency);
    const ids = new Map<string, string>();
    for (const draft of plan.accounts) ids.set(draft.tempId, (await this.saveAccount.execute(draft.fields)).id);
    if (plan.cash !== 0) await this.adjustBalance.execute(CASH_ACCOUNT_ID, plan.cash);
    for (const group of plan.recurring) {
      await this.addRecurring.execute(
        group.map((r) => ({ ...r, accountId: r.accountId ? (ids.get(r.accountId) ?? r.accountId) : r.accountId, startMonth: month })),
      );
    }
    for (const { fields, asFixed } of plan.debts) {
      const debt = await this.saveDebt.execute(fields);
      if (asFixed && fields.direction === 'debo' && fields.termMonths) await this.debtAsFixed.execute(debt.id, month);
    }
    for (const goal of plan.goals) await this.addGoal.execute(goal);
    await this.onboarding.finish();
  }
}
