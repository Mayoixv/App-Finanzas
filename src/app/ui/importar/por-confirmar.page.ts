import { Location } from '@angular/common';
import { Component, computed, effect, inject, input, OnInit, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonInput } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBack, receiptOutline } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { ValidationError } from '../../application/errors';
import { PendingImport } from '../../application/use-cases/bank-imports';
import { Account } from '../../domain/account';
import { Category, isExpenseType } from '../../domain/category';
import { accountOptions } from '../cuentas/account-choices';
import { amountToInput, formatDay, formatMoney, parseAmount } from '../format';
import { MonthState } from '../month-state';
import { CategoryFieldComponent } from '../select/category-field.component';
import { SelectFieldComponent } from '../select/select-field.component';
import { BankNotificationsService } from './bank-notifications.service';

const BANK_NAME: Record<PendingImport['item']['bank'], string> = { qik: 'Qik', banreservas: 'Banreservas', popular: 'Popular' };

/** Una compra por confirmar: categoría y cuenta (ya sugeridas), monto editable y Confirmar o Descartar. */
@Component({
  selector: 'app-import-row',
  templateUrl: 'import-row.component.html',
  styleUrls: ['por-confirmar.page.scss'],
  imports: [CategoryFieldComponent, SelectFieldComponent, IonInput],
})
export class ImportRowComponent implements OnInit {
  private readonly container = inject(APP_CONTAINER);

  readonly pending = input.required<PendingImport>();
  readonly categories = input.required<Category[]>();
  readonly accounts = input.required<Account[]>();
  readonly done = output<string>();
  readonly categoryCreated = output<Category>();

  protected readonly categoryId = signal<string | null>(null);
  protected readonly accountId = signal<string | null>(null);
  protected readonly amount = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected readonly item = computed(() => this.pending().item);
  protected readonly foreign = computed(() => this.item().currency !== 'DOP');
  protected readonly accountOptions = computed(() => accountOptions(this.accounts()));
  protected readonly title = computed(() => this.item().merchant || `Compra con ${BANK_NAME[this.item().bank]}`);
  protected readonly detail = computed(
    () => `${BANK_NAME[this.item().bank]} ••${this.item().last4} · ${formatDay(this.item().date)}`,
  );
  protected readonly shown = computed(() =>
    this.foreign() ? `US$${amountToInput(this.item().amount)}` : formatMoney(this.item().amount),
  );
  protected readonly canConfirm = computed(
    () => !!this.categoryId() && !!this.accountId() && parseAmount(this.amount()) !== null && !this.busy(),
  );

  ngOnInit() {
    const p = this.pending();
    this.categoryId.set(p.categoryId);
    this.accountId.set(p.accountId);
    // En otra moneda se deja vacío: la app no convierte, la persona escribe cuánto fue en pesos.
    this.amount.set(this.foreign() ? '' : amountToInput(p.item.amount));
  }

  protected async confirm() {
    const { categoryId, accountId } = { categoryId: this.categoryId(), accountId: this.accountId() };
    if (!categoryId || !accountId) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.container.confirmImport.execute(this.item().id, {
        categoryId,
        accountId,
        amount: parseAmount(this.amount()) ?? 0,
        date: this.item().date,
        note: this.item().merchant,
      });
      this.done.emit(`${this.title()} guardada`);
    } catch (e) {
      this.error.set(e instanceof ValidationError ? e.message : 'No se pudo guardar. Inténtalo de nuevo.');
      this.busy.set(false);
    }
  }

  protected async discard() {
    this.busy.set(true);
    await this.container.discardImport.execute(this.item().id);
    this.done.emit(`${this.title()} descartada`);
  }
}

/** Compras leídas de los avisos del banco que esperan que la persona las confirme o descarte. */
@Component({
  selector: 'app-por-confirmar',
  templateUrl: 'por-confirmar.page.html',
  styleUrls: ['por-confirmar.page.scss'],
  imports: [IonContent, IonIcon, RouterLink, ImportRowComponent],
})
export class PorConfirmarPage {
  private readonly container = inject(APP_CONTAINER);
  private readonly location = inject(Location);
  private readonly monthState = inject(MonthState);
  protected readonly bank = inject(BankNotificationsService);

  protected readonly items = signal<PendingImport[] | null>(null);
  protected readonly categories = signal<Category[]>([]);
  protected readonly accounts = signal<Account[]>([]);
  protected readonly liveMessage = signal('');

  constructor() {
    addIcons({ chevronBack, receiptOutline });
    effect(() => {
      this.monthState.version();
      this.load();
    });
  }

  protected back() {
    this.location.back();
  }

  protected onDone(message: string) {
    this.liveMessage.set(message);
    this.monthState.notifyChange();
  }

  protected addCategory(c: Category) {
    this.categories.update((list) => [...list, c]);
  }

  private async load() {
    const [items, categories, accounts] = await Promise.all([
      this.container.listPendingImports.execute(),
      this.container.categories.list(),
      this.container.accounts.list(),
    ]);
    this.categories.set(categories.filter((c) => isExpenseType(c.type)));
    this.accounts.set(accounts.filter((a) => !a.archived));
    this.items.set(items);
  }
}
