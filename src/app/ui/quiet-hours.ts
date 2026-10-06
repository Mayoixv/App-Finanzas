/** Si la hora cae dentro del silencio [start, end) (puede cruzar la medianoche, p. ej. 22 → 7). */
export function inQuiet(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

/** Mueve un aviso que caería en horas de silencio al final del silencio (ese día o el siguiente). */
export function deferPastQuiet(at: Date, start: number, end: number): Date {
  if (!inQuiet(at.getHours(), start, end)) return at;
  const out = new Date(at);
  out.setHours(end, 0, 0, 0);
  if (out <= at) out.setDate(out.getDate() + 1);
  return out;
}

/**
 * Para recordatorios que dicen "hoy" o "mañana": los mueve fuera del silencio sin cambiar de día.
 * Si cae al final de la noche (22:00 con silencio 22 → 7), lo adelanta a la hora anterior al silencio;
 * si cae de madrugada (02:00), lo pasa al final del silencio de ese mismo día.
 */
export function fitInSameDay(at: Date, start: number, end: number): Date {
  const hour = at.getHours();
  if (!inQuiet(hour, start, end)) return at;
  const out = new Date(at);
  const crossesMidnight = start > end;
  if (crossesMidnight && hour >= start) out.setHours(Math.max(0, start - 1), 0, 0, 0);
  else out.setHours(end, 0, 0, 0);
  return out;
}
