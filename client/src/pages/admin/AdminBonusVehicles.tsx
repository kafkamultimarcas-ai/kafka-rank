import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, Car, Trash2, Edit, ToggleLeft, ToggleRight, Search, Package, PenLine } from "lucide-react";
import { toast } from "sonner";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('pt-BR');
}

export default function AdminBonusVehicles() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Mode: 'stock' = selecionar do estoque, 'manual' = digitar manualmente
  const [inputMode, setInputMode] = useState<'stock' | 'manual'>('stock');
  const [stockSearch, setStockSearch] = useState("");
  const [showStockDropdown, setShowStockDropdown] = useState(false);
  
  // Form state
  const [vehicleModel, setVehicleModel] = useState("");
  const [plate, setPlate] = useState("");
  const [bonusAmount, setBonusAmount] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [campaignRules, setCampaignRules] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const utils = trpc.useUtils();
  const { data: bonusVehicles = [], isLoading } = trpc.sellerResults.listBonusVehicles.useQuery({});
  
  // Buscar veículos do estoque
  const { data: stockVehicles } = trpc.inventory.list.useQuery(
    { status: "available", search: stockSearch || undefined },
    { enabled: inputMode === 'stock' && stockSearch.length >= 2 }
  );

  const createMutation = trpc.sellerResults.createBonusVehicle.useMutation({
    onSuccess: () => { utils.sellerResults.listBonusVehicles.invalidate(); resetForm(); },
  });
  const updateMutation = trpc.sellerResults.updateBonusVehicle.useMutation({
    onSuccess: () => { utils.sellerResults.listBonusVehicles.invalidate(); resetForm(); },
  });
  const deleteMutation = trpc.sellerResults.deleteBonusVehicle.useMutation({
    onSuccess: () => { utils.sellerResults.listBonusVehicles.invalidate(); },
  });

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setInputMode('stock');
    setStockSearch("");
    setShowStockDropdown(false);
    setVehicleModel("");
    setPlate("");
    setBonusAmount("");
    setCampaignName("");
    setCampaignRules("");
    setStartDate("");
    setEndDate("");
  }

  function handleSelectFromStock(v: any) {
    const label = `${v.brand} ${v.model} ${v.version || ""} ${v.year || ""}`.trim();
    setVehicleModel(label);
    setPlate(v.plate || "");
    setStockSearch(label);
    setShowStockDropdown(false);
  }

  function handleSubmit() {
    // Validar campos obrigatórios
    if (!vehicleModel) { toast.error("Selecione ou digite o veículo"); return; }
    if (!bonusAmount) { toast.error("Informe o valor do bônus"); return; }
    if (!campaignName) { toast.error("Informe o nome da campanha"); return; }
    if (!startDate) { toast.error("Informe a data de início"); return; }
    if (!endDate) { toast.error("Informe a data de fim"); return; }

    const cleanAmount = bonusAmount.replace(/[^\d,\.]/g, '').replace(',', '.');
    const amount = Math.round(parseFloat(cleanAmount) * 100);
    if (isNaN(amount) || amount <= 0) { toast.error("Valor do bônus inválido"); return; }

    // Tratar formato de data (iOS pode enviar formato diferente)
    let startTs: number, endTs: number;
    try {
      startTs = new Date(startDate + 'T00:00:00').getTime();
      endTs = new Date(endDate + 'T23:59:59').getTime();
      if (isNaN(startTs) || isNaN(endTs)) throw new Error('Data inválida');
    } catch {
      toast.error("Data inválida. Selecione novamente.");
      return;
    }

    const data = {
      vehicleModel,
      plate: plate || undefined,
      bonusAmount: amount,
      campaignName,
      campaignRules: campaignRules || undefined,
      startDate: startTs,
      endDate: endTs,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => toast.success("Carro bônus cadastrado com sucesso!"),
        onError: (err) => toast.error(`Erro ao cadastrar: ${err.message}`),
      });
    }
  }

  function handleEdit(bv: any) {
    setEditingId(bv.id);
    setInputMode('manual');
    setVehicleModel(bv.vehicleModel);
    setPlate(bv.plate || "");
    setBonusAmount((bv.bonusAmount / 100).toFixed(2).replace('.', ','));
    setCampaignName(bv.campaignName);
    setCampaignRules(bv.campaignRules || "");
    setStartDate(new Date(bv.startDate).toISOString().split('T')[0]);
    setEndDate(new Date(bv.endDate).toISOString().split('T')[0]);
    setShowForm(true);
  }

  function handleToggleActive(bv: any) {
    updateMutation.mutate({ id: bv.id, active: !bv.active });
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Carros Bônus</h1>
            <p className="text-sm text-muted-foreground">Cadastre veículos com bônus para campanhas. O bônus é lançado automaticamente quando o vendedor vende o carro.</p>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-1" /> Novo Carro Bônus
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-emerald-400">{editingId ? 'Editar' : 'Novo'} Carro Bônus</h3>
            
            {/* Toggle: Estoque vs Manual */}
            {!editingId && (
              <div className="flex gap-2 p-1 bg-background rounded-lg border border-border w-fit">
                <button
                  onClick={() => { setInputMode('stock'); setVehicleModel(""); setPlate(""); setStockSearch(""); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${inputMode === 'stock' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Package className="w-3.5 h-3.5" /> Do Estoque
                </button>
                <button
                  onClick={() => { setInputMode('manual'); setVehicleModel(""); setPlate(""); setStockSearch(""); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${inputMode === 'manual' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <PenLine className="w-3.5 h-3.5" /> Manual
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Veículo - Do Estoque */}
              {inputMode === 'stock' && (
                <div className="md:col-span-2 relative">
                  <label className="text-sm text-muted-foreground mb-1 block">Buscar no Estoque *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={vehicleModel || stockSearch}
                      onChange={(e) => {
                        if (vehicleModel) { setVehicleModel(""); setPlate(""); }
                        setStockSearch(e.target.value);
                        setShowStockDropdown(true);
                      }}
                      onFocus={() => stockSearch.length >= 2 && setShowStockDropdown(true)}
                      placeholder="Digite modelo, marca ou placa para buscar..."
                      className="bg-background pl-9"
                    />
                  </div>
                  {vehicleModel && (
                    <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                      <Car className="w-3 h-3" /> Selecionado: {vehicleModel} {plate && `(${plate})`}
                      <button onClick={() => { setVehicleModel(""); setPlate(""); setStockSearch(""); }} className="text-red-400 ml-2 underline text-[10px]">limpar</button>
                    </p>
                  )}
                  {!vehicleModel && <p className="text-xs text-muted-foreground mt-1">Digite pelo menos 2 caracteres para buscar no estoque</p>}
                  
                  {/* Dropdown de resultados */}
                  {showStockDropdown && stockVehicles && stockVehicles.length > 0 && !vehicleModel && (
                    <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {stockVehicles.slice(0, 15).map((v: any) => (
                        <button
                          key={v.id}
                          onClick={() => handleSelectFromStock(v)}
                          className="w-full text-left px-3 py-2.5 hover:bg-accent/50 border-b border-border/50 last:border-0 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm text-foreground">{v.brand} {v.model} {v.version || ""} {v.year || ""}</p>
                              <p className="text-xs text-muted-foreground">
                                {v.plate && <span className="font-mono mr-2">{v.plate}</span>}
                                {v.color && <span className="mr-2">{v.color}</span>}
                                {v.km && <span>{Number(v.km).toLocaleString('pt-BR')} km</span>}
                              </p>
                            </div>
                            {v.price && <span className="text-xs text-emerald-400 font-medium">R$ {Number(v.price).toLocaleString('pt-BR')}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {showStockDropdown && stockSearch.length >= 2 && stockVehicles && stockVehicles.length === 0 && !vehicleModel && (
                    <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-border rounded-lg shadow-xl p-3">
                      <p className="text-sm text-muted-foreground text-center">Nenhum veículo encontrado no estoque</p>
                      <button onClick={() => setInputMode('manual')} className="text-xs text-emerald-400 underline mt-1 block mx-auto">Cadastrar manualmente</button>
                    </div>
                  )}
                </div>
              )}

              {/* Veículo - Manual */}
              {inputMode === 'manual' && (
                <>
                  <div className="md:col-span-2">
                    <label className="text-sm text-muted-foreground mb-1 block">Veículo/Modelo *</label>
                    <Input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="Ex: Onix 2022, Saveiro Robust 1.6" className="bg-background" />
                    <p className="text-xs text-muted-foreground mt-1">O sistema cruza automaticamente com a placa ou modelo na hora da venda</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Placa (opcional)</label>
                    <Input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="ABC1D23" className="bg-background" />
                    <p className="text-xs text-muted-foreground mt-1">Se informar, o bônus vale só para este carro específico</p>
                  </div>
                </>
              )}

              {/* Campos comuns */}
              <div className={inputMode === 'stock' ? '' : ''}>
                <label className="text-sm text-muted-foreground mb-1 block">Valor do Bônus (R$) *</label>
                <Input value={bonusAmount} onChange={(e) => setBonusAmount(e.target.value)} placeholder="500,00" className="bg-background" />
              </div>
              {inputMode === 'stock' && (
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Placa (automática)</label>
                  <Input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="Preenchida do estoque" className="bg-background" disabled={!!plate} />
                </div>
              )}
              <div className="md:col-span-2">
                <label className="text-sm text-muted-foreground mb-1 block">Nome da Campanha *</label>
                <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Ex: Feirão Kafka, Queima de Estoque" className="bg-background" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-muted-foreground mb-1 block">Regras da Campanha (opcional)</label>
                <Input value={campaignRules} onChange={(e) => setCampaignRules(e.target.value)} placeholder="Ex: Válido apenas para vendas à vista" className="bg-background" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Data Início *</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-background" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Data Fim *</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-background" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Cadastrar Carro Bônus'}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* Lista */}
        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Carregando...</div>
        ) : bonusVehicles.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <Car className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground text-lg">Nenhum carro bônus cadastrado</p>
            <p className="text-sm text-muted-foreground mt-1">Cadastre veículos com bônus para que o sistema lance automaticamente quando vendidos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bonusVehicles.map((bv: any) => {
              const now = Date.now();
              const isActive = bv.active && bv.endDate >= now && bv.startDate <= now;
              const isExpired = bv.active && bv.endDate < now;
              return (
                <div key={bv.id} className={`bg-card border rounded-xl p-4 transition-all ${isActive ? 'border-emerald-500/40 shadow-sm shadow-emerald-500/10' : 'border-border opacity-70'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-foreground text-lg">{bv.vehicleModel}</p>
                        {isActive && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium">ATIVO</span>}
                        {!bv.active && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-medium">INATIVO</span>}
                        {isExpired && <span className="text-[10px] bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full font-medium">EXPIRADO</span>}
                      </div>
                      {bv.plate && <p className="text-sm text-muted-foreground mt-0.5">Placa: <span className="font-mono font-medium">{bv.plate}</span></p>}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-sm text-orange-400 font-medium">{bv.campaignName}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(bv.startDate)} → {formatDate(bv.endDate)}</span>
                      </div>
                      {bv.campaignRules && <p className="text-xs text-muted-foreground mt-1 italic">{bv.campaignRules}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-black text-emerald-400">{formatCurrency(bv.bonusAmount)}</p>
                      <div className="flex gap-1 mt-2 justify-end">
                        <button onClick={() => handleToggleActive(bv)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-accent" title={bv.active ? 'Desativar' : 'Ativar'}>
                          {bv.active ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button onClick={() => handleEdit(bv)} className="text-muted-foreground hover:text-blue-400 p-1.5 rounded-lg hover:bg-accent">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (confirm('Excluir este carro bônus?')) deleteMutation.mutate({ id: bv.id }); }} className="text-muted-foreground hover:text-red-400 p-1.5 rounded-lg hover:bg-accent">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
