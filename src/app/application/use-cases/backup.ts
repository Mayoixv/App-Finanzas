import { monthOf } from '../../domain/month';
import { decryptText, encryptText } from '../backup-crypto';
import { ValidationError } from '../errors';
import { BackupData, IBackupStore } from '../ports/repositories';

const MIN_PASSWORD = 6;

export interface BackupSummary {
  transactions: number;
  /** Primer y último mes con movimientos; null si no hay. */
  firstMonth: string | null;
  lastMonth: string | null;
}

export class CreateBackup {
  constructor(private readonly store: IBackupStore) {}

  async execute(password: string): Promise<string> {
    if (password.length < MIN_PASSWORD) {
      throw new ValidationError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`);
    }
    return encryptText(JSON.stringify(await this.store.dump()), password);
  }
}

/** Descifra y valida un respaldo sin tocar los datos actuales, para mostrar qué contiene antes de restaurar. */
export class OpenBackup {
  async execute(fileText: string, password: string): Promise<{ data: BackupData; summary: BackupSummary }> {
    const data = JSON.parse(await decryptText(fileText, password)) as BackupData;
    if (!Number.isInteger(data?.schemaVersion) || typeof data.tables !== 'object') {
      throw new ValidationError('El respaldo está incompleto');
    }
    const months = (data.tables['transactions'] ?? [])
      .map((t) => monthOf(String(t['date'])))
      .sort();
    return {
      data,
      summary: {
        transactions: months.length,
        firstMonth: months[0] ?? null,
        lastMonth: months[months.length - 1] ?? null,
      },
    };
  }
}

export class RestoreBackup {
  constructor(private readonly store: IBackupStore) {}

  /** Reemplaza todos los datos actuales por los del respaldo. Si algo falla, quedan los de antes. */
  execute(data: BackupData): Promise<void> {
    return this.store.restore(data);
  }
}

/** Palabra que hay que escribir para confirmar el borrado total. */
export const WIPE_CONFIRMATION = 'BORRAR';

export class WipeAllData {
  constructor(private readonly store: IBackupStore) {}

  /** Borra todos los datos y ajustes (también el PIN). Exige escribir BORRAR para que no pase por un toque. */
  async execute(confirmation: string): Promise<void> {
    if (confirmation.trim().toUpperCase() !== WIPE_CONFIRMATION) {
      throw new ValidationError(`Escribe ${WIPE_CONFIRMATION} para confirmar.`);
    }
    return this.store.wipe();
  }
}
