import { inject, Injectable, signal } from '@angular/core';
import { APP_CONTAINER } from '../app.container';
import { Currency } from '../domain/currency';
import { displayCurrency, setDisplayCurrency } from './format';
import { MonthState } from './month-state';

/** Moneda que se muestra en toda la app. Cambiarla recarga las pantallas para que tomen el nuevo símbolo. */
@Injectable({ providedIn: 'root' })
export class CurrencyState {
  private readonly container = inject(APP_CONTAINER);
  private readonly monthState = inject(MonthState);

  readonly currency = signal<Currency>(displayCurrency());

  async change(value: Currency) {
    await this.container.currencySettings.set(value);
    setDisplayCurrency(value);
    this.currency.set(value);
    this.monthState.notifyChange();
  }

  /** Solo cambia el símbolo en pantalla, sin guardarlo (preguntas iniciales: se guarda al confirmar). */
  preview(value: Currency) {
    setDisplayCurrency(value);
    this.currency.set(value);
  }
}
