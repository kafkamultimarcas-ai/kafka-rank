import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  Plus, Flag, Target, CheckCircle2, Clock, XCircle, Pencil, Trash2, ListTodo,
  Megaphone, Share2, Zap, Handshake, LayoutGrid, ChevronRight, AlertTriangle, Search
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

type Tab = "strategies" | "tasks";

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  geral: { label: "Geral", color: "bg-gray-500/20 text-gray-400", icon: Flag },
  redes_sociais: { label: "Redes Sociais", color: "bg-blue-500/20 text-blue-400", icon: Share2 },
  trafego_pago: { label: "Tráfego Pago", color: "bg-purple-500/20 text-purple-400", icon: Zap },
  eventos: { label: "Eventos", color: "bg-orange-500/20 text-orange-400", icon: Megaphone },
  parcerias: { label: "Parcerias", color: "bg-emerald-500/20 text-emerald-400", icon: Handshake },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  planejada: { label: "Planejada", color: "text-blue-400", icon: Target },
  em_andamento: { label: "Em Andamento", color: "text-yellow-400", icon: Clock },
  concluida: { label: "Concluída", color: "text-emerald-400", icon: CheckCircle2 },
  cancelada: { label: "Cancelada", color: "text-red-400", icon: XCircle },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  baixa: { label: "Baixa", color: "bg-gray-500/20 text-gray-400" },
  media: { label: "Média", color: "bg-blue-500/20 text-blue-400" },
  alta: { label: "Alta", color: "bg-orange-500/20 text-orange-400" },
  urgente: { label: "Urgente", color: "bg-red-500/20 text-red-400" },
};

