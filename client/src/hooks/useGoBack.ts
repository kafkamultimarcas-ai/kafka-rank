import { useCallback } from "react";
import { useLocation } from "wouter";
import { buildTenantPath, getCurrentTenantSlug } from "@/lib/tenant";

/**
 * Hook that provides a safe "go back" function.
 * Uses browser history.back() when there's history available,
 * otherwise falls back to the admin dashboard or minha-area.
 */
export function useGoBack(fallbackPath?: string) {
  const [, setLocation] = useLocation();
  const tenantSlug = getCurrentTenantSlug();

  const goBack = useCallback(() => {
    // If there's browser history, use it (preserves tenant context)
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback: navigate to admin or provided fallback
      const path = fallbackPath || "/admin";
      setLocation(buildTenantPath(tenantSlug, path));
    }
  }, [setLocation, tenantSlug, fallbackPath]);

  return goBack;
}
