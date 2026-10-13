import { Component, effect, inject, signal } from '@angular/core';
import { HelpButtonComponent } from '../help/help-button.component';
import { Category } from '../../domain/category';
import { lookOf } from '../category-look';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline, chevronForward, settingsOutline } from 'ionicons/icons';
import { OnboardingGoal } from '../../application/use-cases/user-profile';
import { APP_CONTAINER } from '../../app.container';
import { MonthOverview } from '../../application/use-cases/get-month-overview';
import { MonthlySummary } from '../../domain/monthly-summary';
import { Transaction } from '../../domain/transaction';
import { formatDay, formatMoney, formatPercent } from '../format';
import { MonthSwitcherComponent } from '../month-switcher.component';
import { MonthState } from '../month-state';
import { TransactionFormService } from '../movimientos/transaction-form.service';
import { BudgetsCardComponent } from '../presupuestos/budgets-card.component';
import { UpcomingCardComponent } from '../fijos/upcoming-card.component';
import { AlertsRowComponent } from './alerts-row.component';
import { MonthCompareComponent } from './month-compare.component';
import { NetWorthCardComponent } from './net-worth-card.component';
import { BalanceReelComponent } from '../balance-reel.component';
import { ExpenseDonutComponent } from './expense-donut.component';
import { LoadingComponent } from '../loading.component';
import { t } from '../i18n';

interface RecentRow {
  id: string;
  transaction: Transaction;
  /** Ícono y color de la categoría, para el círculo de la fila. */
  icon: string;
  color: string;
  title: string;
  subtitle: string;
  amount: string;
  isIncome: boolean;
}

@Component({
  selector: 'app-inicio',
  templateUrl: 'inicio.page.html',
  styleUrls: ['inicio.page.scss'],
  imports: [HelpButtonComponent, 
    LoadingComponent,
    RouterLink,
    IonContent,
    IonIcon,
    MonthSwitcherComponent,
    ExpenseDonutComponent,
    BudgetsCardComponent,
    BalanceReelComponent,
    UpcomingCardComponent,
    AlertsRowComponent,
    MonthCompareComponent,
    NetWorthCardComponent,
  ],
})
export class InicioPage {
  protected readonly t = t;
  private readonly container = inject(APP_CONTAINER);
  protected readonly monthState = inject(MonthState);
  private readonly transactionForm = inject(TransactionFormService);

  protected readonly overview = signal<MonthOverview | null>(null);
  protected readonly userName = signal('');
  protected readonly goal = signal<OnboardingGoal | null>(null);
  /** A dónde lleva el objetivo elegido en las preguntas iniciales. */
  protected readonly goalRoute: Record<OnboardingGoal, { path: string; query?: Record<string, string> }> = {
    controlar: { path: '/reportes' },
    ahorrar: { path: '/tabs/planes', query: { ver: 'metas' } },
    deudas: { path: '/tabs/planes', query: { ver: 'deudas' } },
    organizar: { path: '/tabs/fijos' },
  };
  protected readonly recent = signal<RecentRow[]>([]);
  protected readonly failed = signal(false);
  protected readonly money = formatMoney;
  protected readonly percent = formatPercent;
  /** Cada carga lleva un número; si el usuario cambió de mes mientras tanto, la respuesta vieja se descarta. */
  protected readonly categories = signal<Category[]>([]);
  private loadSeq = 0;

  constructor() {
    addIcons({ alertCircleOutline, chevronForward, settingsOutline });
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
      this.userName.set(await this.container.profile.name());
      this.goal.set(await this.container.profile.goal());
      const [overview, categories] = await Promise.all([
        this.container.getMonthOverview.execute(month),
        this.container.categories.list(),
      ]);
      if (seq !== this.loadSeq) return;
      this.overview.set(overview);
      this.categories.set(categories);
      this.recent.set(
        overview.recent.map(({ transaction: tx, category }) => {
          const isIncome = category?.type === 'ingreso';
          const name = category?.name ?? t('common.noCategory');
          return {
            id: tx.id,
            transaction: tx,
            ...lookOf(category ?? { type: isIncome ? 'ingreso' : 'variable' }),
            title: tx.note || name,
            subtitle: `${name} · ${formatDay(tx.date)}`,
            amount: `${isIncome ? '+' : '−'}${formatMoney(tx.amount)}`,
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
