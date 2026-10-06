import { ValidationError } from '../errors';
import {
  InMemoryBudgets,
  InMemoryCategories,
  InMemoryDebts,
  InMemoryRecurring,
  InMemorySavings,
  InMemorySettings,
  InMemoryTransactions,
  SequentialIds,
} from '../testing/in-memory';
import { AddRecurringExpense } from './add-recurring-expense';
import { AddSavingsContribution } from './add-savings-contribution';
import { AddSavingsGoal } from './add-savings-goal';
import { AddTransaction } from './add-transaction';
import { DeleteDebtPayment, GetDebtsOverview, RegisterDebtPayment, SaveDebt } from './debts';
import { GetBudgetStatuses } from './get-budget-statuses';
import { GetMonthRecurringExpenses } from './get-month-recurring-expenses';
import { GetSavingsOverview } from './get-savings-overview';
import { GetUpcomingRecurring } from './get-upcoming-recurring';
import { Onboarding } from './onboarding';
import { GetAlerts } from './get-alerts';
import { GetMonthHistory } from './get-month-history';
import { change } from '../../domain/monthly-summary';
import { GetNotificationPlan } from './get-notification-plan';
import { PauseRecurringExpense, ResumeRecurringExpense } from './pause-recurring-expense';
import { SetBudget } from './set-budget';
import { UpdateRecurringExpense } from './update-recurring-expense';

function setup() {
  const categories = new InMemoryCategories();
  categories.items.set('sal', { id: 'sal', name: 'Salario', type: 'ingreso' });
  categories.items.set('ren', { id: 'ren', name: 'Renta', type: 'fijo' });
  categories.items.set('com', { id: 'com', name: 'Comida', type: 'variable' });
  categories.items.set('cat-pago-deudas', { id: 'cat-pago-deudas', name: 'Pago de deudas', type: 'fijo' });
  return {
    categories,
    recurring: new InMemoryRecurring(),
    transactions: new InMemoryTransactions(),
    savings: new InMemorySavings(),
    budgets: new InMemoryBudgets(),
    debts: new InMemoryDebts(),
    ids: new SequentialIds(),
  };
}

describe('fijos: ingresos, frecuencia y pausa', () => {
  it('acepta sueldo fijo (categoría de ingreso) pero no categorías variables', async () => {
    const s = setup();
    const add = new AddRecurringExpense(s.recurring, s.categories, s.ids);
    await expect(add.execute({ name: 'Sueldo', amount: 6_000_000, categoryId: 'sal', dueDay: 30, startMonth: '2026-10' })).resolves.toBeTruthy();
    await expect(add.execute({ name: 'Súper', amount: 100, categoryId: 'com', dueDay: 1, startMonth: '2026-10' })).rejects.toThrow(ValidationError);
  });

  it('un fijo anual solo aparece en su mes; uno trimestral cada 3 meses', async () => {
    const s = setup();
    const add = new AddRecurringExpense(s.recurring, s.categories, s.ids);
    await add.execute({ name: 'Seguro', amount: 1000, categoryId: 'ren', dueDay: 10, startMonth: '2026-10', frequency: 12 });
    await add.execute({ name: 'Mantenimiento', amount: 500, categoryId: 'ren', dueDay: 5, startMonth: '2026-10', frequency: 3 });
    const list = new GetMonthRecurringExpenses(s.recurring);
    const names = async (m: string) => (await list.execute(m)).map((i) => i.expense.name).sort();
    expect(await names('2026-10')).toEqual(['Mantenimiento', 'Seguro']);
    expect(await names('2026-11')).toEqual([]);
    expect(await names('2027-01')).toEqual(['Mantenimiento']);
    expect(await names('2027-10')).toEqual(['Mantenimiento', 'Seguro']);
    await expect(add.execute({ name: 'X', amount: 1, categoryId: 'ren', dueDay: 1, startMonth: '2026-10', frequency: 2 as never })).rejects.toThrow(ValidationError);
  });

  it('cambiar a anual quita los pendientes de meses que ya no tocan', async () => {
    const s = setup();
    const e = await new AddRecurringExpense(s.recurring, s.categories, s.ids).execute({ name: 'Gym', amount: 900, categoryId: 'ren', dueDay: 3, startMonth: '2026-10' });
    const list = new GetMonthRecurringExpenses(s.recurring);
    await list.execute('2026-10');
    await list.execute('2026-11');
    await new UpdateRecurringExpense(s.recurring, s.categories).execute(e.id, { name: 'Gym', amount: 900, categoryId: 'ren', dueDay: 3, frequency: 12 }, '2026-10');
    expect((await s.recurring.listInstancesOf(e.id)).map((i) => i.month)).toEqual(['2026-10']);
  });

  it('pausar quita lo pendiente de esos meses, lista la pausa y reanudar lo vuelve a generar', async () => {
    const s = setup();
    const e = await new AddRecurringExpense(s.recurring, s.categories, s.ids).execute({ name: 'Netflix', amount: 560, categoryId: 'ren', dueDay: 1, startMonth: '2026-10' });
    const list = new GetMonthRecurringExpenses(s.recurring);
    await list.execute('2026-11');
    expect(await new PauseRecurringExpense(s.recurring).execute(e.id, '2026-11', 2)).toBe('2026-12');
    expect(await list.execute('2026-11')).toEqual([]);
    expect(await list.execute('2026-12')).toEqual([]);
    expect(await list.execute('2027-01')).toHaveLength(1);
    expect((await list.pausedIn('2026-12')).map((x) => x.name)).toEqual(['Netflix']);
    await new ResumeRecurringExpense(s.recurring).execute(e.id);
    expect(await list.execute('2026-12')).toHaveLength(1);
  });

  it('próximos 7 días: incluye vencidos del mes y cruza al mes siguiente', async () => {
    const s = setup();
    const add = new AddRecurringExpense(s.recurring, s.categories, s.ids);
    await add.execute({ name: 'Luz', amount: 100, categoryId: 'ren', dueDay: 2, startMonth: '2026-10' });
    await add.execute({ name: 'Agua', amount: 100, categoryId: 'ren', dueDay: 28, startMonth: '2026-10' });
    await add.execute({ name: 'Renta', amount: 100, categoryId: 'ren', dueDay: 1, startMonth: '2026-10' });
    await add.execute({ name: 'Lejos', amount: 100, categoryId: 'ren', dueDay: 20, startMonth: '2026-10' });
    const upcoming = new GetUpcomingRecurring(new GetMonthRecurringExpenses(s.recurring));
    const items = await upcoming.execute('2026-10-27');
    expect(items.map((i) => `${i.expense.name} ${i.instance.dueDate}`)).toEqual([
      'Renta 2026-10-01', 'Luz 2026-10-02', 'Lejos 2026-10-20', 'Agua 2026-10-28', 'Renta 2026-11-01', 'Luz 2026-11-02',
    ]);
  });
});

