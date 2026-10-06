import { InjectionToken } from '@angular/core';
import { AddRecurringExpense } from './application/use-cases/add-recurring-expense';
import { DeleteTransaction, RestoreTransaction } from './application/use-cases/delete-transaction';
import { RemoveRecurringExpense } from './application/use-cases/remove-recurring-expense';
import { UpdateRecurringExpense } from './application/use-cases/update-recurring-expense';
import { UpdateTransaction } from './application/use-cases/update-transaction';
import { AddSavingsGoal } from './application/use-cases/add-savings-goal';
import { AddCategory, DeleteCategory, RenameCategory } from './application/use-cases/manage-categories';
import { CreateBackup, OpenBackup, RestoreBackup } from './application/use-cases/backup';
import { ExportTransactionsCsv } from './application/use-cases/export-csv';
import { PinLock } from './application/use-cases/pin-lock';
import { BulkUpdateTransactions } from './application/use-cases/bulk-update-transactions';
import {
  DeleteDebt,
  DeleteDebtPayment,
  GetDebtsOverview,
  RegisterDebtPayment,
  SaveDebt,
} from './application/use-cases/debts';
import { Onboarding } from './application/use-cases/onboarding';
import { GetAlerts } from './application/use-cases/get-alerts';
import { GetMonthHistory } from './application/use-cases/get-month-history';
import { GetNotificationPlan } from './application/use-cases/get-notification-plan';
import { GetUpcomingRecurring } from './application/use-cases/get-upcoming-recurring';
import { PauseRecurringExpense, ResumeRecurringExpense } from './application/use-cases/pause-recurring-expense';
import { CurrencySettings } from './application/use-cases/currency-settings';
import { CopyBudgets } from './application/use-cases/copy-budgets';
import { DeleteBudget } from './application/use-cases/delete-budget';
import {
  DeleteSavingsContribution,
  RestoreSavingsContribution,
} from './application/use-cases/delete-savings-contribution';
import { DeleteSavingsGoal } from './application/use-cases/delete-savings-goal';
import { GetSavingsOverview } from './application/use-cases/get-savings-overview';
import { SetBudget } from './application/use-cases/set-budget';
import { UpdateSavingsGoal } from './application/use-cases/update-savings-goal';
import { AddSavingsContribution } from './application/use-cases/add-savings-contribution';
import { AddTransaction } from './application/use-cases/add-transaction';
import { GetBudgetStatuses } from './application/use-cases/get-budget-statuses';
import { GetMonthOverview } from './application/use-cases/get-month-overview';
import { GetMonthRecurringExpenses } from './application/use-cases/get-month-recurring-expenses';
import { PayRecurringExpense } from './application/use-cases/pay-recurring-expense';
import {
  IBackupStore,
  IBudgetRepository,
  ICategoryRepository,
  IDebtRepository,
  IdGenerator,
  IRecurringExpenseRepository,
  ISavingsRepository,
  ISettingsRepository,
  ITransactionRepository,
} from './application/ports/repositories';
import {
  SqliteBudgetRepository,
  SqliteCategoryRepository,
  SqliteDebtRepository,
  SqliteRecurringExpenseRepository,
  SqliteSavingsRepository,
  SqliteSettingsRepository,
  SqliteTransactionRepository,
} from './infrastructure/repositories/sqlite-repositories';
import { SqliteBackupStore } from './infrastructure/sqlite/sqlite-backup-store';
import { CapacitorSqliteDatabase } from './infrastructure/sqlite/capacitor-sqlite-database';
import { runMigrations } from './infrastructure/sqlite/migrations';

export interface Repositories {
  categories: ICategoryRepository;
  transactions: ITransactionRepository;
  recurring: IRecurringExpenseRepository;
  savings: ISavingsRepository;
  budgets: IBudgetRepository;
  settings: ISettingsRepository;
  backup: IBackupStore;
  debts: IDebtRepository;
}

/** Raíz de composición: une repositorios y casos de uso. La UI solo ve esto. */
export interface AppContainer {
  categories: ICategoryRepository;
  transactions: ITransactionRepository;
  addTransaction: AddTransaction;
  updateTransaction: UpdateTransaction;
  deleteTransaction: DeleteTransaction;
  addRecurringExpense: AddRecurringExpense;
  updateRecurringExpense: UpdateRecurringExpense;
  removeRecurringExpense: RemoveRecurringExpense;
  getMonthOverview: GetMonthOverview;
  getMonthRecurringExpenses: GetMonthRecurringExpenses;
  payRecurringExpense: PayRecurringExpense;
  getSavingsOverview: GetSavingsOverview;
  addSavingsGoal: AddSavingsGoal;
  updateSavingsGoal: UpdateSavingsGoal;
  deleteSavingsGoal: DeleteSavingsGoal;
  addSavingsContribution: AddSavingsContribution;
  deleteSavingsContribution: DeleteSavingsContribution;
  getBudgetStatuses: GetBudgetStatuses;
  setBudget: SetBudget;
  deleteBudget: DeleteBudget;
  copyBudgets: CopyBudgets;
  currencySettings: CurrencySettings;
  addCategory: AddCategory;
  renameCategory: RenameCategory;
  deleteCategory: DeleteCategory;
  restoreTransaction: RestoreTransaction;
  restoreSavingsContribution: RestoreSavingsContribution;
  createBackup: CreateBackup;
  openBackup: OpenBackup;
  restoreBackup: RestoreBackup;
  exportCsv: ExportTransactionsCsv;
  pinLock: PinLock;
  bulkUpdateTransactions: BulkUpdateTransactions;
  settings: ISettingsRepository;
  pauseRecurringExpense: PauseRecurringExpense;
  resumeRecurringExpense: ResumeRecurringExpense;
  getUpcomingRecurring: GetUpcomingRecurring;
  saveDebt: SaveDebt;
  deleteDebt: DeleteDebt;
  getDebtsOverview: GetDebtsOverview;
  registerDebtPayment: RegisterDebtPayment;
  deleteDebtPayment: DeleteDebtPayment;
  onboarding: Onboarding;
  getAlerts: GetAlerts;
  getNotificationPlan: GetNotificationPlan;
  getMonthHistory: GetMonthHistory;
}

