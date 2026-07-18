import { useState } from "react";
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
  const { data: sellerSession } = trpc.sellers.me.useQuery();

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
      {mainTab === "contas" && <ContasTab />}
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