const TASK_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pendente: { label: "Pendente", color: "text-blue-400 bg-blue-500/10 border-blue-500/30", icon: Clock },
  em_andamento: { label: "Em Andamento", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", icon: Clock },
  concluida: { label: "Concluída", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", icon: CheckCircle2 },
  cancelada: { label: "Cancelada", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: XCircle },
};

export default function AdminMarketing() {
  const { data: strategies } = trpc.mktStrategies.list.useQuery();
  const { data: tasks } = trpc.mktTasks.list.useQuery({});
  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: true });
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<Tab>("strategies");
  const [strategyDialogOpen, setStrategyDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<any>(null);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");

  const [strategyForm, setStrategyForm] = useState({
    title: "", description: "", category: "geral", status: "planejada",
    startDate: "", endDate: "", budget: "", responsibleId: "",
  });

  const [taskForm, setTaskForm] = useState({
    title: "", description: "", status: "pendente", priority: "media",
    dueDate: "", assignedToId: "", strategyId: "",
  });

  const marketingStaff = useMemo(() => {
    return (sellers || []).filter((s: any) => s.department === "marketing");
  }, [sellers]);

  const createStrategy = trpc.mktStrategies.create.useMutation({
    onSuccess: () => {
      utils.mktStrategies.list.invalidate();
      setStrategyDialogOpen(false);
      resetStrategyForm();
      toast.success("Estratégia criada!");
    },
    onError: () => toast.error("Erro ao criar estratégia."),
  });

  const updateStrategy = trpc.mktStrategies.update.useMutation({
    onSuccess: () => {
      utils.mktStrategies.list.invalidate();
      setStrategyDialogOpen(false);
      setEditingStrategy(null);
      resetStrategyForm();
      toast.success("Estratégia atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar."),
  });

  const deleteStrategy = trpc.mktStrategies.delete.useMutation({
    onSuccess: () => {
      utils.mktStrategies.list.invalidate();
      utils.mktTasks.list.invalidate();
      toast.success("Estratégia excluída!");
    },
    onError: () => toast.error("Erro ao excluir."),
  });

  const createTask = trpc.mktTasks.create.useMutation({
    onSuccess: () => {
      utils.mktTasks.list.invalidate();
      setTaskDialogOpen(false);
      resetTaskForm();
      toast.success("Tarefa criada!");
    },
    onError: () => toast.error("Erro ao criar tarefa."),
  });

  const updateTask = trpc.mktTasks.update.useMutation({
    onSuccess: () => {
      utils.mktTasks.list.invalidate();
      setTaskDialogOpen(false);
      setEditingTask(null);
      resetTaskForm();
      toast.success("Tarefa atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar tarefa."),
  });

  const deleteTask = trpc.mktTasks.delete.useMutation({
    onSuccess: () => {
      utils.mktTasks.list.invalidate();
      toast.success("Tarefa excluída!");
    },
    onError: () => toast.error("Erro ao excluir tarefa."),
  });

  function resetStrategyForm() {
    setStrategyForm({ title: "", description: "", category: "geral", status: "planejada", startDate: "", endDate: "", budget: "", responsibleId: "" });
  }

  function resetTaskForm() {
    setTaskForm({ title: "", description: "", status: "pendente", priority: "media", dueDate: "", assignedToId: "", strategyId: "" });
  }

  function openEditStrategy(s: any) {
    setEditingStrategy(s);
    setStrategyForm({
      title: s.title,
      description: s.description || "",
      category: s.category || "geral",
      status: s.status,
      startDate: s.startDate ? new Date(s.startDate).toISOString().split("T")[0] : "",
      endDate: s.endDate ? new Date(s.endDate).toISOString().split("T")[0] : "",
      budget: s.budget ? String(s.budget) : "",
      responsibleId: s.responsibleId ? String(s.responsibleId) : "",
    });
    setStrategyDialogOpen(true);
  }

  function openEditTask(t: any) {
    setEditingTask(t);
    setTaskForm({
      title: t.title,
      description: t.description || "",
      status: t.status,
      priority: t.priority || "media",
      dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : "",
      assignedToId: t.assignedToId ? String(t.assignedToId) : "",
      strategyId: t.strategyId ? String(t.strategyId) : "",
    });
    setTaskDialogOpen(true);
  }

  function handleSubmitStrategy(e: React.FormEvent) {
    e.preventDefault();
    const data: any = {
      title: strategyForm.title,
      description: strategyForm.description || undefined,
      category: strategyForm.category,
      status: strategyForm.status as any,
      startDate: strategyForm.startDate ? new Date(strategyForm.startDate).getTime() : undefined,
      endDate: strategyForm.endDate ? new Date(strategyForm.endDate).getTime() : undefined,
      budget: strategyForm.budget ? parseInt(strategyForm.budget) : undefined,
      responsibleId: strategyForm.responsibleId ? parseInt(strategyForm.responsibleId) : undefined,
    };
    if (editingStrategy) {
      updateStrategy.mutate({ id: editingStrategy.id, ...data });
    } else {
      createStrategy.mutate(data);
    }
  }

  function handleSubmitTask(e: React.FormEvent) {
    e.preventDefault();
    const data: any = {
      title: taskForm.title,
      description: taskForm.description || undefined,
      status: taskForm.status as any,
      priority: taskForm.priority as any,
      dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).getTime() : undefined,
      assignedToId: taskForm.assignedToId ? parseInt(taskForm.assignedToId) : undefined,
      strategyId: taskForm.strategyId ? parseInt(taskForm.strategyId) : undefined,
    };
    if (editingTask) {
      updateTask.mutate({ id: editingTask.id, ...data });
    } else {
      createTask.mutate(data);
    }
  }

  // Filtered data
  const filteredStrategies = useMemo(() => {
    let result = strategies || [];
    if (filterStatus !== "todos") result = result.filter(s => s.status === filterStatus);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(s => s.title.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q));
    }
    return result;
  }, [strategies, filterStatus, searchTerm]);

  const filteredTasks = useMemo(() => {
    let result = tasks || [];
    if (filterStatus !== "todos") result = result.filter(t => t.status === filterStatus);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }
    return result;
  }, [tasks, filterStatus, searchTerm]);

  // Stats
  const strategyStats = useMemo(() => {
    const all = strategies || [];
    return {
      total: all.length,
      planejadas: all.filter(s => s.status === "planejada").length,
      emAndamento: all.filter(s => s.status === "em_andamento").length,
      concluidas: all.filter(s => s.status === "concluida").length,
    };
  }, [strategies]);

  const taskStats = useMemo(() => {
    const all = tasks || [];
    return {
      total: all.length,
      pendentes: all.filter(t => t.status === "pendente").length,
      emAndamento: all.filter(t => t.status === "em_andamento").length,
      concluidas: all.filter(t => t.status === "concluida").length,
    };
  }, [tasks]);

  const getSellerName = (id: number | null) => {
    if (!id) return "—";
    const s = sellers?.find((sel: any) => sel.id === id);
    return s?.nickname || s?.name || "—";
  };

  const getStrategyName = (id: number | null) => {
    if (!id) return "Avulsa";
    const s = strategies?.find(str => str.id === id);
    return s?.title || "—";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-xl text-foreground">Marketing</h1>
            <p className="text-muted-foreground text-sm mt-1">Estratégias, campanhas e tarefas do setor de marketing</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="racing-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Flag className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Estratégias</span>
            </div>
            <p className="font-heading font-bold text-xl text-foreground">{strategyStats.total}</p>
            <p className="text-xs text-muted-foreground">{strategyStats.emAndamento} em andamento</p>
          </div>
          <div className="racing-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <ListTodo className="h-4 w-4 text-yellow-400" />
              <span className="text-xs text-muted-foreground">Tarefas</span>
            </div>
            <p className="font-heading font-bold text-xl text-foreground">{taskStats.total}</p>
            <p className="text-xs text-muted-foreground">{taskStats.pendentes} pendentes</p>
          </div>
          <div className="racing-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-muted-foreground">Em Andamento</span>
            </div>
            <p className="font-heading font-bold text-xl text-foreground">{strategyStats.emAndamento + taskStats.emAndamento}</p>
          </div>
          <div className="racing-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-muted-foreground">Concluídas</span>
            </div>
            <p className="font-heading font-bold text-xl text-foreground">{strategyStats.concluidas + taskStats.concluidas}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTab("strategies"); setFilterStatus("todos"); setSearchTerm(""); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "strategies"
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Flag className="h-4 w-4" />
            Estratégias
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted">{strategyStats.total}</span>
          </button>
          <button
            onClick={() => { setActiveTab("tasks"); setFilterStatus("todos"); setSearchTerm(""); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "tasks"
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <ListTodo className="h-4 w-4" />
            Tarefas
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted">{taskStats.total}</span>
          </button>
        </div>

        {/* Search + Filter + Add */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-input border-border text-foreground"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px] bg-input border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {activeTab === "strategies" ? (
                <>
                  <SelectItem value="planejada">Planejada</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
          {activeTab === "strategies" ? (
            <Dialog open={strategyDialogOpen} onOpenChange={(open) => {
              setStrategyDialogOpen(open);
              if (!open) { setEditingStrategy(null); resetStrategyForm(); }
            }}>
              <DialogTrigger asChild>
                <Button className="racing-gradient text-white gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nova Estratégia</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-heading text-foreground">
                    {editingStrategy ? "Editar Estratégia" : "Nova Estratégia"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitStrategy} className="space-y-4">
                  <div>
                    <Label className="text-foreground">Título *</Label>
                    <Input value={strategyForm.title} onChange={e => setStrategyForm({ ...strategyForm, title: e.target.value })} placeholder="Ex: Campanha Black Friday" className="bg-input border-border text-foreground" />
                  </div>
                  <div>
                    <Label className="text-foreground">Descrição</Label>
                    <Textarea value={strategyForm.description} onChange={e => setStrategyForm({ ...strategyForm, description: e.target.value })} placeholder="Detalhes da estratégia..." className="bg-input border-border text-foreground" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-foreground">Categoria</Label>
                      <Select value={strategyForm.category} onValueChange={v => setStrategyForm({ ...strategyForm, category: v })}>
                        <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                            <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-foreground">Status</Label>
                      <Select value={strategyForm.status} onValueChange={v => setStrategyForm({ ...strategyForm, status: v })}>
                        <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-foreground">Data Início</Label>
                      <Input type="date" value={strategyForm.startDate} onChange={e => setStrategyForm({ ...strategyForm, startDate: e.target.value })} className="bg-input border-border text-foreground" />
                    </div>
                    <div>
                      <Label className="text-foreground">Data Fim</Label>
                      <Input type="date" value={strategyForm.endDate} onChange={e => setStrategyForm({ ...strategyForm, endDate: e.target.value })} className="bg-input border-border text-foreground" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-foreground">Orçamento (R$)</Label>
                      <Input type="number" value={strategyForm.budget} onChange={e => setStrategyForm({ ...strategyForm, budget: e.target.value })} placeholder="0" className="bg-input border-border text-foreground" />
                    </div>
                    <div>
                      <Label className="text-foreground">Responsável</Label>
                      <Select value={strategyForm.responsibleId || "none"} onValueChange={v => setStrategyForm({ ...strategyForm, responsibleId: v === "none" ? "" : v })}>
                        <SelectTrigger className="bg-input border-border text-foreground"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {marketingStaff.map((s: any) => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.nickname || s.name}</SelectItem>
                          ))}
                          {marketingStaff.length === 0 && (
                            <SelectItem value="none" disabled>Nenhum colaborador de Marketing cadastrado</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full racing-gradient text-white" disabled={!strategyForm.title || createStrategy.isPending || updateStrategy.isPending}>
                    {editingStrategy ? "Salvar Alterações" : "Criar Estratégia"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={taskDialogOpen} onOpenChange={(open) => {
              setTaskDialogOpen(open);
              if (!open) { setEditingTask(null); resetTaskForm(); }
            }}>
              <DialogTrigger asChild>
                <Button className="racing-gradient text-white gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nova Tarefa</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-heading text-foreground">
                    {editingTask ? "Editar Tarefa" : "Nova Tarefa"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitTask} className="space-y-4">
                  <div>
                    <Label className="text-foreground">Título *</Label>
                    <Input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Ex: Criar arte para Instagram" className="bg-input border-border text-foreground" />
                  </div>
                  <div>
                    <Label className="text-foreground">Descrição</Label>
                    <Textarea value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Detalhes da tarefa..." className="bg-input border-border text-foreground" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-foreground">Status</Label>
                      <Select value={taskForm.status} onValueChange={v => setTaskForm({ ...taskForm, status: v })}>
                        <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="em_andamento">Em Andamento</SelectItem>
                          <SelectItem value="concluida">Concluída</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-foreground">Prioridade</Label>
                      <Select value={taskForm.priority} onValueChange={v => setTaskForm({ ...taskForm, priority: v })}>
                        <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                            <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-foreground">Prazo</Label>
                      <Input type="date" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} className="bg-input border-border text-foreground" />
                    </div>
                    <div>
                      <Label className="text-foreground">Responsável</Label>
                      <Select value={taskForm.assignedToId || "none"} onValueChange={v => setTaskForm({ ...taskForm, assignedToId: v === "none" ? "" : v })}>
                        <SelectTrigger className="bg-input border-border text-foreground"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {marketingStaff.map((s: any) => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.nickname || s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-foreground">Estratégia vinculada</Label>
                    <Select value={taskForm.strategyId || "none"} onValueChange={v => setTaskForm({ ...taskForm, strategyId: v === "none" ? "" : v })}>
                      <SelectTrigger className="bg-input border-border text-foreground"><SelectValue placeholder="Avulsa" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Avulsa (sem estratégia)</SelectItem>
                        {(strategies || []).map(s => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full racing-gradient text-white" disabled={!taskForm.title || createTask.isPending || updateTask.isPending}>
                    {editingTask ? "Salvar Alterações" : "Criar Tarefa"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* STRATEGIES TAB */}
        {activeTab === "strategies" && (
          <div className="space-y-3">
            {filteredStrategies.length === 0 ? (
              <div className="racing-card p-12 text-center">
                <Flag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma estratégia encontrada.</p>
                <p className="text-xs text-muted-foreground mt-1">Crie uma nova estratégia de marketing para começar.</p>
              </div>
            ) : (
              filteredStrategies.map(strategy => {
                const cat = CATEGORY_CONFIG[strategy.category || "geral"] || CATEGORY_CONFIG.geral;
                const st = STATUS_CONFIG[strategy.status] || STATUS_CONFIG.planejada;
                const strategyTasks = (tasks || []).filter(t => t.strategyId === strategy.id);
                const completedTasks = strategyTasks.filter(t => t.status === "concluida").length;
                return (
                  <div key={strategy.id} className="racing-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cat.color}`}>{cat.label}</span>
                          <span className={`flex items-center gap-1 text-xs font-semibold ${st.color}`}>
                            <st.icon className="h-3 w-3" />
                            {st.label}
                          </span>
                        </div>
                        <h3 className="font-semibold text-foreground text-sm">{strategy.title}</h3>
                        {strategy.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{strategy.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                          {strategy.startDate && (
                            <span>Início: {new Date(strategy.startDate).toLocaleDateString("pt-BR")}</span>
                          )}
                          {strategy.endDate && (
                            <span>Fim: {new Date(strategy.endDate).toLocaleDateString("pt-BR")}</span>
                          )}
                          {strategy.budget && strategy.budget > 0 && (
                            <span>Orçamento: R$ {strategy.budget.toLocaleString("pt-BR")}</span>
                          )}
                          <span>Responsável: {getSellerName(strategy.responsibleId)}</span>
                        </div>
                        {strategyTasks.length > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${(completedTasks / strategyTasks.length) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{completedTasks}/{strategyTasks.length} tarefas</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-blue-300" onClick={() => openEditStrategy(strategy)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-foreground">Excluir estratégia?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Todas as tarefas vinculadas também serão excluídas. Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-border text-foreground">Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteStrategy.mutate({ id: strategy.id })} className="bg-red-600 hover:bg-red-700 text-white">Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TASKS TAB */}
        {activeTab === "tasks" && (
          <div className="space-y-2">
            {filteredTasks.length === 0 ? (
              <div className="racing-card p-12 text-center">
                <ListTodo className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma tarefa encontrada.</p>
              </div>
            ) : (
              filteredTasks.map(task => {
                const ts = TASK_STATUS_CONFIG[task.status] || TASK_STATUS_CONFIG.pendente;
                const pr = PRIORITY_CONFIG[task.priority || "media"] || PRIORITY_CONFIG.media;
                const isOverdue = task.dueDate && task.dueDate < Date.now() && task.status !== "concluida" && task.status !== "cancelada";
                return (
                  <div key={task.id} className={`racing-card p-3 border-l-4 ${ts.color.split(" ").find(c => c.startsWith("border-")) || "border-border"} ${isOverdue ? "border-l-red-500" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${pr.color}`}>{pr.label}</span>
                          <span className={`flex items-center gap-1 text-[10px] font-semibold ${ts.color.split(" ")[0]}`}>
                            <ts.icon className="h-3 w-3" />
                            {ts.label}
                          </span>
                          {isOverdue && (
                            <span className="flex items-center gap-0.5 text-[10px] text-red-400 font-bold animate-pulse">
                              <AlertTriangle className="h-3 w-3" />
                              ATRASADA
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-foreground text-sm">{task.title}</h3>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          {task.dueDate && (
                            <span className={isOverdue ? "text-red-400 font-semibold" : ""}>
                              Prazo: {new Date(task.dueDate).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                          <span>Responsável: {getSellerName(task.assignedToId)}</span>
                          <span>Estratégia: {getStrategyName(task.strategyId)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {task.status !== "concluida" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-400 hover:text-emerald-300"
                            onClick={() => updateTask.mutate({ id: task.id, status: "concluida" })}
                            title="Marcar como concluída"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-blue-300" onClick={() => openEditTask(task)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-foreground">Excluir tarefa?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-border text-foreground">Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteTask.mutate({ id: task.id })} className="bg-red-600 hover:bg-red-700 text-white">Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