export const APP_CONTAINER = new InjectionToken<AppContainer>('AppContainer');

export const uuidGenerator: IdGenerator = { next: () => crypto.randomUUID() };

export function buildContainer(repos: Repositories, ids: IdGenerator = uuidGenerator): AppContainer {
  const getMonthRecurringExpenses = new GetMonthRecurringExpenses(repos.recurring);
  const getBudgetStatuses = new GetBudgetStatuses(repos.budgets, repos.transactions);
  const getUpcomingRecurring = new GetUpcomingRecurring(getMonthRecurringExpenses);
  return {
    categories: repos.categories,
    transactions: repos.transactions,
    addTransaction: new AddTransaction(repos.transactions, repos.categories, ids),
    updateTransaction: new UpdateTransaction(repos.transactions, repos.categories),
    deleteTransaction: new DeleteTransaction(repos.transactions, repos.recurring),
    addRecurringExpense: new AddRecurringExpense(repos.recurring, repos.categories, ids),
    updateRecurringExpense: new UpdateRecurringExpense(repos.recurring, repos.categories),
    removeRecurringExpense: new RemoveRecurringExpense(repos.recurring),
    getMonthOverview: new GetMonthOverview(repos.transactions, repos.categories, repos.savings),
    getMonthHistory: new GetMonthHistory(repos.transactions, repos.categories, repos.savings),
    getMonthRecurringExpenses,
    payRecurringExpense: new PayRecurringExpense(repos.recurring, repos.transactions, ids),
    getSavingsOverview: new GetSavingsOverview(repos.savings),
    addSavingsGoal: new AddSavingsGoal(repos.savings, ids),
    updateSavingsGoal: new UpdateSavingsGoal(repos.savings),
    deleteSavingsGoal: new DeleteSavingsGoal(repos.savings),
    addSavingsContribution: new AddSavingsContribution(repos.savings, ids),
    deleteSavingsContribution: new DeleteSavingsContribution(repos.savings),
    getBudgetStatuses,
    setBudget: new SetBudget(repos.budgets, repos.categories, ids),
    deleteBudget: new DeleteBudget(repos.budgets),
    copyBudgets: new CopyBudgets(repos.budgets, ids),
    currencySettings: new CurrencySettings(repos.settings),
    addCategory: new AddCategory(repos.categories, ids),
    renameCategory: new RenameCategory(repos.categories),
    deleteCategory: new DeleteCategory(repos.categories),
    restoreTransaction: new RestoreTransaction(repos.transactions, repos.recurring),
    restoreSavingsContribution: new RestoreSavingsContribution(repos.savings),
    createBackup: new CreateBackup(repos.backup),
    openBackup: new OpenBackup(),
    restoreBackup: new RestoreBackup(repos.backup),
    exportCsv: new ExportTransactionsCsv(repos.transactions, repos.categories),
    pinLock: new PinLock(repos.settings),
    bulkUpdateTransactions: new BulkUpdateTransactions(repos.transactions, repos.categories),
    settings: repos.settings,
    pauseRecurringExpense: new PauseRecurringExpense(repos.recurring),
    resumeRecurringExpense: new ResumeRecurringExpense(repos.recurring),
    getUpcomingRecurring,
    getAlerts: new GetAlerts(getUpcomingRecurring, getBudgetStatuses, repos.categories),
    getNotificationPlan: new GetNotificationPlan(getMonthRecurringExpenses, getBudgetStatuses, repos.categories),
    saveDebt: new SaveDebt(repos.debts, ids),
    deleteDebt: new DeleteDebt(repos.debts),
    getDebtsOverview: new GetDebtsOverview(repos.debts),
    registerDebtPayment: new RegisterDebtPayment(repos.debts, repos.transactions, repos.categories, ids),
    deleteDebtPayment: new DeleteDebtPayment(repos.debts, repos.transactions),
    onboarding: new Onboarding(repos.settings, repos.transactions, repos.recurring),
  };
}

export async function createSqliteContainer(): Promise<AppContainer> {
  const db = await CapacitorSqliteDatabase.open();
  await runMigrations(db);
  return buildContainer({
    categories: new SqliteCategoryRepository(db),
    transactions: new SqliteTransactionRepository(db),
    recurring: new SqliteRecurringExpenseRepository(db),
    savings: new SqliteSavingsRepository(db),
    budgets: new SqliteBudgetRepository(db),
    settings: new SqliteSettingsRepository(db),
    backup: new SqliteBackupStore(db),
    debts: new SqliteDebtRepository(db),
  });
}
