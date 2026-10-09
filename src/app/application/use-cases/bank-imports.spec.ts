import { InMemoryAccounts, InMemoryBankImports, InMemoryCategories, InMemorySettings, InMemoryTransactions, SequentialIds } from '../testing/in-memory';
import { SaveAccount } from './accounts';
import { AddTransaction } from './add-transaction';
import { ConfirmImport, DiscardImport, IngestBankNotifications, ListPendingImports, merchantPrefix, QIK_PACKAGE, UNRECOGNIZED_KEY } from './bank-imports';

const compra = (monto: string, comercio: string) =>
  `Usaste tu tarjeta de crédito Qik ¡Hola ANA! Tarjeta 53*************8462 Se hizo una transacción de RD$ ${monto} en ${comercio} con tu tarjeta crédito Qik que termina en 53*************8462 Localidad | ${comercio} | Fecha y hora | 10-05-2026 05:13 PM (AST)`;

function setup() {
  const categories = new InMemoryCategories();
  categories.items.set('sup', { id: 'sup', name: 'Supermercado', type: 'variable' });
  const transactions = new InMemoryTransactions();
  const accounts = new InMemoryAccounts(transactions, categories);
  const imports = new InMemoryBankImports();
  const settings = new InMemorySettings();
  const ids = new SequentialIds();
  return {
    categories, transactions, accounts, imports, settings,
    ingest: new IngestBankNotifications(imports, settings, ids),
    list: new ListPendingImports(imports, accounts),
    confirm: new ConfirmImport(imports, new AddTransaction(transactions, categories, ids, accounts)),
    discard: new DiscardImport(imports),
    saveAccount: new SaveAccount(accounts, ids),
  };
}

describe('importar compras de las notificaciones', () => {
  it('guarda la compra una sola vez aunque llegue el correo y la notificación de la app', async () => {
    const s = setup();
    const at = '2026-10-05T21:13:28Z';
    expect(await s.ingest.execute([{ text: compra('129.00', 'LA SIRENA INDEPEND MC'), receivedAt: at }, { text: compra('129.00', 'LA SIRENA INDEPEND MC'), receivedAt: at }])).toEqual({ added: 1, reversed: 0 });
    expect(await s.list.execute()).toHaveLength(1);
  });

  it('asigna la cuenta por los últimos 4 dígitos y sugiere la categoría usada antes con ese comercio', async () => {
    const s = setup();
    const qik = await s.saveAccount.execute({ name: 'Qik', type: 'tarjeta', initialBalance: 0, creditLimit: 5_000_000, cutDay: 5, dueDay: 2, cardLast4: '8462' });
    await s.ingest.execute([{ text: compra('129.00', 'LA SIRENA INDEPEND MC'), receivedAt: '2026-10-05T21:13:28Z' }]);
    const [first] = await s.list.execute();
    expect(first).toMatchObject({ accountId: qik.id, categoryId: null });
    await s.confirm.execute(first.item.id, { categoryId: 'sup', accountId: qik.id, amount: first.item.amount, date: first.item.date, note: 'La Sirena' });
    expect((await s.transactions.listAll()).map((t) => [t.amount, t.accountId, t.categoryId, t.note])).toEqual([[12900, qik.id, 'sup', 'La Sirena']]);

    // La siguiente compra en La Sirena ya trae Supermercado sugerido.
    await s.ingest.execute([{ text: compra('450.00', 'LA SIRENA CHURCHILL'), receivedAt: '2026-10-06T15:00:00Z' }]);
    expect((await s.list.execute())[0]).toMatchObject({ accountId: qik.id, categoryId: 'sup' });
  });

  it('un reverso quita la compra pendiente; descartar no crea movimiento', async () => {
    const s = setup();
    await s.ingest.execute([
      { text: compra('3.19', 'WL *VALVE CORPORATION').replace('RD$ 3.19', 'RD$ 3.19'), receivedAt: '2026-10-02T20:00:00Z' },
      { text: compra('200.06', 'WL *STEAM PURCHASE'), receivedAt: '2026-10-02T21:11:46Z' },
    ]);
    const r = await s.ingest.execute([{ text: 'Ha sido reversada la transacción de RD$ 3.19 en WL *VALVE CORPORATION con tu Tarjeta de Crédito Qik que termina en *8462.', receivedAt: '2026-10-02T22:55:49Z', package: QIK_PACKAGE }]);
    expect(r.reversed).toBe(1);
    const [left] = await s.list.execute();
    expect(left.item.merchant).toBe('WL *STEAM PURCHASE');
    await s.discard.execute(left.item.id);
    expect(await s.list.execute()).toEqual([]);
    expect(await s.transactions.listAll()).toEqual([]);
  });

  it('ignora un reverso que llega por correo: cualquiera puede escribirlo', async () => {
    const s = setup();
    await s.ingest.execute([{ text: compra('3.19', 'WL *VALVE CORPORATION'), receivedAt: '2026-10-02T20:00:00Z' }]);
    const r = await s.ingest.execute([
      { text: 'Ha sido reversada la transacción de RD$ 3.19 en WL *VALVE CORPORATION con tu Tarjeta de Crédito Qik que termina en *8462.', receivedAt: '2026-10-02T22:55:49Z', package: 'com.google.android.gm' },
    ]);
    expect(r.reversed).toBe(0);
    expect((await s.list.execute()).length).toBe(1);
  });

  it('guarda aparte (pocos) los avisos de banco que no pudo leer, para ajustar el lector', async () => {
    const s = setup();
    await s.ingest.execute([
      { text: 'Qik: compraste RD$ 500.00 en Tienda X', receivedAt: '2026-10-08T10:00:00Z' },
      { text: 'Tu pedido de Amazon salió', receivedAt: '2026-10-08T10:00:00Z' },
    ]);
    expect(JSON.parse((await s.settings.get(UNRECOGNIZED_KEY))!)).toEqual(['Qik: compraste RD$ 500.00 en Tienda X']);
  });

  it('los últimos 4 dígitos: 4 números y no repetidos entre cuentas', async () => {
    const s = setup();
    await s.saveAccount.execute({ name: 'Popular', type: 'banco', initialBalance: 0, cardLast4: '1347' });
    await expect(s.saveAccount.execute({ name: 'Otra', type: 'banco', initialBalance: 0, cardLast4: '1347' })).rejects.toThrow('ya usa esos 4 dígitos');
    await expect(s.saveAccount.execute({ name: 'Mala', type: 'banco', initialBalance: 0, cardLast4: '13a7' })).rejects.toThrow('últimos 4 dígitos');
  });

  it('merchantPrefix reconoce el comercio sin números ni sucursal', () => {
    expect(merchantPrefix('LA SIRENA INDEPEND MC')).toBe('LA SIRENA');
    expect(merchantPrefix('CLARO RECAR 8298796363 SANTO DOMINGO DO')).toBe('CLARO RECAR');
  });
});
