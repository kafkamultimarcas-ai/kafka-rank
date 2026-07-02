import { trpc } from "@/lib/trpc";
import { getTenantSlugFromPath } from "@/lib/tenant";
import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useLocation } from "wouter";

type TenantContextValue = {
  tenantSlug: string | null;
  tenant: {
    id: number;
    name: string;
    slug: string;
    logoUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    status: string;
  } | null;
  isLoading: boolean;
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const tenantSlug = getTenantSlugFromPath(location);
  const { data, isLoading } = trpc.tenantPublic.getBySlug.useQuery(
    { slug: tenantSlug || "" },
    {
      enabled: !!tenantSlug,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    if (data?.primaryColor) {
      root.style.setProperty("--tenant-primary", data.primaryColor);
    } else {
      root.style.removeProperty("--tenant-primary");
    }

    if (data?.secondaryColor) {
      root.style.setProperty("--tenant-secondary", data.secondaryColor);
    } else {
      root.style.removeProperty("--tenant-secondary");
    }
  }, [data?.primaryColor, data?.secondaryColor]);

  const value = useMemo<TenantContextValue>(() => ({
    tenantSlug,
    tenant: data ?? null,
    isLoading,
  }), [data, isLoading, tenantSlug]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return context;
}
