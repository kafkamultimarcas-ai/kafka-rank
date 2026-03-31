import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Play, Square, Users, UserPlus, X, Pencil, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import BracketPanel from "@/components/BracketPanel";

const CATEGORY_LABELS: Record<string, string> = {
  vendas: "Vendas", fei: "F&I", consignacao: "Consignação",
  despachante: "Despachante", feirao: "Feirão", pre_vendas: "Pré-Vendas",
};
const CATEGORY_COLORS: Record<string, string> = {
  vendas: "bg-red-500/20 text-red-400", fei: "bg-green-500/20 text-green-400",
  consignacao: "bg-blue-500/20 text-blue-400", despachante: "bg-purple-500/20 text-purple-400",
  feirao: "bg-orange-500/20 text-orange-400", pre_vendas: "bg-cyan-500/20 text-cyan-400",
};

type FormState = {
  name: string; description: string; category: string;
  type: "individual" | "team" | "group" | "1v1";
  pointsPerSale: number; goalTarget: string; startDate: string; endDate: string;
};

const emptyForm: FormState = {
  name: "", description: "", category: "vendas",
  type: "individual", pointsPerSale: 1, goalTarget: "", startDate: "", endDate: "",
};

function tsToDateInput(ts: number) {
  const d = new Date(ts);
  return d.toISOString().split("T")[0];
}

