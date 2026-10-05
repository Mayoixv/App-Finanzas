import { Cents } from './money';
import { IsoDate } from './month';

export interface TransactionSplit {
  categoryId: string;
  amount: Cents;
}

export interface Transaction {
  id: string;
  date: IsoDate;
  /** Siempre positivo; el signo lo da el tipo de la categoría. */
  amount: Cents;
  /** Si está dividido, es la categoría de la parte más grande (la que se muestra en la lista). */
  categoryId: string;
  note: string;
  /** Etiquetas libres para agrupar movimientos de distintas categorías (por ejemplo, un viaje). */
  tags?: string[];
  /** Si existe, el monto se reparte entre estas categorías y las partes suman el total exacto. */
  splits?: TransactionSplit[];
  /** Cuántas fotos de recibo tiene. Solo lectura: lo llena el repositorio. */
  attachmentCount?: number;
}

/** Foto de un recibo, guardada como data URL JPEG ya reducida. */
export interface Attachment {
  id: string;
  transactionId: string;
  data: string;
}

/** Un movimiento dividido cuenta como varios, uno por parte, en resúmenes, dona y presupuestos. */
export function expandSplits(list: Transaction[]): Transaction[] {
  return list.flatMap((t) =>
    t.splits?.length
      ? t.splits.map((s) => ({ ...t, categoryId: s.categoryId, amount: s.amount, splits: undefined }))
      : [t],
  );
}

const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;

/** Recorta, quita comas (son el separador al guardar), elimina repetidas sin distinguir mayúsculas y limita. */
export function normalizeTags(raw: string | string[]): string[] {
  const parts = (Array.isArray(raw) ? raw : raw.split(','))
    .map((t) => t.replace(/,/g, ' ').trim().slice(0, MAX_TAG_LENGTH))
    .filter(Boolean);
  const seen = new Set<string>();
  return parts
    .filter((t) => {
      const key = t.toLocaleLowerCase('es');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_TAGS);
}
