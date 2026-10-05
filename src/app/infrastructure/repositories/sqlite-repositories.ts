import {
  IBudgetRepository,
  ICategoryRepository,
  IRecurringExpenseRepository,
  ISavingsRepository,
  ISettingsRepository,
  ITransactionRepository,
} from '../../application/ports/repositories';
import { Budget } from '../../domain/budget';
import { Category, CategoryType } from '../../domain/category';
import { MonthKey } from '../../domain/month';
import {
  PaymentStatus,
  RecurringExpense,
  RecurringExpenseInstance,
} from '../../domain/recurring-expense';
import { SavingsContribution, SavingsGoal } from '../../domain/savings';
import { Transaction } from '../../domain/transaction';
import { SqlDatabase } from '../sqlite/sql-database';

/** Rango de fechas ISO del mes; la comparación de texto 'YYYY-MM-DD' respeta el orden cronológico. */
function monthRange(month: MonthKey): [string, string] {
  return [`${month}-01`, `${month}-31`];
}

export class SqliteCategoryRepository implements ICategoryRepository {
  constructor(private readonly db: SqlDatabase) {}

  async list(): Promise<Category[]> {
    return this.db.all<Category>('SELECT id, name, type FROM categories ORDER BY name');
  }

  async get(id: string): Promise<Category | undefined> {
    const rows = await this.db.all<Category>('SELECT id, name, type FROM categories WHERE id = ?', [id]);
    return rows[0];
  }

  async save(c: Category): Promise<void> {
    await this.db.run(
      `INSERT INTO categories (id, name, type) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, type = excluded.type`,
      [c.id, c.name, c.type satisfies CategoryType],
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.run('DELETE FROM categories WHERE id = ?', [id]);
  }

  async isInUse(id: string): Promise<boolean> {
    const rows = await this.db.all<{ used: number }>(
      `SELECT EXISTS (SELECT 1 FROM transactions WHERE category_id = ?)
           OR EXISTS (SELECT 1 FROM recurring_expenses WHERE category_id = ?) AS used`,
      [id, id],
    );
    return rows[0]?.used === 1;
  }
}

interface TransactionRow {
  id: string;
  date: string;
  amount: number;
  category_id: string;
  note: string;
}

const toTransaction = (r: TransactionRow): Transaction => ({
  id: r.id,
  date: r.date,
  amount: r.amount,
  categoryId: r.category_id,
  note: r.note,
});

export class SqliteTransactionRepository implements ITransactionRepository {
  constructor(private readonly db: SqlDatabase) {}

  async listByMonth(month: MonthKey): Promise<Transaction[]> {
    const rows = await this.db.all<TransactionRow>(
      'SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date, id',
      monthRange(month),
    );
    return rows.map(toTransaction);
  }

  async get(id: string): Promise<Transaction | undefined> {
    const rows = await this.db.all<TransactionRow>('SELECT * FROM transactions WHERE id = ?', [id]);
    return rows[0] && toTransaction(rows[0]);
  }

  async save(t: Transaction): Promise<void> {
    await this.db.run(
      `INSERT INTO transactions (id, date, amount, category_id, note) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET date = excluded.date, amount = excluded.amount,
         category_id = excluded.category_id, note = excluded.note`,
      [t.id, t.date, t.amount, t.categoryId, t.note],
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.run('DELETE FROM transactions WHERE id = ?', [id]);
  }
}

interface RecurringRow {
  id: string;
  name: string;
  amount: number;
  category_id: string;
  due_day: number;
  active: number;
  start_month: string;
}

interface InstanceRow {
  recurring_expense_id: string;
  month: string;
  due_date: string;
  amount: number;
  status: PaymentStatus;
  transaction_id: string | null;
}

const toRecurring = (r: RecurringRow): RecurringExpense => ({
  id: r.id,
  name: r.name,
  amount: r.amount,
  categoryId: r.category_id,
  dueDay: r.due_day,
  active: r.active === 1,
  startMonth: r.start_month,
});

const toInstance = (r: InstanceRow): RecurringExpenseInstance => ({
  recurringExpenseId: r.recurring_expense_id,
  month: r.month,
  dueDate: r.due_date,
  amount: r.amount,
  status: r.status,
  ...(r.transaction_id ? { transactionId: r.transaction_id } : {}),
});

export class SqliteRecurringExpenseRepository implements IRecurringExpenseRepository {
  constructor(private readonly db: SqlDatabase) {}

  async list(): Promise<RecurringExpense[]> {
    const rows = await this.db.all<RecurringRow>('SELECT * FROM recurring_expenses ORDER BY due_day, name');
    return rows.map(toRecurring);
  }

  async get(id: string): Promise<RecurringExpense | undefined> {
    const rows = await this.db.all<RecurringRow>('SELECT * FROM recurring_expenses WHERE id = ?', [id]);
    return rows[0] && toRecurring(rows[0]);
  }

