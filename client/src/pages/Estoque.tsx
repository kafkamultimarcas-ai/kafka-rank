import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { useGoBack } from "@/hooks/useGoBack";
import { ArrowLeft, Search, Car, ExternalLink, ChevronDown, ChevronUp, X, Fuel, Gauge, Palette, Calendar, Tag, Copy, Check, Send, Download, ZoomIn, ChevronLeft, ChevronRight, Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useBranding } from "@/contexts/TenantContext";
import { getCurrentTenantSlug } from "@/lib/tenant";

function formatPrice(v: number | null | undefined) {
  if (!v) return "Consulte";
  return `R$ ${Number(v).toLocaleString("pt-BR")}`;
}

// Detecta padrões de preço na busca: "até 30 mil", "ate 50000", "até 100k", "30000", etc.
function extractPriceFilter(text: string): { cleanSearch: string; maxPrice?: number; minPrice?: number } {
  if (!text) return { cleanSearch: "" };

  // Pattern: "até X mil" ou "ate X mil" ou "até Xk"
  const ateMatch = text.match(/at[eé]\s*(\d+[\.,]?\d*)\s*(mil|k)?/i);
  if (ateMatch) {
    let value = parseFloat(ateMatch[1].replace(",", "."));
    if (ateMatch[2] && (ateMatch[2].toLowerCase() === "mil" || ateMatch[2].toLowerCase() === "k")) {
      value *= 1000;
    } else if (value < 1000) {
      value *= 1000;
    }
    const cleanSearch = text.replace(/at[eé]\s*\d+[\.,]?\d*\s*(mil|k)?/i, "").trim();
    return { cleanSearch, maxPrice: value };
  }

  // Pattern: "de X a Y" ou "de X até Y"
  const rangeMatch = text.match(/de\s*(\d+[\.,]?\d*)\s*(mil|k)?\s*(a|at[eé]|até)\s*(\d+[\.,]?\d*)\s*(mil|k)?/i);
  if (rangeMatch) {
    let minVal = parseFloat(rangeMatch[1].replace(",", "."));
    if (rangeMatch[2] && (rangeMatch[2].toLowerCase() === "mil" || rangeMatch[2].toLowerCase() === "k")) {
      minVal *= 1000;
    } else if (minVal < 1000) {
      minVal *= 1000;
    }
    let maxVal = parseFloat(rangeMatch[4].replace(",", "."));
    if (rangeMatch[5] && (rangeMatch[5].toLowerCase() === "mil" || rangeMatch[5].toLowerCase() === "k")) {
      maxVal *= 1000;
    } else if (maxVal < 1000) {
      maxVal *= 1000;
    }
    const cleanSearch = text.replace(/de\s*\d+[\.,]?\d*\s*(mil|k)?\s*(a|at[eé]|até)\s*\d+[\.,]?\d*\s*(mil|k)?/i, "").trim();
    return { cleanSearch, minPrice: minVal, maxPrice: maxVal };
  }

  return { cleanSearch: text };
}

