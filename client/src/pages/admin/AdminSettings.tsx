import DashboardLayout from "@/components/DashboardLayout";
import { KeyRound, Plug2, Shield, Store, Users } from "lucide-react";
import {
  SettingsIntegrationsTab,
  SettingsSecurityTab,
  SettingsStoreTab,
  SettingsUsersTab,
} from "@/pages/crm/CrmAdminDashboard";
import { AccessCodeTab } from "@/features/settings/AccessCodeTab";
import { SettingsTabsLayout, type SettingsTab } from "@/features/settings/SettingsTabsLayout";

const SETTINGS_TABS: SettingsTab[] = [
  { key: "usuarios", label: "Usuários Admin", icon: Users, content: <SettingsUsersTab /> },
  { key: "loja", label: "Dados da Loja", icon: Store, content: <SettingsStoreTab /> },
  { key: "integracoes", label: "Integrações", icon: Plug2, content: <SettingsIntegrationsTab /> },
  { key: "seguranca", label: "Segurança", icon: Shield, content: <SettingsSecurityTab /> },
  { key: "acesso", label: "Código de Acesso", icon: KeyRound, content: <AccessCodeTab /> },
];

export default function AdminSettings() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-bold text-xl text-foreground">Configurações</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie o acesso e configurações do app</p>
        </div>

        <SettingsTabsLayout tabs={SETTINGS_TABS} />
      </div>
    </DashboardLayout>
  );
}