describe('ahorro: retiros, fecha objetivo y proyección', () => {
  it('un retiro resta de la meta y del ahorrado del mes, y no puede pasar de lo ahorrado', async () => {
    const s = setup();
    const g = await new AddSavingsGoal(s.savings, s.ids).execute({ name: 'Fondo', targetAmount: 10_000 });
    const add = new AddSavingsContribution(s.savings, s.ids);
    await add.execute({ goalId: g.id, date: '2026-10-01', amount: 3_000 });
    await expect(add.execute({ goalId: g.id, date: '2026-10-05', amount: 5_000, withdrawal: true })).rejects.toThrow(ValidationError);
    await add.execute({ goalId: g.id, date: '2026-10-05', amount: 1_000, withdrawal: true });
    const o = await new GetSavingsOverview(s.savings).execute('2026-10');
    expect(o.goals[0].saved).toBe(2_000);
    expect(o.savedThisMonth).toBe(2_000);
  });

  it('proyecta con el promedio de 3 meses y calcula cuánto aportar para la fecha objetivo', async () => {
    const s = setup();
    const g = await new AddSavingsGoal(s.savings, s.ids).execute({ name: 'Viaje', targetAmount: 12_000, targetDate: '2027-03-15' });
    const add = new AddSavingsContribution(s.savings, s.ids);
    for (const m of ['08', '09', '10']) await add.execute({ goalId: g.id, date: `2026-${m}-01`, amount: 1_000 });
    const [goal] = (await new GetSavingsOverview(s.savings).execute('2026-10')).goals;
    expect(goal.monthlyAverage).toBe(1_000);
    // Faltan 9,000 a 1,000/mes: 9 meses contando octubre, llega en junio de 2027.
    expect(goal.projectedMonth).toBe('2027-06');
    // De octubre a marzo son 6 meses: 9,000 / 6 = 1,500 por mes.
    expect(goal.neededPerMonth).toBe(1_500);
    expect(goal.targetPassed).toBe(false);
    await expect(new AddSavingsGoal(s.savings, s.ids).execute({ name: 'X', targetAmount: 1, targetDate: '2026-02-30' })).rejects.toThrow(ValidationError);
  });
});

