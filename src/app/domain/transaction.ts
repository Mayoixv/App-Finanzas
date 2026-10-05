import { IsoDate } from './month';

export interface Transaction {
  id: string;
  date: IsoDate;
  /** Siempre positivo; el signo lo da el tipo de la categoría. */
  amount: number;
  categoryId: string;
  note: string;
}
