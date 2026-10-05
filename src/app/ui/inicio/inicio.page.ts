import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline, settingsOutline } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { MonthOverview } from '../../application/use-cases/get-month-overview';
import { MonthlySummary, SavingsRating } from '../../domain/monthly-summary';
import { Transaction } from '../../domain/transaction';
import { formatDay, formatMoney, formatPercent } from '../format';
import { MonthSwitcherComponent } from '../month-switcher.component';
import { MonthState } from '../month-state';
import { TransactionFormService } from '../movimientos/transaction-form.service';
import { BudgetsCardComponent } from '../presupuestos/budgets-card.component';
import { UpcomingCardComponent } from '../fijos/upcoming-card.component';
import { BalanceReelComponent } from '../balance-reel.component';
import { ExpenseDonutComponent } from './expense-donut.component';

const RATING_TEXT: Record<SavingsRating, string> = {
  excelente: 'Excelente',
  regular: 'Regular',
  bajo: 'Bajo',
};

interface RecentRow {
  id: string;
  transaction: Transaction;
  initial: string;
  title: string;
  subtitle: string;
  amount: string;
  isIncome: boolean;
}

@Component({
  selector: 'app-inicio',
  templateUrl: 'inicio.page.html',
  styleUrls: ['inicio.page.scss'],
  imports: [
    RouterLink,
    IonContent,
    IonIcon,
    MonthSwitcherComponent,
    ExpenseDonutComponent,
    BudgetsCardComponent,
    BalanceReelComponent,
    UpcomingCardComponent,
  ],
})
export class InicioPage {
  private readonly container = inject(APP_CONTAINER);
  protected readonly monthState = inject(MonthState);
  private readonly transactionForm = inject(TransactionFormService);

  protected readonly overview = signal<MonthOverview | null>(null);
  protected readonly recent = signal<RecentRow[]>([]);
  protected readonly failed = signal(false);
  protected readonly money = formatMoney;
  protected readonly percent = formatPercent;
  protected readonly ratingText = RATING_TEXT;
  /** Cada carga lleva un número; si el usuario cambió de mes mientras tanto, la respuesta vieja se descarta. */
  private loadSeq = 0;

  constructor() {
    addIcons({ alertCircleOutline, settingsOutline });
    effect(() => {
      const month = this.monthState.month();
      this.monthState.version();
      this.load(month);
    });
  }

  protected isEmpty(s: MonthlySummary): boolean {
    return s.income === 0 && s.expenses === 0 && s.saved === 0;
  }

  protected edit(row: RecentRow) {
    this.transactionForm.open(row.transaction);
  }

  private async load(month: string) {
    const seq = ++this.loadSeq;
    try {
      const overview = await this.container.getMonthOverview.execute(month);
      if (seq !== this.loadSeq) return;
      this.overview.set(overview);
      this.recent.set(
        overview.recent.map(({ transaction: t, category }) => {
          const isIncome = category?.type === 'ingreso';
          const name = category?.name ?? 'Sin categoría';
          return {
            id: t.id,
            transaction: t,
            initial: name.charAt(0).toUpperCase(),
            title: t.note || name,
            subtitle: `${name} · ${formatDay(t.date)}`,
            amount: `${isIncome ? '+' : '−'}${formatMoney(t.amount)}`,
            isIncome,
          };
        }),
      );
      this.failed.set(false);
    } catch (error) {
      console.error(error);
      if (seq === this.loadSeq) this.failed.set(true);
    }
  }
}
