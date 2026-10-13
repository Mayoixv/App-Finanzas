import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { APP_VERSION } from '../../version';
import { t } from '../i18n';

/**
 * Firestore guarda documentos de hasta 1 MiB: el archivo cifrado se parte en trozos de este tamaño.
 * El archivo es JSON con los datos en base64, así que cada carácter ocupa un byte.
 */
const CHUNK = 900_000;
/** Respaldos que se guardan en la nube; los más viejos se borran. */
const KEEP = 4;

export interface CloudBackupInfo {
  id: string;
  createdAt: string;
  appVersion: string;
}

interface BackupDoc {
  createdAt: string;
  appVersion: string;
  chunks: number;
}

/**
 * Respaldo en la nube (Firebase): sube el mismo archivo cifrado del respaldo automático a la cuenta de Google del
 * usuario. Solo viaja texto cifrado con su contraseña; las reglas de Firestore dejan a cada cuenta ver solo lo suyo.
 */
@Injectable({ providedIn: 'root' })
export class CloudBackupService {
  readonly available = Capacitor.isNativePlatform();
  /** Correo de la cuenta con que se entró, o null. */
  readonly email = signal<string | null>(null);
  private uid: string | null = null;

  constructor() {
    if (!this.available) return;
    FirebaseAuthentication.getCurrentUser()
      .then(({ user }) => this.setUser(user))
      .catch(console.error);
  }

  /** Entra con Google. Devuelve el nombre de la cuenta, para llenar el nombre y apellido si se quiere. */
  async signIn(): Promise<string> {
    const { user } = await FirebaseAuthentication.signInWithGoogle();
    this.setUser(user);
    return user?.displayName ?? '';
  }

  async signOut(): Promise<void> {
    await FirebaseAuthentication.signOut();
    this.setUser(null);
  }

  /** Sube un respaldo cifrado y deja solo los últimos KEEP. */
  async upload(fileText: string): Promise<void> {
    const base = this.base();
    const id = new Date().toISOString().replace(/[:.]/g, '-');
    const chunks = Math.ceil(fileText.length / CHUNK) || 1;
    // Primero los trozos y al final el documento que los lista: un respaldo a medias nunca aparece en la lista.
    for (let i = 0; i < chunks; i++) {
      await FirebaseFirestore.setDocument({
        reference: `${base}/${id}/chunks/${i}`,
        data: { data: fileText.slice(i * CHUNK, (i + 1) * CHUNK) },
      });
    }
    const doc: BackupDoc = { createdAt: new Date().toISOString(), appVersion: APP_VERSION, chunks };
    await FirebaseFirestore.setDocument({ reference: `${base}/${id}`, data: { ...doc } });
    for (const old of (await this.list()).slice(KEEP)) await this.remove(old.id);
  }

  /** Respaldos en la nube, del más nuevo al más viejo. */
  async list(): Promise<CloudBackupInfo[]> {
    const { snapshots } = await FirebaseFirestore.getCollection<BackupDoc>({ reference: this.base() });
    return snapshots
      .filter((s) => s.data)
      .map((s) => ({ id: s.id, createdAt: s.data!.createdAt, appVersion: s.data!.appVersion }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** El archivo cifrado completo, para abrirlo con la contraseña como un respaldo normal. */
  async download(id: string): Promise<string> {
    const { snapshot } = await FirebaseFirestore.getDocument<BackupDoc>({ reference: `${this.base()}/${id}` });
    const chunks = snapshot.data?.chunks ?? 0;
    let text = '';
    for (let i = 0; i < chunks; i++) {
      const part = await FirebaseFirestore.getDocument<{ data: string }>({ reference: `${this.base()}/${id}/chunks/${i}` });
      text += part.snapshot.data?.data ?? '';
    }
    return text;
  }

  private async remove(id: string) {
    const { snapshot } = await FirebaseFirestore.getDocument<BackupDoc>({ reference: `${this.base()}/${id}` });
    await FirebaseFirestore.deleteDocument({ reference: `${this.base()}/${id}` });
    for (let i = 0; i < (snapshot.data?.chunks ?? 0); i++) {
      await FirebaseFirestore.deleteDocument({ reference: `${this.base()}/${id}/chunks/${i}` });
    }
  }

  private base(): string {
    if (!this.uid) throw new Error('Sin cuenta');
    return `users/${this.uid}/backups`;
  }

  private setUser(user: { uid: string; email: string | null } | null) {
    this.uid = user?.uid ?? null;
    this.email.set(user ? (user.email ?? t('cloud.yourAccount')) : null);
  }
}
