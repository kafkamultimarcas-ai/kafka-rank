import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { Target, Plus, Trash2, Award, TrendingUp } from "lucide-react";

const CATEGORY_OPTIONS = [
  { value: "vendas", label: "Vendas" },
  { value: "fei", label: "F&I" },
  { value: "consignacao", label: "Consignação" },
  { value: "despachante", label: "Despachante" },
  { value: "feirao", label: "Feirão" },
  { value: "pre_vendas", label: "Pré-Vendas" },
];

const CATEGORY_COLORS: Record<string, string> = {
  vendas: "bg-red-500/20 text-red-400",
  fei: "bg-green-500/20 text-green-400",
  consignacao: "bg-blue-500/20 text-blue-400",
  despachante: "bg-purple-500/20 text-purple-400",
  feirao: "bg-orange-500/20 text-orange-400",
  pre_vendas: "bg-cyan-500/20 text-cyan-400",
};

export default function AdminGoals() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [type, setType] = useState<"store" | "individual">("store");
  const [category, setCategory] = useState("vendas");
  const [targetValue, setTargetValue] = useState("");
  const [bonusDescription, setBonusDescription] = useState("");
  const [bonusValue, setBonusValue] = useState("");
  const [sellerId, setSellerId] = useState("");

  const utils = trpc.useUtils();
  const { data: goals, isLoading } = trpc.goals.list.useQuery({ month, year });
  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: true });
  const createGoal = trpc.goals.create.useMutation({
    onSuccess: () => {
      toast.success("Meta criada!");
      utils.goals.list.invalidate();
      setShowForm(false);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateGoal = trpc.goals.update.useMutation({
    onSuccess: () => {
      toast.success("Progresso atualizado!");
      utils.goals.list.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteGoal = trpc.goals.delete.useMutation({
    onSuccess: () => {
      toast.success("Meta excluída!");
      utils.goals.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setType("store");
    setCategory("vendas");
    setTargetValue("");
    setBonusDescription("");
    setBonusValue("");
    setSellerId("");
  };

  const handleCreate = () => {
    if (!targetValue || parseInt(targetValue) <= 0) {
      toast.error("Informe o valor da meta");
      return;
    }
    createGoal.mutate({
      type,
      category,
      targetValue: parseInt(targetValue),
      month,
      year,
      bonusDescription: bonusDescription || undefined,
      bonusValue: bonusValue ? parseFloat(bonusValue) : undefined,
      sellerId: type === "individual" && sellerId ? parseInt(sellerId) : undefined,
    });
  };

  const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-primary" />
            <h1 className="font-heading font-bold text-2xl text-foreground">Metas</h1>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Meta
          </Button>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }}>
            ←
          </Button>
          <span className="font-heading font-bold text-lg px-4">{MONTH_NAMES[month - 1]} {year}</span>
          <Button variant="outline" size="sm" onClick={() => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }}>
            →
          </Button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="racing-card p-6 space-y-4">
            <h3 className="font-heading font-bold text-foreground">Criar Meta</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Tipo</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as "store" | "individual")}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="store">Meta da Loja (Geral)</option>
                  <option value="individual">Meta Individual</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Categoria</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {CATEGORY_OPTIONS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Valor da Meta</label>
                <Input type="number" value={targetValue} onChange={e => setTargetValue(e.target.value)} placeholder="Ex: 50" />
              </div>
              {type === "individual" && (
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Vendedor</label>
                  <select
                    value={sellerId}
                    onChange={e => setSellerId(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {sellers?.map(s => (
                      <option key={s.id} value={s.id}>{s.nickname || s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Descrição do Bônus (opcional)</label>
                <Input value={bonusDescription} onChange={e => setBonusDescription(e.target.value)} placeholder="Ex: Almoço especial" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Valor do Bônus R$ (opcional)</label>
                <Input type="number" value={bonusValue} onChange={e => setBonusValue(e.target.value)} placeholder="Ex: 500" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={createGoal.isPending}>
                {createGoal.isPending ? "Criando..." : "Criar Meta"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* Goals List */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : !goals || goals.length === 0 ? (
          <div className="racing-card p-8 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma meta para {MONTH_NAMES[month - 1]} {year}.</p>
            <p className="text-sm text-muted-foreground mt-1">Clique em "Nova Meta" para criar.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Store Goals */}
            {goals.filter(g => g.type === "store").length > 0 && (
              <div>
                <h3 className="font-heading font-bold text-sm text-muted-foreground mb-3 uppercase">Metas da Loja</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {goals.filter(g => g.type === "store").map(goal => {
                    const pct = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
                    return (
                      <div key={goal.id} className="racing-card p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${CATEGORY_COLORS[goal.category] || ""}`}>
                            {CATEGORY_OPTIONS.find(c => c.value === goal.category)?.label || goal.category}
                          </span>
                          <div className="flex items-center gap-1">
                            {goal.achieved && <Award className="h-4 w-4 text-emerald-400" />}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                              if (confirm("Excluir esta meta?")) deleteGoal.mutate({ id: goal.id });
                            }}>
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-end gap-2 mb-2">
                          <span className="font-heading font-bold text-2xl text-foreground">{goal.currentValue}</span>
                          <span className="text-sm text-muted-foreground">/ {goal.targetValue}</span>
                          <span className="text-sm font-bold text-primary ml-auto">{pct}%</span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-muted overflow-hidden mb-2">
                          <div className={`h-full rounded-full ${goal.achieved ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                        </div>
                        {goal.bonusDescription && (
                          <p className="text-xs text-yellow-500 flex items-center gap-1">
                            <Award className="h-3 w-3" /> {goal.bonusDescription}
                            {goal.bonusValue ? ` — R$ ${goal.bonusValue.toLocaleString("pt-BR")}` : ""}
                          </p>
                        )}
                        <div className="flex gap-2 mt-3">
                          <Input
                            type="number"
                            placeholder="Novo valor"
                            className="h-8 text-sm"
                            onKeyDown={e => {
                              if (e.key === "Enter") {
                                const val = parseInt((e.target as HTMLInputElement).value);
                                if (val >= 0) {
                                  updateGoal.mutate({ id: goal.id, currentValue: val });
                                  (e.target as HTMLInputElement).value = "";
                                }
                              }
                            }}
                          />
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => {
                            updateGoal.mutate({ id: goal.id, currentValue: goal.currentValue + 1 });
                          }}>
                            <TrendingUp className="h-3 w-3 mr-1" /> +1
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Individual Goals */}
            {goals.filter(g => g.type === "individual").length > 0 && (
              <div>
                <h3 className="font-heading font-bold text-sm text-muted-foreground mb-3 uppercase">Metas Individuais</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {goals.filter(g => g.type === "individual").map(goal => {
                    const pct = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
                    const seller = sellers?.find(s => s.id === goal.sellerId);
                    return (
                      <div key={goal.id} className="racing-card p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {seller?.photoUrl ? (
                              <img src={seller.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold">
                                {seller?.name?.charAt(0) || "?"}
                              </div>
                            )}
                            <span className="font-semibold text-sm text-foreground">{seller?.nickname || seller?.name || "?"}</span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            if (confirm("Excluir esta meta?")) deleteGoal.mutate({ id: goal.id });
                          }}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${CATEGORY_COLORS[goal.category] || ""}`}>
                          {CATEGORY_OPTIONS.find(c => c.value === goal.category)?.label || goal.category}
                        </span>
                        <div className="flex items-end gap-2 mt-2 mb-2">
                          <span className="font-heading font-bold text-xl text-foreground">{goal.currentValue}</span>
                          <span className="text-sm text-muted-foreground">/ {goal.targetValue}</span>
                          <span className="text-sm font-bold text-primary ml-auto">{pct}%</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden mb-2">
                          <div className={`h-full rounded-full ${goal.achieved ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                        </div>
                        {goal.bonusDescription && (
                          <p className="text-xs text-yellow-500 flex items-center gap-1">
                            <Award className="h-3 w-3" /> {goal.bonusDescription}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => {
                            updateGoal.mutate({ id: goal.id, currentValue: goal.currentValue + 1 });
                          }}>
                            +1
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
