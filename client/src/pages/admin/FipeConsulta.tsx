import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Car } from "lucide-react";

function formatCurrency(value: string): string {
  return value; // FIPE API already returns formatted "R$ XX.XXX,XX"
}

export default function FipeConsulta() {
  const [vehicleType, setVehicleType] = useState<"carros" | "motos" | "caminhoes">("carros");
  const [brandCode, setBrandCode] = useState("");
  const [modelCode, setModelCode] = useState("");
  const [yearCode, setYearCode] = useState("");

  const { data: brands, isLoading: loadingBrands } = trpc.vehicleCosts.fipeBrands.useQuery(
    { type: vehicleType },
    { staleTime: 1000 * 60 * 60 } // cache 1h
  );

  const { data: models, isLoading: loadingModels } = trpc.vehicleCosts.fipeModels.useQuery(
    { type: vehicleType, brandCode },
    { enabled: !!brandCode, staleTime: 1000 * 60 * 60 }
  );

  const { data: years, isLoading: loadingYears } = trpc.vehicleCosts.fipeYears.useQuery(
    { type: vehicleType, brandCode, modelCode },
    { enabled: !!brandCode && !!modelCode, staleTime: 1000 * 60 * 60 }
  );

  const { data: price, isLoading: loadingPrice } = trpc.vehicleCosts.fipePrice.useQuery(
    { type: vehicleType, brandCode, modelCode, yearCode },
    { enabled: !!brandCode && !!modelCode && !!yearCode, staleTime: 1000 * 60 * 30 }
  );

  const handleTypeChange = (type: "carros" | "motos" | "caminhoes") => {
    setVehicleType(type);
    setBrandCode("");
    setModelCode("");
    setYearCode("");
  };

  const handleBrandChange = (code: string) => {
    setBrandCode(code);
    setModelCode("");
    setYearCode("");
  };

  const handleModelChange = (code: string) => {
    setModelCode(code);
    setYearCode("");
  };

  return (
    <div className="space-y-4">
      {/* Tipo de veículo */}
      <div className="flex gap-2">
        {(["carros", "motos", "caminhoes"] as const).map((t) => (
          <Button
            key={t}
            variant={vehicleType === t ? "default" : "outline"}
            size="sm"
            onClick={() => handleTypeChange(t)}
          >
            {t === "carros" ? "Carros" : t === "motos" ? "Motos" : "Caminhões"}
          </Button>
        ))}
      </div>

      {/* Seletores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label>Marca</Label>
          <Select value={brandCode} onValueChange={handleBrandChange}>
            <SelectTrigger>
              <SelectValue placeholder={loadingBrands ? "Carregando..." : "Selecione a marca"} />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {brands?.map((b: any) => (
                <SelectItem key={b.codigo} value={String(b.codigo)}>{b.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Modelo</Label>
          <Select value={modelCode} onValueChange={handleModelChange} disabled={!brandCode}>
            <SelectTrigger>
              <SelectValue placeholder={loadingModels ? "Carregando..." : "Selecione o modelo"} />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {models?.modelos?.map((m: any) => (
                <SelectItem key={m.codigo} value={String(m.codigo)}>{m.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Ano</Label>
          <Select value={yearCode} onValueChange={setYearCode} disabled={!modelCode}>
            <SelectTrigger>
              <SelectValue placeholder={loadingYears ? "Carregando..." : "Selecione o ano"} />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {years?.map((y: any) => (
                <SelectItem key={y.codigo} value={String(y.codigo)}>{y.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Resultado */}
      {loadingPrice && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Consultando FIPE...</span>
        </div>
      )}

      {price && !loadingPrice && (
        <Card className="border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-bold">{price.Marca} {price.Modelo}</p>
                  <p className="text-sm text-muted-foreground">Ano: {price.AnoModelo} | {price.Combustivel}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">{price.CodigoFipe}</Badge>
            </div>

            <div className="bg-primary/10 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Valor FIPE</p>
              <p className="text-3xl font-bold text-primary">{price.Valor}</p>
            </div>

            <div className="mt-3 text-xs text-muted-foreground text-center">
              <p>Referência: {price.MesReferencia}</p>
              <p>Código FIPE: {price.CodigoFipe} | Combustível: {price.SiglaCombustivel}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!brandCode && (
        <div className="flex flex-col items-center py-8 text-muted-foreground">
          <Search className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">Selecione marca, modelo e ano para consultar o valor FIPE</p>
          <p className="text-xs mt-1">A tabela FIPE é atualizada automaticamente todo mês</p>
        </div>
      )}
    </div>
  );
}