describe('presupuestos con rollover', () => {
  it('lo que sobra pasa al mes siguiente y se encadena; sin rollover no arrastra', async () => {
    const s = setup();
    const set = new SetBudget(s.budgets, s.categories, s.ids);
    const add = new AddTransaction(s.transactions, s.categories, s.ids);
    await set.execute({ categoryId: 'com', month: '2026-08', limit: 1_000, rollover: true });
    await set.execute({ categoryId: 'com', month: '2026-09', limit: 1_000, rollover: true });
    await set.execute({ categoryId: 'com', month: '2026-10', limit: 1_000, rollover: true });
    await add.execute({ date: '2026-08-10', amount: 800, categoryId: 'com' });
    await add.execute({ date: '2026-09-10', amount: 1_500, categoryId: 'com' });
    // Agosto sobran 200; septiembre 1,000 + 200 − 1,500 = −300; octubre arranca con 700.
    const [oct] = await new GetBudgetStatuses(s.budgets, s.transactions).execute('2026-10');
    expect(oct.status).toMatchObject({ carry: -300, limit: 700, remaining: 700 });

    await set.execute({ categoryId: 'com', month: '2026-10', limit: 1_000, rollover: false });
    const [plain] = await new GetBudgetStatuses(s.budgets, s.transactions).execute('2026-10');
    expect(plain.status).toMatchObject({ carry: 0, limit: 1_000 });
  });
});

describe('deudas', () => {
  it('registra pagos repartidos entre interés y capital, y opcionalmente como gasto del mes', async () => {
    const s = setup();
    const debt = await new SaveDebt(s.debts, s.ids).execute({
      name: 'Préstamo carro', direction: 'debo', principal: 1_000_000, annualRate: 12, termMonths: 12, startDate: '2026-10-01',
    });
    const pay = new RegisterDebtPayment(s.debts, s.transactions, s.categories, s.ids);
    const p1 = await pay.execute(debt.id, '2026-10-15', 88_849, true);
    expect(p1).toMatchObject({ interest: 10_000, principal: 78_849 });
    expect((await s.transactions.get(p1.transactionId!))).toMatchObject({ amount: 88_849, categoryId: 'cat-pago-deudas', note: 'Préstamo carro' });

    const [view] = await new GetDebtsOverview(s.debts).execute();
    expect(view).toMatchObject({ balance: 921_151, installment: 88_849, paidInterest: 10_000 });

    await expect(pay.execute(debt.id, '2026-11-15', 5_000_000, false)).rejects.toThrow('mayor que lo que queda');
    s.categories.items.delete('cat-pago-deudas');
    await expect(pay.execute(debt.id, '2026-11-15', 100, true)).rejects.toThrow('Pago de deudas');
    await new DeleteDebtPayment(s.debts, s.transactions).execute(p1);
    expect(await s.transactions.get(p1.transactionId!)).toBeUndefined();
    expect((await new GetDebtsOverview(s.debts).execute())[0].balance).toBe(1_000_000);
  });

  it('valida los datos de la deuda', async () => {
    const s = setup();
    const save = new SaveDebt(s.debts, s.ids);
    const ok = { name: 'Juan', direction: 'me_deben' as const, principal: 500, annualRate: 0, termMonths: null, startDate: '2026-10-01' };
    await expect(save.execute(ok)).resolves.toBeTruthy();
    await expect(save.execute({ ...ok, name: ' ' })).rejects.toThrow(ValidationError);
    await expect(save.execute({ ...ok, annualRate: 300 })).rejects.toThrow(ValidationError);
    await expect(save.execute({ ...ok, termMonths: 0 })).rejects.toThrow(ValidationError);
  });
});

describe('bienvenida', () => {
  it('se pide una vez si no hay datos y nunca si ya los hay', async () => {
    const s = setup();
    const fresh = new Onboarding(new InMemorySettings(), s.transactions, s.recurring);
    expect(await fresh.needed()).toBe(true);
    await fresh.finish();
    expect(await fresh.needed()).toBe(false);

    await new AddTransaction(s.transactions, s.categories, s.ids).execute({ date: '2026-10-01', amount: 100, categoryId: 'com' });
    expect(await new Onboarding(new InMemorySettings(), s.transactions, s.recurring).needed()).toBe(false);
  });
});

