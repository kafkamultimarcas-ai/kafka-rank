import { trpc } from "@/lib/trpc";
import { getTenantSlugFromPath } from "@/lib/tenant";
import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useLocation } from "wouter";

export const DEFAULT_LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028900346/NKs9YYU4Bt79zUwnWH56wx/kafka-rank-logo-gTPVVbk3XkgaZ4gQf48tvP.webp";
export const DEFAULT_APP_NAME = "Kafka Rank";

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
    // Sobrescreve os tokens de tema (definidos em index.css) com a cor da loja, quando
    // configurada. --primary/--secondary alimentam todas as classes utilitárias
    // (bg-primary, text-primary etc via @theme inline), então isso já propaga para o
    // app inteiro sem precisar tocar em cada componente.
    if (data?.primaryColor) {
      root.style.setProperty("--primary", data.primaryColor);
      root.style.setProperty("--ring", data.primaryColor);
      root.style.setProperty("--sidebar-primary", data.primaryColor);
      root.style.setProperty("--sidebar-ring", data.primaryColor);
    } else {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--sidebar-primary");
      root.style.removeProperty("--sidebar-ring");
    }

    if (data?.secondaryColor) {
      root.style.setProperty("--secondary", data.secondaryColor);
    } else {
      root.style.removeProperty("--secondary");
    }

    if (data?.name) {
      document.title = data.name;
    }
  }, [data?.primaryColor, data?.secondaryColor, data?.name]);

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

/** Nome e logo da loja atual, com fallback para a marca padrão (Kafka Rank) quando não há tenant resolvido. */
export function useBranding() {
  const { tenant } = useTenant();
  return {
    name: tenant?.name || DEFAULT_APP_NAME,
    logoUrl: tenant?.logoUrl || DEFAULT_LOGO_URL,
  };
}