// Detectar se é iOS
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export default function Estoque() {
  const { logoUrl, name: brandName } = useBranding();
  const [, setLocation] = useLocation();
  const goBack = useGoBack("/admin");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("available");
  const [brandFilter, setBrandFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(() => {
    const veiculoParam = new URLSearchParams(window.location.search).get("veiculo");
    return veiculoParam ? Number(veiculoParam) : null;
  });
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const referredSellerId = useMemo(() => {
    const v = new URLSearchParams(window.location.search).get("vendedor");
    return v ? Number(v) : null;
  }, []);

  // Lightbox state
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // "Tenho Interesse" modal state
  const [interestVehicle, setInterestVehicle] = useState<any | null>(null);
  const [interestName, setInterestName] = useState("");
  const [interestPhone, setInterestPhone] = useState("");
  const [interestSending, setInterestSending] = useState(false);

  const submitInterest = async () => {
    if (!interestVehicle || interestName.trim().length < 2) return;
    setInterestSending(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const res = await fetch("/api/webhooks/widget/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: interestName.trim(),
          phone: interestPhone.trim() || null,
          vehicleInterest: `${interestVehicle.brand} ${interestVehicle.model} (#${interestVehicle.id})`,
          tenantSlug: getCurrentTenantSlug(),
          pageUrl: window.location.href,
          utmSource: params.get("utm_source") || undefined,
          utmMedium: params.get("utm_medium") || undefined,
          utmCampaign: params.get("utm_campaign") || undefined,
          sellerId: referredSellerId || undefined,
          formId: "estoque_publico",
        }),
      });
      if (!res.ok) throw new Error("Falha ao enviar");
      toast.success("Recebemos seu interesse! Entraremos em contato em breve.");
      setInterestVehicle(null);
      setInterestName("");
      setInterestPhone("");
    } catch {
      toast.error("Não deu pra enviar agora. Tenta de novo em instantes.");
    } finally {
      setInterestSending(false);
    }
  };

  // Extrair filtro de preço da busca
  const priceFilter = useMemo(() => extractPriceFilter(search), [search]);

  const { data: vehicles, isLoading } = trpc.inventory.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter as any,
    search: priceFilter.cleanSearch || undefined,
    brand: brandFilter || undefined,
    maxPrice: priceFilter.maxPrice || undefined,
    minPrice: priceFilter.minPrice || undefined,
  });
  const { data: brands } = trpc.inventory.brands.useQuery();
  const { data: stats } = trpc.inventory.stats.useQuery();

  // Abrir lightbox
  const openLightbox = (photos: string[], index: number) => {
    setLightboxPhotos(photos);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const sendViaWhatsApp = (v: any) => {
    const photos: string[] = v.photos ? (typeof v.photos === "string" ? JSON.parse(v.photos) : v.photos as string[]) : [];
    const text = `🚗 *${v.brand} ${v.model}*${v.version ? ` ${v.version}` : ""}\n📅 Ano: ${v.year || "N/A"}\n\n${photos.length > 0 ? photos.slice(0, 5).join("\n") : ""}\n\n🏪 *${brandName}*`;
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  // Salvar fotos - abordagem diferente para iOS vs Android
  const savePhotos = async (v: any) => {
    const photos: string[] = v.photos ? (typeof v.photos === "string" ? JSON.parse(v.photos) : v.photos as string[]) : [];
    if (photos.length === 0) {
      toast.error("Nenhuma foto disponível");
      return;
    }
    const maxPhotos = Math.min(photos.length, 5);

    if (isIOS()) {
      // iOS: Abrir no lightbox interno - usuário segura a imagem para salvar
      openLightbox(photos.slice(0, maxPhotos), 0);
      toast.info("Segure a imagem para salvar na galeria.", { duration: 4000 });
    } else {
      // Android: Download direto funciona
      toast.info(`Baixando ${maxPhotos} foto(s)...`);
      for (let i = 0; i < maxPhotos; i++) {
        const filename = `${v.brand}-${v.model}-${i + 1}.jpg`;
        const downloadUrl = `/api/photo-download?url=${encodeURIComponent(photos[i])}&name=${encodeURIComponent(filename)}`;
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = filename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (i < maxPhotos - 1) await new Promise(r => setTimeout(r, 800));
      }
      toast.success(`${maxPhotos} foto(s) salva(s)!`);
    }
  };

  // Compartilhar fotos via Web Share API (funciona em ambos)
  const sharePhotos = async (v: any) => {
    const photos: string[] = v.photos ? (typeof v.photos === "string" ? JSON.parse(v.photos) : v.photos as string[]) : [];
    if (photos.length === 0) {
      toast.error("Nenhuma foto disponível");
      return;
    }
    const maxPhotos = Math.min(photos.length, 5);
    toast.info(`Preparando ${maxPhotos} foto(s)...`);
    
    try {
      const files: File[] = [];
      for (let i = 0; i < maxPhotos; i++) {
        try {
          const downloadUrl = `/api/photo-download?url=${encodeURIComponent(photos[i])}&name=foto.jpg`;
          const response = await fetch(downloadUrl);
          const blob = await response.blob();
          const file = new File([blob], `${v.brand}-${v.model}-${i + 1}.jpg`, { type: "image/jpeg" });
          files.push(file);
        } catch (err) {
          console.error("Erro ao baixar foto", i, err);
        }
      }

      if (files.length === 0) {
        toast.error("Não foi possível preparar as fotos");
        return;
      }

      if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({
          title: `${v.brand} ${v.model}`,
          files,
        });
      } else {
        // Fallback
        savePhotos(v);
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        savePhotos(v);
      }
    }
  };

  const copyVehicleInfo = (v: any) => {
    const text = `${v.brand} ${v.model}${v.version ? ` ${v.version}` : ""}\nAno: ${v.year || "N/A"}\nCor: ${v.color || "N/A"}\nKM: ${v.km ? Number(v.km).toLocaleString("pt-BR") : "N/A"}\nPreço: ${formatPrice(v.price)}${v.fipePrice ? `\nFIPE: ${formatPrice(v.fipePrice)}` : ""}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(v.id);
      toast.success("Info copiada!");
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Indicador visual de filtro de preço ativo
  const hasPriceFilter = !!(priceFilter.maxPrice || priceFilter.minPrice);

  return (
    <div className="min-h-screen bg-background">
      {/* Lightbox / Visualizador de Fotos */}
      {lightboxOpen && lightboxPhotos.length > 0 && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          {/* Header com botão Voltar */}
          <div className="flex items-center justify-between p-4 bg-black/80">
            <button onClick={() => setLightboxOpen(false)} className="flex items-center gap-2 text-white p-2 -ml-2">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Voltar</span>
            </button>
            <span className="text-white/70 text-sm">{lightboxIndex + 1} / {lightboxPhotos.length}</span>
            <button onClick={() => setLightboxOpen(false)} className="text-white/70 hover:text-white p-2">
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Image */}
          <div className="flex-1 flex items-center justify-center px-4 relative">
            {lightboxIndex > 0 && (
              <button
                onClick={() => setLightboxIndex(i => i - 1)}
                className="absolute left-2 z-10 bg-black/50 text-white rounded-full p-2"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            
            <img
              src={lightboxPhotos[lightboxIndex]}
              alt={`Foto ${lightboxIndex + 1}`}
              className="max-h-[70vh] max-w-full object-contain rounded-lg"
            />
            
            {lightboxIndex < lightboxPhotos.length - 1 && (
              <button
                onClick={() => setLightboxIndex(i => i + 1)}
                className="absolute right-2 z-10 bg-black/50 text-white rounded-full p-2"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Dica para iOS */}
          {isIOS() && (
            <p className="text-center text-white/60 text-xs py-1">Segure a imagem para salvar na galeria</p>
          )}

          {/* Thumbnails */}
          <div className="p-3 flex gap-2 overflow-x-auto justify-center bg-black/80">
            {lightboxPhotos.map((photo, i) => (
              <img
                key={i}
                src={photo}
                alt={`Thumb ${i + 1}`}
                onClick={() => setLightboxIndex(i)}
                className={`h-14 w-20 object-cover rounded cursor-pointer border-2 transition-all ${i === lightboxIndex ? "border-white opacity-100" : "border-transparent opacity-50"}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={goBack} className="gap-1.5 -ml-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img src={logoUrl} alt={brandName} className="h-7 w-7 rounded-lg object-contain" />
            <div>
              <span className="font-heading font-bold text-sm text-foreground">{brandName}</span>
              <p className="text-xs text-muted-foreground">Estoque · {vehicles?.length || 0} veículos</p>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      {stats && (
        <div className="border-b border-border bg-card/50">
          <div className="container py-3">
            <div className="flex gap-4 overflow-x-auto text-center">
              <div className="flex-shrink-0">
                <p className="text-lg font-bold text-foreground">{stats.total}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
              <div className="flex-shrink-0">
                <p className="text-lg font-bold text-green-400">{stats.available}</p>
                <p className="text-[10px] text-muted-foreground">Disponíveis</p>
              </div>
              <div className="flex-shrink-0">
                <p className="text-lg font-bold text-amber-400">{stats.reserved}</p>
                <p className="text-[10px] text-muted-foreground">Reservados</p>
              </div>
              <div className="flex-shrink-0">
                <p className="text-lg font-bold text-red-400">{stats.sold}</p>
                <p className="text-[10px] text-muted-foreground">Vendidos</p>
              </div>
              {stats.avgPrice > 0 && (
                <div className="flex-shrink-0">
                  <p className="text-lg font-bold text-primary">{formatPrice(stats.avgPrice)}</p>
                  <p className="text-[10px] text-muted-foreground">Ticket Médio</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="border-b border-border bg-background">
        <div className="container py-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar marca, modelo... ou 'até 30 mil'"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 h-10"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Price filter indicator */}
          {hasPriceFilter && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                <Tag className="h-3 w-3" />
                {priceFilter.minPrice && priceFilter.maxPrice
                  ? `R$ ${(priceFilter.minPrice / 1000).toFixed(0)} mil a R$ ${(priceFilter.maxPrice / 1000).toFixed(0)} mil`
                  : priceFilter.maxPrice
                  ? `Até R$ ${priceFilter.maxPrice >= 1000 ? `${(priceFilter.maxPrice / 1000).toFixed(0)} mil` : priceFilter.maxPrice}`
                  : `A partir de R$ ${priceFilter.minPrice! >= 1000 ? `${(priceFilter.minPrice! / 1000).toFixed(0)} mil` : priceFilter.minPrice}`
                }
                <button onClick={() => setSearch(priceFilter.cleanSearch)} className="ml-0.5 hover:text-primary/80">
                  <X className="h-3 w-3" />
                </button>
              </span>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setStatusFilter("available")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${statusFilter === "available" ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}
            >
              Disponíveis
            </button>
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${statusFilter === "all" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter("reserved")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${statusFilter === "reserved" ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"}`}
            >
              Reservados
            </button>
            <div className="h-6 w-px bg-border self-center" />
            <button
              onClick={() => setBrandFilter("")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${!brandFilter ? "bg-cyan-500 text-white" : "bg-muted text-muted-foreground"}`}
            >
              Todas Marcas
            </button>
            {brands?.slice(0, 8).map(b => (
              <button
                key={b.brand}
                onClick={() => setBrandFilter(brandFilter === b.brand ? "" : b.brand)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${brandFilter === b.brand ? "bg-cyan-500 text-white" : "bg-muted text-muted-foreground"}`}
              >
                {b.brand} ({b.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vehicle List */}
      <div className="container py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : vehicles?.length === 0 ? (
          <div className="text-center py-16">
            <Car className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum veículo encontrado</p>
            {hasPriceFilter && (
              <p className="text-xs text-muted-foreground mt-1">Tente ajustar o filtro de preço</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {vehicles?.map(v => {
              const isExpanded = expandedId === v.id;
              const photos: string[] = v.photos ? (typeof v.photos === "string" ? JSON.parse(v.photos) : v.photos as string[]) : [];
              const belowFipe = Number(v.fipePrice) > 0 && Number(v.price) > 0 && Number(v.price) < Number(v.fipePrice);

              return (
                <div key={v.id} className="rounded-xl border border-border bg-card overflow-hidden transition-all">
                  {/* Main Card */}
                  <div className="flex" onClick={() => setExpandedId(isExpanded ? null : v.id)}>
                    {/* Photo */}
                    <div className="w-28 sm:w-36 flex-shrink-0 bg-accent/30 relative">
                      {v.photoUrl ? (
                        <img src={v.photoUrl} alt={`${v.brand} ${v.model}`} className="w-full h-full min-h-[100px] object-cover" />
                      ) : (
                        <div className="w-full h-full min-h-[100px] flex items-center justify-center">
                          <Car className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                      )}
                      {belowFipe && (
                        <span className="absolute top-1.5 left-1.5 text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded font-bold">
                          ABAIXO FIPE
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 p-3 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-foreground truncate">{v.brand} {v.model}</h3>
                          {v.version && <p className="text-[10px] text-muted-foreground truncate">{v.version}</p>}
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                          v.status === "available" ? "bg-green-500/20 text-green-400" :
                          v.status === "reserved" ? "bg-amber-500/20 text-amber-400" :
                          "bg-red-500/20 text-red-400"
                        }`}>
                          {v.status === "available" ? "Disponível" : v.status === "reserved" ? "Reservado" : "Vendido"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
                        {v.year && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{v.year}</span>}
                        {v.color && <span className="flex items-center gap-1"><Palette className="h-3 w-3" />{v.color}</span>}
                        {v.km != null && Number(v.km) > 0 && <span className="flex items-center gap-1"><Gauge className="h-3 w-3" />{Number(v.km).toLocaleString("pt-BR")} km</span>}
                        {v.fuel && <span className="flex items-center gap-1"><Fuel className="h-3 w-3" />{v.fuel}</span>}
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <p className="text-base font-bold text-primary">{formatPrice(v.price)}</p>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-border p-3 space-y-3 bg-accent/5">
                      {/* Photo Gallery - clicável para ampliar */}
                      {photos.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {photos.map((photo, i) => (
                            <div
                              key={i}
                              className="relative flex-shrink-0 cursor-pointer group"
                              onClick={(e) => { e.stopPropagation(); openLightbox(photos, i); }}
                            >
                              <img
                                src={photo}
                                alt={`Foto ${i + 1}`}
                                className="h-20 w-28 object-cover rounded-lg border border-border"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/0 group-active:bg-black/30 rounded-lg flex items-center justify-center transition-all">
                                <ZoomIn className="h-5 w-5 text-white opacity-0 group-active:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {v.transmission && (
                          <div className="bg-muted/50 rounded-lg p-2">
                            <p className="text-[10px] text-muted-foreground">Câmbio</p>
                            <p className="font-medium text-foreground">{v.transmission}</p>
                          </div>
                        )}
                        {v.doors && (
                          <div className="bg-muted/50 rounded-lg p-2">
                            <p className="text-[10px] text-muted-foreground">Portas</p>
                            <p className="font-medium text-foreground">{v.doors}</p>
                          </div>
                        )}
                        {Number(v.fipePrice) > 0 && (
                          <div className="bg-muted/50 rounded-lg p-2">
                            <p className="text-[10px] text-muted-foreground">FIPE</p>
                            <p className="font-medium text-foreground">{formatPrice(v.fipePrice)}</p>
                          </div>
                        )}
                        {v.plate && (
                          <div className="bg-muted/50 rounded-lg p-2">
                            <p className="text-[10px] text-muted-foreground">Placa</p>
                            <p className="font-medium text-foreground">{v.plate}</p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setInterestVehicle(v); }}
                          className="w-full gap-1.5 text-xs racing-gradient text-white"
                        >
                          <Heart className="h-3.5 w-3.5" /> Tenho Interesse
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); copyVehicleInfo(v); }}
                            className="flex-1 gap-1.5 text-xs"
                          >
                            {copiedId === v.id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                            {copiedId === v.id ? "Copiado!" : "Copiar Info"}
                          </Button>
                          {v.externalUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => { e.stopPropagation(); window.open(v.externalUrl!, "_blank"); }}
                              className="flex-1 gap-1.5 text-xs border-cyan-600 text-cyan-400"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Ver no Site
                            </Button>
                          )}
                        </div>
                        {photos.length > 0 && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); savePhotos(v); }}
                              className="flex-1 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Download className="h-3.5 w-3.5" /> Salvar Fotos
                            </Button>
                            <Button
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); sharePhotos(v); }}
                              className="flex-1 gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              <Send className="h-3.5 w-3.5" /> Enviar Fotos
                            </Button>
                          </div>
                        )}
                        <Button
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); sendViaWhatsApp(v); }}
                          className="w-full gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Send className="h-3.5 w-3.5" /> Enviar Texto via WhatsApp
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* "Tenho Interesse" modal */}
      <Dialog open={!!interestVehicle} onOpenChange={(open) => !open && setInterestVehicle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tenho interesse</DialogTitle>
          </DialogHeader>
          {interestVehicle && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {interestVehicle.brand} {interestVehicle.model} {interestVehicle.year ? `${interestVehicle.year}` : ""} — {formatPrice(interestVehicle.price)}
              </p>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Seu nome *</Label>
                <Input value={interestName} onChange={(e) => setInterestName(e.target.value)} placeholder="Como podemos te chamar?" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">WhatsApp</Label>
                <Input value={interestPhone} onChange={(e) => setInterestPhone(e.target.value)} placeholder="(00) 00000-0000" inputMode="tel" />
              </div>
              <p className="text-[11px] text-muted-foreground">Alguém da nossa equipe entra em contato em breve.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInterestVehicle(null)} disabled={interestSending}>Cancelar</Button>
            <Button onClick={submitInterest} disabled={interestSending || interestName.trim().length < 2} className="racing-gradient text-white">
              {interestSending ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Enviando...</> : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
