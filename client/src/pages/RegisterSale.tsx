import { useState, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Link } from "wouter";
import { Flag, Car, CheckCircle2, ArrowLeft, Trophy, Loader2, Banknote, FileText, Warehouse, Headphones, Mic, MicOff, Sparkles, FileWarning, Upload, Phone, Search, X, User } from "lucide-react";
import { buildTenantPath, getCurrentTenantSlug, getTenantLoginPath } from "@/lib/tenant";

type Category = "vendas" | "fei" | "consignacao" | "despachante" | "pre_vendas";

/** Formata valor monetário brasileiro: 50000 -> 50.000,00 */
function formatCurrency(val: string): string {
  const num = parseFloat(val.replace(/[^\d.,]/g, "").replace(",", "."));
  if (isNaN(num)) return val;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Extrai número de string formatada: 50.000,00 -> 50000 */
function parseCurrencyToNumber(val: string): number {
  const cleaned = val.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  return parseFloat(cleaned) || 0;
}

/** Input de moeda com formatação automática */
function CurrencyInput({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const handleBlur = () => {
    if (value && value.trim()) {
      onChange(formatCurrency(value));
    }
  };
  return (
    <Input
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={handleBlur}
      placeholder={placeholder || "Ex: 50.000,00"}
      className={className || "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"}
    />
  );
}

const CATEGORIES: { value: Category; label: string; icon: typeof Car; color: string }[] = [
  { value: "vendas", label: "Venda", icon: Car, color: "text-red-400" },
  { value: "fei", label: "F&I", icon: Banknote, color: "text-green-400" },
  { value: "consignacao", label: "Consignação", icon: Warehouse, color: "text-blue-400" },
  { value: "despachante", label: "Despachante", icon: FileText, color: "text-purple-400" },
  { value: "pre_vendas", label: "SDR", icon: Headphones, color: "text-orange-400" },
];

/** Vehicle Selector - search from inventory or type manually */
function VehicleSelector({ value, onChange }: { value: string; onChange: (model: string, price?: number, plate?: string, inventoryId?: number) => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const { data: vehicles } = trpc.inventory.list.useQuery(
    { status: "available", search: searchTerm || undefined },
    { enabled: searchTerm.length >= 2 }
  );

  const handleSelect = (v: any) => {
    const label = `${v.brand} ${v.model} ${v.version || ""} ${v.year || ""}`.trim();
    onChange(label, v.price || undefined, v.plate || undefined, v.id || undefined);
    setSearchTerm("");
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            value={value || searchTerm}
            onChange={e => {
              if (value) {
                onChange("");
                setSearchTerm(e.target.value);
              } else {
                setSearchTerm(e.target.value);
              }
              setShowDropdown(true);
            }}
            onFocus={() => searchTerm.length >= 2 && setShowDropdown(true)}
            placeholder="Buscar no estoque ou digitar..."
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
          />
        </div>
        {value && (
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white" onClick={() => { onChange(""); setSearchTerm(""); }}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      {showDropdown && vehicles && vehicles.length > 0 && !value && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {vehicles.slice(0, 8).map((v: any) => (
            <button
              key={v.id}
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-gray-700 flex items-center gap-3 border-b border-gray-700/50 last:border-0"
              onClick={() => handleSelect(v)}
            >
              {v.photoUrl ? (
                <img src={v.photoUrl} alt="" className="w-12 h-8 object-cover rounded" />
              ) : (
                <div className="w-12 h-8 bg-gray-700 rounded flex items-center justify-center">
                  <Car className="w-4 h-4 text-gray-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{v.brand} {v.model}</p>
                <p className="text-gray-400 text-[10px] truncate">{v.version} | {v.year} | {v.color}</p>
              </div>
              <span className="text-emerald-400 text-sm font-semibold whitespace-nowrap">
                {v.price ? `R$ ${v.price.toLocaleString("pt-BR")}` : ""}
              </span>
            </button>
          ))}
          <button
            type="button"
            className="w-full px-3 py-2 text-left hover:bg-gray-700 text-gray-400 text-sm"
            onClick={() => { onChange(searchTerm); setShowDropdown(false); }}
          >
            Usar texto: "{searchTerm}"
          </button>
        </div>
      )}
      {showDropdown && searchTerm.length >= 2 && vehicles && vehicles.length === 0 && !value && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-3">
          <p className="text-gray-400 text-sm">Nenhum veículo encontrado no estoque</p>
          <button
            type="button"
            className="text-blue-400 text-sm mt-1 hover:underline"
            onClick={() => { onChange(searchTerm); setShowDropdown(false); }}
          >
            Usar "{searchTerm}" mesmo assim
          </button>
        </div>
      )}
    </div>
  );
}

export default function RegisterSale() {
  const tenantSlug = getCurrentTenantSlug();
  const [category, setCategory] = useState<Category>("vendas");
  const [sellerId, setSellerId] = useState<string>("");
  const [competitionId, setCompetitionId] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState("");

  // Data retroativa (opcional - para lançar vendas de meses anteriores)
  const [retroDate, setRetroDate] = useState("");

  // Venda fields
  const [vehicleModel, setVehicleModel] = useState("");
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(null);
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [saleLeadSource, setSaleLeadSource] = useState<string>("");
  const [saleCustomerName, setSaleCustomerName] = useState("");
  const [saleCustomerEmail, setSaleCustomerEmail] = useState("");
  const [saleCustomerCpf, setSaleCustomerCpf] = useState("");
  const [saleCustomerBirthday, setSaleCustomerBirthday] = useState("");

  // F&I fields
  const [feiCustomerName, setFeiCustomerName] = useState("");
  const [customerCpf, setCustomerCpf] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [bankName, setBankName] = useState("");
  const [financedValue, setFinancedValue] = useState("");
  const [returnType, setReturnType] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [feiNotes, setFeiNotes] = useState("");

  // Consignação fields
  const [consignModel, setConsignModel] = useState("");
  const [consignPlate, setConsignPlate] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [hasAuction, setHasAuction] = useState(false);
  const [vehicleStatus, setVehicleStatus] = useState("quitado");
  const [payoffValue, setPayoffValue] = useState("");
  const [costValue, setCostValue] = useState("");
  const [consignNotes, setConsignNotes] = useState("");
  const [plateCheckResult, setPlateCheckResult] = useState<{ blocked: boolean; warning: boolean; message: string } | null>(null);
  const [isCheckingPlate, setIsCheckingPlate] = useState(false);

  // Despachante fields
  const [dispatchPlate, setDispatchPlate] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [customerPaid, setCustomerPaid] = useState(false);
  const [transferValue, setTransferValue] = useState("");

  // SDR fields
  const [sdrType, setSdrType] = useState<"agendamento" | "lead_convertido">("agendamento");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [vehicleInterest, setVehicleInterest] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [sdrNotes, setSdrNotes] = useState("");

  // Voice
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const recognitionRef = useRef<any>(null);

  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: true });
  const { data: competitions } = trpc.competitions.list.useQuery({ status: "active" });

  const registerSale = trpc.sales.registerBySeller.useMutation();
  const registerFei = trpc.fei.register.useMutation();
  const registerConsignment = trpc.consignment.register.useMutation();
  const checkPlateMutation = trpc.consignment.checkPlate.useQuery(
    { plate: consignPlate },
    { enabled: consignPlate.length >= 6 && category === 'consignacao' }
  );
  const registerDispatch = trpc.dispatch.register.useMutation();
  const registerSdr = trpc.sdr.register.useMutation();
  const parseVoice = trpc.voice.parseVoice.useMutation();

  const selectedSeller = useMemo(() => {
    if (!sellerId || !sellers) return null;
    return sellers.find(s => s.id === parseInt(sellerId));
  }, [sellerId, sellers]);

  const filteredCompetitions = useMemo(() => {
    if (!competitions) return [];
    return competitions.filter(c => {
      if (category === "vendas") return c.category === "vendas" || c.category === "feirao";
      if (category === "pre_vendas") return c.category === "pre_vendas";
      return c.category === category;
    });
  }, [competitions, category]);

  useEffect(() => {
    if (filteredCompetitions.length === 1 && !competitionId) {
      setCompetitionId(filteredCompetitions[0].id.toString());
    } else if (filteredCompetitions.length === 0) {
      setCompetitionId("");
    }
  }, [filteredCompetitions, competitionId]);

  const isPending = registerSale.isPending || registerFei.isPending || registerConsignment.isPending || registerDispatch.isPending || registerSdr.isPending;

  const resetForm = () => {
    setVehicleModel(""); setValue(""); setDescription(""); setSaleLeadSource("");
    setCustomerCpf(""); setVehiclePlate(""); setBankName(""); setFinancedValue(""); setReturnType(""); setPaymentDate(""); setFeiNotes("");
    setConsignModel(""); setConsignPlate(""); setOwnerName(""); setOwnerPhone(""); setEntryDate("");
    setDispatchPlate(""); setDocumentType(""); setCustomerPaid(false); setTransferValue("");
    setSdrType("agendamento"); setCustomerName(""); setCustomerPhone(""); setCustomerEmail(""); setVehicleInterest(""); setLeadSource(""); setScheduledDate(""); setSdrNotes("");
    setSubmitted(false); setSubmittedMessage(""); setVoiceTranscript("");
  };

  // ===== VOICE RECOGNITION =====
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Seu navegador não suporta reconhecimento de voz. Use o Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setVoiceTranscript(finalTranscript + interim);
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error("Erro no reconhecimento de voz. Tente novamente.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    toast.info("Fale os dados da venda...");
  };

  const stopListening = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);

    if (!voiceTranscript.trim()) return;

    setIsProcessingVoice(true);
    try {
      const result = await parseVoice.mutateAsync({
        transcript: voiceTranscript,
        category,
      });
      if (result.success && result.data) {
        const d = result.data as any;
        // Preencher campos baseado na categoria
        if (category === "vendas") {
          if (d.vehicleModel) setVehicleModel(d.vehicleModel);
          if (d.value) setValue(String(Math.round(d.value)));
          if (d.description) setDescription(d.description);
        } else if (category === "fei") {
          if (d.vehiclePlate) setVehiclePlate(d.vehiclePlate);
          if (d.customerCpf) setCustomerCpf(d.customerCpf);
          if (d.bankName) setBankName(d.bankName);
          if (d.value) setFinancedValue(String(Math.round(d.value)));
        } else if (category === "consignacao") {
          if (d.vehicleModel) setConsignModel(d.vehicleModel);
          if (d.vehiclePlate) setConsignPlate(d.vehiclePlate);
          if (d.customerName) setOwnerName(d.customerName);
          if (d.customerPhone) setOwnerPhone(d.customerPhone);
        } else if (category === "despachante") {
          if (d.vehiclePlate) setDispatchPlate(d.vehiclePlate);
          if (d.value) setTransferValue(String(Math.round(d.value)));
        } else if (category === "pre_vendas") {
          if (d.customerName) setCustomerName(d.customerName);
          if (d.customerPhone) setCustomerPhone(d.customerPhone);
          if (d.customerEmail) setCustomerEmail(d.customerEmail);
          if (d.vehicleModel) setVehicleInterest(d.vehicleModel);
        }
        toast.success("Dados preenchidos pela voz! Confira e ajuste se necessário.");
      }
    } catch {
      toast.error("Erro ao processar voz. Preencha manualmente.");
    } finally {
      setIsProcessingVoice(false);
    }
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
          if (!saleLeadSource) { toast.error("Selecione a origem do lead!"); return; }
          result = await registerSale.mutateAsync({
            sellerId: sid, competitionId: cid, vehicleModel,
            vehiclePlate: vehiclePlate || undefined,
            value: value ? Math.round(parseCurrencyToNumber(value)) : undefined,
            description: description || undefined,
            leadSource: saleLeadSource as 'lead_loja' | 'lead_vendedor',
            customerPhone: customerPhone || undefined,
            customerName: saleCustomerName || undefined,
            customerEmail: saleCustomerEmail || undefined,
            customerCpf: saleCustomerCpf || undefined,
            customerBirthday: saleCustomerBirthday || undefined,
            retroDate: retroDate || undefined,
          });
          // Mostrar alerta se venda foi vinculada a agendamento SDR
          if ((result as any).linkedSdr) {
            toast.success(`Agendamento encontrado! SDR: ${(result as any).linkedSdr.sdrSellerName}`, { duration: 5000 });
          }
          break;
        case "fei":
          if (!feiCustomerName) { toast.error("Informe o nome do cliente!"); return; }
          if (!customerCpf) { toast.error("Informe o CPF do cliente!"); return; }
          if (!vehiclePlate) { toast.error("Informe a placa do veículo!"); return; }
          if (!bankName || !returnType) { toast.error("Informe o banco e o tipo de retorno!"); return; }
          result = await registerFei.mutateAsync({
            sellerId: sid, competitionId: cid,
            customerName: feiCustomerName,
            customerCpf: customerCpf || undefined,
            vehiclePlate: vehiclePlate || undefined,
            bankName, returnType,
            financedValue: financedValue ? Math.round(parseCurrencyToNumber(financedValue)) : undefined,
            paymentDate: paymentDate ? new Date(paymentDate).getTime() : undefined,
            notes: feiNotes || undefined,
          });
          break;
        case "consignacao":
          if (!consignPlate || consignPlate.length < 6) { toast.error("Informe a placa do veículo!"); return; }
          if (!consignModel || !ownerName) { toast.error("Informe o modelo e o nome do dono!"); return; }
          if (checkPlateMutation.data?.blocked) { toast.error(checkPlateMutation.data.message); return; }
          result = await registerConsignment.mutateAsync({
            sellerId: sid, competitionId: cid,
            vehiclePlate: consignPlate,
            vehicleModel: consignModel, ownerName,
            ownerPhone: ownerPhone || undefined,
            entryDate: Date.now(),
            hasAuction,
            vehicleStatus,
            payoffValue: payoffValue ? Math.round(parseCurrencyToNumber(payoffValue)) : undefined,
            costValue: costValue ? Math.round(parseCurrencyToNumber(costValue)) : undefined,
            notes: consignNotes || undefined,
          });
          break;
        case "despachante":
          if (!documentType) { toast.error("Informe o tipo de documento!"); return; }
          result = await registerDispatch.mutateAsync({
            sellerId: sid, competitionId: cid,
            vehiclePlate: dispatchPlate || undefined,
            documentType, customerPaid,
            transferValue: transferValue ? Math.round(parseCurrencyToNumber(transferValue)) : undefined,
          });
          break;
        case "pre_vendas":
          if (!customerName) { toast.error("Informe o nome do cliente!"); return; }
          result = await registerSdr.mutateAsync({
            sellerId: sid, competitionId: cid,
            type: sdrType,
            customerName: customerName || undefined,
            customerPhone: customerPhone || undefined,
            customerEmail: customerEmail || undefined,
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
              {category === "pre_vendas" ? (
                <p className="text-emerald-400 text-sm mt-2 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Agendamento confirmado!
                </p>
              ) : (
                <p className="text-yellow-400 text-sm mt-2 flex items-center justify-center gap-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Aguardando aprovação...
                </p>
              )}
            </div>

            {/* Aviso de Documentos - só para vendas */}
            {category === "vendas" && (
              <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/40 rounded-xl p-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <FileWarning className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-orange-400 font-bold text-sm">Documentos Necessários!</p>
                    <p className="text-gray-400 text-xs mt-1">Após a aprovação, envie a <strong className="text-white">CNH</strong> e o <strong className="text-white">Comprovante de Residência</strong> do cliente na sua <strong className="text-white">Minha Área</strong> para o despachante iniciar a transferência.</p>
                    <Link href={sellerId ? buildTenantPath(tenantSlug, `/minha-area/${sellerId}`) : getTenantLoginPath(tenantSlug)}>
                      <button className="mt-3 flex items-center gap-2 text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors">
                        <Upload className="w-3.5 h-3.5" /> Ir para Minha Área e enviar docs
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button onClick={resetForm} className="bg-red-600 hover:bg-red-700 text-white font-bold">
                <catInfo.icon className="w-4 h-4 mr-2" />
                REGISTRAR OUTRO
              </Button>
              {sellerId && category === "vendas" && (
                <Link href={buildTenantPath(tenantSlug, `/minha-area/${sellerId}`)}>
                  <Button variant="outline" className="w-full border-orange-600 text-orange-400 hover:bg-orange-600/10 font-bold">
                    <FileText className="w-4 h-4 mr-2" />
                    ENVIAR DOCUMENTOS
                  </Button>
                </Link>
              )}
              <Link href={buildTenantPath(tenantSlug, "/")}>
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
        <div className="grid grid-cols-5 gap-1 bg-gray-900/80 rounded-lg p-1 border border-gray-800">
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
                  {sellers?.filter(s => {
                    const dept = s.department || 'vendas';
                    if (category === 'vendas') return dept === 'vendas';
                    if (category === 'fei') return dept === 'fei';
                    if (category === 'consignacao') return dept === 'consignacao';
                    if (category === 'despachante') return dept === 'despachante';
                    if (category === 'pre_vendas') return dept === 'pre_vendas' || dept === 'vendas';
                    return true;
                  }).map(seller => (
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
                  <p className="text-gray-400 text-xs">
                    {(!selectedSeller.department || selectedSeller.department === 'vendas' || selectedSeller.department === 'pre_vendas')
                      ? `${selectedSeller.totalSales} registros | ${selectedSeller.totalPoints} pts`
                      : selectedSeller.department === 'fei' ? 'F&I' : selectedSeller.department === 'consignacao' ? 'Consignação' : selectedSeller.department === 'despachante' ? 'Despachante' : selectedSeller.department
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Competição */}
            {filteredCompetitions.length > 0 && (
              <div className="space-y-2">
                <Label className="text-gray-300 font-semibold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  Campanha
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

            {/* ===== BOTÃO DE VOZ ===== */}
            <div className="relative">
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessingVoice}
                className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl border-2 font-bold text-sm transition-all ${
                  isListening
                    ? "border-red-500 bg-red-500/20 text-red-400 animate-pulse"
                    : isProcessingVoice
                    ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-400"
                    : "border-dashed border-gray-600 bg-gray-800/50 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                }`}
              >
                {isProcessingVoice ? (
                  <>
                    <Sparkles className="w-5 h-5 animate-spin" />
                    IA processando sua fala...
                  </>
                ) : isListening ? (
                  <>
                    <MicOff className="w-5 h-5" />
                    PARAR E PREENCHER
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    REGISTRAR POR VOZ
                  </>
                )}
              </button>
              {voiceTranscript && !isProcessingVoice && (
                <div className="mt-2 bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                  <p className="text-gray-400 text-xs mb-1">Transcrição:</p>
                  <p className="text-gray-300 text-sm italic">"{voiceTranscript.trim()}"</p>
                </div>
              )}
            </div>

            {/* ===== CAMPOS POR CATEGORIA ===== */}

            {/* VENDAS */}
            {category === "vendas" && (
              <>
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold flex items-center gap-2">
                    <Flag className="w-4 h-4 text-yellow-400" />
                    Origem do Lead *
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSaleLeadSource('lead_loja')}
                      className={`py-3 px-4 rounded-lg border-2 font-bold text-sm transition-all flex flex-col items-center gap-1 ${
                        saleLeadSource === 'lead_loja'
                          ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                          : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <span className="text-lg">🏪</span>
                      <span>Lead Loja</span>
                      <span className="text-[10px] text-gray-500 font-normal">Plataformas da loja</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaleLeadSource('lead_vendedor')}
                      className={`py-3 px-4 rounded-lg border-2 font-bold text-sm transition-all flex flex-col items-center gap-1 ${
                        saleLeadSource === 'lead_vendedor'
                          ? 'border-green-500 bg-green-500/20 text-green-400'
                          : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <span className="text-lg">👤</span>
                      <span>Lead Vendedor</span>
                      <span className="text-[10px] text-gray-500 font-normal">Facebook, anúncio próprio</span>
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold flex items-center gap-2">
                    <Car className="w-4 h-4 text-blue-400" />
                    Veículo *
                  </Label>
                  <VehicleSelector
                    value={vehicleModel}
                    onChange={(model, price, plate, invId) => {
                      setVehicleModel(model);
                      if (price && !value) setValue(String(price));
                      if (plate) setVehiclePlate(plate);
                      if (invId) setSelectedInventoryId(invId);
                    }}
                  />
                  {selectedInventoryId && (
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3 h-3" /> Veículo selecionado do estoque (saída automática após aprovação)
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-400" />
                    Nome completo do comprador
                  </Label>
                  <Input value={saleCustomerName} onChange={e => setSaleCustomerName(e.target.value)}
                    placeholder="Nome completo" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold flex items-center gap-2">
                      <Phone className="w-4 h-4 text-green-400" />
                      Telefone
                    </Label>
                    <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="(47) 99999-9999" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold">CPF</Label>
                    <Input value={saleCustomerCpf} onChange={e => setSaleCustomerCpf(e.target.value)}
                      placeholder="000.000.000-00" maxLength={14} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold">Email</Label>
                    <Input value={saleCustomerEmail} onChange={e => setSaleCustomerEmail(e.target.value)}
                      placeholder="email@exemplo.com" type="email" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold">Data de Nascimento</Label>
                    <Input value={saleCustomerBirthday} onChange={e => setSaleCustomerBirthday(e.target.value)}
                      placeholder="DD/MM/AAAA" maxLength={10} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 -mt-1">Telefone cruza com agendamentos (SDR). Aniversário permite disparo automático de parabéns!</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold">Valor (R$)</Label>
                    <CurrencyInput value={value} onChange={setValue} placeholder="Ex: 50.000,00" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold">Placa do veículo</Label>
                    <Input value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
                      placeholder="ABC1D23" maxLength={7} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 -mt-1">Se preencher a placa, o sistema cruza automaticamente com a consignação</p>
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
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-400" />
                    Nome do cliente *
                  </Label>
                  <Input value={feiCustomerName} onChange={e => setFeiCustomerName(e.target.value)}
                    placeholder="Nome completo do cliente" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold text-sm">CPF do cliente *</Label>
                    <Input value={customerCpf} onChange={e => setCustomerCpf(e.target.value)}
                      placeholder="000.000.000-00" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold text-sm">Placa do veículo *</Label>
                    <Input value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
                      placeholder="ABC1D23" maxLength={7} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
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
                  <CurrencyInput value={financedValue} onChange={setFinancedValue} placeholder="Ex: 50.000,00" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold text-sm">Retorno *</Label>
                    <Select value={returnType} onValueChange={setReturnType}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {["R0", "R1", "R2", "R3", "R4", "R5"].map(r => (
                          <SelectItem key={r} value={r} className="text-white hover:bg-gray-700">{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold text-sm">Data pgto banco</Label>
                    <Input value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                      type="date" className="bg-gray-800 border-gray-700 text-white" />
                    <p className="text-[10px] text-gray-500">Data que o banco pagou (pode ser diferente do dia do lançamento)</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold">Observação</Label>
                  <Textarea value={feiNotes} onChange={e => setFeiNotes(e.target.value)}
                    placeholder="Anotações sobre a ficha..." className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 resize-none" rows={2} />
                </div>
              </>
            )}

            {/* CONSIGNAÇÃO */}
            {category === "consignacao" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold text-sm flex items-center gap-1">
                      Placa do veículo *
                    </Label>
                    <Input value={consignPlate} onChange={e => setConsignPlate(e.target.value.toUpperCase())}
                      placeholder="ABC1D23" maxLength={7}
                      className={`bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 ${
                        checkPlateMutation.data?.blocked ? 'border-red-500 ring-1 ring-red-500' :
                        checkPlateMutation.data?.warning ? 'border-yellow-500 ring-1 ring-yellow-500' : ''
                      }`} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold text-sm">Data entrada</Label>
                    <div className="bg-gray-800/50 border border-gray-700 rounded-md px-3 py-2 text-white text-sm flex items-center gap-2">
                      <span className="text-emerald-400">Automática:</span>
                      <span>{new Date().toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p className="text-xs text-gray-500">A data de entrada é registrada automaticamente no momento do lançamento e não pode ser alterada (contagem dos 7 dias).</p>
                  </div>
                </div>
                {/* Alerta de placa duplicada */}
                {checkPlateMutation.data?.blocked && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <p className="text-red-400 text-xs font-semibold">
                      ⛔ {checkPlateMutation.data.message}
                    </p>
                  </div>
                )}
                {checkPlateMutation.data?.warning && !checkPlateMutation.data?.blocked && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <p className="text-yellow-400 text-xs font-semibold">
                      ⚠️ {checkPlateMutation.data.message}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold flex items-center gap-2">
                    <Car className="w-4 h-4 text-blue-400" />
                    Modelo do veículo *
                  </Label>
                  <Input value={consignModel} onChange={e => setConsignModel(e.target.value)}
                    placeholder="Ex: Toyota Corolla 2023" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
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

                {/* Leilão */}
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold text-sm">Leilão</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setHasAuction(false)}
                      className={`py-2.5 rounded-lg text-sm font-bold border transition-all ${
                        !hasAuction ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
                      }`}>Sem Leilão</button>
                    <button type="button" onClick={() => setHasAuction(true)}
                      className={`py-2.5 rounded-lg text-sm font-bold border transition-all ${
                        hasAuction ? 'bg-red-600 border-red-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
                      }`}>Com Leilão</button>
                  </div>
                </div>

                {/* Quitação */}
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold text-sm">Situação do veículo</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setVehicleStatus('quitado')}
                      className={`py-2.5 rounded-lg text-sm font-bold border transition-all ${
                        vehicleStatus === 'quitado' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
                      }`}>Quitado</button>
                    <button type="button" onClick={() => setVehicleStatus('financiado')}
                      className={`py-2.5 rounded-lg text-sm font-bold border transition-all ${
                        vehicleStatus === 'financiado' ? 'bg-orange-600 border-orange-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
                      }`}>Financiado</button>
                  </div>
                </div>

                {/* Valor de quitação (só aparece quando financiado) */}
                {vehicleStatus === 'financiado' && (
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold text-sm">Valor de quitação (R$)</Label>
                    <CurrencyInput value={payoffValue} onChange={setPayoffValue} placeholder="Ex: 25.000,00" />
                  </div>
                )}

                {/* Valor de custo */}
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold text-sm">Valor de custo (R$)</Label>
                  <CurrencyInput value={costValue} onChange={setCostValue} placeholder="Ex: 50.000,00" />
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold text-sm">Observações</Label>
                  <textarea value={consignNotes} onChange={e => setConsignNotes(e.target.value)}
                    placeholder="Informações adicionais sobre o veículo..."
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder:text-gray-500 rounded-md px-3 py-2 text-sm" />
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-blue-400 text-xs">
                    <strong>Regra:</strong> O veículo precisa ficar no mínimo 7 dias no pátio para contar pontos. Placa é obrigatória e não pode duplicar em 60 dias.
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
                      Agendamento
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
                      Lead Convertido
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
                    <Label className="text-gray-300 font-semibold text-sm">E-mail</Label>
                    <Input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
                      placeholder="email@exemplo.com" type="email" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold text-sm">Veículo de interesse</Label>
                    <Input value={vehicleInterest} onChange={e => setVehicleInterest(e.target.value)}
                      placeholder="Ex: HB20, Civic..." className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold text-sm">Origem</Label>
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
                {sdrType === "agendamento" && (
                  <div className="space-y-2">
                    <Label className="text-gray-300 font-semibold">Data do agendamento</Label>
                    <Input value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                      type="datetime-local" className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-gray-300 font-semibold">Descrição / Observações</Label>
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
                      : "Agendamento vale 1 ponto. Quando o cliente comparecer e for aprovado, ganha +1 ponto extra!"}
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
                    <CurrencyInput value={transferValue} onChange={setTransferValue} placeholder="Ex: 350,00" />
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

            {/* Data retroativa (opcional) */}
            {(category === "vendas" || category === "fei" || category === "consignacao" || category === "despachante") && (
              <div className="space-y-2 border border-yellow-500/30 bg-yellow-500/5 rounded-lg p-3">
                <Label className="text-yellow-400 font-semibold text-sm flex items-center gap-2">
                  📅 Data da Venda (opcional - retroativo)
                </Label>
                <Input
                  type="date"
                  value={retroDate}
                  onChange={e => setRetroDate(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
                <p className="text-gray-500 text-xs">
                  {retroDate ? `A venda será registrada com data ${new Date(retroDate + 'T12:00:00').toLocaleDateString('pt-BR')}` : 'Deixe vazio para usar a data de hoje'}
                </p>
              </div>
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
