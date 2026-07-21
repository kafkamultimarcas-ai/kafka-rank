/**
 * Aplicação de branding do tenant (cores da loja) nos tokens de tema.
 *
 * - Primária: usada crua em botões/accents (--primary e derivados).
 * - Secundária: usada como *tint* (matiz) das superfícies escuras — menu, cards,
 *   fundo, bordas — via `color-mix`, ancorando num tom escuro para não quebrar o
 *   dark theme (mantém contraste/legibilidade). Também define --secondary cru.
 *
 * Fonte única usada pelo TenantContext (branding persistido) e pelo preview ao
 * vivo da aba "Dados da Loja".
 */

type BrandingColors = {
  primaryColor?: string | null;
  secondaryColor?: string | null;
};

const PRIMARY_VARS = ["--primary", "--ring", "--sidebar-primary", "--sidebar-ring"] as const;

// [token, % da secundária, base escura (valor original do index.css)]
const SECONDARY_TINTS: Array<[string, number, string]> = [
  ["--background", 6, "oklch(0.13 0.01 250)"],
  ["--sidebar", 8, "oklch(0.15 0.015 250)"],
  ["--card", 10, "oklch(0.17 0.015 250)"],
  ["--popover", 10, "oklch(0.17 0.015 250)"],
  ["--muted", 10, "oklch(0.22 0.015 250)"],
  ["--accent", 14, "oklch(0.25 0.02 250)"],
  ["--input", 14, "oklch(0.25 0.02 250)"],
  ["--border", 16, "oklch(0.28 0.02 250)"],
  ["--sidebar-accent", 14, "oklch(0.22 0.02 250)"],
  ["--sidebar-border", 16, "oklch(0.28 0.02 250)"],
];

const SECONDARY_VARS = ["--secondary", ...SECONDARY_TINTS.map(([token]) => token)];

/** Aplica (ou remove) as cores da loja nos tokens de tema do elemento raiz. */
export function applyTenantBranding(root: HTMLElement, colors: BrandingColors) {
  const { primaryColor, secondaryColor } = colors;

  if (primaryColor) {
    for (const v of PRIMARY_VARS) root.style.setProperty(v, primaryColor);
  } else {
    for (const v of PRIMARY_VARS) root.style.removeProperty(v);
  }

  if (secondaryColor) {
    root.style.setProperty("--secondary", secondaryColor);
    for (const [token, pct, base] of SECONDARY_TINTS) {
      root.style.setProperty(token, `color-mix(in oklab, ${secondaryColor} ${pct}%, ${base})`);
    }
  } else {
    for (const v of SECONDARY_VARS) root.style.removeProperty(v);
  }
}
