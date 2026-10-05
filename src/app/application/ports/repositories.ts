import { Budget } from '../../domain/budget';
import { Category } from '../../domain/category';
import { MonthKey } from '../../domain/month';
import { RecurringExpense, RecurringExpenseInstance } from '../../domain/recurring-expense';
import { SavingsContribution, SavingsGoal } from '../../domain/savings';
import { Transaction } from '../../domain/transaction';

export interface ICategoryRepository {
  list(): Promise<Category[]>;
  get(id: string): Promise<Category | undefined>;
  save(category: Category): Promise<void>;
  delete(id: string): Promise<void>;
  /** true si algún movimiento o gasto fijo usa la categoría (no se puede borrar sin perder datos). */
  isInUse(id: string): Promise<boolean>;
}

export interface ITransactionRepository {
  listByMonth(month: MonthKey): Promise<Transaction[]>;
  get(id: string): Promise<Transaction | undefined>;
  save(transaction: Transaction): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IRecurringExpenseRepository {
  list(): Promise<RecurringExpense[]>;
  get(id: string): Promise<RecurringExpense | undefined>;
  save(expense: RecurringExpense): Promise<void>;
  delete(id: string): Promise<void>;
  listInstances(month: MonthKey): Promise<RecurringExpenseInstance[]>;
  saveInstance(instance: RecurringExpenseInstance): Promise<void>;
  /** Crea la instancia solo si no existe; nunca pisa una que ya esté (por ejemplo, pagada). */
  insertInstanceIfMissing(instance: RecurringExpenseInstance): Promise<void>;
  listInstancesOf(expenseId: string): Promise<RecurringExpenseInstance[]>;
  deleteInstance(expenseId: string, month: MonthKey): Promise<void>;
  findInstanceByTransaction(transactionId: string): Promise<RecurringExpenseInstance | undefined>;
}

export interface ISavingsRepository {
  listGoals(): Promise<SavingsGoal[]>;
  getGoal(id: string): Promise<SavingsGoal | undefined>;
  saveGoal(goal: SavingsGoal): Promise<void>;
  deleteGoal(id: string): Promise<void>;
  listContributions(): Promise<SavingsContribution[]>;
  listContributionsByMonth(month: MonthKey): Promise<SavingsContribution[]>;
  saveContribution(contribution: SavingsContribution): Promise<void>;
  deleteContribution(id: string): Promise<void>;
}

export interface IBudgetRepository {
  listByMonth(month: MonthKey): Promise<Budget[]>;
  save(budget: Budget): Promise<void>;
  delete(id: string): Promise<void>;
}

/** Preferencias de la app guardadas en el dispositivo, como pares clave/valor. */
export interface ISettingsRepository {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
}

export interface IdGenerator {
  next(): string;
}
