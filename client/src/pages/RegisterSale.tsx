import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Link } from "wouter";
import { Flag, Car, CheckCircle2, ArrowLeft, Trophy, Loader2, Banknote, FileText, Warehouse, Headphones } from "lucide-react";

type Category = "vendas" | "fei" | "consignacao" | "despachante" | "pre_vendas";

const CATEGORIES: { value: Category; label: string; icon: typeof Car; color: string }[] = [
  { value: "vendas", label: "Venda", icon: Car, color: "text-red-400" },
  { value: "fei", label: "F&I", icon: Banknote, color: "text-green-400" },
  { value: "consignacao", label: "Consignação", icon: Warehouse, color: "text-blue-400" },
  { value: "despachante", label: "Despachante", icon: FileText, color: "text-purple-400" },
  { value: "pre_vendas", label: "SDR", icon: Headphones, color: "text-orange-400" },
];

export default function RegisterSale() {
  const [category, setCategory] = useState<Category>("vendas");
  const [sellerId, setSellerId] = useState<string>("");
  const [competitionId, setCompetitionId] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState("");

  // Venda fields
  const [vehicleModel, setVehicleModel] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");

  // F&I fields
  const [customerCpf, setCustomerCpf] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [bankName, setBankName] = useState("");
  const [financedValue, setFinancedValue] = useState("");
  const [returnType, setReturnType] = useState("");
  const [paymentDate, setPaymentDate] = useState("");

  // Consignação fields
  const [consignModel, setConsignModel] = useState("");
  const [consignPlate, setConsignPlate] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [entryDate, setEntryDate] = useState("");

  // Despachante fields
  const [dispatchPlate, setDispatchPlate] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [customerPaid, setCustomerPaid] = useState(false);
  const [transferValue, setTransferValue] = useState("");

  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: true });
  const { data: competitions } = trpc.competitions.list.useQuery({ status: "active" });

  // SDR fields
  const [sdrType, setSdrType] = useState<"agendamento" | "lead_convertido">("agendamento");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [vehicleInterest, setVehicleInterest] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [sdrNotes, setSdrNotes] = useState("");

  const registerSale = trpc.sales.registerBySeller.useMutation();
  const registerFei = trpc.fei.register.useMutation();
  const registerConsignment = trpc.consignment.register.useMutation();
  const registerDispatch = trpc.dispatch.register.useMutation();
  const registerSdr = trpc.sdr.register.useMutation();

  const selectedSeller = useMemo(() => {
    if (!sellerId || !sellers) return null;
    return sellers.find(s => s.id === parseInt(sellerId));
  }, [sellerId, sellers]);

  // Filtrar competições pela categoria selecionada
  const filteredCompetitions = useMemo(() => {
    if (!competitions) return [];
    return competitions.filter(c => {
      if (category === "vendas") return c.category === "vendas" || c.category === "feirao";
      if (category === "pre_vendas") return c.category === "pre_vendas";
      return c.category === category;
    });
  }, [competitions, category]);

  // Auto-selecionar competição quando só tem uma ativa na categoria
  useEffect(() => {
    if (filteredCompetitions.length === 1 && !competitionId) {
      setCompetitionId(filteredCompetitions[0].id.toString());
    } else if (filteredCompetitions.length === 0) {
      setCompetitionId("");
    }
  }, [filteredCompetitions, competitionId]);

  const isPending = registerSale.isPending || registerFei.isPending || registerConsignment.isPending || registerDispatch.isPending || registerSdr.isPending;

  const resetForm = () => {
    setVehicleModel(""); setValue(""); setDescription("");
    setCustomerCpf(""); setVehiclePlate(""); setBankName(""); setFinancedValue(""); setReturnType(""); setPaymentDate("");
    setConsignModel(""); setConsignPlate(""); setOwnerName(""); setOwnerPhone(""); setEntryDate("");
    setDispatchPlate(""); setDocumentType(""); setCustomerPaid(false); setTransferValue("");
    setSdrType("agendamento"); setCustomerName(""); setCustomerPhone(""); setVehicleInterest(""); setLeadSource(""); setScheduledDate(""); setSdrNotes("");
    setSubmitted(false); setSubmittedMessage("");
  };

  const handleSubmit = async () => {
    if (!sellerId) { toast.error("Selecione seu nome!"); return; }
    const sid = parseInt(sellerId);
    const cid = competitionId && competitionId !== "none" ? parseInt(competitionId) : undefined;

    try {
      let result: { message: string };
      switch (category) {
        case "vendas":
          if (!vehicleModel) { toast.error("Informe o modelo do veículo!"); return; }
          result = await registerSale.mutateAsync({
            sellerId: sid, competitionId: cid, vehicleModel,
            value: value ? parseInt(value.replace(/\D/g, "")) : undefined,
            description: description || undefined,
          });
          break;
        case "fei":
          if (!bankName || !returnType) { toast.error("Informe o banco e o tipo de retorno!"); return; }
          result = await registerFei.mutateAsync({
            sellerId: sid, competitionId: cid,
            customerCpf: customerCpf || undefined,
            vehiclePlate: vehiclePlate || undefined,
            bankName, returnType,
            financedValue: financedValue ? Math.round(parseFloat(financedValue) * 100) : undefined,
            paymentDate: paymentDate ? new Date(paymentDate).getTime() : undefined,
          });
          break;
        case "consignacao":
          if (!consignModel || !ownerName || !entryDate) { toast.error("Informe o modelo, dono e data de entrada!"); return; }
          result = await registerConsignment.mutateAsync({
            sellerId: sid, competitionId: cid,
            vehiclePlate: consignPlate || undefined,
            vehicleModel: consignModel, ownerName,
            ownerPhone: ownerPhone || undefined,
            entryDate: new Date(entryDate).getTime(),
          });
          break;
        case "despachante":
          if (!documentType) { toast.error("Informe o tipo de documento!"); return; }
          result = await registerDispatch.mutateAsync({
            sellerId: sid, competitionId: cid,
            vehiclePlate: dispatchPlate || undefined,
            documentType, customerPaid,
            transferValue: transferValue ? Math.round(parseFloat(transferValue) * 100) : undefined,
          });
          break;
        case "pre_vendas":
          if (!customerName) { toast.error("Informe o nome do cliente!"); return; }
          result = await registerSdr.mutateAsync({
            sellerId: sid, competitionId: cid,
            type: sdrType,
            customerName: customerName || undefined,
            customerPhone: customerPhone || undefined,
            vehicleInterest: vehicleInterest || undefined,
            source: leadSource || undefined,
            scheduledDate: scheduledDate ? new Date(scheduledDate).getTime() : undefined,
            notes: sdrNotes || undefined,
          });
          break;
      }
      toast.success(result.message);
      setSubmittedMessage(result.message);
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar");
    }
  };

  const catInfo = CATEGORIES.find(c => c.value === category)!;

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900/80 border-green-500/30 text-center">
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white font-racing mb-2">REGISTRADO!</h2>
              <p className="text-gray-400">{submittedMessage}</p>
              <p className="text-yellow-400 text-sm mt-2 flex items-center justify-center gap-1">
                <Loader2 className="w-4 h-4 animate-spin" />
                Aguardando aprovação...
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={resetForm} className="bg-red-600 hover:bg-red-700 text-white font-bold">
                <catInfo.icon className="w-4 h-4 mr-2" />
                REGISTRAR OUTRO
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
          <div className={`w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center`}>
            <catInfo.icon className={`w-8 h-8 ${catInfo.color}`} />
          </div>
          <h1 className="text-2xl font-bold text-white font-racing tracking-wider">REGISTRAR</h1>
          <p className="text-gray-400 text-sm">Selecione o tipo e preencha os dados</p>
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-4 gap-1 bg-gray-900/80 rounded-lg p-1 border border-gray-800">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-md text-xs font-semibold transition-all ${
                category === cat.value
                  ? "bg-gray-700 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <cat.icon className={`w-4 h-4 ${category === cat.value ? cat.color : ""}`} />
              {cat.label}
            </button>
          ))}
        </div>

        <Card className="bg-gray-900/80 border-gray-800">
          <CardContent className="pt-6 space-y-5">
            {/* Selecionar colaborador */}
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

            {/* Foto do selecionado */}
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
                  <p className="text-gray-400 text-xs">{selectedSeller.totalSales} registros | {selectedSeller.totalPoints} pts</p>
                </div>
              </div>
            )}

            {/* Competição */}
            {filteredCompetitions.length > 0 && (
              <div className="space-y-2">
                <Label className="text-gray-300 font-semibold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  Campanha (opcional)
                </Label>
                <Select value={competitionId} onValueChange={setCompetitionId}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Selecione a campanha" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="none" className="text-gray-400 hover:bg-gray-700">Sem campanha</SelectItem>
                    {filteredCompetitions.map(comp => (
                      <SelectItem key={comp.id} value={comp.id.toString()} className="text-white hover:bg-gray-700">
                        {comp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* ===== CAMPOS POR CATEGORIA ===== */}

            {/* VENDAS */}
            {category === "vendas" && (
              <>
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold flex items-center gap-2">
                    <Car className="w-4 h-4 text-blue-400" />
                    Modelo do veículo *
                  </Label>
                  <Input value={vehicleModel} onChange={e => setVehicleModel(e.target.value)}
                    placeholder="Ex: Honda Civic 2024" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold">Valor (R$)</Label>
                  <Input value={value} onChange={e => setValue(e.target.value)}
                    placeholder="Ex: 85000" type="number" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold">Observação</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Algum detalhe..." className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 resize-none" rows={2} />
                </div>
              </>
            )}

            {/* F&I */}
            {category === "fei" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold text-sm">Placa</Label>
                    <Input value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
                      placeholder="ABC1D23" maxLength={7} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold text-sm">CPF do cliente</Label>
                    <Input value={customerCpf} onChange={e => setCustomerCpf(e.target.value)}
                      placeholder="000.000.000-00" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-green-400" />
                    Banco que pagou *
                  </Label>
                  <Input value={bankName} onChange={e => setBankName(e.target.value)}
                    placeholder="Ex: Santander, BV, Itaú..." className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold">Valor financiado (R$)</Label>
                  <Input value={financedValue} onChange={e => setFinancedValue(e.target.value)}
                    placeholder="Ex: 50000" type="number" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold text-sm">Retorno *</Label>
                    <Select value={returnType} onValueChange={setReturnType}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {["R1", "R2", "R3", "R4", "R5"].map(r => (
                          <SelectItem key={r} value={r} className="text-white hover:bg-gray-700">{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold text-sm">Data pagamento</Label>
                    <Input value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                      type="date" className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                </div>
              </>
            )}

            {/* CONSIGNAÇÃO */}
            {category === "consignacao" && (
              <>
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold flex items-center gap-2">
                    <Car className="w-4 h-4 text-blue-400" />
                    Modelo do veículo *
                  </Label>
                  <Input value={consignModel} onChange={e => setConsignModel(e.target.value)}
                    placeholder="Ex: Toyota Corolla 2023" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold text-sm">Placa</Label>
                    <Input value={consignPlate} onChange={e => setConsignPlate(e.target.value.toUpperCase())}
                      placeholder="ABC1D23" maxLength={7} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold text-sm">Data entrada *</Label>
                    <Input value={entryDate} onChange={e => setEntryDate(e.target.value)}
                      type="date" className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold">Nome do proprietário *</Label>
                  <Input value={ownerName} onChange={e => setOwnerName(e.target.value)}
                    placeholder="Nome do dono do veículo" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold">Telefone do proprietário</Label>
                  <Input value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)}
                    placeholder="(11) 99999-9999" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-blue-400 text-xs">
                    <strong>Regra:</strong> O veículo precisa ficar no mínimo 7 dias no pátio para que a consignação conte pontos na competição.
                  </p>
                </div>
              </>
            )}

            {/* PRÉ-VENDAS / SDR */}
            {category === "pre_vendas" && (
              <>
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold">Tipo de registro *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSdrType("agendamento")}
                      className={`p-3 rounded-lg border text-sm font-semibold transition-all ${
                        sdrType === "agendamento"
                          ? "border-orange-500 bg-orange-500/20 text-orange-400"
                          : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                      }`}
                    >
                      📅 Agendamento
                    </button>
                    <button
                      type="button"
                      onClick={() => setSdrType("lead_convertido")}
                      className={`p-3 rounded-lg border text-sm font-semibold transition-all ${
                        sdrType === "lead_convertido"
                          ? "border-green-500 bg-green-500/20 text-green-400"
                          : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                      }`}
                    >
                      ✅ Lead Convertido
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold flex items-center gap-2">
                    <Headphones className="w-4 h-4 text-orange-400" />
                    Nome do cliente *
                  </Label>
                  <Input value={customerName} onChange={e => setCustomerName(e.target.value)}
                    placeholder="Nome do cliente" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold text-sm">Telefone</Label>
                    <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="(11) 99999-9999" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold text-sm">Origem do lead</Label>
                    <Select value={leadSource} onValueChange={setLeadSource}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Origem" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {["Instagram", "Facebook", "OLX", "WebMotors", "iCarros", "Indicação", "Loja física", "WhatsApp", "Outro"].map(s => (
                          <SelectItem key={s} value={s} className="text-white hover:bg-gray-700">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold">Veículo de interesse</Label>
                  <Input value={vehicleInterest} onChange={e => setVehicleInterest(e.target.value)}
                    placeholder="Ex: SUV, Sedan, HB20..." className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                </div>
                {sdrType === "agendamento" && (
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold">Data do agendamento</Label>
                    <Input value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                      type="datetime-local" className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold">Observações</Label>
                  <Textarea value={sdrNotes} onChange={e => setSdrNotes(e.target.value)}
                    placeholder="Detalhes do atendimento..." className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 resize-none" rows={2} />
                </div>
                <div className={`rounded-lg p-3 border ${
                  sdrType === "lead_convertido"
                    ? "bg-green-500/10 border-green-500/20"
                    : "bg-orange-500/10 border-orange-500/20"
                }`}>
                  <p className={`text-xs ${
                    sdrType === "lead_convertido" ? "text-green-400" : "text-orange-400"
                  }`}>
                    {sdrType === "lead_convertido"
                      ? "Lead convertido vale 3 pontos na competição!"
                      : "Agendamento vale 1 ponto na competição."}
                  </p>
                </div>
              </>
            )}

            {/* DESPACHANTE */}
            {category === "despachante" && (
              <>
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    Tipo de documento *
                  </Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {["Transferência", "Licenciamento", "Emplacamento", "2ª Via CRV", "Outro"].map(t => (
                        <SelectItem key={t} value={t} className="text-white hover:bg-gray-700">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold text-sm">Placa</Label>
                    <Input value={dispatchPlate} onChange={e => setDispatchPlate(e.target.value.toUpperCase())}
                      placeholder="ABC1D23" maxLength={7} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold text-sm">Valor (R$)</Label>
                    <Input value={transferValue} onChange={e => setTransferValue(e.target.value)}
                      placeholder="Ex: 350" type="number" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 hover:border-green-500/30 transition-colors">
                    <input type="checkbox" checked={customerPaid} onChange={e => setCustomerPaid(e.target.checked)}
                      className="w-5 h-5 rounded accent-green-500" />
                    <div>
                      <p className="text-white font-semibold text-sm">Cliente pagou o documento</p>
                      <p className="text-gray-400 text-xs">Marca se o cliente pagou sem a loja bancar a transferência (ganha bônus!)</p>
                    </div>
                  </label>
                </div>
                {customerPaid && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <p className="text-green-400 text-xs font-semibold">
                      Bônus ativado! Você ganhará pontos extras por cobrar do cliente.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Botão registrar */}
            <Button
              onClick={handleSubmit}
              disabled={isPending || !sellerId}
              className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold text-lg py-6 shadow-lg shadow-red-500/20"
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <catInfo.icon className="w-5 h-5 mr-2" />
              )}
              {isPending ? "REGISTRANDO..." : `REGISTRAR ${catInfo.label.toUpperCase()}!`}
            </Button>

            <p className="text-center text-gray-500 text-xs">
              O registro será enviado para aprovação do gerente.
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
