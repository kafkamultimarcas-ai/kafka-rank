import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { buildTenantPath, getCurrentTenantSlug } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Car,
  ChevronRight,
  Copy,
  Edit,
  Eye,
  EyeOff,
  Facebook,
  ImageIcon,
  MessageCircle,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Shield,
  Trash2,
  Upload,
  UserPlus,
  Zap,
} from "lucide-react";

const PERM_LABELS: Record<string, string> = {
  vendas: "Vendas",
  pre_vendas: "Pré-Vendas/SDR",
  consignacao: "Consignação",
  fei: "F&I",
  marketing: "Marketing",
  financeiro: "Financeiro",
  estoque: "Estoque",
  configuracoes: "Configurações",
  gerenciar_admins: "Gerenciar Admins",
};

function getAdminRoleLabel(admin: any): { label: string; color: string } {
  if (admin.role === "owner") {
    return { label: "Dono", color: "bg-amber-500/20 text-amber-400 border-amber-500/20" };
  }

  let perms: Record<string, boolean> = {};
  try {
    perms = JSON.parse(admin.permissions || "{}");
  } catch {
    perms = {};
  }

  const activeKeys = Object.entries(perms)
    .filter(([, value]) => value)
    .map(([key]) => key);

  if (activeKeys.length === 1 && activeKeys[0] === "pre_vendas") {
    return { label: "SDR", color: "bg-purple-500/20 text-purple-400 border-purple-500/20" };
  }
  if (activeKeys.length === 1 && activeKeys[0] === "fei") {
    return { label: "F&I", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/20" };
  }
  if (activeKeys.length === 1 && activeKeys[0] === "financeiro") {
    return { label: "Financeiro", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20" };
  }
  if (activeKeys.length === 1 && activeKeys[0] === "marketing") {
    return { label: "Marketing", color: "bg-pink-500/20 text-pink-400 border-pink-500/20" };
  }

  return { label: "Admin", color: "bg-blue-500/20 text-blue-400 border-blue-500/20" };
}

export function CrmSettingsAjustesPanel() {
  const { data: admins, refetch } = trpc.adminAuth.list.useQuery();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    email: "",
    phone: "",
    role: "admin",
    permissions: {
      vendas: true,
      pre_vendas: false,
      consignacao: false,
      fei: false,
      marketing: false,
      financeiro: false,
      estoque: false,
      configuracoes: false,
      gerenciar_admins: false,
    },
  });
  const [resetPasswordId, setResetPasswordId] = useState<number | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [showChangeMyPassword, setShowChangeMyPassword] = useState(false);
  const [myNewPassword, setMyNewPassword] = useState("");
  const [myConfirmPassword, setMyConfirmPassword] = useState("");
  const [editingAdminId, setEditingAdminId] = useState<number | null>(null);
  const [editPerms, setEditPerms] = useState<Record<string, boolean>>({});
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const updateAdmin = trpc.adminAuth.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingAdminId(null);
      toast.success("Admin atualizado com sucesso!");
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });

  const toggleAdmin = trpc.adminAuth.update.useMutation({
    onSuccess: (_, vars) => {
      refetch();
      toast.success(vars.active ? "Usuário ativado!" : "Usuário desativado!");
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });

  const createAdmin = trpc.adminAuth.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowAdd(false);
      setForm({
        name: "",
        username: "",
        password: "",
        email: "",
        phone: "",
        role: "admin",
        permissions: {
          vendas: true,
          pre_vendas: false,
          consignacao: false,
          fei: false,
          marketing: false,
          financeiro: false,
          estoque: false,
          configuracoes: false,
          gerenciar_admins: false,
        },
      });
      toast.success("Admin criado com sucesso! Senha temporária definida.");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const resetAdminPassword = trpc.adminAuth.resetAdminPassword.useMutation({
    onSuccess: () => {
      refetch();
      setResetPasswordId(null);
      setResetPasswordValue("");
      toast.success("Senha resetada! O admin precisará trocar no próximo login.");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const changeMyPassword = trpc.adminAuth.changePassword.useMutation({
    onSuccess: () => {
      setShowChangeMyPassword(false);
      setMyNewPassword("");
      setMyConfirmPassword("");
      toast.success("Sua senha foi alterada com sucesso!");
    },
    onError: (error: any) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-bold text-foreground mb-3">Administradores do CRM</h3>
        <div className="space-y-2">
          {admins?.map((admin: any) => {
            let perms: Record<string, boolean> = {};
            try {
              perms = JSON.parse(admin.permissions || "{}");
            } catch {
              perms = {};
            }

            const activePerms = Object.entries(perms)
              .filter(([, value]) => value)
              .map(([key]) => PERM_LABELS[key] || key);
            const roleInfo = getAdminRoleLabel(admin);

            return (
              <div key={admin.id} className={`p-3 rounded-lg bg-accent/50 border border-border ${!admin.active ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-sm text-foreground font-medium">{admin.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      @{admin.username} • <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${roleInfo.color}`}>{roleInfo.label}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {admin.email && <span className="text-[9px] text-muted-foreground">{admin.email}</span>}
                    {admin.role !== "owner" && (
                      <button
                        onClick={() => toggleAdmin.mutate({ id: admin.id, active: !admin.active })}
                        className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${admin.active ? "bg-green-500" : "bg-muted-foreground/30"}`}
                        title={admin.active ? "Desativar" : "Ativar"}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${admin.active ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded ${admin.active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                      {admin.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>

                {admin.role !== "owner" && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {resetPasswordId === admin.id ? (
                      <div className="flex gap-2 items-center w-full">
                        <Input
                          placeholder="Nova senha"
                          type="password"
                          value={resetPasswordValue}
                          onChange={(event) => setResetPasswordValue(event.target.value)}
                          className="h-7 text-xs flex-1"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px]"
                          onClick={() => {
                            if (resetPasswordValue.length < 4) {
                              toast.error("Mínimo 4 caracteres");
                              return;
                            }
                            resetAdminPassword.mutate({ adminId: admin.id, newPassword: resetPasswordValue });
                          }}
                          disabled={resetAdminPassword.isPending}
                        >
                          {resetAdminPassword.isPending ? "..." : "Salvar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[10px]"
                          onClick={() => {
                            setResetPasswordId(null);
                            setResetPasswordValue("");
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button onClick={() => setResetPasswordId(admin.id)} className="text-[10px] text-amber-400 hover:text-amber-300 font-medium">
                          Resetar Senha
                        </button>
                        <button
                          onClick={() => {
                            setEditingAdminId(editingAdminId === admin.id ? null : admin.id);
                            setEditName(admin.name || "");
                            setEditEmail(admin.email || "");
                            setEditPhone(admin.phone || "");
                            try {
                              setEditPerms(JSON.parse(admin.permissions || "{}"));
                            } catch {
                              setEditPerms({});
                            }
                          }}
                          className="text-[10px] text-primary hover:text-primary/80 font-medium"
                        >
                          <Edit className="w-3 h-3 inline mr-0.5" /> Editar
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {editingAdminId === admin.id && admin.role !== "owner" && (
                  <div className="mt-3 p-3 rounded-lg bg-accent/30 border border-primary/30 space-y-3">
                    <p className="text-xs font-bold text-primary">Editando: {admin.name}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input placeholder="Nome" value={editName} onChange={(event) => setEditName(event.target.value)} className="h-8 text-xs" />
                      <Input placeholder="Email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} className="h-8 text-xs" />
                      <Input placeholder="Telefone" value={editPhone} onChange={(event) => setEditPhone(event.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-foreground mb-2">Permissões:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {Object.entries(PERM_LABELS).map(([key, label]) => (
                          <label key={key} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-accent/50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editPerms[key] || false}
                              onChange={(event) => setEditPerms({ ...editPerms, [key]: event.target.checked })}
                              className="rounded border-border"
                            />
                            <span className="text-[11px] text-foreground">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 racing-gradient text-white text-xs"
                        disabled={updateAdmin.isPending}
                        onClick={() =>
                          updateAdmin.mutate({
                            id: admin.id,
                            name: editName || undefined,
                            email: editEmail || undefined,
                            phone: editPhone || undefined,
                            permissions: JSON.stringify(editPerms),
                          })
                        }
                      >
                        <Save className="w-3 h-3 mr-1" /> {updateAdmin.isPending ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => setEditingAdminId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {editingAdminId !== admin.id && admin.role !== "owner" && activePerms.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {activePerms.map((perm) => (
                      <span key={perm} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {perm}
                      </span>
                    ))}
                  </div>
                )}
                {admin.role === "owner" && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/20">Acesso Total</span>
                )}
              </div>
            );
          })}
        </div>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowAdd(!showAdd)}>
          <UserPlus className="w-3.5 h-3.5 mr-1" /> Novo Admin
        </Button>
        {showAdd && (
          <div className="mt-3 p-3 rounded-lg bg-accent/30 border border-border space-y-3">
            <Input placeholder="Nome completo" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="h-9 text-sm" />
            <Input placeholder="Usuário de login" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} className="h-9 text-sm" />
            <Input placeholder="Senha temporária (admin troca no 1º acesso)" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="h-9 text-sm" />
            <Input placeholder="Email (opcional)" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="h-9 text-sm" />
            <Input placeholder="Telefone (opcional)" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="h-9 text-sm" />
            <p className="text-[10px] text-amber-400">O admin será obrigado a trocar a senha no primeiro login</p>
            <div>
              <p className="text-xs font-medium text-foreground mb-2">Permissões de Acesso:</p>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(PERM_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-accent/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(form.permissions as any)[key] || false}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          permissions: { ...form.permissions, [key]: event.target.checked },
                        })
                      }
                      className="rounded border-border"
                    />
                    <span className="text-[11px] text-foreground">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (!form.name || !form.username || !form.password || !form.email) {
                  toast.error("Preencha todos os campos");
                  return;
                }
                createAdmin.mutate({
                  name: form.name,
                  username: form.username,
                  password: form.password,
                  email: form.email,
                  role: form.role as any,
                  permissions: JSON.stringify(form.permissions),
                  mustChangePassword: true,
                  ...(form.phone ? { phone: form.phone } : {}),
                });
              }}
              disabled={createAdmin.isPending}
              className="w-full racing-gradient text-white"
            >
              {createAdmin.isPending ? "Criando..." : "Criar Admin"}
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Minha Senha</h3>
          <Button size="sm" variant="outline" onClick={() => setShowChangeMyPassword(!showChangeMyPassword)}>
            Trocar Senha
          </Button>
        </div>
        {showChangeMyPassword && (
          <div className="mt-3 space-y-3">
            <Input placeholder="Nova senha" type="password" value={myNewPassword} onChange={(event) => setMyNewPassword(event.target.value)} className="h-9 text-sm" />
            <Input placeholder="Confirmar nova senha" type="password" value={myConfirmPassword} onChange={(event) => setMyConfirmPassword(event.target.value)} className="h-9 text-sm" />
            {myConfirmPassword && myNewPassword !== myConfirmPassword && <p className="text-xs text-red-400">As senhas não coincidem</p>}
            <Button
              size="sm"
              className="w-full"
              disabled={changeMyPassword.isPending || myNewPassword.length < 4 || myNewPassword !== myConfirmPassword}
              onClick={() => {
                const token = localStorage.getItem("crm_admin_token");
                if (!token) {
                  toast.error("Faça login novamente");
                  return;
                }
                changeMyPassword.mutate({ token, newPassword: myNewPassword });
              }}
            >
              {changeMyPassword.isPending ? "Salvando..." : "Salvar Nova Senha"}
            </Button>
          </div>
        )}
      </div>

      <ResetAllPasswordsSection />
    </div>
  );
}

export function CrmSettingsIntegracoesPanel() {
  const [, navigate] = useLocation();

  return (
    <div className="space-y-4">
      <WhatsAppZapiPanel />
      <InventoryIntegrationPanel />

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-foreground">Integrações</h3>
          <button
            onClick={() => navigate(buildTenantPath(getCurrentTenantSlug(), "/crm/integracoes"))}
            className="flex items-center gap-1 text-[10px] text-primary hover:underline"
          >
            <BookOpen className="w-3 h-3" /> Ver documentação completa
          </button>
        </div>
        <div className="space-y-2">
          <TokenIntegrationRow type="sig" name="SIG Web" description="Integre com seu sistema de gestão para sincronizar vendas e estoque" endpointLabel="Sincronização de vendas/estoque" endpointPath="/api/webhooks/sig/sale" />
          <TokenIntegrationRow type="email_parser" name="OLX / Webmotors" description="Receba leads automaticamente das plataformas de anúncio (via encaminhamento de e-mail)" endpointLabel="Parser de e-mail" endpointPath="/api/webhooks/email-parser" />
        </div>
      </div>

      <MetaIntegrationPanel />
    </div>
  );
}

function TokenIntegrationRow({ type, name, description, endpointLabel, endpointPath }: {
  type: string;
  name: string;
  description: string;
  endpointLabel: string;
  endpointPath: string;
}) {
  const utils = trpc.useUtils();
  const { data: integrations } = trpc.crmIntegrations.list.useQuery();
  const integration = integrations?.find((item) => item.type === type);
  const [expanded, setExpanded] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const create = trpc.crmIntegrations.create.useMutation({
    onSuccess: () => {
      toast.success(`${name} ativado! Copie o token abaixo.`);
      utils.crmIntegrations.list.invalidate();
      setExpanded(true);
      setShowToken(true);
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });
  const update = trpc.crmIntegrations.update.useMutation({
    onSuccess: () => {
      utils.crmIntegrations.list.invalidate();
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });
  const remove = trpc.crmIntegrations.delete.useMutation({
    onSuccess: () => {
      toast.success("Integração removida.");
      utils.crmIntegrations.list.invalidate();
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });
  const regenerate = trpc.crmIntegrations.regenerateToken.useMutation({
    onSuccess: () => {
      toast.success("Token regenerado! Atualize a configuração na plataforma externa.");
      utils.crmIntegrations.list.invalidate();
      setShowToken(true);
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });

  const webhookUrl = `${window.location.origin}${endpointPath}`;
  const status = !integration ? "pendente" : integration.active ? "ativo" : "inativo";
  const statusStyle = status === "ativo" ? "bg-green-500/20 text-green-400" : status === "inativo" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400";

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  return (
    <div className="rounded-lg bg-accent/30 border border-border overflow-hidden">
      <button onClick={() => integration && setExpanded(!expanded)} className={`w-full flex items-center justify-between p-3 text-left ${integration ? "cursor-pointer hover:bg-accent/50" : ""}`}>
        <div className="min-w-0">
          <p className="text-sm text-foreground font-medium">{name}</p>
          <p className="text-[10px] text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] px-2 py-0.5 rounded ${statusStyle}`}>{status}</span>
          {integration && <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />}
        </div>
      </button>

      {!integration && (
        <div className="px-3 pb-3">
          <Button size="sm" className="w-full" onClick={() => create.mutate({ type, name })} disabled={create.isPending}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            {create.isPending ? "Ativando..." : "Ativar Integração"}
          </Button>
        </div>
      )}

      {integration && expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">{endpointLabel} - URL do Webhook</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono bg-background border border-border rounded px-2 py-1.5 truncate">{webhookUrl}</code>
              <button onClick={() => copyText(webhookUrl, "URL")} className="p-1.5 rounded hover:bg-accent shrink-0">
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Header <code>x-api-token</code></label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono bg-background border border-border rounded px-2 py-1.5 truncate">
                {showToken ? integration.apiToken : "•".repeat(24)}
              </code>
              <button onClick={() => setShowToken(!showToken)} className="p-1.5 rounded hover:bg-accent shrink-0">
                {showToken ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
              <button onClick={() => copyText(integration.apiToken || "", "Token")} className="p-1.5 rounded hover:bg-accent shrink-0">
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Este token identifica a sua loja - não compartilhe com outras lojas.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => update.mutate({ id: integration.id, active: !integration.active })} disabled={update.isPending}>
              {integration.active ? "Desativar" : "Reativar"}
            </Button>
            <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => regenerate.mutate({ id: integration.id })} disabled={regenerate.isPending}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Regenerar Token
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs flex-1 text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm(`Remover a integração ${name}? A URL configurada externamente vai parar de funcionar.`)) {
                  remove.mutate({ id: integration.id });
                }
              }}
              disabled={remove.isPending}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Remover
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MetaIntegrationPanel() {
  const { data: config, refetch } = trpc.crmIntegrations.getMetaConfig.useQuery();
  const saveConfig = trpc.crmIntegrations.saveMetaConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuração do Meta Ads salva!");
      refetch();
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });
  const testConnection = trpc.crmIntegrations.testMetaConnection.useMutation({
    onSuccess: (data: any) => {
      if (data.success) {
        toast.success("Conexão com Meta Ads validada!");
        return;
      }
      toast.error(data.error || "Falha na conexão");
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });

  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({ appId: "", appSecret: "", pageAccessToken: "", verifyToken: "", pageId: "" });
  const [initialized, setInitialized] = useState(false);

  if (config && !initialized) {
    setForm({
      appId: config.appId || "",
      appSecret: "",
      pageAccessToken: "",
      verifyToken: config.verifyToken || "",
      pageId: config.pageId || "",
    });
    setInitialized(true);
  }

  const isActive = !!(config?.hasAppSecret && config?.hasPageAccessToken);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? "bg-blue-500/20" : "bg-amber-500/20"}`}>
            <Facebook className={`w-5 h-5 ${isActive ? "text-blue-400" : "text-amber-400"}`} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-foreground">Meta Ads (Facebook/Instagram Lead Ads)</h3>
            <p className="text-[10px] text-muted-foreground">Receba leads direto dos anúncios, sem precisar de Zapier/Make</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded ${isActive ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}>
            {isActive ? "Configurado" : "Pendente"}
          </span>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-[11px] text-blue-300 leading-relaxed">
              Crie um App em <a href="https://developers.facebook.com" target="_blank" rel="noopener" className="underline">developers.facebook.com</a>, conecte sua página e copie as credenciais abaixo. Veja o passo a passo completo na documentação de integrações.
            </p>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">App ID</label>
            <Input value={form.appId} onChange={(event) => setForm({ ...form, appId: event.target.value })} className="h-9 text-sm font-mono" placeholder="Ex: 1234567890" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">App Secret</label>
            <Input value={form.appSecret} type="password" onChange={(event) => setForm({ ...form, appSecret: event.target.value })} placeholder={config?.hasAppSecret ? "***já configurado*** (deixe vazio para manter)" : "Cole o App Secret aqui"} className="h-9 text-sm font-mono" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Page Access Token</label>
            <Input value={form.pageAccessToken} type="password" onChange={(event) => setForm({ ...form, pageAccessToken: event.target.value })} placeholder={config?.hasPageAccessToken ? "***já configurado*** (deixe vazio para manter)" : "Cole o Page Access Token aqui"} className="h-9 text-sm font-mono" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Page ID</label>
            <Input value={form.pageId} onChange={(event) => setForm({ ...form, pageId: event.target.value })} className="h-9 text-sm font-mono" placeholder="Ex: 987654321" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Verify Token (você escolhe, usado na verificação do webhook)</label>
            <Input value={form.verifyToken} onChange={(event) => setForm({ ...form, verifyToken: event.target.value })} className="h-9 text-sm font-mono" placeholder="Ex: kafka-verify-123" />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => {
                const updates: any = {};
                if (form.appId) updates.appId = form.appId;
                if (form.appSecret) updates.appSecret = form.appSecret;
                if (form.pageAccessToken) updates.pageAccessToken = form.pageAccessToken;
                if (form.verifyToken) updates.verifyToken = form.verifyToken;
                if (form.pageId) updates.pageId = form.pageId;
                if (Object.keys(updates).length === 0) {
                  toast.error("Preencha pelo menos um campo");
                  return;
                }
                saveConfig.mutate(updates);
              }}
              disabled={saveConfig.isPending}
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              {saveConfig.isPending ? "Salvando..." : "Salvar Credenciais"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => testConnection.mutate()} disabled={testConnection.isPending || !isActive}>
              <Zap className="w-3.5 h-3.5 mr-1" />
              {testConnection.isPending ? "Testando..." : "Testar Conexão"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResetAllPasswordsSection() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const resetAll = trpc.sellers.resetAllPasswords.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.resetCount} senhas resetadas! Todos os vendedores precisarão fazer o primeiro acesso novamente.`);
      setShowConfirm(false);
      setConfirmText("");
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });

  return (
    <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4">
      <h3 className="text-sm font-bold text-red-400 flex items-center gap-2 mb-2">
        <Shield className="w-4 h-4" /> Segurança - Resetar Senhas
      </h3>
      <p className="text-xs text-gray-400 mb-3">
        Reseta TODAS as senhas dos vendedores. Cada um precisará fazer o primeiro acesso novamente.
        Use em caso de problema de segurança.
      </p>
      {!showConfirm ? (
        <Button size="sm" variant="destructive" className="text-xs" onClick={() => setShowConfirm(true)}>
          Resetar Todas as Senhas
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-red-300 font-bold">Digite RESETAR para confirmar:</p>
          <Input value={confirmText} onChange={(event) => setConfirmText(event.target.value)} placeholder="RESETAR" className="h-8 text-sm border-red-500/50" />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" className="text-xs" disabled={confirmText !== "RESETAR" || resetAll.isPending} onClick={() => resetAll.mutate()}>
              {resetAll.isPending ? "Resetando..." : "Confirmar Reset"}
            </Button>
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setShowConfirm(false); setConfirmText(""); }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function WhatsAppZapiPanel() {
  const { data: settings } = trpc.crmPerformance.getTenantSettings.useQuery();
  const updateSettings = trpc.crmPerformance.updateTenantSettings.useMutation({
    onSuccess: () => toast.success("Configurações da loja salvas!"),
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });
  const testZapi = trpc.crmPerformance.testZapiConnection.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`WhatsApp conectado! ${data.phone ? `Tel: ${data.phone}` : ""}`);
        return;
      }
      toast.error(data.error || "Falha na conexão");
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });
  const { data: zapiStatus } = trpc.whatsapp.status.useQuery();
  const enableSentByMe = trpc.whatsapp.enableSentByMe.useMutation({
    onSuccess: () => toast.success("Captura de mensagens enviadas ativada!"),
    onError: (error: any) => toast.error(error.message),
  });
  const configureWebhook = trpc.whatsapp.configureWebhook.useMutation({
    onSuccess: () => toast.success("Webhook configurado com sucesso!"),
    onError: (error: any) => toast.error(error.message),
  });

  const [showZapi, setShowZapi] = useState(false);
  const [zapiForm, setZapiForm] = useState({ zapiInstanceId: "", zapiToken: "", zapiClientToken: "" });
  const [initialized, setInitialized] = useState(false);

  if (settings && !initialized) {
    setZapiForm({
      zapiInstanceId: settings.zapiInstanceId || "",
      zapiToken: "",
      zapiClientToken: "",
    });
    setInitialized(true);
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setShowZapi(!showZapi)} className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${settings?.hasZapi ? "bg-green-500/20" : "bg-amber-500/20"}`}>
            <MessageCircle className={`w-5 h-5 ${settings?.hasZapi ? "text-green-400" : "text-amber-400"}`} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-foreground">WhatsApp (Z-API)</h3>
            <p className="text-[10px] text-muted-foreground">{settings?.hasZapi ? "Credenciais configuradas" : "Configure suas credenciais Z-API para enviar mensagens"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded ${settings?.hasZapi ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}>
            {settings?.hasZapi ? "Configurado" : "Pendente"}
          </span>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showZapi ? "rotate-90" : ""}`} />
        </div>
      </button>
      {showZapi && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-[11px] text-blue-300 leading-relaxed">
              <strong>Como obter:</strong> Acesse <a href="https://z-api.io" target="_blank" rel="noopener" className="underline">z-api.io</a>, crie uma instância e copie as credenciais abaixo. Cada loja precisa de sua própria instância Z-API.
            </p>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Instance ID</label>
            <Input placeholder="Ex: 3C7A1B2D3E4F..." value={zapiForm.zapiInstanceId} onChange={(event) => setZapiForm({ ...zapiForm, zapiInstanceId: event.target.value })} className="h-9 text-sm font-mono" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Token</label>
            <Input placeholder={settings?.zapiToken ? "***já configurado*** (deixe vazio para manter)" : "Cole o token aqui"} value={zapiForm.zapiToken} type="password" onChange={(event) => setZapiForm({ ...zapiForm, zapiToken: event.target.value })} className="h-9 text-sm font-mono" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Client Token</label>
            <Input placeholder={settings?.zapiClientToken ? "***já configurado*** (deixe vazio para manter)" : "Cole o client token aqui"} value={zapiForm.zapiClientToken} type="password" onChange={(event) => setZapiForm({ ...zapiForm, zapiClientToken: event.target.value })} className="h-9 text-sm font-mono" />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => {
                const updates: any = {};
                if (zapiForm.zapiInstanceId) updates.zapiInstanceId = zapiForm.zapiInstanceId;
                if (zapiForm.zapiToken) updates.zapiToken = zapiForm.zapiToken;
                if (zapiForm.zapiClientToken) updates.zapiClientToken = zapiForm.zapiClientToken;
                if (Object.keys(updates).length === 0) {
                  toast.error("Preencha pelo menos um campo");
                  return;
                }
                updateSettings.mutate(updates);
              }}
              disabled={updateSettings.isPending}
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              {updateSettings.isPending ? "Salvando..." : "Salvar Credenciais"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => testZapi.mutate()} disabled={testZapi.isPending || !settings?.hasZapi}>
              <Zap className="w-3.5 h-3.5 mr-1" />
              {testZapi.isPending ? "Testando..." : "Testar Conexão"}
            </Button>
          </div>
          {zapiStatus?.connected && (
            <div className="flex gap-2 pt-1 border-t border-border/50">
              <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => configureWebhook.mutate()} disabled={configureWebhook.isPending}>
                {configureWebhook.isPending ? "Configurando..." : "Reconfigurar Webhook"}
              </Button>
              <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => enableSentByMe.mutate()} disabled={enableSentByMe.isPending}>
                {enableSentByMe.isPending ? "Ativando..." : "Ativar Captura Outbound"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InventoryIntegrationPanel() {
  const { data: settings, refetch } = trpc.crmPerformance.getTenantSettings.useQuery();
  const updateSettings = trpc.crmPerformance.updateTenantSettings.useMutation({
    onSuccess: () => {
      toast.success("URL do estoque salva!");
      refetch();
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });
  const { data: syncLogs, refetch: refetchLogs } = trpc.inventory.syncLogs.useQuery();
  const syncNow = trpc.inventory.sync.useMutation({
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.error);
        return;
      }
      toast.success(`Sincronizado! ${data.added} novo(s), ${data.updated} atualizado(s), ${data.removed} removido(s)`);
      refetchLogs();
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });

  const [showInventory, setShowInventory] = useState(false);
  const [inventoryUrl, setInventoryUrl] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (settings && !initialized) {
    setInventoryUrl(settings.inventoryUrl || "");
    setInitialized(true);
  }

  const lastLog = syncLogs?.[0];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setShowInventory(!showInventory)} className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${settings?.inventoryUrl ? "bg-green-500/20" : "bg-amber-500/20"}`}>
            <Car className={`w-5 h-5 ${settings?.inventoryUrl ? "text-green-400" : "text-amber-400"}`} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-foreground">Estoque de Veículos</h3>
            <p className="text-[10px] text-muted-foreground">{settings?.inventoryUrl ? "URL configurada" : "Configure a URL do site de estoque da sua loja"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded ${settings?.inventoryUrl ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}>
            {settings?.inventoryUrl ? "Configurado" : "Pendente"}
          </span>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showInventory ? "rotate-90" : ""}`} />
        </div>
      </button>
      {showInventory && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-[11px] text-blue-300 leading-relaxed">Informe a URL do site onde fica o estoque de veículos da sua loja. O sistema sincroniza automaticamente a cada 15 minutos.</p>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">URL do site de estoque</label>
            <Input placeholder="https://seusite.com.br" value={inventoryUrl} onChange={(event) => setInventoryUrl(event.target.value)} className="h-9 text-sm font-mono" />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => {
                if (!inventoryUrl) {
                  toast.error("Informe a URL do estoque");
                  return;
                }
                updateSettings.mutate({ inventoryUrl });
              }}
              disabled={updateSettings.isPending}
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              {updateSettings.isPending ? "Salvando..." : "Salvar URL"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => syncNow.mutate()} disabled={syncNow.isPending || !settings?.inventoryUrl}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncNow.isPending ? "animate-spin" : ""}`} />
              {syncNow.isPending ? "Sincronizando..." : "Sincronizar Agora"}
            </Button>
          </div>
          {lastLog && (
            <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
              <span className={lastLog.status === "success" ? "text-green-400" : "text-red-400"}>
                {lastLog.status === "success" ? "Última sincronização" : "Falha na sincronização"}
              </span>{" "}
              em {new Date(lastLog.createdAt).toLocaleString("pt-BR")}
              {lastLog.status === "success"
                ? ` - ${lastLog.vehiclesFound} encontrado(s), ${lastLog.vehiclesAdded} novo(s), ${lastLog.vehiclesUpdated} atualizado(s), ${lastLog.vehiclesRemoved} removido(s)`
                : lastLog.errorMessage ? ` - ${lastLog.errorMessage}` : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function StoreDataPanel() {
  const utils = trpc.useUtils();
  const { data: settings, refetch } = trpc.crmPerformance.getTenantSettings.useQuery();
  const updateSettings = trpc.crmPerformance.updateTenantSettings.useMutation({
    onSuccess: () => {
      toast.success("Configurações da loja salvas!");
      refetch();
      utils.tenantPublic.getBySlug.invalidate();
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });
  const uploadLogo = trpc.crmPerformance.uploadTenantLogo.useMutation({
    onSuccess: () => {
      toast.success("Logo atualizada!");
      refetch();
      utils.tenantPublic.getBySlug.invalidate();
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });

  const [showStore, setShowStore] = useState(false);
  const [storeForm, setStoreForm] = useState({ name: "", phone: "", email: "", city: "", state: "", address: "", primaryColor: "", secondaryColor: "" });
  const [initialized, setInitialized] = useState(false);

  if (settings && !initialized) {
    setStoreForm({
      name: settings.name || "",
      phone: settings.phone || "",
      email: settings.email || "",
      city: settings.city || "",
      state: settings.state || "",
      address: settings.address || "",
      primaryColor: settings.primaryColor || "#DC2626",
      secondaryColor: settings.secondaryColor || "#1F2937",
    });
    setInitialized(true);
  }

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 3MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadLogo.mutate({ base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setShowStore(!showStore)} className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/20">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-foreground">Dados da Loja</h3>
            <p className="text-[10px] text-muted-foreground">Nome, contato, endereço e personalização visual</p>
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showStore ? "rotate-90" : ""}`} />
      </button>
      {showStore && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Logo da Loja</label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl border border-border bg-background flex items-center justify-center overflow-hidden shrink-0">
                {settings?.logoUrl ? <img src={settings.logoUrl} alt="Logo da loja" className="w-full h-full object-contain" /> : <ImageIcon className="w-6 h-6 text-muted-foreground" />}
              </div>
              <div className="flex-1">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-accent/30 hover:bg-accent/50 text-sm cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  {uploadLogo.isPending ? "Enviando..." : "Enviar nova logo"}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleLogoChange} disabled={uploadLogo.isPending} />
                </label>
                <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG, WEBP ou SVG. Máximo 3MB. Se não enviar, a logo padrão é exibida.</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Nome da Loja</label>
              <Input value={storeForm.name} onChange={(event) => setStoreForm({ ...storeForm, name: event.target.value })} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Telefone</label>
              <Input value={storeForm.phone} onChange={(event) => setStoreForm({ ...storeForm, phone: event.target.value })} className="h-9 text-sm" placeholder="(11) 99999-9999" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Email</label>
              <Input value={storeForm.email} onChange={(event) => setStoreForm({ ...storeForm, email: event.target.value })} className="h-9 text-sm" type="email" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Cidade</label>
              <Input value={storeForm.city} onChange={(event) => setStoreForm({ ...storeForm, city: event.target.value })} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Estado (UF)</label>
              <Input value={storeForm.state} onChange={(event) => setStoreForm({ ...storeForm, state: event.target.value })} className="h-9 text-sm" maxLength={2} placeholder="SP" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Endereço Completo</label>
            <Input value={storeForm.address} onChange={(event) => setStoreForm({ ...storeForm, address: event.target.value })} className="h-9 text-sm" placeholder="Rua, Número, Bairro" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Cor Principal</label>
              <div className="flex items-center gap-2">
                <input type="color" value={storeForm.primaryColor} onChange={(event) => setStoreForm({ ...storeForm, primaryColor: event.target.value })} className="w-8 h-8 rounded cursor-pointer border border-border" />
                <Input value={storeForm.primaryColor} onChange={(event) => setStoreForm({ ...storeForm, primaryColor: event.target.value })} className="h-9 text-sm font-mono flex-1" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Cor Secundária</label>
              <div className="flex items-center gap-2">
                <input type="color" value={storeForm.secondaryColor} onChange={(event) => setStoreForm({ ...storeForm, secondaryColor: event.target.value })} className="w-8 h-8 rounded cursor-pointer border border-border" />
                <Input value={storeForm.secondaryColor} onChange={(event) => setStoreForm({ ...storeForm, secondaryColor: event.target.value })} className="h-9 text-sm font-mono flex-1" />
              </div>
            </div>
          </div>
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              const updates: any = {};
              for (const [key, value] of Object.entries(storeForm)) {
                if (value) updates[key] = value;
              }
              updateSettings.mutate(updates);
            }}
            disabled={updateSettings.isPending}
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {updateSettings.isPending ? "Salvando..." : "Salvar Dados da Loja"}
          </Button>
        </div>
      )}
    </div>
  );
}
