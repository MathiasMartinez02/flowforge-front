const TONES = {
  lime: "bg-lime text-lime-ink",
  pink: "bg-pink text-lime-ink",
  violet: "bg-violet text-white",
  faint: "bg-faint text-muted",
} as const;

// Chip relleno de estado (activo/completado = lime, fallido = pink, pendiente = violet, borrador = faint).
export function StatusBadge({ tone, children }: { tone: keyof typeof TONES; children: React.ReactNode }) {
  return (
    <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${TONES[tone]}`}>
      {children}
    </span>
  );
}
