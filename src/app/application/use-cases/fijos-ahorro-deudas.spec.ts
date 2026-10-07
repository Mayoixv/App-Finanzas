import { ValidationError } from '../errors';
import {
  InMemoryAccounts,
  InMemoryBudgets,
  InMemoryCategories,
  InMemoryDebts,
  InMemoryRecurring,
  InMemorySavings,
  InMemorySettings,
  InMemoryTransactions,
  SequentialIds,
} from '../testing/in-memory';
import { AddRecurringExpense, AddRecurringExpenses, paymentName } from './add-recurring-expense';
import { AddSavingsContribution } from './add-savings-contribution';
import { AddSavingsGoal } from './add-savings-goal';
import { AddTransaction } from './add-transaction';
import { DeleteDebtPayment, GetDebtsOverview, RegisterDebtPayment, SaveDebt } from './debts';
import { GetBudgetStatuses } from './get-budget-statuses';
import { GetMonthRecurringExpenses } from './get-month-recurring-expenses';
import { GetSavingsOverview } from './get-savings-overview';
import { GetUpcomingRecurring } from './get-upcoming-recurring';
import { Onboarding } from './onboarding';
import { UserProfile } from './user-profile';
import { GetAlerts } from './get-alerts';
import { AdjustAccountBalance, ArchiveAccount, DeleteAccount, GetAccountsOverview, GetCardStatuses, GetNetWorth, SaveAccount, SaveTransfer, SetCardMinimum } from './accounts';
import { UpdateTransaction } from './update-transaction';
import { GetMonthHistory } from './get-month-history';
import { GetReport } from './get-report';
import { GetSubscriptionCost } from './get-subscription-cost';
import { GetDebtInstallments } from './get-debt-installments';
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
      new GetCardStatuses(new InMemoryAccounts(s.transactions, s.categories), new InMemorySettings()),
    );
    expect(await alerts.execute('2026-10-10')).toEqual({
      cardsDue: [],
      cardsHighUse: [],
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
      new GetCardStatuses(new InMemoryAccounts(s.transactions, s.categories), new InMemorySettings()),
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

describe('cuentas y transferencias', () => {
  function accountsSetup() {
    const s = setup();
    const accounts = new InMemoryAccounts(s.transactions, s.categories);
    return {
      ...s,
      accounts,
      save: new SaveAccount(accounts, s.ids),
      add: new AddTransaction(s.transactions, s.categories, s.ids, accounts),
      overview: new GetAccountsOverview(accounts),
    };
  }

  it('el saldo sale del saldo inicial, los movimientos y las transferencias', async () => {
    const s = accountsSetup();
    const banco = await s.save.execute({ name: 'Banco', type: 'banco', initialBalance: 10_000 });
    await s.add.execute({ date: '2026-10-01', amount: 50_000, categoryId: 'sal', accountId: banco.id });
    await s.add.execute({ date: '2026-10-02', amount: 2_000, categoryId: 'com' });
    await new SaveTransfer(s.accounts, s.ids).execute({ date: '2026-10-03', amount: 5_000, fromAccountId: banco.id, toAccountId: 'acc-efectivo' });

    const view = await s.overview.execute();
    const balance = (id: string) => view.accounts.find((a) => a.account.id === id)?.balance;
    expect(balance(banco.id)).toBe(55_000);
    expect(balance('acc-efectivo')).toBe(3_000);
    expect(view.assets).toBe(58_000);
    // Antes de la transferencia, el efectivo estaba en −2,000.
    expect((await s.accounts.balances('2026-10-02')).get('acc-efectivo')).toBe(-2_000);
  });

  it('tarjetas: piden límite y días; la deuda se suma aparte de lo que tienes', async () => {
    const s = accountsSetup();
    await expect(s.save.execute({ name: 'Visa', type: 'tarjeta', initialBalance: 0 })).rejects.toThrow(ValidationError);
    const visa = await s.save.execute({ name: 'Visa', type: 'tarjeta', initialBalance: 0, creditLimit: 100_000, cutDay: 15, dueDay: 5 });
    await s.add.execute({ date: '2026-10-05', amount: 30_000, categoryId: 'com', accountId: visa.id });
    const view = await s.overview.execute();
    expect(view.cardDebt).toBe(30_000);
    expect(view.assets).toBe(0);
    // Un banco no guarda datos de tarjeta aunque lleguen.
    const banco = await s.save.execute({ name: 'Banco', type: 'banco', initialBalance: 0, creditLimit: 5, cutDay: 1, dueDay: 1 });
    expect(banco.creditLimit).toBeNull();
  });

  it('ajustar saldo cambia el inicial sin crear movimientos; borrar solo cuentas vacías', async () => {
    const s = accountsSetup();
    const banco = await s.save.execute({ name: 'Banco', type: 'banco', initialBalance: 0 });
    await s.add.execute({ date: '2026-10-01', amount: 1_000, categoryId: 'com', accountId: banco.id });
    await new AdjustAccountBalance(s.accounts).execute(banco.id, 20_000);
    expect((await s.accounts.balances()).get(banco.id)).toBe(20_000);
    expect(s.transactions.items.size).toBe(1);

    await expect(new DeleteAccount(s.accounts).execute(banco.id)).rejects.toThrow('Archívala');
    await expect(new DeleteAccount(s.accounts).execute('acc-efectivo')).rejects.toThrow(ValidationError);
    await new ArchiveAccount(s.accounts).execute(banco.id, true);
    await expect(s.add.execute({ date: '2026-10-02', amount: 1, categoryId: 'com', accountId: banco.id })).rejects.toThrow('archivada');
    const vacia = await s.save.execute({ name: 'Vieja', type: 'ahorro', initialBalance: 0 });
    await new DeleteAccount(s.accounts).execute(vacia.id);
    expect(await s.accounts.get(vacia.id)).toBeUndefined();
  });

  it('editar un movimiento sin decir la cuenta la conserva; transferencias validan cuentas', async () => {
    const s = accountsSetup();
    const banco = await s.save.execute({ name: 'Banco', type: 'banco', initialBalance: 0 });
    const t = await s.add.execute({ date: '2026-10-01', amount: 1_000, categoryId: 'com', accountId: banco.id });
    const edited = await new UpdateTransaction(s.transactions, s.categories, s.accounts).execute(t.id, { date: '2026-10-01', amount: 2_000, categoryId: 'com' });
    expect(edited.accountId).toBe(banco.id);

    const transfer = new SaveTransfer(s.accounts, s.ids);
    await expect(transfer.execute({ date: '2026-10-01', amount: 1, fromAccountId: banco.id, toAccountId: banco.id })).rejects.toThrow('distintas');
    await expect(transfer.execute({ date: '2026-10-01', amount: 1, fromAccountId: banco.id, toAccountId: 'nope' })).rejects.toThrow();
  });
});

describe('estado de tarjeta', () => {
  it('separa lo que se debía al corte, lo pagado desde entonces y los cargos del ciclo', async () => {
    const s = setup();
    const accounts = new InMemoryAccounts(s.transactions, s.categories);
    const add = new AddTransaction(s.transactions, s.categories, s.ids, accounts);
    const visa = await new SaveAccount(accounts, s.ids).execute({ name: 'Visa', type: 'tarjeta', initialBalance: 0, creditLimit: 100_000, cutDay: 15, dueDay: 5 });
    await add.execute({ date: '2026-09-20', amount: 20_000, categoryId: 'com', accountId: visa.id });
    await add.execute({ date: '2026-10-10', amount: 15_000, categoryId: 'com', accountId: visa.id });
    await add.execute({ date: '2026-10-18', amount: 5_000, categoryId: 'com', accountId: visa.id });
    await new SaveTransfer(accounts, s.ids).execute({ date: '2026-10-20', amount: 10_000, fromAccountId: 'acc-efectivo', toAccountId: visa.id });

    const [card] = await new GetCardStatuses(accounts, new InMemorySettings()).execute('2026-10-25');
    expect(card).toMatchObject({
      lastCut: '2026-10-15',
      dueDate: '2026-11-05',
      daysToDue: 11,
      statementDebt: 35_000,
      paidSinceCut: 10_000,
      pending: 25_000,
      cycleCharges: 5_000,
      currentDebt: 30_000,
      utilization: 30,
    });
  });

  it('las alertas y las notificaciones avisan del pago de la tarjeta y del uso alto', async () => {
    const s = setup();
    const accounts = new InMemoryAccounts(s.transactions, s.categories);
    const visa = await new SaveAccount(accounts, s.ids).execute({ name: 'Visa', type: 'tarjeta', initialBalance: 0, creditLimit: 100_000, cutDay: 15, dueDay: 5 });
    await new AddTransaction(s.transactions, s.categories, s.ids, accounts).execute({ date: '2026-10-10', amount: 40_000, categoryId: 'com', accountId: visa.id });
    const cards = new GetCardStatuses(accounts, new InMemorySettings());
    const recurring = new GetMonthRecurringExpenses(s.recurring);
    const budgets = new GetBudgetStatuses(s.budgets, s.transactions);

    const alerts = await new GetAlerts(new GetUpcomingRecurring(recurring), budgets, s.categories, cards).execute('2026-11-03');
    expect(alerts).toMatchObject({ cardsDue: ['Visa'], cardsHighUse: ['Visa'] });

    const plan = await new GetNotificationPlan(recurring, budgets, s.categories, cards).execute('2026-11-03');
    expect(plan.reminders.filter((r) => r.kind === 'tarjeta').map((r) => `${r.when} ${r.date} ${r.amount}`)).toEqual([
      'antes 2026-11-04 40000',
      'hoy 2026-11-05 40000',
    ]);
  });
});

describe('patrimonio', () => {
  it('cuentas − tarjetas − deudas + lo que te deben', async () => {
    const s = setup();
    const accounts = new InMemoryAccounts(s.transactions, s.categories);
    const save = new SaveAccount(accounts, s.ids);
    await save.execute({ name: 'Banco', type: 'banco', initialBalance: 100_000 });
    await save.execute({ name: 'Visa', type: 'tarjeta', initialBalance: -20_000, creditLimit: 50_000, cutDay: 1, dueDay: 8 });
    const debts = new SaveDebt(s.debts, s.ids);
    await debts.execute({ name: 'Carro', direction: 'debo', principal: 50_000, annualRate: 0, termMonths: null, startDate: '2026-10-01' });
    await debts.execute({ name: 'Juan', direction: 'me_deben', principal: 5_000, annualRate: 0, termMonths: null, startDate: '2026-10-01' });
    const net = await new GetNetWorth(new GetAccountsOverview(accounts), new GetDebtsOverview(s.debts)).execute();
    expect(net).toEqual({ have: 105_000, owe: 70_000, total: 35_000 });
  });
});

describe('reportes', () => {
  it('resume el periodo por mes y por categoría, saldo de cuentas al cierre y proyección del mes', async () => {
    const s = setup();
    s.categories.items.set('oci', { id: 'oci', name: 'Ocio', type: 'variable' });
    const accounts = new InMemoryAccounts(s.transactions, s.categories);
    const tx = new AddTransaction(s.transactions, s.categories, s.ids, accounts);
    await tx.execute({ date: '2026-08-01', amount: 50_000, categoryId: 'sal' });
    await tx.execute({ date: '2026-08-05', amount: 10_000, categoryId: 'com' });
    await tx.execute({ date: '2026-10-01', amount: 50_000, categoryId: 'sal' });
    await tx.execute({ date: '2026-10-03', amount: 4_000, categoryId: 'com' });
    await tx.execute({ date: '2026-10-04', amount: 6_000, categoryId: 'oci' });
    const add = new AddRecurringExpense(s.recurring, s.categories, s.ids);
    await add.execute({ name: 'Renta', amount: 20_000, categoryId: 'ren', dueDay: 28, startMonth: '2026-10' });
    await add.execute({ name: 'Bono', amount: 5_000, categoryId: 'sal', dueDay: 30, startMonth: '2026-10' });

    const report = await new GetReport(s.transactions, s.categories, s.savings, accounts, new GetMonthRecurringExpenses(s.recurring)).execute('2026-10', 3, '2026-10');
    expect(report.months).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(report.summaries.map((m) => m.expenses)).toEqual([10_000, 0, 10_000]);
    expect(report.categories.map((c) => [c.name, c.total, c.byMonth])).toEqual([
      ['Comida', 14_000, [10_000, 0, 4_000]],
      ['Ocio', 6_000, [0, 0, 6_000]],
    ]);
    expect(report.accountsAtClose).toEqual([40_000, 40_000, 80_000]);
    expect(report.projection).toEqual({ current: 40_000, pendingIncome: 5_000, pendingExpenses: 20_000, projected: 25_000 });

    const past = await new GetReport(s.transactions, s.categories, s.savings, accounts, new GetMonthRecurringExpenses(s.recurring)).execute('2026-09', 3, '2026-10');
    expect(past.projection).toBeNull();
  });
});

describe('costo de suscripciones', () => {
  it('pasa cada suscripción a costo mensual y deja fuera las pausadas', async () => {
    const s = setup();
    s.categories.items.set('cat-suscripciones', { id: 'cat-suscripciones', name: 'Suscripciones', type: 'fijo' });
    const add = new AddRecurringExpense(s.recurring, s.categories, s.ids);
    await add.execute({ name: 'Netflix', amount: 600, categoryId: 'cat-suscripciones', dueDay: 1, startMonth: '2026-10' });
    await add.execute({ name: 'iCloud anual', amount: 1_200, categoryId: 'cat-suscripciones', dueDay: 1, startMonth: '2026-10', frequency: 12 });
    const gym = await add.execute({ name: 'Gym', amount: 1_000, categoryId: 'cat-suscripciones', dueDay: 1, startMonth: '2026-10' });
    await add.execute({ name: 'Renta', amount: 9_000, categoryId: 'ren', dueDay: 1, startMonth: '2026-10' });
    await new PauseRecurringExpense(s.recurring).execute(gym.id, '2026-10', 2);

    expect(await new GetSubscriptionCost(s.recurring, s.categories).execute('2026-10')).toEqual({ count: 2, monthly: 700, yearly: 8_400 });
  });
});

describe('cuotas de deudas en Fijos', () => {
  it('muestra la cuota del mes con su número y fecha, y la marca pagada si hubo un pago ese mes', async () => {
    const s = setup();
    const debt = await new SaveDebt(s.debts, s.ids).execute({
      name: 'Carro', direction: 'debo', principal: 1_000_000, annualRate: 12, termMonths: 12, startDate: '2026-08-20',
    });
    await new SaveDebt(s.debts, s.ids).execute({ name: 'Juan', direction: 'me_deben', principal: 500, annualRate: 0, termMonths: 2, startDate: '2026-08-01' });
    const installments = new GetDebtInstallments(new GetDebtsOverview(s.debts));

    expect(await installments.execute('2026-08')).toEqual([]);
    const [oct] = await installments.execute('2026-10');
    expect(oct).toMatchObject({ number: 2, of: 12, dueDate: '2026-10-20', amount: 88_849, paid: false });

    await new RegisterDebtPayment(s.debts, s.transactions, s.categories, s.ids).execute(debt.id, '2026-10-18', 88_849, false);
    expect((await installments.execute('2026-10'))[0].paid).toBe(true);
    expect(await installments.execute('2027-09')).toEqual([]);
  });
});

describe('pago mínimo de tarjeta', () => {
  it('se guarda por estado: al cambiar de corte vuelve a estar vacío', async () => {
    const s = setup();
    const settings = new InMemorySettings();
    const accounts = new InMemoryAccounts(s.transactions, s.categories);
    const visa = await new SaveAccount(accounts, s.ids).execute({ name: 'Visa', type: 'tarjeta', initialBalance: -30_000, creditLimit: 100_000, cutDay: 15, dueDay: 5 });
    const cards = new GetCardStatuses(accounts, settings);
    await new SetCardMinimum(settings).execute(visa.id, '2026-10-15', 1_500);
    expect((await cards.execute('2026-10-20'))[0].minimum).toBe(1_500);
    expect((await cards.execute('2026-11-16'))[0].minimum).toBeNull();
    await expect(new SetCardMinimum(settings).execute(visa.id, '2026-10-15', 0)).rejects.toThrow(ValidationError);
  });
});

describe('nombre del usuario', () => {
  it('se guarda limpio, puede quedar vacío y tiene un largo máximo', async () => {
    const profile = new UserProfile(new InMemorySettings());
    expect(await profile.name()).toBe('');
    expect(await profile.setName('  Ana   Pérez ')).toBe('Ana Pérez');
    expect(await profile.name()).toBe('Ana Pérez');
    await expect(profile.setName('x'.repeat(41))).rejects.toThrow(ValidationError);
  });
});

describe('sueldo con varios cobros', () => {
  it('quincenal: un fijo por cobro con su día y su monto, y ambos aparecen cada mes', async () => {
    const s = setup();
    const base = { categoryId: 'sal', startMonth: '2026-10' };
    await new AddRecurringExpenses(s.recurring, s.categories, s.ids).execute([
      { ...base, name: paymentName('Sueldo', 15), amount: 2_500_000, dueDay: 15 },
      { ...base, name: paymentName('Sueldo', 31), amount: 2_750_000, dueDay: 31 },
    ]);
    const list = new GetMonthRecurringExpenses(s.recurring);
    const feb = await list.execute('2027-02');
    expect(feb.map((i) => `${i.expense.name} ${i.instance.dueDate} ${i.instance.amount}`)).toEqual([
      'Sueldo · día 15 2027-02-15 2500000',
      'Sueldo · fin de mes 2027-02-28 2750000',
    ]);
  });

  it('si un cobro no es válido no guarda ninguno, y no deja dos cobros el mismo día', async () => {
    const s = setup();
    const add = new AddRecurringExpenses(s.recurring, s.categories, s.ids);
    const base = { name: 'Sueldo', categoryId: 'sal', startMonth: '2026-10', amount: 100 };
    await expect(add.execute([{ ...base, dueDay: 15 }, { ...base, dueDay: 15 }])).rejects.toThrow('mismo día');
    await expect(add.execute([{ ...base, dueDay: 15 }, { ...base, dueDay: 30, amount: 0 }])).rejects.toThrow(ValidationError);
    expect(await s.recurring.list()).toEqual([]);
  });
});
