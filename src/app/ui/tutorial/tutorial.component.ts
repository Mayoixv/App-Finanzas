import { Component, computed, output, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  barChartOutline,
  calendarOutline,
  homeOutline,
  listOutline,
  notificationsOutline,
  shieldCheckmarkOutline,
  walletOutline,
} from 'ionicons/icons';

interface Slide {
  icon: string;
  /** Dónde está en la app. */
  where: string;
  title: string;
  points: string[];
}

/** Lo que la app hace hoy, sección por sección. Si se agrega una función, se agrega aquí. */
const SLIDES: Slide[] = [
  {
    icon: 'home-outline',
    where: 'Pestaña Inicio',
    title: 'Tu mes de un vistazo',
    points: [
      'El balance del mes: ingresos menos gastos menos lo ahorrado.',
      'Alertas de fijos por vencer, tarjetas por pagar y presupuestos al límite.',
      'En qué se va el gasto, tu patrimonio y cómo vas contra el mes anterior.',
    ],
  },
  {
    icon: 'list-outline',
    where: 'Pestaña Movimientos y botón +',
    title: 'Anota cada ingreso y gasto',
    points: [
      'Con el botón + eliges el monto, la categoría y de qué cuenta sale.',
      'Divide un gasto en varias categorías, ponle etiquetas o la foto del recibo.',
      'Busca, filtra por categoría o cuenta, y cambia varios a la vez con Seleccionar.',
    ],
  },
  {
    icon: 'calendar-outline',
    where: 'Pestaña Fijos',
    title: 'Lo que se repite cada mes',
    points: [
      'Alquiler, servicios, suscripciones y tu sueldo aparecen solos cada mes.',
      'Márcalos como pagados o recibidos; pueden ser mensuales, trimestrales o anuales.',
      'Pausa uno unos meses y mira las cuotas de tus préstamos.',
    ],
  },
  {
    icon: 'wallet-outline',
    where: 'Pestaña Dinero',
    title: 'Todo lo que tienes y lo que debes',
    points: [
      'Cuentas con su saldo y transferencias entre ellas.',
      'Tarjetas con su corte, lo que falta pagar y cuánto del límite usas.',
      'Metas de ahorro con fecha y deudas con su calendario de cuotas.',
    ],
  },
  {
    icon: 'bar-chart-outline',
    where: 'Inicio › Mes a mes › Ver reportes',
    title: 'Presupuestos y reportes',
    points: [
      'Ponle un límite a cada categoría y te avisa al llegar al 85%.',
      'Gráficas por mes y por categoría, y con cuánto cierras el mes.',
      'Exporta un mes a PDF o tus movimientos a Excel.',
    ],
  },
  {
    icon: 'notifications-outline',
    where: 'Ajustes › Avisos',
    title: 'Avisos a tiempo',
    points: [
      'Te avisa el día antes y el día que vence cada fijo y cada tarjeta.',
      'Un recordatorio diario para anotar tus gastos, si lo quieres.',
      'Elige la hora y unas horas de silencio.',
    ],
  },
  {
    icon: 'shield-checkmark-outline',
    where: 'Ajustes › Seguridad y Tus datos',
    title: 'Tus datos, solo tuyos',
    points: [
      'Todo se guarda en este teléfono: sin cuentas ni nube.',
      'Protege la app con PIN o huella y ocúltala en las apps recientes.',
      'Activa el respaldo semanal y guarda una copia fuera del teléfono de vez en cuando.',
    ],
  },
];

/** Recorrido de la app: una pantalla por sección, con Atrás, Siguiente y Saltar. */
@Component({
  selector: 'app-tutorial',
  templateUrl: 'tutorial.component.html',
  styleUrls: ['tutorial.component.scss'],
  imports: [IonIcon],
})
export class TutorialComponent {
  /** Se emite al terminar o al saltar. */
  readonly finished = output<void>();

  protected readonly slides = SLIDES;
  protected readonly index = signal(0);
  protected readonly slide = computed(() => SLIDES[this.index()]);
  protected readonly isLast = computed(() => this.index() === SLIDES.length - 1);

  constructor() {
    addIcons({
      barChartOutline,
      calendarOutline,
      homeOutline,
      listOutline,
      notificationsOutline,
      shieldCheckmarkOutline,
      walletOutline,
    });
  }

  protected next() {
    if (this.isLast()) this.finished.emit();
    else this.index.update((i) => i + 1);
  }

  protected back() {
    this.index.update((i) => Math.max(0, i - 1));
  }
}