  async save(e: RecurringExpense): Promise<void> {
    await this.db.run(
      `INSERT INTO recurring_expenses (id, name, amount, category_id, due_day, active, start_month)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, amount = excluded.amount,
         category_id = excluded.category_id, due_day = excluded.due_day, active = excluded.active,
         start_month = excluded.start_month`,
      [e.id, e.name, e.amount, e.categoryId, e.dueDay, e.active ? 1 : 0, e.startMonth],
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.run('DELETE FROM recurring_expenses WHERE id = ?', [id]);
  }

  async listInstances(month: MonthKey): Promise<RecurringExpenseInstance[]> {
    const rows = await this.db.all<InstanceRow>(
      'SELECT * FROM recurring_instances WHERE month = ? ORDER BY due_date',
      [month],
    );
    return rows.map(toInstance);
  }

  async saveInstance(i: RecurringExpenseInstance): Promise<void> {
    await this.db.run(
      `INSERT INTO recurring_instances
         (recurring_expense_id, month, due_date, amount, status, transaction_id)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(recurring_expense_id, month) DO UPDATE SET due_date = excluded.due_date,
         amount = excluded.amount, status = excluded.status, transaction_id = excluded.transaction_id`,
      [i.recurringExpenseId, i.month, i.dueDate, i.amount, i.status, i.transactionId ?? null],
    );
  }

  async insertInstanceIfMissing(i: RecurringExpenseInstance): Promise<void> {
    await this.db.run(
      `INSERT INTO recurring_instances
         (recurring_expense_id, month, due_date, amount, status, transaction_id)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(recurring_expense_id, month) DO NOTHING`,
      [i.recurringExpenseId, i.month, i.dueDate, i.amount, i.status, i.transactionId ?? null],
    );
  }

  async listInstancesOf(expenseId: string): Promise<RecurringExpenseInstance[]> {
    const rows = await this.db.all<InstanceRow>(
      'SELECT * FROM recurring_instances WHERE recurring_expense_id = ? ORDER BY month',
      [expenseId],
    );
    return rows.map(toInstance);
  }

  async deleteInstance(expenseId: string, month: MonthKey): Promise<void> {
    await this.db.run(
      'DELETE FROM recurring_instances WHERE recurring_expense_id = ? AND month = ?',
      [expenseId, month],
    );
  }

  async findInstanceByTransaction(transactionId: string): Promise<RecurringExpenseInstance | undefined> {
    const rows = await this.db.all<InstanceRow>(
      'SELECT * FROM recurring_instances WHERE transaction_id = ?',
      [transactionId],
    );
    return rows[0] && toInstance(rows[0]);
  }
}

interface GoalRow {
  id: string;
  name: string;
  target_amount: number;
}

interface ContributionRow {
  id: string;
  goal_id: string;
  date: string;
  amount: number;
}

const toGoal = (r: GoalRow): SavingsGoal => ({
  id: r.id,
  name: r.name,
  targetAmount: r.target_amount,
});

const toContribution = (r: ContributionRow): SavingsContribution => ({
  id: r.id,
  goalId: r.goal_id,
  date: r.date,
  amount: r.amount,
});

export class SqliteSavingsRepository implements ISavingsRepository {
  constructor(private readonly db: SqlDatabase) {}

  async listGoals(): Promise<SavingsGoal[]> {
    const rows = await this.db.all<GoalRow>('SELECT * FROM savings_goals ORDER BY name');
    return rows.map(toGoal);
  }

  async getGoal(id: string): Promise<SavingsGoal | undefined> {
    const rows = await this.db.all<GoalRow>('SELECT * FROM savings_goals WHERE id = ?', [id]);
    return rows[0] && toGoal(rows[0]);
  }

  async saveGoal(g: SavingsGoal): Promise<void> {
    await this.db.run(
      `INSERT INTO savings_goals (id, name, target_amount) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, target_amount = excluded.target_amount`,
      [g.id, g.name, g.targetAmount],
    );
  }

  async deleteGoal(id: string): Promise<void> {
    await this.db.run('DELETE FROM savings_goals WHERE id = ?', [id]);
  }

  async listContributions(): Promise<SavingsContribution[]> {
    const rows = await this.db.all<ContributionRow>(
      'SELECT * FROM savings_contributions ORDER BY date, id',
    );
    return rows.map(toContribution);
  }

  async listContributionsByMonth(month: MonthKey): Promise<SavingsContribution[]> {
    const rows = await this.db.all<ContributionRow>(
      'SELECT * FROM savings_contributions WHERE date >= ? AND date <= ? ORDER BY date, id',
      monthRange(month),
    );
    return rows.map(toContribution);
  }

  async saveContribution(c: SavingsContribution): Promise<void> {
    await this.db.run(
      `INSERT INTO savings_contributions (id, goal_id, date, amount) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET goal_id = excluded.goal_id, date = excluded.date,
         amount = excluded.amount`,
      [c.id, c.goalId, c.date, c.amount],
    );
  }

  async deleteContribution(id: string): Promise<void> {
    await this.db.run('DELETE FROM savings_contributions WHERE id = ?', [id]);
  }
}

interface BudgetRow {
  id: string;
  category_id: string;
  month: string;
  limit_amount: number;
}

export class SqliteBudgetRepository implements IBudgetRepository {
  constructor(private readonly db: SqlDatabase) {}

  async listByMonth(month: MonthKey): Promise<Budget[]> {
    const rows = await this.db.all<BudgetRow>('SELECT * FROM budgets WHERE month = ?', [month]);
    return rows.map((r) => ({
      id: r.id,
      categoryId: r.category_id,
      month: r.month,
      limit: r.limit_amount,
    }));
  }

  async save(b: Budget): Promise<void> {
    await this.db.run(
      `INSERT INTO budgets (id, category_id, month, limit_amount) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET category_id = excluded.category_id, month = excluded.month,
         limit_amount = excluded.limit_amount`,
      [b.id, b.categoryId, b.month, b.limit],
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.run('DELETE FROM budgets WHERE id = ?', [id]);
  }
}

export class SqliteSettingsRepository implements ISettingsRepository {
  constructor(private readonly db: SqlDatabase) {}

  async get(key: string): Promise<string | undefined> {
    const rows = await this.db.all<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
    return rows[0]?.value;
  }

  async set(key: string, value: string): Promise<void> {
    await this.db.run(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value],
    );
  }
}
