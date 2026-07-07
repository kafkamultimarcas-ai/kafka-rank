export function getTenantSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/t\/([a-z0-9-]+)(?:\/|$)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function getCurrentTenantSlug(): string | null {
  if (typeof window === "undefined") return null;
  return getTenantSlugFromPath(window.location.pathname);
}

export function buildTenantPath(tenantSlug: string | null | undefined, pathname: string): string {
  if (!pathname.startsWith("/")) {
    pathname = `/${pathname}`;
  }

  if (!tenantSlug) return pathname;
  if (pathname.startsWith(`/t/${tenantSlug}/`) || pathname === `/t/${tenantSlug}`) {
    return pathname;
  }

  if (pathname === "/" || pathname === "/404" || pathname.startsWith("/super-admin")) {
    return pathname;
  }

  return `/t/${tenantSlug}${pathname}`;
}

export function getTenantLoginPath(_tenantSlug: string | null | undefined): string {
  return "/login";
}
