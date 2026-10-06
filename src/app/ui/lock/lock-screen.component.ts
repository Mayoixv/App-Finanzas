import { Component, computed, effect, HostListener, inject, signal, untracked } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { backspaceOutline, fingerPrint } from 'ionicons/icons';
import { LockState } from './lock-state';

const MAX_DIGITS = 6;

/** Pantalla de PIN que tapa toda la app mientras está bloqueada. Acepta toque y teclado físico. */
@Component({
  selector: 'app-lock-screen',
  templateUrl: 'lock-screen.component.html',
  styleUrls: ['lock-screen.component.scss'],
  imports: [IonIcon],
})
export class LockScreenComponent {
  protected readonly lock = inject(LockState);

  protected readonly pin = signal('');
  protected readonly message = signal('');
  protected readonly checking = signal(false);
  protected readonly waitSeconds = signal(0);
  protected readonly shake = signal(false);
  protected readonly keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  /** Tantas bolitas como números tiene el PIN; si no se sabe, el máximo. */
  protected readonly maxDigits = computed(() => this.lock.pinLength() ?? MAX_DIGITS);
  protected readonly slots = computed(() => Array.from({ length: this.maxDigits() }, (_, i) => i));
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    addIcons({ backspaceOutline, fingerPrint });
    // Al bloquearse (al abrir o al volver a la app), pide la huella sola. Si se cancela, queda el PIN.
    effect(() => {
      if (this.lock.locked() && this.lock.biometricOn()) untracked(() => setTimeout(() => this.lock.unlockWithBiometry(), 300));
    });
  }

  protected press(digit: string) {
    if (this.blocked() || this.pin().length >= this.maxDigits()) return;
    this.message.set('');
    this.pin.update((p) => p + digit);
    // Con el largo conocido, al completar el PIN se comprueba solo.
    if (this.lock.pinLength() && this.pin().length === this.maxDigits()) this.submit();
  }

  protected erase() {
    this.pin.update((p) => p.slice(0, -1));
  }

  protected blocked() {
    return this.checking() || this.waitSeconds() > 0;
  }

  protected async submit() {
    if (this.blocked() || this.pin().length < 4) return;
    this.checking.set(true);
    const check = await this.lock.unlock(this.pin());
    this.checking.set(false);
    this.pin.set('');
    if (check.ok) {
      this.message.set('');
      return;
    }
    this.shake.set(true);
    setTimeout(() => this.shake.set(false), 450);
    if (check.waitSeconds > 0) this.startWait(check.waitSeconds);
    else this.message.set('PIN incorrecto');
  }

  @HostListener('document:keydown', ['$event'])
  protected onKey(event: KeyboardEvent) {
    if (!this.lock.locked()) return;
    if (/^\d$/.test(event.key)) this.press(event.key);
    else if (event.key === 'Backspace') this.erase();
    else if (event.key === 'Enter') this.submit();
    else return;
    event.preventDefault();
  }

  private startWait(seconds: number) {
    clearInterval(this.timer);
    this.waitSeconds.set(seconds);
    this.message.set(`Demasiados intentos. Espera ${seconds} s.`);
    this.timer = setInterval(() => {
      const left = this.waitSeconds() - 1;
      this.waitSeconds.set(Math.max(left, 0));
      this.message.set(left > 0 ? `Demasiados intentos. Espera ${left} s.` : '');
      if (left <= 0) clearInterval(this.timer);
    }, 1000);
  }
}
