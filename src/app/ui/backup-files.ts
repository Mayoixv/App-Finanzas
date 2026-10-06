import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { BackupData } from '../application/ports/repositories';
import { fileDate } from './file-io';

/** Carpeta visible en "Mis archivos" del teléfono: Documentos/Finanzas. */
export const AUTO_BACKUP_FOLDER = 'Finanzas';
const AUTO_BACKUP_KEEP = 4;
const SAFETY_FOLDER = 'respaldos';
const SAFETY_KEEP = 3;

/** Deja solo los `keep` archivos más nuevos con ese prefijo (el nombre lleva la fecha, así que ordenar por nombre basta). */
async function prune(directory: Directory, folder: string, prefix: string, keep: number) {
  const { files } = await Filesystem.readdir({ path: folder, directory });
  const old = files
    .map((f) => f.name)
    .filter((n) => n.startsWith(prefix))
    .sort()
    .slice(0, -keep);
  for (const name of old) await Filesystem.deleteFile({ path: `${folder}/${name}`, directory });
}

/**
 * Copia de los datos antes de actualizar la base, dentro del almacenamiento privado de la app (sin cifrar,
 * igual que la base misma). Solo en el teléfono.
 */
export async function saveSafetyCopy(data: BackupData): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await Filesystem.writeFile({
    path: `${SAFETY_FOLDER}/antes-de-actualizar-${fileDate()}-v${data.schemaVersion}.json`,
    data: JSON.stringify(data),
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    recursive: true,
  });
  await prune(Directory.Data, SAFETY_FOLDER, 'antes-de-actualizar-', SAFETY_KEEP);
}

/** Guarda el respaldo automático (ya cifrado) en Documentos/Finanzas y deja los 4 más recientes. */
export async function saveAutoBackup(content: string): Promise<string> {
  const name = `finanzas-auto-${fileDate()}.finanzas`;
  await Filesystem.writeFile({
    path: `${AUTO_BACKUP_FOLDER}/${name}`,
    data: content,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true,
  });
  await prune(Directory.Documents, AUTO_BACKUP_FOLDER, 'finanzas-auto-', AUTO_BACKUP_KEEP);
  return name;
}
