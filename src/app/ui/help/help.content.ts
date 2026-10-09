/**
 * Textos de ayuda de cada pantalla. El recorrido (tour.service.ts) usa estos mismos textos.
 * Reglas: máximo 3 viñetas, 2 líneas cada una, verbo al inicio.
 */
export type HelpTopic = 'inicio' | 'movimientos' | 'fijos' | 'cuentas' | 'tarjetas' | 'metas' | 'deudas' | 'reportes';

export interface HelpEntry {
  title: string;
  points: string[];
}

export const HELP: Record<HelpTopic, HelpEntry> = {
  inicio: {
    title: 'Inicio',
    points: [
      'Mira tu balance del mes: lo que entró menos lo que gastaste y ahorraste.',
      'Cambia de mes con las flechas o tocando el nombre del mes.',
      'Toca + para anotar un gasto o un ingreso en segundos.',
    ],
  },
  movimientos: {
    title: 'Movimientos',
    points: [
      'Busca por nota, categoría o etiqueta, y filtra por tipo o cuenta.',
      'Toca un movimiento para editarlo; con ⋯ lo duplicas o lo borras.',
      'Usa Seleccionar para cambiar o borrar varios a la vez.',
    ],
  },
  fijos: {
    title: 'Fijos',
    points: [
      'Agrega una sola vez los pagos e ingresos que se repiten cada mes.',
      'Márcalos como pagados o recibidos cuando ocurran.',
      'Pausa un pago unos meses o elimínalo solo de este mes.',
    ],
  },
  cuentas: {
    title: 'Dinero',
    points: [
      'Anota dónde está tu dinero: cuentas, efectivo y tarjetas de crédito.',
      'Disponible suma cuentas y efectivo; las tarjetas no, porque es lo que debes.',
      'Usa Transferir para mover dinero o pagar una tarjeta sin contarlo como gasto.',
    ],
  },
  tarjetas: {
    title: 'Tarjetas',
    points: [
      'Agrega tu tarjeta con su límite y sus días de corte y pago.',
      'Revisa cuánto debes del corte y cuánto te falta para pagarlo.',
      'Paga la tarjeta con Transferir: sale de una cuenta y baja lo que debes.',
    ],
  },
  metas: {
    title: 'Metas',
    points: [
      'Crea una meta con un monto objetivo y, si quieres, una fecha.',
      'Aporta cuando puedas y mira cuánto llevas.',
      'Retira si lo necesitas: lo que aportas no cuenta como gasto.',
    ],
  },
  deudas: {
    title: 'Deudas',
    points: [
      'Anota lo que debes o lo que te deben, con su tasa y sus cuotas.',
      'Registra cada pago y mira cómo baja el saldo.',
      'Paga las cuotas del mes desde Fijos, en "Cuotas de deudas".',
    ],
  },
  reportes: {
    title: 'Reportes',
    points: [
      'Compara tus ingresos y gastos de 3, 6 o 12 meses.',
      'Toca una categoría para ver cómo cambió mes a mes.',
      'Exporta el mes a PDF para guardarlo o compartirlo.',
    ],
  },
};

/** Orden en que se listan en Ajustes › Ayuda. */
export const HELP_TOPICS: HelpTopic[] = ['inicio', 'movimientos', 'fijos', 'cuentas', 'tarjetas', 'metas', 'deudas', 'reportes'];
