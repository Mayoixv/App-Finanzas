import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Entrega un archivo al usuario. En Android lo guarda en la caché de la app y abre la hoja de compartir
 * (Drive, WhatsApp, correo); en el navegador lo descarga.
 */
export async function saveFile(name: string, content: string, mime: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({
      path: name,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    try {
      await Share.share({ title: name, files: [uri] });
    } catch {
      // Cerrar la hoja de compartir sin elegir nada no es un error.
    }
    return;
  }
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url));
}

/** Como saveFile, para archivos binarios (un PDF) que llegan en base64. */
export async function saveBinaryFile(name: string, base64: string, mime: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({ path: name, data: base64, directory: Directory.Cache });
    try {
      await Share.share({ title: name, files: [uri] });
    } catch {
      // Cerrar la hoja de compartir sin elegir nada no es un error.
    }
    return;
  }
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url));
}

/** Abre el selector de archivos del sistema y devuelve el texto del archivo elegido, o null si se cancela. */
export function pickTextFile(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept });
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) file.text().then(resolve, () => resolve(null));
      else resolve(null);
    });
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

/** Fecha de hoy para nombres de archivo: finanzas-respaldo-2026-10-05. */
export function fileDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
