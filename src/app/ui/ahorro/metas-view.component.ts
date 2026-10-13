import { Component, computed, effect, inject, signal } from '@angular/core';
import { AlertController, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, createOutline } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import {
  GoalProgress,
  MonthContribution,
} from '../../application/use-cases/get-savings-overview';
import { MonthlySummary } from '../../domain/monthly-summary';
import { formatDay, formatMoney, formatPercent, monthLabel } from '../format';
import { PageSlideComponent } from '../page-slide.component';
import { PillOption, PillToggleComponent } from '../pill-toggle.component';
import { MonthState } from '../month-state';
import { UndoService } from '../undo.service';
import { SavingsFormService } from './savings-form.service';
import { LoadingComponent } from '../loading.component';
import { t } from '../i18n';

interface View {
  summary: MonthlySummary;
  goals: GoalProgress[];
  contributions: MonthContribution[];
}

@Component({
  selector: 'app-metas-view',
  templateUrl: 'metas-view.component.html',
  styleUrls: ['metas-view.component.scss'],
  imports: [
    LoadingComponent,
    IonIcon,
    PillToggleComponent,
    PageSlideComponent,
  ],
})
/** Sección Metas de la pestaña Dinero: ahorrado del mes, metas y aportes. */
export class MetasViewComponent {
  protected readonly t = t;
  private readonly container = inject(APP_CONTAINER);
  private readonly alerts = inject(AlertController);
  private readonly undo = inject(UndoService);
  protected readonly monthState = inject(MonthState);
  protected readonly form = inject(SavingsFormService);

  protected readonly view = signal<View | null>(null);
  protected readonly failed = signal(false);
  protected readonly liveMessage = signal('');
  /** Vista activa (design.md 10.3): '1' progreso acumulado de las metas, '2' aportes del mes. */
  protected readonly view1or2 = signal('1');
  protected readonly viewOptions = computed<PillOption[]>(() => [
    { value: '1', label: t('metas.total') },
    { value: '2', label: t('metas.thisMonth') },
  ]);

  protected goalName(c: MonthContribution): string {
    return c.goalName ?? t('metas.deletedGoal');
  }
  /** Cada carga lleva un número; si el usuario cambió de mes mientras tanto, la respuesta vieja se descarta. */
  private loadSeq = 0;

  protected readonly money = formatMoney;
  protected readonly percent = formatPercent;
  protected readonly day = formatDay;
  protected readonly abs = Math.abs;

  /** Una línea: para cuándo se llega al ritmo actual y cuánto aportar para llegar a la fecha elegida. */
  protected projection(g: GoalProgress): string {
    if (g.reached) return '';
    const parts: string[] = [];
    if (g.goal.targetDate) {
      parts.push(
        g.targetPassed
          ? t('metas.datePassed', { month: monthLabel(g.goal.targetDate.slice(0, 7)) })
          : t('metas.needed', { month: monthLabel(g.goal.targetDate.slice(0, 7)), amount: formatMoney(g.neededPerMonth ?? 0) }),
      );
    }
    if (g.projectedMonth)
      parts.push(t('metas.atPace', { month: monthLabel(g.projectedMonth) }));
    else if (g.saved > 0 || g.goal.targetDate)
      parts.push(t('metas.noPace'));
    return parts.join(' · ');
  }

  constructor() {
    addIcons({ checkmarkCircleOutline, createOutline });
    effect(() => {
      const month = this.monthState.month();
      this.monthState.version();
      this.load(month);
    });
  }

  protected page(): 1 | 2 {
    return this.view1or2() === '2' ? 2 : 1;
  }

  /** Ancho de la barra: el progreso real puede pasar de 100%, la barra no. */
  protected barWidth(percent: number): number {
    return Math.min(percent, 100);
  }

  protected async confirmDeleteContribution(item: MonthContribution) {
    const alert = await this.alerts.create({
      cssClass: 'app-alert',
      header: t(item.contribution.withdrawal ? 'metas.deleteWithdrawalTitle' : 'metas.deleteContributionTitle'),
      message: t(item.contribution.withdrawal ? 'metas.deleteWithdrawalMsg' : 'metas.deleteContributionMsg', {
        amount: formatMoney(item.contribution.amount),
        name: this.goalName(item),
        date: formatDay(item.contribution.date),
      }),
      buttons: [
        { text: t('common.cancel'), role: 'cancel' },
        { text: t('common.delete'), role: 'destructive' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'destructive') return;
    try {
      const removed = await this.container.deleteSavingsContribution.execute(
        item.contribution.id,
      );
      this.monthState.notifyChange();
      if (removed)
        this.undo.offer(
          t(removed.withdrawal ? 'metas.withdrawalDeleted' : 'metas.contributionDeleted'),
          () => this.container.restoreSavingsContribution.execute(removed),
        );
    } catch (error) {
      console.error(error);
      this.liveMessage.set(t('metas.deleteFailed'));
    }
  }

  private async load(month: string) {
    const seq = ++this.loadSeq;
    try {
      const [savings, overview] = await Promise.all([
        this.container.getSavingsOverview.execute(month),
        this.container.getMonthOverview.execute(month),
      ]);
      if (seq !== this.loadSeq) return;
      this.view.set({
        summary: overview.summary,
        goals: savings.goals,
        contributions: savings.monthContributions,
      });
      this.failed.set(false);
    } catch (error) {
      console.error(error);
      if (seq === this.loadSeq) this.failed.set(true);
    }
  }
}
