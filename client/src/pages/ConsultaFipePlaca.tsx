import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Car, ArrowLeft, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export default function ConsultaFipePlaca() {
  const [, setLocation] = useLocation();

  // === State ===
  const [vehicleType, setVehicleType] = useState<"carros" | "motos" | "caminhoes">("carros");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [result, setResult] = useState<any>(null);

  // === tRPC hooks ===
  const { data: brands } = trpc.crmFipe.getBrands.useQuery({ vehicleType });
  const { data: models } = trpc.crmFipe.getModels.useQuery(
    { vehicleType, brandCode: selectedBrand },
    { enabled: !!selectedBrand }
  );
  const { data: years } = trpc.crmFipe.getYears.useQuery(
    { vehicleType, brandCode: selectedBrand, modelCode: selectedModel },
    { enabled: !!selectedBrand && !!selectedModel }
  );
  const { data: fipePrice, isFetching: fetchingPrice } = trpc.crmFipe.getPrice.useQuery(
    { vehicleType, brandCode: selectedBrand, modelCode: selectedModel, yearCode: selectedYear },
    { enabled: !!selectedBrand && !!selectedModel && !!selectedYear }
  );

  // Quando fipePrice muda, atualizar resultado
  if (fipePrice && fipePrice !== result) {
    setResult(fipePrice);
  }

  const resetAll = () => {
    setSelectedBrand("");
    setSelectedModel("");
    setSelectedYear("");
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            <h1 className="font-heading font-bold text-lg">Consulta FIPE</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-5">
        {/* Tipo de Veículo */}
        <div className="flex rounded-xl overflow-hidden border border-border bg-muted/30">
          {(["carros", "motos", "caminhoes"] as const).map((type) => (
            <button
              key={type}
              onClick={() => { setVehicleType(type); resetAll(); }}
              className={`flex-1 py-3 text-sm font-bold transition-all ${
                vehicleType === type
                  ? "bg-red-500 text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {type === "carros" ? "Carros" : type === "motos" ? "Motos" : "Caminhões"}
            </button>
          ))}
        </div>

        {/* Marca */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Marca</label>
          <select
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value);
              setSelectedModel("");
              setSelectedYear("");
              setResult(null);
            }}
            className="w-full h-12 px-4 rounded-lg bg-muted border border-border text-foreground text-sm"
          >
            <option value="">Selecione a marca...</option>
            {brands?.map((b: any) => (
              <option key={b.codigo} value={b.codigo}>{b.nome}</option>
            ))}
          </select>
        </div>

        {/* Modelo */}
        {selectedBrand && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Modelo</label>
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                setSelectedYear("");
                setResult(null);
              }}
              className="w-full h-12 px-4 rounded-lg bg-muted border border-border text-foreground text-sm"
            >
              <option value="">Selecione o modelo...</option>
              {models?.modelos?.map((m: any) => (
                <option key={m.codigo} value={m.codigo}>{m.nome}</option>
              ))}
            </select>
          </div>
        )}

        {/* Ano */}
        {selectedModel && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Ano</label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setResult(null);
              }}
              className="w-full h-12 px-4 rounded-lg bg-muted border border-border text-foreground text-sm"
            >
              <option value="">Selecione o ano...</option>
              {years?.map((y: any) => (
                <option key={y.codigo} value={y.codigo}>{y.nome}</option>
              ))}
            </select>
          </div>
        )}

        {/* Loading */}
        {fetchingPrice && selectedYear && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Buscando valor FIPE...</span>
          </div>
        )}

        {/* Resultado */}
        {result && !fetchingPrice && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Card do Veículo */}
            <div className="racing-card p-5 border-2 border-primary/40">
              <div className="flex items-center gap-2 mb-3">
                <Car className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-foreground">{result.Marca} {result.Modelo}</h3>
                <span className="ml-auto text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{result.CodigoFipe}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Ano</span>
                  <span className="font-bold">{result.AnoModelo}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Combustível</span>
                  <span className="font-bold">{result.Combustivel}</span>
                </div>
              </div>
            </div>

            {/* Valor FIPE Grande */}
            <div className="racing-card p-6 border-2 border-red-500/40 bg-gradient-to-br from-red-950/30 to-red-900/10">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Valor FIPE</p>
                <p className="font-heading font-bold text-4xl text-red-400">{result.Valor}</p>
                <p className="text-xs text-muted-foreground mt-3">
                  Referência: {result.MesReferencia} | Código: {result.CodigoFipe}
                </p>
              </div>
            </div>

            {/* Botão Nova Consulta */}
            <Button
              variant="outline"
              className="w-full"
              onClick={resetAll}
            >
              Nova Consulta
            </Button>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Valores atualizados automaticamente pela Tabela FIPE.
          A tabela é atualizada no início de cada mês.
        </p>
      </div>
    </div>
  );
}