export default function AdminCompetitions() {
  const { data: competitions } = trpc.competitions.list.useQuery({});
  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: true });
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<any>(null);
  const [participantDialog, setParticipantDialog] = useState<number | null>(null);
  const [teamDialog, setTeamDialog] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [editForm, setEditForm] = useState<FormState>({ ...emptyForm });
  const [teamForm, setTeamForm] = useState({ name: "", color: "#EF4444" });

  const createComp = trpc.competitions.create.useMutation({
    onSuccess: () => { utils.competitions.list.invalidate(); setDialogOpen(false); setForm({ ...emptyForm }); toast.success("Competição criada!"); },
    onError: () => toast.error("Erro ao criar competição."),
  });
  const updateComp = trpc.competitions.update.useMutation({
    onSuccess: () => { utils.competitions.list.invalidate(); setEditDialogOpen(false); setEditingComp(null); toast.success("Competição atualizada!"); },
    onError: () => toast.error("Erro ao atualizar."),
  });
  const deleteComp = trpc.competitions.delete.useMutation({
    onSuccess: () => { utils.competitions.list.invalidate(); toast.success("Competição removida!"); },
  });
  const addParticipant = trpc.participants.add.useMutation({
    onSuccess: () => { utils.participants.list.invalidate(); utils.competitions.ranking.invalidate(); toast.success("Participante adicionado!"); },
  });
  const removeParticipant = trpc.participants.remove.useMutation({
    onSuccess: () => { utils.participants.list.invalidate(); utils.competitions.ranking.invalidate(); toast.success("Participante removido!"); },
  });
  const createTeam = trpc.teams.create.useMutation({
    onSuccess: () => { utils.teams.list.invalidate(); setTeamForm({ name: "", color: "#EF4444" }); toast.success("Equipe criada!"); },
  });
  const deleteTeam = trpc.teams.delete.useMutation({
    onSuccess: () => { utils.teams.list.invalidate(); toast.success("Equipe removida!"); },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.startDate || !form.endDate) { toast.error("Preencha todos os campos obrigatórios"); return; }
    createComp.mutate({
      name: form.name, description: form.description, type: form.type,
      category: form.category, pointsPerSale: form.pointsPerSale,
      goalTarget: form.goalTarget ? parseInt(form.goalTarget) : undefined,
      startDate: new Date(form.startDate).getTime(),
      endDate: new Date(form.endDate).getTime(),
    });
  }

  function openEdit(comp: any) {
    setEditingComp(comp);
    setEditForm({
      name: comp.name, description: comp.description || "",
      category: comp.category || "vendas", type: comp.type,
      pointsPerSale: comp.pointsPerSale, goalTarget: comp.goalTarget ? String(comp.goalTarget) : "",
      startDate: tsToDateInput(comp.startDate), endDate: tsToDateInput(comp.endDate),
    });
    setEditDialogOpen(true);
  }

  function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingComp || !editForm.name.trim() || !editForm.startDate || !editForm.endDate) { toast.error("Preencha todos os campos"); return; }
    updateComp.mutate({
      id: editingComp.id,
      name: editForm.name, description: editForm.description,
      category: editForm.category, pointsPerSale: editForm.pointsPerSale,
      goalTarget: editForm.goalTarget ? parseInt(editForm.goalTarget) : undefined,
      startDate: new Date(editForm.startDate).getTime(),
      endDate: new Date(editForm.endDate).getTime(),
    });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-xl text-foreground">Competições</h1>
            <p className="text-muted-foreground text-sm mt-1">Crie e gerencie competições de vendas</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="racing-gradient text-white gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nova Competição</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-heading text-foreground">Nova Competição</DialogTitle>
              </DialogHeader>
              <CompetitionForm f={form} setF={setForm} onSubmit={handleCreate} submitLabel="Criar Competição" isPending={createComp.isPending} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Competitions List */}
        {competitions && competitions.length > 0 ? (
          <div className="space-y-4">
            {competitions.map(comp => (
              <CompetitionCard
                key={comp.id}
                comp={comp}
                sellers={sellers || []}
                onStart={() => updateComp.mutate({ id: comp.id, status: "active" })}
                onFinish={() => updateComp.mutate({ id: comp.id, status: "finished" })}
                onReactivate={() => updateComp.mutate({ id: comp.id, status: "active" })}
                onEdit={() => openEdit(comp)}
                onDelete={() => { if (confirm("Remover esta competição?")) deleteComp.mutate({ id: comp.id }); }}
                onOpenParticipants={() => setParticipantDialog(comp.id)}
                onOpenTeams={() => setTeamDialog(comp.id)}
                participantDialogOpen={participantDialog === comp.id}
                onCloseParticipants={() => setParticipantDialog(null)}
                teamDialogOpen={teamDialog === comp.id}
                onCloseTeams={() => setTeamDialog(null)}
                addParticipant={addParticipant}
                removeParticipant={removeParticipant}
                createTeam={createTeam}
                deleteTeam={deleteTeam}
                teamForm={teamForm}
                setTeamForm={setTeamForm}
              />
            ))}
          </div>
        ) : (
          <div className="racing-card p-12 text-center">
            <p className="text-muted-foreground">Nenhuma competição criada. Clique em "Nova Competição" para começar.</p>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) { setEditDialogOpen(false); setEditingComp(null); } }}>
          <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-foreground">Editar Competição</DialogTitle>
            </DialogHeader>
            <CompetitionForm f={editForm} setF={setEditForm} onSubmit={handleEdit} submitLabel="Salvar Alterações" isPending={updateComp.isPending} />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

