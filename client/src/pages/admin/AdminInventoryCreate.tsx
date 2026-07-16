import DashboardLayout from "@/components/DashboardLayout";
import InventoryVehicleForm from "@/components/inventory/InventoryVehicleForm";
import { trpc } from "@/lib/trpc";
import { buildTenantPath, getCurrentTenantSlug } from "@/lib/tenant";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function AdminInventoryCreate() {
  const [, setLocation] = useLocation();
  const tenantSlug = getCurrentTenantSlug();
  const createMutation = trpc.inventory.createDetailed.useMutation({
    onSuccess: () => {
      toast.success("Veículo cadastrado com sucesso.");
      setLocation(buildTenantPath(tenantSlug, "/admin/estoque"));
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <DashboardLayout>
      <InventoryVehicleForm
        mode="create"
        isSubmitting={createMutation.isPending}
        onCancel={() => setLocation(buildTenantPath(tenantSlug, "/admin/estoque"))}
        onSubmit={(payload) => createMutation.mutate(payload)}
      />
    </DashboardLayout>
  );
}
