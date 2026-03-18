import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Link } from "wouter";
import { Flag, Car, CheckCircle2, ArrowLeft, Trophy, Loader2 } from "lucide-react";

export default function RegisterSale() {
  const [sellerId, setSellerId] = useState<string>("");
  const [competitionId, setCompetitionId] = useState<string>("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: true });
  const { data: competitions } = trpc.competitions.list.useQuery({ status: "active" });
  const registerSale = trpc.sales.registerBySeller.useMutation();

  const selectedSeller = useMemo(() => {
    if (!sellerId || !sellers) return null;
    return sellers.find(s => s.id === parseInt(sellerId));
  }, [sellerId, sellers]);

  const handleSubmit = async () => {
    if (!sellerId || !vehicleModel) {
      toast.error("Selecione seu nome e informe o modelo do veículo!");
      return;
    }
    try {
      const result = await registerSale.mutateAsync({
        sellerId: parseInt(sellerId),
        competitionId: competitionId ? parseInt(competitionId) : undefined,
        vehicleModel,
        value: value ? parseInt(value.replace(/\D/g, "")) : undefined,
        description: description || undefined,
      });
      toast.success(result.message);
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar venda");
    }
  };

  const handleNewSale = () => {
    setVehicleModel("");
    setValue("");
    setDescription("");
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900/80 border-green-500/30 text-center">
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white font-racing mb-2">VENDA REGISTRADA!</h2>
              <p className="text-gray-400">
                Sua venda de <span className="text-white font-semibold">{vehicleModel}</span> foi enviada para aprovação do gerente.
              </p>
              <p className="text-yellow-400 text-sm mt-2 flex items-center justify-center gap-1">
                <Loader2 className="w-4 h-4 animate-spin" />
                Aguardando aprovação...
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={handleNewSale} className="bg-red-600 hover:bg-red-700 text-white font-bold">
                <Car className="w-4 h-4 mr-2" />
                REGISTRAR OUTRA VENDA
              </Button>
              <Link href="/">
                <Button variant="outline" className="w-full border-gray-700 text-gray-300 hover:bg-gray-800">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  VOLTAR AO RANKING
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
            <Trophy className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white font-racing tracking-wider">REGISTRAR VENDA</h1>
          <p className="text-gray-400 text-sm">Mais uma venda, mais uma volta na pista!</p>
        </div>

        <Card className="bg-gray-900/80 border-gray-800">
          <CardContent className="pt-6 space-y-5">
            {/* Selecionar vendedor */}
            <div className="space-y-2">
              <Label className="text-gray-300 font-semibold flex items-center gap-2">
                <Flag className="w-4 h-4 text-red-400" />
                Quem é você?
              </Label>
              <Select value={sellerId} onValueChange={setSellerId}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Selecione seu nome" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {sellers?.map(seller => (
                    <SelectItem key={seller.id} value={seller.id.toString()} className="text-white hover:bg-gray-700">
                      <div className="flex items-center gap-2">
                        {seller.photoUrl && (
                          <img src={seller.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                        )}
                        {seller.name} {seller.nickname ? `(${seller.nickname})` : ''}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Foto do vendedor selecionado */}
            {selectedSeller && (
              <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                {selectedSeller.photoUrl ? (
                  <img src={selectedSeller.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-red-500" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold text-lg">
                    {selectedSeller.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-white font-semibold">{selectedSeller.name}</p>
                  <p className="text-gray-400 text-xs">{selectedSeller.totalSales} vendas | {selectedSeller.totalPoints} pts</p>
                </div>
              </div>
            )}

            {/* Competição (opcional) */}
            {competitions && competitions.length > 0 && (
              <div className="space-y-2">
                <Label className="text-gray-300 font-semibold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  Competição (opcional)
                </Label>
                <Select value={competitionId} onValueChange={setCompetitionId}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Selecione a competição" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="none" className="text-gray-400 hover:bg-gray-700">Sem competição</SelectItem>
                    {competitions.map(comp => (
                      <SelectItem key={comp.id} value={comp.id.toString()} className="text-white hover:bg-gray-700">
                        {comp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Modelo do veículo */}
            <div className="space-y-2">
              <Label className="text-gray-300 font-semibold flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-400" />
                Modelo do veículo *
              </Label>
              <Input
                value={vehicleModel}
                onChange={e => setVehicleModel(e.target.value)}
                placeholder="Ex: Honda Civic 2024"
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <Label className="text-gray-300 font-semibold">Valor (R$)</Label>
              <Input
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="Ex: 85000"
                type="number"
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            {/* Observação */}
            <div className="space-y-2">
              <Label className="text-gray-300 font-semibold">Observação (opcional)</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Algum detalhe sobre a venda..."
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 resize-none"
                rows={2}
              />
            </div>

            {/* Botão registrar */}
            <Button
              onClick={handleSubmit}
              disabled={registerSale.isPending || !sellerId || !vehicleModel}
              className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold text-lg py-6 shadow-lg shadow-red-500/20"
            >
              {registerSale.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Flag className="w-5 h-5 mr-2" />
              )}
              {registerSale.isPending ? "REGISTRANDO..." : "REGISTRAR VENDA!"}
            </Button>

            <p className="text-center text-gray-500 text-xs">
              A venda será enviada para aprovação do gerente antes de contar no ranking.
            </p>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link href="/">
            <Button variant="ghost" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao ranking
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
