import DashboardLayout from "@/components/DashboardLayout";
import { MetaIntegrationConfig } from "@/features/integrations/MetaIntegrationConfig";

/**
 * Rota dedicada da integração Meta. A configuração vive no componente
 * compartilhado `MetaIntegrationConfig`, que também é embutido na aba
 * Configurações → Integrações (fonte única).
 */
export default function AdminMetaIntegration() {
  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integração Meta (Facebook + Instagram)</h1>
          <p className="text-muted-foreground mt-1">
            Receba leads de anúncios, DMs e comentários automaticamente no CRM
          </p>
        </div>
        <MetaIntegrationConfig defaultOpen />
      </div>
    </DashboardLayout>
  );
}
