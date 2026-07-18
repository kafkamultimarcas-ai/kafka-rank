import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { buildTenantPath, getCurrentTenantSlug } from "@/lib/tenant";
import { trpc } from "@/lib/trpc";
import { FinanceiroHeader } from "@/features/financeiro/components/FinanceiroHeader";
import { FinanceiroTabs } from "@/features/financeiro/components/FinanceiroTabs";
import { DashboardTab } from "@/features/financeiro/tabs/DashboardTab";
import { ContasTab } from "@/features/financeiro/tabs/ContasTab";
import { GasolinaTab } from "@/features/financeiro/tabs/GasolinaTab";
import { PosVendaTab } from "@/features/financeiro/tabs/PosVendaTab";
import { RelatoriosTab } from "@/features/financeiro/tabs/RelatoriosTab";
import type { FinanceiroTabDefinition, MainTab } from "@/features/financeiro/utils/constants";
import { FINANCEIRO_MENU_ICONS } from "@/features/financeiro/utils/constants";
import { useBranding } from "@/contexts/TenantContext";
import { Building2 } from "lucide-react";
import { AdminFinanceiroInner } from "@/pages/admin/AdminFinanceiro";
import { FornecedoresInner } from "@/pages/Fornecedores";

export default function Financeiro() {
  const { logoUrl, name: brandName } = useBranding();
  const [, navigate] = useLocation();
  const [mainTab, setMainTab] = useState<MainTab>("dashboard");
  const [initialContaId, setInitialContaId] = useState<number | null>(null);
  const { data: sellerSession } = trpc.sellers.me.useQuery();

  // Deep-link support: read ?tab=contas&contaId=123 from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const contaId = params.get("contaId");
    if (tab && ["dashboard", "contas", "admin-financeiro", "pos-venda", "gasolina", "relatorios", "fornecedor"].includes(tab)) {
      setMainTab(tab as MainTab);
    }
    if (contaId) {
      setInitialContaId(Number(contaId));
    }
    // Clean URL params after reading
    if (tab || contaId) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const logoutMutation = trpc.sellers.logout.useMutation({
    onSuccess: () => {
      window.location.href = buildTenantPath(getCurrentTenantSlug(), "/login");
    },
  });

  const tabs: FinanceiroTabDefinition[] = [
    { key: "dashboard", label: "Painel", icon: FINANCEIRO_MENU_ICONS.dashboard },
    { key: "contas", label: "Contas", icon: FINANCEIRO_MENU_ICONS.contas },
    { key: "admin-financeiro", label: "Financeiro", icon: FINANCEIRO_MENU_ICONS.adminFinanceiro },
    { key: "pos-venda", label: "Pós-Venda", icon: FINANCEIRO_MENU_ICONS.posVenda },
    { key: "gasolina", label: "Gasolina", icon: FINANCEIRO_MENU_ICONS.gasolina },
    { key: "relatorios", label: "Relatórios", icon: FINANCEIRO_MENU_ICONS.relatorios },
    { key: "fornecedor", label: "Fornecedor", icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <FinanceiroHeader
        brandName={brandName}
        logoUrl={logoUrl}
        sellerLabel={sellerSession ? sellerSession.nickname || sellerSession.name : null}
        sellerId={sellerSession?.id}
        onBack={() => navigate(buildTenantPath(getCurrentTenantSlug(), "/"))}
        onLogout={() => logoutMutation.mutate()}
      />

      <FinanceiroTabs
        tabs={tabs}
        activeTab={mainTab}
        onTabChange={setMainTab}
        onNavigate={navigate}
      />

      {mainTab === "dashboard" && <DashboardTab />}
      {mainTab === "contas" && <ContasTab initialContaId={initialContaId} />}
      {mainTab === "admin-financeiro" && (
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <AdminFinanceiroInner />
        </div>
      )}
      {mainTab === "pos-venda" && <PosVendaTab />}
      {mainTab === "gasolina" && <GasolinaTab />}
      {mainTab === "relatorios" && <RelatoriosTab />}
      {mainTab === "fornecedor" && (
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <FornecedoresInner />
        </div>
      )}
    </div>
  );
}
