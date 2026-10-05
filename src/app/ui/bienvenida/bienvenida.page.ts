import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonInput, IonSelect, IonSelectOption } from '@ionic/angular';
import { APP_CONTAINER } from '../../app.container';
import { ValidationError } from '../../application/errors';
import { Category } from '../../domain/category';
import { Currency } from '../../domain/currency';
import { CurrencyState } from '../currency-state';
import { currentMonth, formatMoney, parseAmount } from '../format';

type Step = 'hola' | 'moneda' | 'sueldo' | 'fijos';
const STEPS: Step[] = ['hola', 'moneda', 'sueldo', 'fijos'];

@Component({
  selector: 'app-bienvenida',
  templateUrl: 'bienvenida.page.html',
  styleUrls: ['bienvenida.page.scss'],
  imports: [IonContent, IonInput, IonSelect, IonSelectOption],
})
export class BienvenidaPage implements OnInit {
  private readonly container = inject(APP_CONTAINER);
  private readonly router = inject(Router);
  protected readonly currencyState = inject(CurrencyState);

  protected readonly step = signal<Step>('hola');
  protected readonly stepNumber = computed(() => STEPS.indexOf(this.step()) + 1);
  protected readonly total = STEPS.length;
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly salary = signal('');
  protected readonly salaryDay = signal('');

  protected readonly fixedCategories = signal<Category[]>([]);
  protected readonly fixedName = signal('');
  protected readonly fixedAmount = signal('');
  protected readonly fixedDay = signal('');
  protected readonly fixedCategory = signal<string | null>(null);
  protected readonly added = signal<string[]>([]);

  protected readonly currencies: { code: Currency; label: string }[] = [
    { code: 'DOP', label: 'Peso dominicano (RD$)' },
    { code: 'USD', label: 'Dólar estadounidense (US$)' },
  ];

  async ngOnInit() {
    const all = await this.container.categories.list();
    this.fixedCategories.set(all.filter((c) => c.type === 'fijo'));
  }

  protected next() {
    this.error.set(null);
    const i = STEPS.indexOf(this.step());
    this.step.set(STEPS[Math.min(i + 1, STEPS.length - 1)]);
  }

  protected async pickCurrency(code: Currency) {
    await this.currencyState.change(code);
    this.next();
  }

  protected async saveSalary() {
    const amount = parseAmount(this.salary());
    if (amount === null) return this.next();
    await this.work(async () => {
      await this.container.addRecurringExpense.execute({
        name: 'Sueldo',
        amount,
        categoryId: 'cat-salario',
        dueDay: Number(this.salaryDay()) || 30,
        startMonth: currentMonth(),
      });
      this.next();
    });
  }

  protected async addFixed() {
    const amount = parseAmount(this.fixedAmount());
    const categoryId = this.fixedCategory();
    if (amount === null || !categoryId) {
      this.error.set('Escribe el monto y elige una categoría');
      return;
    }
    await this.work(async () => {
      const e = await this.container.addRecurringExpense.execute({
        name: this.fixedName(),
        amount,
        categoryId,
        dueDay: Number(this.fixedDay()),
        startMonth: currentMonth(),
      });
      this.added.update((list) => [...list, `${e.name} · ${formatMoney(e.amount)}`]);
      this.fixedName.set('');
      this.fixedAmount.set('');
      this.fixedDay.set('');
    });
  }

  protected async finish() {
    await this.work(async () => {
      await this.container.onboarding.finish();
      await this.router.navigateByUrl('/tabs/inicio', { replaceUrl: true });
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
