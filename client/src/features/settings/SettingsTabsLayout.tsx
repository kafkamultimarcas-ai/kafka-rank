import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type SettingsTab = {
  /** Identificador único da aba (usado no estado e como key). */
  key: string;
  label: string;
  icon: LucideIcon;
  /** Conteúdo renderizado quando a aba está ativa. */
  content: ReactNode;
};

/**
 * Layout de abas reutilizável para telas de configurações (admin e CRM),
 * no mesmo estilo "pill" usado no CRM. Config-driven: recebe a lista de abas.
 */
export function SettingsTabsLayout({
  tabs,
  defaultTab,
}: {
  tabs: SettingsTab[];
  defaultTab?: string;
}) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.key);
  const current = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];

  return (
    <div className="w-full">
      {/* Navegação das abas */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-accent/30 border border-border mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba ativa */}
      <div key={current?.key} className="animate-fade-in">
        {current?.content}
      </div>
    </div>
  );
}
