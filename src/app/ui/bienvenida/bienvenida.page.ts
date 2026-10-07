import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonInput } from '@ionic/angular';
import { APP_CONTAINER } from '../../app.container';
import { ValidationError } from '../../application/errors';
import { Currency } from '../../domain/currency';
import { CurrencyState } from '../currency-state';
import { TourService } from '../tour/tour.service';

type Step = 'portada' | 'nombre' | 'moneda' | 'recorrido';
/** Orden de los pasos. La portada y el recorrido (opcional) no cuentan en "Paso X de N". */
const STEPS: Step[] = ['portada', 'nombre', 'moneda', 'recorrido'];
/** Sueldo y fijos no se piden aquí: se agregan en la pestaña Fijos, para que haya una sola forma de hacerlo. */
const COUNTED: Step[] = ['nombre', 'moneda', 'recorrido'];

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

  protected readonly step = signal<Step>('portada');
  protected readonly stepNumber = computed(() => COUNTED.indexOf(this.step()) + 1);
  protected readonly total = COUNTED.length;
  protected readonly name = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

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