describe('alertas de Inicio', () => {
  it('junta fijos vencidos y por vencer (sin ingresos) y presupuestos en aviso o pasados', async () => {
    const s = setup();
    s.categories.items.set('oci', { id: 'oci', name: 'Ocio', type: 'variable' });
    const add = new AddRecurringExpense(s.recurring, s.categories, s.ids);
    await add.execute({ name: 'Luz', amount: 100, categoryId: 'ren', dueDay: 2, startMonth: '2026-10' });
    await add.execute({ name: 'Internet', amount: 100, categoryId: 'ren', dueDay: 12, startMonth: '2026-10' });
    await add.execute({ name: 'Gym', amount: 100, categoryId: 'ren', dueDay: 20, startMonth: '2026-10' });
    await add.execute({ name: 'Sueldo', amount: 100, categoryId: 'sal', dueDay: 11, startMonth: '2026-10' });
    const set = new SetBudget(s.budgets, s.categories, s.ids);
    const tx = new AddTransaction(s.transactions, s.categories, s.ids);
    await set.execute({ categoryId: 'com', month: '2026-10', limit: 1_000 });
    await set.execute({ categoryId: 'oci', month: '2026-10', limit: 1_000 });
    await tx.execute({ date: '2026-10-05', amount: 1_200, categoryId: 'com' });
    await tx.execute({ date: '2026-10-05', amount: 900, categoryId: 'oci' });

    const recurring = new GetMonthRecurringExpenses(s.recurring);
    const alerts = new GetAlerts(
      new GetUpcomingRecurring(recurring),
      new GetBudgetStatuses(s.budgets, s.transactions),
      s.categories,
    );
    expect(await alerts.execute('2026-10-10')).toEqual({
      overdue: ['Luz'],
      dueSoon: ['Internet'],
      exceeded: ['Comida'],
      nearLimit: ['Ocio'],
    });
  });
});

describe('plan de notificaciones', () => {
  it('recuerda el día antes y el día del vencimiento desde hoy, cruza de mes y avisa presupuestos', async () => {
    const s = setup();
    const add = new AddRecurringExpense(s.recurring, s.categories, s.ids);
    await add.execute({ name: 'Luz', amount: 100, categoryId: 'ren', dueDay: 30, startMonth: '2026-10' });
    await add.execute({ name: 'Renta', amount: 500, categoryId: 'ren', dueDay: 1, startMonth: '2026-10' });
    await add.execute({ name: 'Sueldo', amount: 900, categoryId: 'sal', dueDay: 30, startMonth: '2026-10' });
    await new SetBudget(s.budgets, s.categories, s.ids).execute({ categoryId: 'com', month: '2026-10', limit: 1_000 });
    await new AddTransaction(s.transactions, s.categories, s.ids).execute({ date: '2026-10-02', amount: 1_100, categoryId: 'com' });

    const plan = await new GetNotificationPlan(
      new GetMonthRecurringExpenses(s.recurring),
      new GetBudgetStatuses(s.budgets, s.transactions),
      s.categories,
    ).execute('2026-10-29');

    // Renta de octubre ya pasó; la de noviembre se avisa el 31 y el 1. Sin recordatorios del sueldo.
    expect(plan.reminders.map((r) => `${r.name} ${r.when} ${r.date}`)).toEqual([
      'Luz antes 2026-10-29',
      'Luz hoy 2026-10-30',
      'Renta antes 2026-10-31',
      'Renta hoy 2026-11-01',
      'Luz antes 2026-11-29',
      'Luz hoy 2026-11-30',
    ]);
    expect(plan.budgets).toEqual([
      { key: 'presupuesto:com:2026-10:exceeded', name: 'Comida', level: 'exceeded', spent: 1_100, limit: 1_000 },
    ]);
  });
});

describe('comparación mes a mes', () => {
  it('resume los últimos meses del más reciente al más antiguo y compara con el anterior', async () => {
    const s = setup();
    const tx = new AddTransaction(s.transactions, s.categories, s.ids);
    await tx.execute({ date: '2026-09-01', amount: 50_000, categoryId: 'sal' });
    await tx.execute({ date: '2026-09-10', amount: 10_000, categoryId: 'com' });
    await tx.execute({ date: '2026-10-01', amount: 50_000, categoryId: 'sal' });
    await tx.execute({ date: '2026-10-10', amount: 12_000, categoryId: 'com' });
    const history = await new GetMonthHistory(s.transactions, s.categories, s.savings).execute('2026-10', 3);
    expect(history.map((h) => [h.month, h.expenses])).toEqual([['2026-10', 12_000], ['2026-09', 10_000], ['2026-08', 0]]);
    expect(change(history[0].expenses, history[1].expenses)).toEqual({ diff: 2_000, percent: 20 });
    expect(change(5, 0)).toEqual({ diff: 5, percent: null });
  });
});
