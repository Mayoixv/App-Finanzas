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
