import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { buildTenantPath, getCurrentTenantSlug } from "@/lib/tenant";

interface PageBackHeaderProps {
  title?: string;
  fallbackPath?: string;
}

export default function PageBackHeader({ title, fallbackPath = "/admin" }: PageBackHeaderProps) {
  const [, setLocation] = useLocation();
  const tenantSlug = getCurrentTenantSlug();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation(buildTenantPath(tenantSlug, fallbackPath));
    }
  };

  return (
    <div className="sticky top-0 z-40 flex items-center gap-3 bg-background/95 backdrop-blur border-b px-4 py-3">
      <button
        onClick={handleBack}
        className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        aria-label="Voltar"
      >
        <ArrowLeft className="w-5 h-5 text-foreground" />
      </button>
      {title && (
        <span className="text-sm font-medium text-foreground truncate">{title}</span>
      )}
    </div>
  );
}
