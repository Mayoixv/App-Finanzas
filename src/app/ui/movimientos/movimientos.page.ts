import { Component, effect, inject, signal } from '@angular/core';
import { AlertController, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { copyOutline, createOutline, ellipsisHorizontal, trashOutline } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { Category } from '../../domain/category';
import { Transaction } from '../../domain/transaction';
import { formatDay, formatMoney } from '../format';
import { DropdownComponent } from '../dropdown.component';
import { MonthSwitcherComponent } from '../month-switcher.component';
import { MonthState } from '../month-state';
import { TransactionFormService } from './transaction-form.service';

/** Alto aproximado del menú de 3 opciones y espacio que ocupan la barra inferior y el botón +. */
const MENU_HEIGHT = 170;
const BOTTOM_BAR_SPACE = 100;

interface Row {
  id: string;
  transaction: Transaction;
  initial: string;
  title: string;
  subtitle: string;
  amount: string;
  isIncome: boolean;
}

@Component({
  selector: 'app-movimientos',
  templateUrl: 'movimientos.page.html',
  styleUrls: ['movimientos.page.scss'],
  imports: [IonContent, IonIcon, MonthSwitcherComponent, DropdownComponent],
})
export class MovimientosPage {
  private readonly container = inject(APP_CONTAINER);
  protected readonly monthState = inject(MonthState);
  private readonly form = inject(TransactionFormService);
  private readonly alerts = inject(AlertController);

  protected readonly rows = signal<Row[] | null>(null);
  protected readonly failed = signal(false);
  /** Fila con el menú "⋯" abierto, y si se abre hacia arriba porque abajo no cabe. */
  protected readonly menuFor = signal<string | null>(null);
  protected readonly menuUp = signal(false);
  protected readonly liveMessage = signal('');
  /** Cada carga lleva un número; si el usuario cambió de mes mientras tanto, la respuesta vieja se descarta. */
  private loadSeq = 0;

  constructor() {
    addIcons({ copyOutline, createOutline, ellipsisHorizontal, trashOutline });
    effect(() => {
      const month = this.monthState.month();
      this.monthState.version();
      this.load(month);
    });
  }

  protected edit(row: Row) {
    this.menuFor.set(null);
    this.form.open(row.transaction);
  }

  protected toggleMenu(row: Row, event: MouseEvent) {
    if (this.menuFor() === row.id) {
      this.menuFor.set(null);
      return;
    }
    // Cerca del final de la pantalla el menú se abre hacia arriba para no quedar bajo la barra inferior.
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.menuUp.set(rect.bottom + MENU_HEIGHT > window.innerHeight - BOTTOM_BAR_SPACE);
    this.menuFor.set(row.id);
  }

  protected setMenu(row: Row, open: boolean) {
    if (!open && this.menuFor() === row.id) this.menuFor.set(null);
  }

  protected duplicate(row: Row) {
    this.menuFor.set(null);
    this.form.open(undefined, row.transaction);
  }

  protected async remove(row: Row) {
    this.menuFor.set(null);
    const alert = await this.alerts.create({
      cssClass: 'app-alert',
      header: 'Eliminar movimiento',
      message: `Se borrará ${row.title} (${row.amount}). Si era el pago de un gasto fijo, ese gasto volverá a quedar pendiente.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'destructive') return;
    try {
      await this.container.deleteTransaction.execute(row.id);
      this.liveMessage.set(`${row.title} eliminado`);
      this.monthState.notifyChange();
    } catch (error) {
      console.error(error);
      this.liveMessage.set('No se pudo eliminar el movimiento. Inténtalo de nuevo.');
    }
  }

  private async load(month: string) {
    const seq = ++this.loadSeq;
    try {
      const [transactions, categories] = await Promise.all([
        this.container.transactions.listByMonth(month),
        this.container.categories.list(),
      ]);
      if (seq !== this.loadSeq) return;
      const byId = new Map(categories.map((c) => [c.id, c]));
      this.rows.set(
        [...transactions]
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((t) => toRow(t, byId.get(t.categoryId))),
      );
      this.failed.set(false);
    } catch (error) {
      console.error(error);
      if (seq === this.loadSeq) this.failed.set(true);
    }
  }
}

function toRow(t: Transaction, category: Category | undefined): Row {
  const isIncome = category?.type === 'ingreso';
  const categoryName = category?.name ?? 'Sin categoría';
  return {
    id: t.id,
    transaction: t,
    initial: categoryName.charAt(0).toUpperCase(),
    title: t.note || categoryName,
    subtitle: `${categoryName} · ${formatDay(t.date)}`,
    amount: `${isIncome ? '+' : '−'}${formatMoney(t.amount)}`,
    isIncome,
  };
}
