import { ArrowLeft, LogOut } from "lucide-react";

interface FinanceiroHeaderProps {
  brandName: string;
  logoUrl?: string | null;
  sellerLabel?: string | null;
  onBack: () => void;
  onLogout: () => void;
}

export function FinanceiroHeader({
  brandName,
  logoUrl,
  sellerLabel,
  onBack,
  onLogout,
}: FinanceiroHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/95 backdrop-blur">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-300">
            <ArrowLeft className="h-5 w-5" />
          </button>
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} className="h-7 w-7 rounded-lg object-contain" />
          ) : (
            <div className="h-7 w-7 rounded-lg bg-gray-800" />
          )}
          <div>
            <span className="text-sm font-bold text-white">{brandName}</span>
            <p className="text-[10px] text-gray-500">
              Financeiro{sellerLabel ? ` · ${sellerLabel}` : ""}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
        >
          <LogOut className="h-3.5 w-3.5" /> Sair
        </button>
      </div>
    </header>
  );
}
