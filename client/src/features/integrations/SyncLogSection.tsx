import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

/** Bloco reutilizável de "Sincronizar agora" + status da última verificação. */
export function SyncLogSection({
  integrationType,
  mutationKey,
}: {
  integrationType: string;
  mutationKey: "syncWhatsapp" | "syncSig" | "syncOlx" | "syncMeta";
}) {
  const { data: logs, refetch } = trpc.crmIntegrations.getSyncLogs.useQuery({ integrationType });
  const sync = (trpc.crmIntegrations as any)[mutationKey].useMutation({
    onSuccess: () => { toast.success("Verificação concluída!"); refetch(); },
    onError: (e: any) => { toast.error("Erro: " + e.message); refetch(); },
  });
  const lastLog = logs?.[0];
  return (
    <div className="pt-2 border-t border-border/50 space-y-2">
      <Button size="sm" variant="outline" className="text-xs" onClick={() => sync.mutate()} disabled={sync.isPending}>
        <RefreshCw className={`w-3.5 h-3.5 mr-1 ${sync.isPending ? "animate-spin" : ""}`} />
        {sync.isPending ? "Verificando..." : "Sincronizar Agora"}
      </Button>
      {lastLog && (
        <div className="text-[11px] text-muted-foreground">
          <span className={lastLog.status === "success" ? "text-green-400" : "text-red-400"}>
            {lastLog.status === "success" ? "✓ Última verificação" : "✗ Falha"}
          </span>
          {" "}em {new Date(lastLog.createdAt).toLocaleString("pt-BR")}
          {lastLog.summary ? ` — ${lastLog.summary}` : ""}
          {lastLog.status === "error" && lastLog.errorMessage ? ` — ${lastLog.errorMessage}` : ""}
        </div>
      )}
    </div>
  );
}
