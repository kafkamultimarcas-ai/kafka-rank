import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import InventoryVehicleForm from "@/components/inventory/InventoryVehicleForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { buildTenantPath, getCurrentTenantSlug } from "@/lib/tenant";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

export default function AdminInventoryEdit() {
  const params = useParams() as { id?: string };
  const vehicleId = Number(params.id);
  const [, setLocation] = useLocation();
  const tenantSlug = getCurrentTenantSlug();
  const [historyOpen, setHistoryOpen] = useState(false);

  const vehicleQuery = trpc.inventory.getAdminById.useQuery(
    { id: vehicleId },
    { enabled: Number.isFinite(vehicleId) && vehicleId > 0 }
  );

  const historyQuery = trpc.inventory.auditLogs.useQuery(
    { inventoryId: vehicleId },
    { enabled: historyOpen && Number.isFinite(vehicleId) && vehicleId > 0 }
  );

  const updateMutation = trpc.inventory.updateDetailed.useMutation({
    onSuccess: () => {
      toast.success("Veículo atualizado com sucesso.");
      setLocation(buildTenantPath(tenantSlug, "/admin/estoque"));
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <DashboardLayout>
      {!Number.isFinite(vehicleId) || vehicleId <= 0 ? (
        <Alert className="border-destructive/40 bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>ID inválido</AlertTitle>
          <AlertDescription>
            O veículo informado para edição não é válido.
          </AlertDescription>
        </Alert>
      ) : vehicleQuery.isLoading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !vehicleQuery.data ? (
        <div className="space-y-4">
          <Alert className="border-destructive/40 bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Veículo não encontrado</AlertTitle>
            <AlertDescription>
              Esse registro não foi localizado neste tenant ou já foi removido.
            </AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => setLocation(buildTenantPath(tenantSlug, "/admin/estoque"))}>
            Voltar para listagem
          </Button>
        </div>
      ) : (
        <>
          <InventoryVehicleForm
            mode="edit"
            initialVehicle={vehicleQuery.data}
            isSubmitting={updateMutation.isPending}
            onCancel={() => setLocation(buildTenantPath(tenantSlug, "/admin/estoque"))}
            onSubmit={(payload) => updateMutation.mutate(payload)}
            onShowHistory={() => setHistoryOpen(true)}
          />

          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Histórico e auditoria do veículo</DialogTitle>
              </DialogHeader>
              <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
                {historyQuery.isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : !historyQuery.data?.length ? (
                  <p className="text-sm text-muted-foreground">Nenhum evento de auditoria encontrado.</p>
                ) : (
                  historyQuery.data.map((entry: any) => (
                    <div key={entry.id} className="rounded-2xl border border-border/60 bg-card/80 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{entry.summary}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.actorName || "Sistema"} • {new Date(entry.createdAt).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{entry.action}</span>
                      </div>
                      {entry.changedFieldsList?.length ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Campos: {entry.changedFieldsList.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </DashboardLayout>
  );
}
