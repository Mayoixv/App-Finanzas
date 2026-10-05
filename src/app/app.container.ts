import { InjectionToken } from '@angular/core';
import { AddRecurringExpense } from './application/use-cases/add-recurring-expense';
import { DeleteTransaction } from './application/use-cases/delete-transaction';
import { RemoveRecurringExpense } from './application/use-cases/remove-recurring-expense';
import { UpdateRecurringExpense } from './application/use-cases/update-recurring-expense';
import { UpdateTransaction } from './application/use-cases/update-transaction';
import { AddSavingsGoal } from './application/use-cases/add-savings-goal';
import { AddCategory, DeleteCategory, RenameCategory } from './application/use-cases/manage-categories';
import { CurrencySettings } from './application/use-cases/currency-settings';
import { CopyBudgets } from './application/use-cases/copy-budgets';
import { DeleteBudget } from './application/use-cases/delete-budget';
import { DeleteSavingsContribution } from './application/use-cases/delete-savings-contribution';
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
  IBudgetRepository,
  ICategoryRepository,
  IdGenerator,
  IRecurringExpenseRepository,
  ISavingsRepository,
  ISettingsRepository,
  ITransactionRepository,
} from './application/ports/repositories';
import {
  SqliteBudgetRepository,
  SqliteCategoryRepository,
  SqliteRecurringExpenseRepository,
  SqliteSavingsRepository,
  SqliteSettingsRepository,
  SqliteTransactionRepository,
} from './infrastructure/repositories/sqlite-repositories';
import { CapacitorSqliteDatabase } from './infrastructure/sqlite/capacitor-sqlite-database';
import { runMigrations } from './infrastructure/sqlite/migrations';

export interface Repositories {
  categories: ICategoryRepository;
  transactions: ITransactionRepository;
  recurring: IRecurringExpenseRepository;
  savings: ISavingsRepository;
  budgets: IBudgetRepository;
  settings: ISettingsRepository;
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
}

export const APP_CONTAINER = new InjectionToken<AppContainer>('AppContainer');

export const uuidGenerator: IdGenerator = { next: () => crypto.randomUUID() };

export function buildContainer(repos: Repositories, ids: IdGenerator = uuidGenerator): AppContainer {
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
    getMonthRecurringExpenses: new GetMonthRecurringExpenses(repos.recurring),
    payRecurringExpense: new PayRecurringExpense(repos.recurring, repos.transactions, ids),
    getSavingsOverview: new GetSavingsOverview(repos.savings),
    addSavingsGoal: new AddSavingsGoal(repos.savings, ids),
    updateSavingsGoal: new UpdateSavingsGoal(repos.savings),
    deleteSavingsGoal: new DeleteSavingsGoal(repos.savings),
    addSavingsContribution: new AddSavingsContribution(repos.savings, ids),
    deleteSavingsContribution: new DeleteSavingsContribution(repos.savings),
    getBudgetStatuses: new GetBudgetStatuses(repos.budgets, repos.transactions),
    setBudget: new SetBudget(repos.budgets, repos.categories, ids),
    deleteBudget: new DeleteBudget(repos.budgets),
    copyBudgets: new CopyBudgets(repos.budgets, ids),
    currencySettings: new CurrencySettings(repos.settings),
    addCategory: new AddCategory(repos.categories, ids),
    renameCategory: new RenameCategory(repos.categories),
    deleteCategory: new DeleteCategory(repos.categories),
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
  });
}
