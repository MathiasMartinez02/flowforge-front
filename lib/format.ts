// Utilidades de formato de fecha/duracion compartidas por el dashboard, el detalle de workflow y el timeline de runs.

// "hace 12 min" / "hace 2 h" / "recién" — relativo a ahora, para listas de historial.
export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "-";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

// Duracion entre dos timestamps ISO, en ms o segundos segun corresponda ("340ms" / "4.8s").
export function formatDuration(startIso: string | null, endIso: string | null): string {
  if (!startIso || !endIso) return "-";
  return formatMs(new Date(endIso).getTime() - new Date(startIso).getTime());
}

export function formatMs(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

// Hora local en formato reloj (HH:MM:SS), para el header del detalle de un run.
export function formatClock(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("es-AR", { hour12: false });
}
