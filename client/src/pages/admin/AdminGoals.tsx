import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Target, Plus, Trash2, TrendingUp, DollarSign, Trophy, Banknote, Pencil, Check, X } from "lucide-react";

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
const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function AdminGoals() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editBonus, setEditBonus] = useState("");
  const [editBonusValue, setEditBonusValue] = useState("");

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
      toast.success("Meta atualizada!");
      utils.goals.list.invalidate();
      setEditingGoalId(null);
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

  const startEdit = (goal: any) => {
    setEditingGoalId(goal.id);
    setEditValue(String(goal.currentValue));
    setEditTarget(String(goal.targetValue));
    setEditBonus(goal.bonusDescription || "");
    setEditBonusValue(goal.bonusValue ? String(goal.bonusValue) : "");
  };

  const saveEdit = (goalId: number) => {
    const updates: any = {};
    if (editValue !== "") updates.currentValue = parseInt(editValue);
    if (editTarget !== "") updates.targetValue = parseInt(editTarget);
    if (editBonus !== undefined) updates.bonusDescription = editBonus;
    if (editBonusValue !== "") updates.bonusValue = parseFloat(editBonusValue);
    updateGoal.mutate({ id: goalId, ...updates });
  };

  // Generate month tabs - show 6 months: 3 before, current, 2 after
  const monthTabs = useMemo(() => {
    const tabs = [];
    for (let i = -3; i <= 2; i++) {
      let m = now.getMonth() + 1 + i;
      let y = now.getFullYear();
      if (m < 1) { m += 12; y -= 1; }
      if (m > 12) { m -= 12; y += 1; }
      tabs.push({ month: m, year: y, label: `${MONTH_NAMES[m - 1]} ${y}` });
    }
    return tabs;
  }, []);

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

        {/* Month Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin">
          {monthTabs.map((tab) => (
            <button
              key={`${tab.month}-${tab.year}`}
              onClick={() => { setMonth(tab.month); setYear(tab.year); }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                month === tab.month && year === tab.year
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="racing-card p-6 space-y-4">
            <h3 className="font-heading font-bold text-foreground">Criar Meta para {MONTH_NAMES[month - 1]} {year}</h3>
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
                <label className="text-sm text-muted-foreground mb-1 block">Descrição do Prêmio (opcional)</label>
                <Input value={bonusDescription} onChange={e => setBonusDescription(e.target.value)} placeholder="Ex: Almoço especial + bônus" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Valor do Prêmio R$ (opcional)</label>
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
                  {goals.filter(g => g.type === "store").map(goal => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      isEditing={editingGoalId === goal.id}
                      editValue={editValue}
                      editTarget={editTarget}
                      editBonus={editBonus}
                      editBonusValue={editBonusValue}
                      setEditValue={setEditValue}
                      setEditTarget={setEditTarget}
                      setEditBonus={setEditBonus}
                      setEditBonusValue={setEditBonusValue}
                      onEdit={() => startEdit(goal)}
                      onSave={() => saveEdit(goal.id)}
                      onCancel={() => setEditingGoalId(null)}
                      onDelete={() => { if (confirm("Excluir esta meta?")) deleteGoal.mutate({ id: goal.id }); }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Individual Goals */}
            {goals.filter(g => g.type === "individual").length > 0 && (
              <div>
                <h3 className="font-heading font-bold text-sm text-muted-foreground mb-3 uppercase">Metas Individuais</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {goals.filter(g => g.type === "individual").map(goal => {
                    const seller = sellers?.find(s => s.id === goal.sellerId);
                    return (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        seller={seller}
                        isEditing={editingGoalId === goal.id}
                        editValue={editValue}
                        editTarget={editTarget}
                        editBonus={editBonus}
                        editBonusValue={editBonusValue}
                        setEditValue={setEditValue}
                        setEditTarget={setEditTarget}
                        setEditBonus={setEditBonus}
                        setEditBonusValue={setEditBonusValue}
                        onEdit={() => startEdit(goal)}
                        onSave={() => saveEdit(goal.id)}
                        onCancel={() => setEditingGoalId(null)}
                        onDelete={() => { if (confirm("Excluir esta meta?")) deleteGoal.mutate({ id: goal.id }); }}
                      />
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

// Goal Card Component - visual with prize money display
function GoalCard({ goal, seller, isEditing, editValue, editTarget, editBonus, editBonusValue,
  setEditValue, setEditTarget, setEditBonus, setEditBonusValue,
  onEdit, onSave, onCancel, onDelete }: {
  goal: any; seller?: any; isEditing: boolean;
  editValue: string; editTarget: string; editBonus: string; editBonusValue: string;
  setEditValue: (v: string) => void; setEditTarget: (v: string) => void;
  setEditBonus: (v: string) => void; setEditBonusValue: (v: string) => void;
  onEdit: () => void; onSave: () => void; onCancel: () => void; onDelete: () => void;
}) {
  const pct = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
  const isAchieved = goal.achieved || goal.currentValue >= goal.targetValue;

  return (
    <div className={`racing-card p-4 ${isAchieved ? "ring-1 ring-emerald-500/50" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {seller && (
            seller.photoUrl ? (
              <img src={seller.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold">
                {seller.name?.charAt(0) || "?"}
              </div>
            )
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${CATEGORY_COLORS[goal.category] || ""}`}>
            {CATEGORY_OPTIONS.find(c => c.value === goal.category)?.label || goal.category}
          </span>
          {seller && <span className="font-semibold text-sm text-foreground">{seller.nickname || seller.name}</span>}
        </div>
        <div className="flex items-center gap-1">
          {isAchieved && <Trophy className="h-4 w-4 text-emerald-400" />}
          {!isEditing && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Editar">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Progress */}
      {isEditing ? (
        <div className="space-y-2 mb-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground">Atual</label>
              <Input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Meta</label>
              <Input type="number" value={editTarget} onChange={e => setEditTarget(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Prêmio</label>
            <Input value={editBonus} onChange={e => setEditBonus(e.target.value)} className="h-8 text-sm" placeholder="Descrição do prêmio" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Valor R$</label>
            <Input type="number" value={editBonusValue} onChange={e => setEditBonusValue(e.target.value)} className="h-8 text-sm" placeholder="0" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs flex-1 gap-1" onClick={onSave}>
              <Check className="h-3 w-3" /> Salvar
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancel}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-2 mb-2">
            <span className="font-heading font-bold text-2xl text-foreground">{goal.currentValue}</span>
            <span className="text-sm text-muted-foreground">/ {goal.targetValue}</span>
            <span className={`text-sm font-bold ml-auto ${isAchieved ? "text-emerald-400" : "text-primary"}`}>{pct}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-muted overflow-hidden mb-3">
            <div className={`h-full rounded-full transition-all ${isAchieved ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
          </div>
        </>
      )}

      {/* Prize Display - Visual with money */}
      {!isEditing && (goal.bonusDescription || goal.bonusValue) && (
        <div className="mt-2 p-3 rounded-lg bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Banknote className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-emerald-400/70 uppercase font-bold tracking-wider">Prêmio</p>
              {goal.bonusValue ? (
                <p className="font-heading font-bold text-lg text-emerald-400">
                  R$ {Number(goal.bonusValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              ) : null}
              {goal.bonusDescription && (
                <p className="text-xs text-emerald-300/80 truncate">{goal.bonusDescription}</p>
              )}
            </div>
            <DollarSign className="h-6 w-6 text-emerald-500/30" />
          </div>
        </div>
      )}
    </div>
  );
}
