import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonInput } from '@ionic/angular';
import { APP_CONTAINER } from '../../app.container';
import { ValidationError } from '../../application/errors';
import { Currency } from '../../domain/currency';
import { Account, AccountType, CASH_ACCOUNT_ID } from '../../domain/account';
import { ACCOUNT_TYPE_LABEL } from '../cuentas/account-choices';
import { CurrencyState } from '../currency-state';
import { DineroFormService } from '../dinero/dinero-form.service';
import { parseBalance } from '../format';
import { TourService } from '../tour/tour.service';

type Step = 'portada' | 'nombre' | 'moneda' | 'dinero' | 'recorrido';
/** Orden de los pasos. La portada y el recorrido (opcional) no cuentan en "Paso X de N". */
const STEPS: Step[] = ['portada', 'nombre', 'moneda', 'dinero', 'recorrido'];
/** Sueldo y fijos no se piden aquí: se agregan en la pestaña Fijos, para que haya una sola forma de hacerlo. */
const COUNTED: Step[] = ['nombre', 'moneda', 'dinero', 'recorrido'];

@Component({
  selector: 'app-bienvenida',
  templateUrl: 'bienvenida.page.html',
  styleUrls: ['bienvenida.page.scss'],
  imports: [IonContent, IonInput],
})
export class BienvenidaPage {
  private readonly container = inject(APP_CONTAINER);
  private readonly router = inject(Router);
  protected readonly currencyState = inject(CurrencyState);
  private readonly tour = inject(TourService);
  private readonly dineroForm = inject(DineroFormService);

  protected readonly step = signal<Step>('portada');
  protected readonly stepNumber = computed(() => COUNTED.indexOf(this.step()) + 1);
  protected readonly total = COUNTED.length;
  protected readonly name = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  /** Paso "¿Dónde tienes tu dinero?": efectivo de hoy y las cuentas o tarjetas que se agregaron. */
  protected readonly cash = signal('');
  protected readonly added = signal<Account[]>([]);
  protected readonly typeLabel = ACCOUNT_TYPE_LABEL;

  protected readonly currencies: { code: Currency; label: string }[] = [
    { code: 'DOP', label: 'Peso dominicano (RD$)' },
    { code: 'USD', label: 'Dólar estadounidense (US$)' },
  ];

  protected next() {
    this.error.set(null);
    const i = STEPS.indexOf(this.step());
    this.step.set(STEPS[Math.min(i + 1, STEPS.length - 1)]);
  }

  /** El nombre es opcional: sin escribir nada, se sigue igual. */
  protected async saveName() {
    await this.work(async () => {
      await this.container.profile.setName(this.name());
      this.next();
    });
  }

  protected async pickCurrency(code: Currency) {
    await this.currencyState.change(code);
    this.next();
  }

  /** Abre el mismo formulario de Dinero; al cerrarlo se lista lo agregado. */
  protected async addAccount(type: AccountType) {
    await this.dineroForm.openAccount(undefined, type);
    this.added.set((await this.container.accounts.list()).filter((a) => a.id !== CASH_ACCOUNT_ID));
  }

  /** El efectivo es opcional: vacío, se queda en cero. */
  protected async saveCash() {
    const cents = parseBalance(this.cash());
    if (cents === null) {
      this.error.set('Escribe el efectivo solo con números');
      return;
    }
    await this.work(async () => {
      if (cents !== 0) await this.container.adjustAccountBalance.execute(CASH_ACCOUNT_ID, cents);
      this.next();
    });
  }

  /** Con `withTour`, al entrar a la app empieza el recorrido sobre las pantallas reales. */
  protected async finish(withTour = false) {
    await this.work(async () => {
      await this.container.onboarding.finish();
      await this.router.navigateByUrl('/tabs/inicio', { replaceUrl: true });
      if (withTour) this.tour.start();
    });
  }

  private async work(task: () => Promise<void>) {
    this.busy.set(true);
    this.error.set(null);
    try {
      await task();
    } catch (e) {
      console.error(e);
      this.error.set(e instanceof ValidationError ? e.message : 'No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      this.busy.set(false);
    }
  }
}
