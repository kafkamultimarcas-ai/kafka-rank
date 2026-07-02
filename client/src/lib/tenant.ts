export function getTenantSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/t\/([a-z0-9-]+)(?:\/|$)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function getCurrentTenantSlug(): string | null {
  if (typeof window === "undefined") return null;
  return getTenantSlugFromPath(window.location.pathname);
}
