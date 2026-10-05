import { createInstance, markPaid, RecurringExpense } from './recurring-expense';

const rent: RecurringExpense = {
  id: 'r1',
  name: 'Renta',
  amount: 15000,
  categoryId: 'ren',
  dueDay: 31,
  active: true,
  startMonth: '2026-01',
};

describe('createInstance', () => {
  it('nace pendiente y ajusta el día al último del mes', () => {
    const i = createInstance(rent, '2026-02');
    expect(i.status).toBe('pendiente');
    expect(i.dueDate).toBe('2026-02-28');
  });

  it('markPaid cambia el estado y enlaza la transacción', () => {
    const paid = markPaid(createInstance(rent, '2026-10'), 't1');
    expect(paid.status).toBe('pagado');
    expect(paid.transactionId).toBe('t1');
  });
});
