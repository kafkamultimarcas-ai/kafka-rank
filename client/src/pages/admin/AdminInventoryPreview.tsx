import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { buildTenantPath, getCurrentTenantSlug } from "@/lib/tenant";
import { ArrowLeft, Car, Loader2 } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { formatBRL } from "@shared/inventory";

function formatPrice(value: number | null | undefined) {
  return formatBRL(value, "Consulte");
}

function parsePhotos(value: unknown): string[] {
  if (!value || typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export default function AdminInventoryPreview() {
  const params = useParams() as { id?: string };
  const [, setLocation] = useLocation();
  const tenantSlug = getCurrentTenantSlug();
  const vehicleId = Number(params.id);

  const vehicleQuery = trpc.inventory.getAdminById.useQuery(
    { id: vehicleId },
    { enabled: Number.isFinite(vehicleId) && vehicleId > 0 }
  );

  if (vehicleQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const vehicle = vehicleQuery.data;
  const photos = parsePhotos(vehicle?.photos);
  const photo = vehicle?.photoUrl || photos[0] || null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="gap-2" onClick={() => setLocation(buildTenantPath(tenantSlug, `/admin/estoque/${vehicleId}/editar`))}>
            <ArrowLeft className="h-4 w-4" />
            Voltar para edição
          </Button>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Preview da vitrine</p>
            <p className="text-sm text-muted-foreground">Visualização interna antes da publicação</p>
          </div>
        </div>

        {!vehicle ? (
          <Card className="border-border/60 bg-card/85">
            <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-3">
              <Car className="h-10 w-10 text-muted-foreground" />
              <p className="text-foreground">Veículo não encontrado para preview.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
            <Card className="overflow-hidden border-border/60 bg-card/85">
              <CardContent className="p-0">
                <div className="aspect-[16/10] bg-muted">
                  {photo ? (
                    <img src={photo} alt={`${vehicle.brand} ${vehicle.model}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Car className="h-14 w-14 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/85">
              <CardContent className="space-y-4 p-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Título exibido</p>
                  <h1 className="mt-2 text-3xl font-bold text-foreground">
                    {(vehicle.title || `${vehicle.brand} ${vehicle.model}`).trim()}
                  </h1>
                  {vehicle.version ? <p className="mt-1 text-sm text-muted-foreground">{vehicle.version}</p> : null}
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Preço em vitrine</p>
                  <p className="mt-2 text-3xl font-semibold text-emerald-400">{formatPrice(vehicle.price)}</p>
                  {vehicle.offerPrice ? <p className="mt-1 text-sm text-orange-300">Oferta: {formatPrice(vehicle.offerPrice)}</p> : null}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Ano</p>
                    <p className="font-semibold text-foreground">{vehicle.modelYear || vehicle.year || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">KM</p>
                    <p className="font-semibold text-foreground">{vehicle.km ? `${Number(vehicle.km).toLocaleString("pt-BR")} km` : "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Câmbio</p>
                    <p className="font-semibold text-foreground">{vehicle.transmission || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Combustível</p>
                    <p className="font-semibold text-foreground">{vehicle.fuel || "—"}</p>
                  </div>
                </div>

                {vehicle.observation ? (
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Descrição pública</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{vehicle.observation}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
