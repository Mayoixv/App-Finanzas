import { Cents } from './money';
import { IsoDate } from './month';

/** Un aviso de consumo leído de una notificación del banco (o de Gmail con el correo del banco). */
export interface BankAlert {
  bank: 'qik' | 'banreservas' | 'popular';
  /** 'compra' agrega un gasto por confirmar; 'reverso' anula una compra igual que aún no se confirmó. */
  kind: 'compra' | 'reverso';
  amount: Cents;
  /** Moneda del aviso; la app no convierte, así que uno en otra moneda se marca para revisar el monto. */
  currency: 'DOP' | 'USD';
  /** Comercio tal como lo escribe el banco; vacío si la notificación lo cortó. */
  merchant: string;
  /** Día de la compra; si el aviso no lo trae, el día en que llegó la notificación. */
  date: IsoDate;
  /** Últimos 4 dígitos de la tarjeta, para saber de qué cuenta sale. */
  last4: string;
}

const pad = (n: string | number) => String(n).padStart(2, '0');

function toCents(text: string): Cents {
  return Math.round(Number(text.replace(/,/g, '')) * 100);
}

function currencyOf(symbol: string): 'DOP' | 'USD' {
  // "RD$" y "DOP" son pesos; "US$", "USD" y "$" solo (así escribe Qik los cobros en dólares) son dólares.
  return /^(RD\$|DOP)$/i.test(symbol.trim()) ? 'DOP' : 'USD';
}

/** Quita el formato de tabla y los espacios de más que dejan el correo o la notificación. */
function normalize(text: string): string {
  return text.replace(/[|]/g, ' ').replace(/\s+/g, ' ').trim();
}

const AMOUNT = String.raw`([\d,]+\.\d{2})`;

/**
 * Lee un aviso de consumo de Qik, Banreservas o Popular. Devuelve null si no es un consumo aprobado ni un
 * reverso (por ejemplo códigos de validación, estados de cuenta o publicidad).
 * `receivedOn` es el día en que llegó la notificación, para cuando el texto no trae la fecha.
 */
export function parseBankAlert(raw: string, receivedOn: IsoDate): BankAlert | null {
  const text = normalize(raw);

  // Qik: "Ha sido reversada la transacción de $ 3.19 en WL *VALVE CORPORATION con tu Tarjeta de Crédito Qik que termina en *8462"
  let m = new RegExp(String.raw`reversada la transacci[oó]n de \*?(RD\$|US\$|\$)\s*${AMOUNT}\*? en \*?(.+?)\*? con tu tarjeta de cr[eé]dito qik que termina en \D*?(\d{4})\b`, 'i').exec(text);
  if (m) return { bank: 'qik', kind: 'reverso', currency: currencyOf(m[1]), amount: toCents(m[2]), merchant: m[3].trim(), last4: m[4], date: qikDate(text) ?? receivedOn };

  // Qik: "Se hizo una transacción de RD$ 62.56 en GOOGLE *Clash of Clans con tu tarjeta crédito Qik que termina en 53*****8462"
  m = new RegExp(String.raw`transacci[oó]n de (RD\$|US\$|\$)\s*${AMOUNT} en (.+?) con tu tarjeta (?:de )?cr[eé]dito qik que termina en [\d*•]*?(\d{4})\b`, 'i').exec(text);
  if (m) return { bank: 'qik', kind: 'compra', currency: currencyOf(m[1]), amount: toCents(m[2]), merchant: m[3].trim(), last4: m[4], date: qikDate(text) ?? receivedOn };

  // Banreservas: "Su tarjeta ESTANDAR ••9515 presenta un consumo. Monto: DOP 100.00 Estado: APROBADO Comercio: CLARO RECAR ... Fecha de transacción: 25/09/2026 15:12 PM"
  m = /tarjeta .*?[•*]+\s*(\d{4}) presenta un consumo/i.exec(text);
  if (m) {
    const amount = new RegExp(String.raw`Monto: (DOP|USD|RD\$|US\$)\s*${AMOUNT}`, 'i').exec(text);
    const status = /Estado: (\w+)/i.exec(text);
    if (!amount || (status && !/aprobad/i.test(status[1]))) return null;
    const merchant = /Comercio: (.+?)(?= Fecha de transacci[oó]n:| N[uú]mero de aprobaci[oó]n:|$)/i.exec(text);
    const date = /Fecha de transacci[oó]n: (\d{2})\/(\d{2})\/(\d{4})/i.exec(text);
    return {
      bank: 'banreservas',
      kind: 'compra',
      currency: currencyOf(amount[1]),
      amount: toCents(amount[2]),
      merchant: merchant?.[1].trim() ?? '',
      last4: m[1],
      date: date ? `${date[3]}-${date[2]}-${date[1]}` : receivedOn,
    };
  }

  // Popular: "Gracias por utilizar su Tarjeta Visa Débito Clásica, terminada en 1347. ... RD$100.00 Peso dominicano 14/09/2026 CLARO RECAR 8298796363 Aprobada"
  m = /utilizar su tarjeta .*?terminada en (\d{4})/i.exec(text);
  if (m) {
    const head = new RegExp(String.raw`(RD\$|US\$|USD|DOP)\s*${AMOUNT}\s+\S+(?: \S+)?\s+(\d{2})\/(\d{2})\/(\d{4})`, 'i').exec(text);
    if (!head) return null;
    // Lo que sigue a la fecha es el comercio y luego el estado; si la notificación cortó el texto, puede faltar.
    const tail = text.slice(head.index + head[0].length);
    const status = /^\s*(.*?)\s*(Aprobad\w*|Declinad\w*|Rechazad\w*)/i.exec(tail);
    if (status && !/aprobad/i.test(status[2])) return null;
    return {
      bank: 'popular',
      kind: 'compra',
      currency: currencyOf(head[1]),
      amount: toCents(head[2]),
      merchant: status ? status[1].trim() : '',
      last4: m[1],
      date: `${head[5]}-${head[4]}-${head[3]}`,
    };
  }
  return null;
}

/** Qik escribe la fecha como mes-día-año: "10-07-2026 10:34 AM". */
function qikDate(text: string): IsoDate | null {
  const m = /\b(\d{2})-(\d{2})-(\d{4}) \d{1,2}:\d{2}/.exec(text);
  return m ? `${m[3]}-${pad(m[1])}-${pad(m[2])}` : null;
}

export type BankImportStatus = 'pendiente' | 'confirmado' | 'descartado';

/** Un aviso guardado en "Por confirmar". */
export interface BankImport extends BankAlert {
  id: string;
  key: string;
  status: BankImportStatus;
  /** Cuándo llegó la notificación (ISO). */
  receivedAt: string;
  /** Al confirmar: el movimiento creado y la categoría elegida (sirve para sugerir la próxima vez). */
  transactionId?: string | null;
  categoryId?: string | null;
}

/**
 * Clave para no registrar dos veces la misma compra (por ejemplo el correo y la notificación de la app del banco).
 * El comercio se recorta porque cada aviso lo escribe un poco distinto.
 */
export function bankAlertKey(a: Pick<BankAlert, 'bank' | 'last4' | 'amount' | 'date' | 'merchant'>): string {
  const shop = a.merchant.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return `${a.bank}:${a.last4}:${a.amount}:${a.date}:${shop}`;
}
