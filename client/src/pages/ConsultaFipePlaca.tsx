import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Search, Car, ArrowLeft, Loader2, AlertTriangle, Hash, List } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type TabMode = "placa" | "manual";

export default function ConsultaFipePlaca() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<TabMode>("placa");

  // === Placa state ===
  const [plate, setPlate] = useState("");
  const [plateType, setPlateType] = useState<"mercosul" | "antiga">("mercosul");
  const [plateResult, setPlateResult] = useState<any>(null);
  const [plateSearching, setPlateSearching] = useState(false);

  // === Manual state ===
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [manualResult, setManualResult] = useState<any>(null);

  // === tRPC hooks ===
  const lookupMutation = trpc.crmFipe.lookupByPlate.useMutation({
    onSuccess: (data) => {
      setPlateResult(data);
      setPlateSearching(false);
    },
    onError: (err) => {
      toast.error("Erro na consulta: " + err.message);
      setPlateSearching(false);
    },
  });

  const { data: brands } = trpc.crmFipe.getBrands.useQuery({ vehicleType: "carros" });
  const { data: models } = trpc.crmFipe.getModels.useQuery(
    { vehicleType: "carros", brandCode: selectedBrand },
    { enabled: !!selectedBrand }
  );
  const { data: years } = trpc.crmFipe.getYears.useQuery(
    { vehicleType: "carros", brandCode: selectedBrand, modelCode: selectedModel },
    { enabled: !!selectedBrand && !!selectedModel }
  );
  const { data: fipePrice, isFetching: fetchingPrice } = trpc.crmFipe.getPrice.useQuery(
    { vehicleType: "carros", brandCode: selectedBrand, modelCode: selectedModel, yearCode: selectedYear },
    { enabled: !!selectedBrand && !!selectedModel && !!selectedYear }
  );

  // Quando fipePrice muda, atualizar resultado manual
  if (fipePrice && fipePrice !== manualResult) {
    setManualResult(fipePrice);
  }

  const handlePlateSearch = () => {
    const clean = plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean.length < 7) {
      toast.error("Digite a placa completa (7 caracteres)");
      return;
    }
    setPlateSearching(true);
    setPlateResult(null);
    lookupMutation.mutate({ plate: clean });
  };

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    setPlate(raw.slice(0, 8));
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
        {/* Tab Switcher */}
        <div className="flex rounded-xl overflow-hidden border border-border bg-muted/30">
          <button
            onClick={() => setTab("placa")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all ${
              tab === "placa"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Hash className="h-4 w-4" />
            Por Placa
          </button>
          <button
            onClick={() => setTab("manual")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all ${
              tab === "manual"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-4 w-4" />
            Por Marca/Modelo
          </button>
        </div>

        {/* === TAB PLACA === */}
        {tab === "placa" && (
          <div className="space-y-5">
            {/* Tipo de Placa Toggle */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPlateType("antiga")}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  plateType === "antiga"
                    ? "bg-yellow-500 text-black shadow-lg"
                    : "bg-muted text-muted-foreground hover:bg-yellow-500/20"
                }`}
              >
                ANTIGA
              </button>
              <button
                onClick={() => setPlateType("mercosul")}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  plateType === "mercosul"
                    ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                    : "bg-muted text-muted-foreground hover:bg-green-500/20"
                }`}
              >
                MERCOSUL
              </button>
            </div>

            {/* Placa Visual */}
            <div className="flex flex-col items-center">
              <div className={`relative w-full max-w-[320px] rounded-lg border-4 ${
                plateType === "mercosul" 
                  ? "border-gray-400 bg-white" 
                  : "border-gray-400 bg-gray-100"
              } p-4 shadow-xl`}>
                {plateType === "mercosul" && (
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-bold px-3 py-0.5 rounded-sm">
                    BRASIL
                  </div>
                )}
                <input
                  type="text"
                  value={plate}
                  onChange={handlePlateChange}
                  placeholder={plateType === "mercosul" ? "ABC1D23" : "ABC-1234"}
                  maxLength={8}
                  className={`w-full text-center font-mono font-bold text-4xl tracking-[0.3em] bg-transparent outline-none ${
                    plateType === "mercosul" ? "text-gray-800 mt-3" : "text-red-700"
                  } placeholder:text-gray-300 placeholder:tracking-[0.2em]`}
                  style={{ letterSpacing: "0.3em" }}
                />
              </div>
            </div>

            {/* Botão Consultar */}
            <Button
              onClick={handlePlateSearch}
              disabled={plateSearching || plate.replace(/[^A-Z0-9]/gi, "").length < 7}
              className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 gap-3"
              size="lg"
            >
              {plateSearching ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  Consultar
                </>
              )}
            </Button>

            {/* Resultado Placa */}
            {plateResult && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {plateResult.error && !plateResult.brand ? (
                  <div className="racing-card p-5 border-2 border-yellow-500/40 bg-yellow-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                      <p className="font-bold text-yellow-400">Não identificado</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{plateResult.error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 text-yellow-400 border-yellow-500/40"
                      onClick={() => setTab("manual")}
                    >
                      Buscar por Marca/Modelo
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Dados do Veículo */}
                    <div className="racing-card p-5 border-2 border-primary/40">
                      <div className="flex items-center gap-2 mb-4">
                        <Car className="h-5 w-5 text-primary" />
                        <h3 className="font-bold text-foreground">Dados do Veículo</h3>
                        {plateResult.confidence === "high" && (
                          <span className="ml-auto text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Alta confiança</span>
                        )}
                        {plateResult.confidence === "medium" && (
                          <span className="ml-auto text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">Média confiança</span>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-border/50 pb-2">
                          <span className="text-sm text-muted-foreground">Placa</span>
                          <span className="font-mono font-bold text-foreground">{plateResult.plate}</span>
                        </div>
                        {plateResult.brand && (
                          <div className="flex justify-between items-center border-b border-border/50 pb-2">
                            <span className="text-sm text-muted-foreground">Marca</span>
                            <span className="font-bold text-foreground">{plateResult.brand}</span>
                          </div>
                        )}
                        {plateResult.model && (
                          <div className="flex justify-between items-center border-b border-border/50 pb-2">
                            <span className="text-sm text-muted-foreground">Modelo</span>
                            <span className="font-bold text-foreground">{plateResult.model}</span>
                          </div>
                        )}
                        {plateResult.year && (
                          <div className="flex justify-between items-center border-b border-border/50 pb-2">
                            <span className="text-sm text-muted-foreground">Ano</span>
                            <span className="font-bold text-foreground">{plateResult.year}</span>
                          </div>
                        )}
                        {plateResult.fuel && (
                          <div className="flex justify-between items-center border-b border-border/50 pb-2">
                            <span className="text-sm text-muted-foreground">Combustível</span>
                            <span className="font-bold text-foreground">{plateResult.fuel}</span>
                          </div>
                        )}
                        {plateResult.color && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Cor</span>
                            <span className="font-bold text-foreground">{plateResult.color}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Valor FIPE */}
                    {plateResult.fipeValue && (
                      <div className="racing-card p-5 border-2 border-red-500/40 bg-gradient-to-br from-red-950/30 to-red-900/10">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Valor FIPE</p>
                          <p className="font-heading font-bold text-4xl text-red-400">{plateResult.fipeValue}</p>
                          {plateResult.fipeFullName && (
                            <p className="text-sm text-foreground mt-2 font-medium">{plateResult.fipeFullName}</p>
                          )}
                          <div className="flex items-center justify-center gap-3 mt-3 text-xs text-muted-foreground">
                            {plateResult.fipeRef && <span>Ref: {plateResult.fipeRef}</span>}
                            {plateResult.fipeCode && <span>Cód: {plateResult.fipeCode}</span>}
                            {plateResult.fipeFuel && <span>{plateResult.fipeFuel}</span>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Se não encontrou FIPE mas tem dados */}
                    {!plateResult.fipeValue && plateResult.brand && (
                      <div className="racing-card p-4 border border-yellow-500/30 bg-yellow-500/5">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-400" />
                          <p className="text-sm text-yellow-400">Valor FIPE não encontrado. Tente a busca por Marca/Modelo.</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 text-yellow-400 border-yellow-500/40"
                          onClick={() => setTab("manual")}
                        >
                          Buscar por Marca/Modelo
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              💡 A consulta por placa usa inteligência artificial e pode não identificar todos os veículos.
              Use a aba "Por Marca/Modelo" para resultado garantido.
            </p>
          </div>
        )}

        {/* === TAB MANUAL === */}
        {tab === "manual" && (
          <div className="space-y-5">
            {/* Marca */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Marca</label>
              <select
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setSelectedModel("");
                  setSelectedYear("");
                  setManualResult(null);
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
                    setManualResult(null);
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
                    setManualResult(null);
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

            {/* Resultado Manual */}
            {manualResult && !fetchingPrice && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Card do Veículo */}
                <div className="racing-card p-5 border-2 border-primary/40">
                  <div className="flex items-center gap-2 mb-3">
                    <Car className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-foreground">{manualResult.Marca} {manualResult.Modelo}</h3>
                    <span className="ml-auto text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{manualResult.CodigoFipe}</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-border/50 pb-2">
                      <span className="text-muted-foreground">Ano</span>
                      <span className="font-bold">{manualResult.AnoModelo}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-2">
                      <span className="text-muted-foreground">Combustível</span>
                      <span className="font-bold">{manualResult.Combustivel}</span>
                    </div>
                  </div>
                </div>

                {/* Valor FIPE Grande */}
                <div className="racing-card p-6 border-2 border-red-500/40 bg-gradient-to-br from-red-950/30 to-red-900/10">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Valor FIPE</p>
                    <p className="font-heading font-bold text-4xl text-red-400">{manualResult.Valor}</p>
                    <p className="text-xs text-muted-foreground mt-3">
                      Referência: {manualResult.MesReferencia} | Código: {manualResult.CodigoFipe}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              💡 Selecione marca, modelo e ano para consultar o valor FIPE atualizado
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
