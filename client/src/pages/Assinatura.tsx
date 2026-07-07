import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import AssinaturaContent from "@/components/billing/AssinaturaContent";
import { buildTenantPath, getCurrentTenantSlug } from "@/lib/tenant";

export default function Assinatura() {
  const [, navigate] = useLocation();
  const tenantSlug = getCurrentTenantSlug();

  return (
    <DashboardLayout>
      <AssinaturaContent
        headerAction={
          <Button variant="outline" onClick={() => navigate(buildTenantPath(tenantSlug, "/admin"))}>
            Voltar ao painel
          </Button>
        }
      />
    </DashboardLayout>
  );
}
