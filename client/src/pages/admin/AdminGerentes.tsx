import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { UserCog, Plus, Trash2, Eye, EyeOff, Edit2, Check, X, ShieldCheck, ShieldOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminGerentes() {
  const { data: managers, isLoading } = trpc.managers.list.useQuery();
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);

  const createMutation = trpc.managers.create.useMutation({
    onSuccess: () => {
      utils.managers.list.invalidate();
      setShowCreate(false);
      setNewUsername("");
      setNewPassword("");
      setNewName("");
      toast.success("Gerente criado com sucesso!");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.managers.update.useMutation({
    onSuccess: () => {
      utils.managers.list.invalidate();
      setEditingId(null);
      setEditName("");
      setEditPassword("");
      toast.success("Gerente atualizado!");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.managers.delete.useMutation({
    onSuccess: () => {
      utils.managers.list.invalidate();
      toast.success("Gerente removido!");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim() || !newName.trim()) return;
    createMutation.mutate({ username: newUsername.trim(), password: newPassword, name: newName.trim() });
  };

  const handleUpdate = (id: number) => {
    const data: any = {};
    if (editName.trim()) data.name = editName.trim();
    if (editPassword.trim()) data.password = editPassword;
    if (Object.keys(data).length === 0) {
      setEditingId(null);
      return;
    }
    data.id = id;
    updateMutation.mutate(data);
  };

  const toggleActive = (id: number, currentActive: boolean) => {
    updateMutation.mutate({ id, active: !currentActive });
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserCog className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-heading font-bold text-foreground">Gerentes</h1>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)} className="racing-gradient text-white">
            <Plus className="h-4 w-4 mr-2" />
            Novo Gerente
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Crie contas de gerente para que outras pessoas possam acessar o painel administrativo com login e senha próprios.
        </p>

        {/* Formulário de criação */}
        {showCreate && (
          <form onSubmit={handleCreate} className="border border-border rounded-xl p-4 space-y-3 bg-card">
            <h3 className="font-semibold text-foreground">Criar Novo Gerente</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Usuário</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder="Ex: joao"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Senha</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mín. 4 caracteres"
                    className="w-full h-10 px-3 pr-9 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending || !newUsername.trim() || !newPassword.trim() || !newName.trim()}>
                {createMutation.isPending ? "Criando..." : "Criar Gerente"}
              </Button>
            </div>
          </form>
        )}

        {/* Lista de gerentes */}
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Carregando...</div>
        ) : !managers?.length ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <UserCog className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum gerente cadastrado</p>
            <p className="text-xs text-muted-foreground mt-1">Clique em "Novo Gerente" para criar o primeiro</p>
          </div>
        ) : (
          <div className="space-y-3">
            {managers.map(m => (
              <div key={m.id} className={`border rounded-xl p-4 transition-all ${m.active ? "border-border bg-card" : "border-border/50 bg-card/50 opacity-60"}`}>
                {editingId === m.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          placeholder={m.name}
                          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Nova Senha (opcional)</label>
                        <div className="relative">
                          <input
                            type={showEditPassword ? "text" : "password"}
                            value={editPassword}
                            onChange={e => setEditPassword(e.target.value)}
                            placeholder="Deixe vazio para manter"
                            className="w-full h-10 px-3 pr-9 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => { setEditingId(null); setEditName(""); setEditPassword(""); }}>
                        <X className="h-3 w-3 mr-1" /> Cancelar
                      </Button>
                      <Button size="sm" onClick={() => handleUpdate(m.id)} disabled={updateMutation.isPending}>
                        <Check className="h-3 w-3 mr-1" /> Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${m.active ? "bg-primary/10" : "bg-muted"}`}>
                        <UserCog className={`h-5 w-5 ${m.active ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{m.name}</p>
                        <p className="text-xs text-muted-foreground">@{m.username} {!m.active && <span className="text-destructive ml-1">(desativado)</span>}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(m.id, m.active)}
                        title={m.active ? "Desativar" : "Ativar"}
                      >
                        {m.active ? <ShieldOff className="h-4 w-4 text-amber-500" /> : <ShieldCheck className="h-4 w-4 text-green-500" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingId(m.id); setEditName(m.name); setEditPassword(""); }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Remover gerente ${m.name}?`)) {
                            deleteMutation.mutate({ id: m.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
