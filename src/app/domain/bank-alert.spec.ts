import { bankAlertKey, parseBankAlert } from './bank-alert';

// Textos reales de los avisos (el nombre del titular cambiado). Así llegan en la notificación de Gmail:
// asunto y el principio del correo, o el correo completo cuando la notificación se expande.
const QIK_COMPRA = `Usaste tu tarjeta de crédito Qik
¡Hola ANA PEREZ! Tarjeta 53*************8462 Se hizo una transacción de RD$ 62.56 en GOOGLE *Clash of Clans con tu tarjeta crédito Qik que termina en 53*************8462 Localidad | GOOGLE *Clash of Clans |
| Fecha y hora | 10-07-2026 10:34 AM (AST) |
| Monto | RD$ 62.56 |
| Balance Disponible | RD$ 660.29 |`;

const QIK_REVERSO = `Se reversó una transacción en tu tarjeta de crédito Qik
¡Hola, ANA! Tarjeta Crédito 53*************8462 Ha sido reversada la transacción de *$ 3.19* en *WL *VALVE CORPORATION* con tu Tarjeta de Crédito Qik que termina en **8462.* Los fondos ya están disponibles en tu tarjeta.
| Estatus | Reversada |
| Fecha y hora | 10-02-2026 06:55 PM (AST) |`;

const BANRESERVAS = `Notificaciones Banreservas
Notificación de Consumo Su tarjeta ESTANDAR ••9515 presenta un consumo. Monto: DOP 100.00 Estado: APROBADO Comercio: CLARO RECAR 8298796363 SANTO DOMINGO DO Fecha de transacción: 25/09/2026 15:12 PM Número de aprobación: 554897`;

const POPULAR = `Notificación de Consumo
Estimado (a) Gracias por utilizar su Tarjeta Visa Débito Clásica, terminada en 1347. A continuación detalle de la transacción:
Monto 	Moneda 	Fecha 	Comercio 	Estatus
RD$100.00	 Peso dominicano	 14/09/2026 	CLARO RECAR
8298796363 	Aprobada
En caso de requerir mayor información, puede comunicarse con nosotros llamando al 809-544-5555.`;

describe('parseBankAlert', () => {
  const today = '2026-10-08';

  it('Qik: compra con monto, comercio, fecha (mes-día-año) y tarjeta', () => {
    expect(parseBankAlert(QIK_COMPRA, today)).toEqual({
      bank: 'qik', kind: 'compra', currency: 'DOP', amount: 6256, merchant: 'GOOGLE *Clash of Clans', last4: '8462', date: '2026-10-07',
    });
  });

  it('Qik: reverso en dólares', () => {
    expect(parseBankAlert(QIK_REVERSO, today)).toEqual({
      bank: 'qik', kind: 'reverso', currency: 'USD', amount: 319, merchant: 'WL *VALVE CORPORATION', last4: '8462', date: '2026-10-02',
    });
  });

  it('Qik: si la notificación no trae la fecha, usa el día en que llegó', () => {
    const corta = 'Usaste tu tarjeta de crédito Qik ¡Hola ANA! Tarjeta 53*************8462 Se hizo una transacción de RD$ 1,880.79 en STEAMGAMES.COM 4259522 con tu tarjeta crédito Qik que termina en 53*************8462';
    expect(parseBankAlert(corta, today)).toMatchObject({ amount: 188079, merchant: 'STEAMGAMES.COM 4259522', date: today });
  });

  it('Banreservas: consumo aprobado', () => {
    expect(parseBankAlert(BANRESERVAS, today)).toEqual({
      bank: 'banreservas', kind: 'compra', currency: 'DOP', amount: 10000, merchant: 'CLARO RECAR 8298796363 SANTO DOMINGO DO', last4: '9515', date: '2026-09-25',
    });
    expect(parseBankAlert(BANRESERVAS.replace('APROBADO', 'DECLINADO'), today)).toBeNull();
  });

  it('Popular: consumo con débito, también cuando la notificación corta el comercio', () => {
    expect(parseBankAlert(POPULAR, today)).toEqual({
      bank: 'popular', kind: 'compra', currency: 'DOP', amount: 10000, merchant: 'CLARO RECAR 8298796363', last4: '1347', date: '2026-09-14',
    });
    const cortada = 'Notificación de Consumo Estimado (a) Gracias por utilizar su Tarjeta Visa Débito Clásica, terminada en 1347. A continuación detalle de la transacción: Monto Moneda Fecha Comercio Estatus RD$100.00 Peso dominicano 14/09/2026';
    expect(parseBankAlert(cortada, today)).toMatchObject({ amount: 10000, merchant: '', date: '2026-09-14' });
  });

  it('ignora lo que no es un consumo: códigos, estados de cuenta, publicidad', () => {
    expect(parseBankAlert('Código validación de compra Estimado (a) CÓDIGO: 745277 Debes colocar este código para validar la siguiente transacción con tu tarjeta VISA DÉBITO terminada en 1347: Monto Comercio Estatus DOP 1451.00 Temu DO Pendiente Validación', today)).toBeNull();
    expect(parseBankAlert('Estado de cuenta de tu Tarjeta de Crédito QIK ¡Hola! Te enviamos el estado de cuenta de tu tarjeta. Período 06 sep - 05 oct 2026', today)).toBeNull();
    expect(parseBankAlert('Aviso importante sobre mantenimiento programado', today)).toBeNull();
  });

  it('la clave es la misma para el correo y para un aviso más corto de la misma compra', () => {
    const a = parseBankAlert(QIK_COMPRA, today)!;
    expect(bankAlertKey(a)).toBe(bankAlertKey({ ...a, merchant: 'GOOGLE *Clash of Clans (app)' }));
    expect(bankAlertKey(a)).not.toBe(bankAlertKey({ ...a, amount: a.amount + 1 }));
  });
});
