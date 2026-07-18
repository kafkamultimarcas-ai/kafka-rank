import type { LucideIcon } from "lucide-react";
import { FINANCEIRO_STATIC_TAB_CLASSES, type FinanceiroTabDefinition, type MainTab } from "@/features/financeiro/utils/constants";

interface FinanceiroTabsProps {
  tabs: FinanceiroTabDefinition[];
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  onNavigate: (href: string) => void;
}

function TabButton({
  label,
  icon: Icon,
  active,
  activeClass,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  activeClass?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 border-b-2 px-3 py-3 text-center text-xs font-bold transition-all ${
        active
          ? activeClass
          : "border-transparent text-gray-500 hover:text-gray-300"
      }`}
    >
      <Icon className="mr-1 inline h-4 w-4" />
      {label}
    </button>
  );
}

export function FinanceiroTabs({
  tabs,
  activeTab,
  onTabChange,
  onNavigate,
}: FinanceiroTabsProps) {
  return (
    <div className="overflow-x-auto border-b border-gray-800 bg-gray-950/80">
      <div className="container flex min-w-max px-2">
        {tabs.map((tab) => {
          const active = !!tab.key && activeTab === tab.key;
          const activeClass = tab.key ? FINANCEIRO_STATIC_TAB_CLASSES[tab.key] : tab.activeClass;

          return (
            <TabButton
              key={tab.key || tab.href || tab.label}
              label={tab.label}
              icon={tab.icon}
              active={active}
              activeClass={activeClass}
              onClick={() => {
                if (tab.href) {
                  onNavigate(tab.href);
                  return;
                }
                if (tab.key) {
                  onTabChange(tab.key);
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
