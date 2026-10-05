import { NotFoundError, ValidationError } from '../errors';
import {
  InMemoryBudgets,
  InMemoryCategories,
  InMemoryRecurring,
  InMemorySavings,
  InMemoryTransactions,
  SequentialIds,
} from '../testing/in-memory';
import { AddRecurringExpense } from './add-recurring-expense';
import { DeleteTransaction } from './delete-transaction';
import { RemoveRecurringExpense } from './remove-recurring-expense';
import { UpdateRecurringExpense } from './update-recurring-expense';
import { UpdateTransaction } from './update-transaction';
import { AddSavingsContribution } from './add-savings-contribution';
import { AddTransaction } from './add-transaction';
import { GetBudgetStatuses } from './get-budget-statuses';
import { GetMonthOverview } from './get-month-overview';
import { GetMonthRecurringExpenses } from './get-month-recurring-expenses';
import { PayRecurringExpense } from './pay-recurring-expense';

function setup() {
  const categories = new InMemoryCategories();
  const transactions = new InMemoryTransactions();
  const recurring = new InMemoryRecurring();
  const savings = new InMemorySavings();
  const budgets = new InMemoryBudgets();
  const ids = new SequentialIds();
  categories.items.set('sal', { id: 'sal', name: 'Salario', type: 'ingreso' });
  categories.items.set('ren', { id: 'ren', name: 'Renta', type: 'fijo' });
  categories.items.set('com', { id: 'com', name: 'Comida', type: 'variable' });
  return { categories, transactions, recurring, savings, budgets, ids };
}

