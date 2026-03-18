import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Play, Square, Users, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminCompetitions() {
  const { data: competitions } = trpc.competitions.list.useQuery({});
  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: true });
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [participantDialog, setParticipantDialog] = useState<number | null>(null);
  const [teamDialog, setTeamDialog] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", category: "vendas",
    type: "individual" as "individual" | "team" | "group",
    pointsPerSale: 1, goalTarget: "", startDate: "", endDate: "",
  });
  const [teamForm, setTeamForm] = useState({ name: "", color: "#EF4444" });

  const createComp = trpc.competitions.create.useMutation({
    onSuccess: () => { utils.competitions.list.invalidate(); setDialogOpen(false); resetForm(); toast.success("Competição criada!"); },
    onError: () => toast.error("Erro ao criar competição."),
  });
  const updateComp = trpc.competitions.update.useMutation({
    onSuccess: () => { utils.competitions.list.invalidate(); toast.success("Competição atualizada!"); },
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

  function resetForm() {
    setForm({ name: "", description: "", category: "vendas", type: "individual", pointsPerSale: 1, goalTarget: "", startDate: "", endDate: "" });
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.startDate || !form.endDate) { toast.error("Preencha todos os campos obrigatórios"); return; }
    createComp.mutate({
      name: form.name, description: form.description, type: form.type,
      category: form.category,
      pointsPerSale: form.pointsPerSale,
      goalTarget: form.goalTarget ? parseInt(form.goalTarget) : undefined,
      startDate: new Date(form.startDate).getTime(),
      endDate: new Date(form.endDate).getTime(),
    });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-xl text-foreground">Competições</h1>
            <p className="text-muted-foreground text-sm mt-1">Crie e gerencie corridas de vendas</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="racing-gradient text-white gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nova Competição</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-heading text-foreground">Nova Competição</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label className="text-foreground">Nome *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Grande Prêmio de Março" className="bg-input border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Descrição</Label>
                  <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descrição da competição" className="bg-input border-border text-foreground" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-foreground">Categoria</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vendas">Vendas</SelectItem>
                        <SelectItem value="fei">F&I</SelectItem>
                        <SelectItem value="consignacao">Consignação</SelectItem>
                        <SelectItem value="despachante">Despachante</SelectItem>
                        <SelectItem value="feirao">Feirão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-foreground">Meta (opcional)</Label>
                    <Input type="number" min={1} value={form.goalTarget} onChange={e => setForm({ ...form, goalTarget: e.target.value })} placeholder="Ex: 10" className="bg-input border-border text-foreground" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-foreground">Tipo</Label>
                    <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                      <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="team">Equipes (2v2)</SelectItem>
                        <SelectItem value="group">Grupos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-foreground">Pontos/Venda</Label>
                    <Input type="number" min={1} value={form.pointsPerSale} onChange={e => setForm({ ...form, pointsPerSale: parseInt(e.target.value) || 1 })} className="bg-input border-border text-foreground" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-foreground">Data Início *</Label>
                    <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="bg-input border-border text-foreground" />
                  </div>
                  <div>
                    <Label className="text-foreground">Data Fim *</Label>
                    <Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="bg-input border-border text-foreground" />
                  </div>
                </div>
                <Button type="submit" className="w-full racing-gradient text-white" disabled={createComp.isPending}>
                  {createComp.isPending ? "Criando..." : "Criar Competição"}
                </Button>
              </form>
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
      </div>
    </DashboardLayout>
  );
}

function CompetitionCard({ comp, sellers, onStart, onFinish, onDelete, onOpenParticipants, onOpenTeams,
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
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              comp.status === "active" ? "bg-green-500/20 text-green-400" :
              comp.status === "finished" ? "bg-muted text-muted-foreground" :
              "bg-yellow-500/20 text-yellow-400"
            }`}>
              {comp.status === "active" ? "Ativa" : comp.status === "finished" ? "Encerrada" : "Rascunho"}
            </span>
            <span className="text-xs text-muted-foreground">
              {comp.type === "individual" ? "Individual" : comp.type === "team" ? "Equipes" : "Grupos"}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              comp.category === "fei" ? "bg-green-500/20 text-green-400" :
              comp.category === "consignacao" ? "bg-blue-500/20 text-blue-400" :
              comp.category === "despachante" ? "bg-purple-500/20 text-purple-400" :
              comp.category === "feirao" ? "bg-orange-500/20 text-orange-400" :
              "bg-red-500/20 text-red-400"
            }`}>
              {comp.category === "fei" ? "F&I" : comp.category === "consignacao" ? "Consignação" : comp.category === "despachante" ? "Despachante" : comp.category === "feirao" ? "Feirão" : "Vendas"}
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
          {comp.status === "draft" && (
            <Button variant="ghost" size="icon" onClick={onStart} title="Iniciar">
              <Play className="h-4 w-4 text-green-400" />
            </Button>
          )}
          {comp.status === "active" && (
            <Button variant="ghost" size="icon" onClick={onFinish} title="Encerrar">
              <Square className="h-4 w-4 text-yellow-400" />
            </Button>
          )}
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
