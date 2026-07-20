/** Nomes dos meses (índice 0-11) — fonte única para todo o app. */
export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

/** Rótulo do mês, opcionalmente com ano: "Julho" ou "Julho 2026". */
export function monthLabel(month: number, year?: number): string {
  const name = MONTH_NAMES[month] ?? "";
  return year != null ? `${name} ${year}`.trim() : name;
}