describe('AddTransaction', () => {
  it('guarda la transacción', async () => {
    const s = setup();
    const t = await new AddTransaction(s.transactions, s.categories, s.ids).execute({
      date: '2026-10-02',
      amount: 500,
      categoryId: 'com',
      note: '  almuerzo ',
    });
    expect(t.note).toBe('almuerzo');
    expect(await s.transactions.get(t.id)).toEqual(t);
  });

  it('rechaza monto no positivo y categoría inexistente', async () => {
    const s = setup();
    const uc = new AddTransaction(s.transactions, s.categories, s.ids);
    await expect(uc.execute({ date: '2026-10-02', amount: 0, categoryId: 'com' })).rejects.toThrow(
      ValidationError,
    );
    await expect(uc.execute({ date: '2026-10-02', amount: 5, categoryId: 'x' })).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe('GetMonthOverview con ahorro', () => {
  it('combina transacciones y aportes del mes', async () => {
    const s = setup();
    const add = new AddTransaction(s.transactions, s.categories, s.ids);
    await add.execute({ date: '2026-10-01', amount: 1000, categoryId: 'sal' });
    await add.execute({ date: '2026-10-03', amount: 300, categoryId: 'com' });
    s.savings.goals.set('g', { id: 'g', name: 'Viaje', targetAmount: 5000 });
    await new AddSavingsContribution(s.savings, s.ids).execute({
      goalId: 'g',
      date: '2026-10-04',
      amount: 200,
    });
    const { summary } = await new GetMonthOverview(s.transactions, s.categories, s.savings).execute(
      '2026-10',
    );
    expect(summary.balance).toBe(500);
    expect(summary.savingsPercent).toBe(20);
  });
});

describe('gastos fijos', () => {
  const rent = { id: 'r1', name: 'Renta', amount: 800, categoryId: 'ren', dueDay: 5, active: true, startMonth: '2026-01' };

  it('genera instancias pendientes una sola vez por mes', async () => {
    const s = setup();
    s.recurring.items.set(rent.id, rent);
    const uc = new GetMonthRecurringExpenses(s.recurring);
    await uc.execute('2026-10');
    const again = await uc.execute('2026-10');
    expect(again).toHaveLength(1);
    expect(again[0].instance.status).toBe('pendiente');
    expect(s.recurring.instances).toHaveLength(1);
  });

  it('pagar crea la transacción y marca la instancia como pagada', async () => {
    const s = setup();
    s.recurring.items.set(rent.id, rent);
    await new GetMonthRecurringExpenses(s.recurring).execute('2026-10');
    const pay = new PayRecurringExpense(s.recurring, s.transactions, s.ids);
    const paid = await pay.execute({
      recurringExpenseId: 'r1',
      month: '2026-10',
      paidDate: '2026-10-05',
    });
    expect(paid.status).toBe('pagado');
    expect((await s.transactions.listByMonth('2026-10'))[0].amount).toBe(800);
    await expect(
      pay.execute({ recurringExpenseId: 'r1', month: '2026-10', paidDate: '2026-10-06' }),
    ).rejects.toThrow(ValidationError);
  });
});

describe('GetBudgetStatuses', () => {
  it('calcula lo gastado por categoría y detecta excesos', async () => {
    const s = setup();
    s.budgets.items.set('b1', { id: 'b1', categoryId: 'com', month: '2026-10', limit: 400 });
    const add = new AddTransaction(s.transactions, s.categories, s.ids);
    await add.execute({ date: '2026-10-02', amount: 300, categoryId: 'com' });
    await add.execute({ date: '2026-10-09', amount: 200, categoryId: 'com' });
    const [result] = await new GetBudgetStatuses(s.budgets, s.transactions).execute('2026-10');
    expect(result.status).toEqual({ spent: 500, remaining: -100, exceeded: true });
  });
});

describe('GetMonthOverview', () => {
  it('devuelve resumen, desglose de gastos y los movimientos más recientes', async () => {
    const s = setup();
    const add = new AddTransaction(s.transactions, s.categories, s.ids);
    await add.execute({ date: '2026-10-01', amount: 1000, categoryId: 'sal' });
    await add.execute({ date: '2026-10-03', amount: 300, categoryId: 'com' });
    await add.execute({ date: '2026-10-09', amount: 100, categoryId: 'ren' });
    const overview = await new GetMonthOverview(s.transactions, s.categories, s.savings).execute(
      '2026-10',
      2,
    );
    expect(overview.summary.balance).toBe(600);
    expect(overview.breakdown.map((b) => b.name)).toEqual(['Comida', 'Renta']);
    expect(overview.recent.map((r) => r.transaction.date)).toEqual(['2026-10-09', '2026-10-03']);
    expect(overview.recent[0].category?.name).toBe('Renta');
  });
});

describe('AddRecurringExpense', () => {
  const valid = { name: ' Internet ', amount: 1500, categoryId: 'ren', dueDay: 12, startMonth: '2026-10' };

  it('guarda la plantilla activa con el nombre recortado', async () => {
    const s = setup();
    const e = await new AddRecurringExpense(s.recurring, s.categories, s.ids).execute(valid);
    expect(e).toMatchObject({ name: 'Internet', active: true, startMonth: '2026-10' });
    expect(await s.recurring.get(e.id)).toEqual(e);
  });

  it('rechaza datos inválidos y categorías que no son de gasto fijo', async () => {
    const s = setup();
    const uc = new AddRecurringExpense(s.recurring, s.categories, s.ids);
    await expect(uc.execute({ ...valid, name: '  ' })).rejects.toThrow(ValidationError);
    await expect(uc.execute({ ...valid, amount: 0 })).rejects.toThrow(ValidationError);
    await expect(uc.execute({ ...valid, dueDay: 32 })).rejects.toThrow(ValidationError);
    await expect(uc.execute({ ...valid, dueDay: 1.5 })).rejects.toThrow(ValidationError);
    await expect(uc.execute({ ...valid, categoryId: 'com' })).rejects.toThrow(ValidationError);
    await expect(uc.execute({ ...valid, categoryId: 'x' })).rejects.toThrow(NotFoundError);
  });

  it('no genera instancias en meses anteriores a su inicio', async () => {
    const s = setup();
    await new AddRecurringExpense(s.recurring, s.categories, s.ids).execute(valid);
    const list = new GetMonthRecurringExpenses(s.recurring);
    expect(await list.execute('2026-09')).toEqual([]);
    expect(await list.execute('2026-10')).toHaveLength(1);
    expect(await list.execute('2026-11')).toHaveLength(1);
  });
});

describe('robustez', () => {
  const rent = { id: 'r1', name: 'Renta', amount: 800, categoryId: 'ren', dueDay: 5, active: true, startMonth: '2026-01' };

  it('una lectura tardía no pisa una instancia que ya se pagó', async () => {
    const s = setup();
    s.recurring.items.set(rent.id, rent);
    const list = new GetMonthRecurringExpenses(s.recurring);
    const realList = s.recurring.listInstances.bind(s.recurring);
    // Simula una lectura que vio "no hay instancia" antes de que otra la creara y la pagara.
    let first = true;
    s.recurring.listInstances = async (m) => {
      if (first) {
        first = false;
        await list.execute(m);
        await new PayRecurringExpense(s.recurring, s.transactions, s.ids).execute({
          recurringExpenseId: 'r1',
          month: m,
          paidDate: '2026-10-05',
        });
        return [];
      }
      return realList(m);
    };
    const result = await list.execute('2026-10');
    expect(result[0].instance.status).toBe('pagado');
  });

  it('si falla marcar la instancia, borra la transacción creada', async () => {
    const s = setup();
    s.recurring.items.set(rent.id, rent);
    await new GetMonthRecurringExpenses(s.recurring).execute('2026-10');
    let calls = 0;
    const realSave = s.recurring.saveInstance.bind(s.recurring);
    s.recurring.saveInstance = async (i) => {
      if (++calls === 1) throw new Error('disco lleno');
      return realSave(i);
    };
    const pay = new PayRecurringExpense(s.recurring, s.transactions, s.ids);
    const input = { recurringExpenseId: 'r1', month: '2026-10', paidDate: '2026-10-05' };
    await expect(pay.execute(input)).rejects.toThrow('disco lleno');
    expect(await s.transactions.listByMonth('2026-10')).toEqual([]);
    await pay.execute(input);
    expect(await s.transactions.listByMonth('2026-10')).toHaveLength(1);
  });

  it('AddTransaction rechaza fechas que no existen', async () => {
    const s = setup();
    const add = new AddTransaction(s.transactions, s.categories, s.ids);
    for (const date of ['2026-02-30', '2026-13-01', '2026-10-00', '']) {
      await expect(add.execute({ date, amount: 5, categoryId: 'com' })).rejects.toThrow(ValidationError);
    }
    await expect(add.execute({ date: '2028-02-29', amount: 5, categoryId: 'com' })).resolves.toBeTruthy();
  });
});

describe('editar y eliminar movimientos', () => {
  it('UpdateTransaction cambia los datos y valida igual que al crear', async () => {
    const s = setup();
    const t = await new AddTransaction(s.transactions, s.categories, s.ids).execute({
      date: '2026-10-02',
      amount: 500,
      categoryId: 'com',
    });
    const update = new UpdateTransaction(s.transactions, s.categories);
    await update.execute(t.id, { date: '2026-10-03', amount: 650, categoryId: 'com', note: ' cena ' });
    expect(await s.transactions.get(t.id)).toEqual({
      id: t.id,
      date: '2026-10-03',
      amount: 650,
      categoryId: 'com',
      note: 'cena',
    });
    await expect(update.execute(t.id, { date: '2026-10-03', amount: 0, categoryId: 'com' })).rejects.toThrow(ValidationError);
    await expect(update.execute('nope', { date: '2026-10-03', amount: 5, categoryId: 'com' })).rejects.toThrow(NotFoundError);
  });

  it('DeleteTransaction de un pago de gasto fijo lo devuelve a pendiente', async () => {
    const s = setup();
    s.recurring.items.set('r1', { id: 'r1', name: 'Renta', amount: 800, categoryId: 'ren', dueDay: 5, active: true, startMonth: '2026-01' });
    await new GetMonthRecurringExpenses(s.recurring).execute('2026-10');
    const paid = await new PayRecurringExpense(s.recurring, s.transactions, s.ids).execute({
      recurringExpenseId: 'r1',
      month: '2026-10',
      paidDate: '2026-10-05',
    });
    await new DeleteTransaction(s.transactions, s.recurring).execute(paid.transactionId!);
    expect(await s.transactions.listByMonth('2026-10')).toEqual([]);
    const [instance] = await s.recurring.listInstances('2026-10');
    expect(instance.status).toBe('pendiente');
    expect(instance.transactionId).toBeUndefined();
  });
});

describe('editar y quitar gastos fijos', () => {
  async function withHistory() {
    const s = setup();
    const add = new AddRecurringExpense(s.recurring, s.categories, s.ids);
    const e = await add.execute({ name: 'Internet', amount: 1500, categoryId: 'ren', dueDay: 12, startMonth: '2026-09' });
    const list = new GetMonthRecurringExpenses(s.recurring);
    await list.execute('2026-09');
    await list.execute('2026-10');
    await list.execute('2026-11');
    await new PayRecurringExpense(s.recurring, s.transactions, s.ids).execute({
      recurringExpenseId: e.id,
      month: '2026-09',
      paidDate: '2026-09-12',
    });
    return { s, e };
  }

  it('UpdateRecurringExpense ajusta lo pendiente desde el mes indicado y respeta lo pagado', async () => {
    const { s, e } = await withHistory();
    await new UpdateRecurringExpense(s.recurring, s.categories).execute(
      e.id,
      { name: 'Internet fibra', amount: 1800, categoryId: 'ren', dueDay: 31 },
      '2026-10',
    );
    const byMonth = Object.fromEntries((await s.recurring.listInstancesOf(e.id)).map((i) => [i.month, i]));
    expect(byMonth['2026-09']).toMatchObject({ amount: 1500, status: 'pagado', dueDate: '2026-09-12' });
    expect(byMonth['2026-10']).toMatchObject({ amount: 1800, dueDate: '2026-10-31' });
    expect(byMonth['2026-11']).toMatchObject({ amount: 1800, dueDate: '2026-11-30' });
    expect((await s.recurring.get(e.id))?.name).toBe('Internet fibra');
  });

  it('RemoveRecurringExpense conserva el historial pagado y deja de generar meses', async () => {
    const { s, e } = await withHistory();
    expect(await new RemoveRecurringExpense(s.recurring).execute(e.id, '2026-10')).toBe('ended');
    expect((await s.recurring.listInstancesOf(e.id)).map((i) => i.month)).toEqual(['2026-09']);
    expect((await s.recurring.get(e.id))?.active).toBe(false);
    expect(await new GetMonthRecurringExpenses(s.recurring).execute('2026-12')).toEqual([]);
    expect(await s.transactions.listByMonth('2026-09')).toHaveLength(1);
  });

  it('RemoveRecurringExpense sin historial borra la plantilla', async () => {
    const s = setup();
    const e = await new AddRecurringExpense(s.recurring, s.categories, s.ids).execute({
      name: 'Gym', amount: 900, categoryId: 'ren', dueDay: 3, startMonth: '2026-10',
    });
    await new GetMonthRecurringExpenses(s.recurring).execute('2026-10');
    expect(await new RemoveRecurringExpense(s.recurring).execute(e.id, '2026-10')).toBe('deleted');
    expect(await s.recurring.get(e.id)).toBeUndefined();
  });
});