function CompetitionForm({ f, setF, onSubmit, submitLabel, isPending }: {
  f: FormState; setF: (v: FormState) => void; onSubmit: (e: React.FormEvent) => void;
  submitLabel: string; isPending: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label className="text-foreground">Nome *</Label>
        <Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Ex: Grande Prêmio de Março" className="bg-input border-border text-foreground" />
      </div>
      <div>
        <Label className="text-foreground">Descrição</Label>
        <Input value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="Descrição da competição" className="bg-input border-border text-foreground" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-foreground">Categoria</Label>
          <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
            <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="vendas">Vendas</SelectItem>
              <SelectItem value="fei">F&I</SelectItem>
              <SelectItem value="consignacao">Consignação</SelectItem>
              <SelectItem value="despachante">Despachante</SelectItem>
              <SelectItem value="feirao">Feirão</SelectItem>
              <SelectItem value="pre_vendas">Pré-Vendas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-foreground">Meta (opcional)</Label>
          <Input type="number" min={1} value={f.goalTarget} onChange={e => setF({ ...f, goalTarget: e.target.value })} placeholder="Ex: 10" className="bg-input border-border text-foreground" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-foreground">Tipo</Label>
          <Select value={f.type} onValueChange={(v: any) => setF({ ...f, type: v })}>
            <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="team">Equipes (2v2)</SelectItem>
              <SelectItem value="group">Grupos</SelectItem>
              <SelectItem value="1v1">1x1 (Mata-Mata)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-foreground">Pontos/Registro</Label>
          <Input type="number" min={1} value={f.pointsPerSale} onChange={e => setF({ ...f, pointsPerSale: parseInt(e.target.value) || 1 })} className="bg-input border-border text-foreground" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-foreground">Data Início *</Label>
          <Input type="date" value={f.startDate} onChange={e => setF({ ...f, startDate: e.target.value })} className="bg-input border-border text-foreground" />
        </div>
        <div>
          <Label className="text-foreground">Data Fim *</Label>
          <Input type="date" value={f.endDate} onChange={e => setF({ ...f, endDate: e.target.value })} className="bg-input border-border text-foreground" />
        </div>
      </div>
      <Button type="submit" className="w-full racing-gradient text-white" disabled={isPending}>
        {isPending ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}

function CompetitionCard({ comp, sellers, onStart, onFinish, onReactivate, onEdit, onDelete, onOpenParticipants, onOpenTeams,
  participantDialogOpen, onCloseParticipants, teamDialogOpen, onCloseTeams,
  addParticipant, removeParticipant, createTeam, deleteTeam, teamForm, setTeamForm }: any) {
  const { data: participants } = trpc.participants.list.useQuery({ competitionId: comp.id });
  const { data: teams } = trpc.teams.list.useQuery({ competitionId: comp.id });
  const isTeamType = comp.type === "team" || comp.type === "group";
  const participantSellerIds = new Set((participants || []).map((p: any) => p.sellerId));

  return (
    <div className="racing-card p-4 sm:p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              comp.status === "active" ? "bg-green-500/20 text-green-400" :
              comp.status === "finished" ? "bg-muted text-muted-foreground" :
              "bg-yellow-500/20 text-yellow-400"
            }`}>
              {comp.status === "active" ? "Ativa" : comp.status === "finished" ? "Encerrada" : "Rascunho"}
            </span>
            <span className="text-xs text-muted-foreground">
              {comp.type === "individual" ? "Individual" : comp.type === "team" ? "Equipes" : comp.type === "1v1" ? "1x1" : "Grupos"}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[comp.category] || CATEGORY_COLORS.vendas}`}>
              {CATEGORY_LABELS[comp.category] || "Vendas"}
            </span>
          </div>
          <h3 className="font-heading font-bold text-foreground">{comp.name}</h3>
          {comp.description && <p className="text-sm text-muted-foreground mt-1">{comp.description}</p>}
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(comp.startDate).toLocaleDateString("pt-BR")} — {new Date(comp.endDate).toLocaleDateString("pt-BR")}
            {" | "}{comp.pointsPerSale} pts/registro
            {comp.goalTarget ? ` | Meta: ${comp.goalTarget}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {/* Editar */}
          <Button variant="ghost" size="icon" onClick={onEdit} title="Editar">
            <Pencil className="h-4 w-4 text-blue-400" />
          </Button>
          {/* Iniciar (rascunho) */}
          {comp.status === "draft" && (
            <Button variant="ghost" size="icon" onClick={onStart} title="Iniciar">
              <Play className="h-4 w-4 text-green-400" />
            </Button>
          )}
          {/* Encerrar (ativa) */}
          {comp.status === "active" && (
            <Button variant="ghost" size="icon" onClick={onFinish} title="Encerrar">
              <Square className="h-4 w-4 text-yellow-400" />
            </Button>
          )}
          {/* Reativar (encerrada) */}
          {comp.status === "finished" && (
            <Button variant="ghost" size="icon" onClick={onReactivate} title="Reativar">
              <RotateCcw className="h-4 w-4 text-green-400" />
            </Button>
          )}
          {/* Excluir */}
          <Button variant="ghost" size="icon" onClick={onDelete} title="Remover">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Participants & Teams */}
      <div className="flex flex-wrap gap-2 mt-3">
        <Button variant="outline" size="sm" onClick={onOpenParticipants} className="gap-1 text-xs">
          <UserPlus className="h-3 w-3" />
          Participantes ({participants?.length || 0})
        </Button>
        {isTeamType && (
          <Button variant="outline" size="sm" onClick={onOpenTeams} className="gap-1 text-xs">
            <Users className="h-3 w-3" />
            Equipes ({teams?.length || 0})
          </Button>
        )}
      </div>

      {/* BRACKET PANEL - Mata-Mata */}
      <BracketPanel
        competitionId={comp.id}
        competitionType={comp.type}
        competitionStatus={comp.status}
      />

      {/* Participant Dialog */}
      <Dialog open={participantDialogOpen} onOpenChange={(open: boolean) => { if (!open) onCloseParticipants(); }}>
        <DialogContent className="bg-card border-border max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-foreground">Gerenciar Participantes</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Adicione vendedores à competição:</p>
            <div className="space-y-2">
              {sellers.filter((s: any) => !participantSellerIds.has(s.id)).map((seller: any) => (
                <div key={seller.id} className="flex items-center gap-3 p-2 rounded-lg bg-accent/30">
                  <span className="text-sm text-foreground flex-1">{seller.name}</span>
                  {isTeamType && teams && teams.length > 0 ? (
                    <Select onValueChange={(teamId: string) => addParticipant.mutate({ competitionId: comp.id, sellerId: seller.id, teamId: parseInt(teamId) })}>
                      <SelectTrigger className="w-32 h-8 text-xs bg-input border-border"><SelectValue placeholder="Equipe" /></SelectTrigger>
                      <SelectContent>
                        {teams.map((t: any) => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => addParticipant.mutate({ competitionId: comp.id, sellerId: seller.id })} className="h-8 text-xs">
                      <Plus className="h-3 w-3 mr-1" /> Adicionar
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {participants && participants.length > 0 && (
              <>
                <p className="text-sm text-muted-foreground mt-4">Participantes atuais:</p>
                <div className="space-y-1">
                  {participants.map((p: any) => {
                    const seller = sellers.find((s: any) => s.id === p.sellerId);
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                        <span className="text-sm text-foreground flex-1">{seller?.name || `ID ${p.sellerId}`}</span>
                        <span className="text-xs text-primary font-heading">{p.points} pts</span>
                        <Button size="icon" variant="ghost" onClick={() => removeParticipant.mutate({ id: p.id })} className="h-7 w-7">
                          <X className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Dialog */}
      {isTeamType && (
        <Dialog open={teamDialogOpen} onOpenChange={(open: boolean) => { if (!open) onCloseTeams(); }}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-heading text-foreground">Gerenciar Equipes</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input value={teamForm.name} onChange={(e: any) => setTeamForm({ ...teamForm, name: e.target.value })} placeholder="Nome da equipe" className="bg-input border-border text-foreground" />
                <Input type="color" value={teamForm.color} onChange={(e: any) => setTeamForm({ ...teamForm, color: e.target.value })} className="w-14 p-1 bg-input border-border" />
                <Button onClick={() => { if (teamForm.name.trim()) createTeam.mutate({ competitionId: comp.id, name: teamForm.name, color: teamForm.color }); }} className="racing-gradient text-white shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {teams && teams.length > 0 && (
                <div className="space-y-2">
                  {teams.map((team: any) => (
                    <div key={team.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                      <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
                      <span className="text-sm text-foreground flex-1">{team.name}</span>
                      <Button size="icon" variant="ghost" onClick={() => deleteTeam.mutate({ id: team.id })} className="h-7 w-7">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
