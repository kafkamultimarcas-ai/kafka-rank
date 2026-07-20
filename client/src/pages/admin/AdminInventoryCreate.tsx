import DashboardLayout from "@/components/DashboardLayout";
import InventoryVehicleForm, { type InventoryPendingUpload, type InventoryVehicleFormSubmitPayload } from "@/components/inventory/InventoryVehicleForm";
import { trpc } from "@/lib/trpc";
import { buildTenantPath, getCurrentTenantSlug } from "@/lib/tenant";
import { type InventoryCreateDetailedInput, type InventoryUpdateDetailedInput } from "@shared/inventory";
import { toast } from "sonner";
import { useLocation } from "wouter";

async function fileToBase64(upload: InventoryPendingUpload) {
  const reader = new FileReader();
  return new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(new Error(`Falha ao ler ${upload.fileName}`));
    reader.readAsDataURL(upload.file);
  });
}

export default function AdminInventoryCreate() {
  const [, setLocation] = useLocation();
  const tenantSlug = getCurrentTenantSlug();
  const createMutation = trpc.inventory.createDetailed.useMutation();
  const updateMutation = trpc.inventory.updateDetailed.useMutation();
  const uploadMediaMutation = trpc.inventory.uploadMedia.useMutation();

  const handleSubmit = async ({ data, pendingUploads }: InventoryVehicleFormSubmitPayload) => {
    try {
      const payload = data as InventoryCreateDetailedInput | InventoryUpdateDetailedInput;
      const hasUploadedImageQueue = pendingUploads.some((item) => item.mediaType === "image");
      const hasLinkedImage = Boolean(payload.photoUrl) || (Array.isArray(payload.photos) && payload.photos.length > 0);
      const needsDraftFirst = payload.isPublished === true && hasUploadedImageQueue && !hasLinkedImage;

      const created = await createMutation.mutateAsync({
        ...payload,
        isPublished: needsDraftFirst ? false : payload.isPublished,
      });

      for (const upload of pendingUploads) {
        const base64 = await fileToBase64(upload);
        await uploadMediaMutation.mutateAsync({
          vehicleId: created.id,
          fileName: upload.fileName,
          base64,
          mimeType: upload.mimeType,
          width: upload.width,
          height: upload.height,
          durationSeconds: upload.durationSeconds,
        });
      }

      if (needsDraftFirst) {
        await updateMutation.mutateAsync({
          ...payload,
          id: created.id,
          isPublished: true,
        });
      }

      toast.success("Veículo cadastrado com sucesso.");
      setLocation(buildTenantPath(tenantSlug, "/admin/estoque"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao cadastrar veículo.";
      toast.error(message);
    }
  };

  return (
    <DashboardLayout>
      <InventoryVehicleForm
        mode="create"
        isSubmitting={createMutation.isPending || updateMutation.isPending || uploadMediaMutation.isPending}
        onCancel={() => setLocation(buildTenantPath(tenantSlug, "/admin/estoque"))}
        onSubmit={handleSubmit}
      />
    </DashboardLayout>
  );
}
