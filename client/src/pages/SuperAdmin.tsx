import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Building2, Users, ShoppingCart, TrendingUp, Plus, Search,
  Settings, LogOut, Eye, Edit, Trash2, Shield, Crown,
  Store, MapPin, Phone, Mail, Palette, Zap, BarChart3,
  ChevronRight, AlertTriangle, CheckCircle2, Clock, XCircle, EyeOff,
  Key, RefreshCw
} from "lucide-react";

// ===== AUTH STATE =====
function useSuperAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("super_token"));
  const [admin, setAdmin] = useState<any>(null);

  const { data: me } = trpc.superAdmin.me.useQuery(
    { token: token || "" },
    { enabled: !!token, retry: false }
  );

  useEffect(() => {
    if (me) setAdmin(me);
    if (me === null && token) {
      localStorage.removeItem("super_token");
      setToken(null);
    }
  }, [me, token]);

  const login = (t: string, a: any) => {
    localStorage.setItem("super_token", t);
    setToken(t);
    setAdmin(a);
  };

  const logout = () => {
    localStorage.removeItem("super_token");
    setToken(null);
    setAdmin(null);
  };

  return { token, admin, login, logout, isLoggedIn: !!token && !!admin };
}

// ===== LOGIN SCREEN =====
function SuperLoginScreen({ onLogin }: { onLogin: (token: string, admin: any) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const loginMut = trpc.superAdmin.login.useMutation({
    onSuccess: (data) => {
      toast.success("Login realizado!");
      onLogin(data.token, data.admin);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Portal Super Admin</h1>
          <p className="text-gray-400 mt-1">Gerencie todas as lojas do Kafka Rank</p>
        </div>

        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              placeholder="superadmin"
              onKeyDown={(e) => e.key === "Enter" && loginMut.mutate({ username, password })}
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              placeholder="********"
              onKeyDown={(e) => e.key === "Enter" && loginMut.mutate({ username, password })}
            />
          </div>
          <button
            onClick={() => loginMut.mutate({ username, password })}
            disabled={loginMut.isPending || !username || !password}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50"
          >
            {loginMut.isPending ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== STATUS BADGE =====
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: any; label: string }> = {
    active: { color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2, label: "Ativa" },
    trial: { color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: Clock, label: "Trial" },
    suspended: { color: "text-red-400 bg-red-500/10 border-red-500/20", icon: AlertTriangle, label: "Suspensa" },
    cancelled: { color: "text-gray-400 bg-gray-500/10 border-gray-500/20", icon: XCircle, label: "Cancelada" },
  };
  const c = config[status] || config.cancelled;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${c.color}`}>
      <Icon className="w-3 h-3" /> {c.label}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const config: Record<string, string> = {
    trial: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    basic: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    pro: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    enterprise: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${config[plan] || config.trial}`}>
      {plan.toUpperCase()}
    </span>
  );
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function normalizeUsername(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]/g, "");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getAvailabilityMessage(value: string, available: boolean, type: "slug" | "username") {
  if (!value) return null;
  if (available) {
    return type === "slug"
      ? "Slug disponível para uso."
      : "Login disponível para o admin da loja.";
  }

  return type === "slug"
    ? "Esse slug já está em uso por outra loja."
    : "Esse login já está em uso. Escolha outro.";
}

// ===== CREATE TENANT MODAL =====
function CreateTenantModal({ token, onClose, onCreated }: { token: string; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "", slug: "", phone: "", email: "", city: "", state: "",
    plan: "trial" as "trial" | "basic" | "pro" | "enterprise",
    maxSellers: 10, maxAdmins: 2,
    adminUsername: "", adminPassword: "", adminName: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const createMut = trpc.superAdmin.createTenant.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      onCreated();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const trimmedName = form.name.trim();
  const trimmedSlug = slugify(form.slug);
  const trimmedPhone = form.phone.trim();
  const trimmedEmail = form.email.trim();
  const trimmedAdminName = form.adminName.trim();
  const normalizedAdminUsername = normalizeUsername(form.adminUsername);
  const trimmedAdminPassword = form.adminPassword.trim();
  const phoneDigits = trimmedPhone.replace(/\D/g, "");
  const [debouncedSlug, setDebouncedSlug] = useState(trimmedSlug);
  const [debouncedAdminUsername, setDebouncedAdminUsername] = useState(normalizedAdminUsername);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSlug(trimmedSlug), 350);
    return () => window.clearTimeout(timer);
  }, [trimmedSlug]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedAdminUsername(normalizedAdminUsername), 350);
    return () => window.clearTimeout(timer);
  }, [normalizedAdminUsername]);

  const nameIsValid = trimmedName.length >= 2;
  const slugIsValid = trimmedSlug.length >= 2;
  const phoneIsValid = !trimmedPhone || phoneDigits.length === 10 || phoneDigits.length === 11;
  const emailIsValid = !trimmedEmail || isValidEmail(trimmedEmail);
  const adminNameIsValid = trimmedAdminName.length >= 2;
  const usernameIsValid = normalizedAdminUsername.length >= 3;
  const passwordIsValid = trimmedAdminPassword.length >= 4;
  const availabilityQuery = trpc.superAdmin.checkAvailability.useQuery(
    {
      token,
      slug: debouncedSlug || undefined,
      adminUsername: debouncedAdminUsername || undefined,
    },
    {
      enabled: slugIsValid || usernameIsValid,
      retry: false,
    }
  );

  const slugAvailability = availabilityQuery.data?.slug;
  const usernameAvailability = availabilityQuery.data?.adminUsername;
  const slugAvailable = !slugIsValid || debouncedSlug !== trimmedSlug ? true : slugAvailability?.available !== false;
  const adminUsernameAvailable = !usernameIsValid || debouncedAdminUsername !== normalizedAdminUsername ? true : usernameAvailability?.available !== false;
  const canSubmit =
    !createMut.isPending &&
    nameIsValid &&
    slugIsValid &&
    phoneIsValid &&
    emailIsValid &&
    adminNameIsValid &&
    usernameIsValid &&
    passwordIsValid &&
    slugAvailable &&
    adminUsernameAvailable;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-red-500" /> Nova Loja
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">×</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Dados da Loja */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Dados da Loja</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Nome da Loja *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-11 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="Ex: Auto Center Premium"
                  autoFocus
                />
                {!nameIsValid && <p className="mt-1 text-[11px] text-amber-400">Informe um nome com pelo menos 2 caracteres.</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Slug (URL) *</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="auto-center-premium"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <p className="mt-1 text-[11px] text-gray-400">Link da loja: `http://localhost:3000/t/{trimmedSlug || "sua-loja"}/login`</p>
                <p className="mt-1 text-[11px] text-gray-500">Esse será o acesso principal da equipe comercial da loja.</p>
                {slugIsValid && debouncedSlug === trimmedSlug && slugAvailability && (
                  <p className={`mt-1 text-[11px] ${slugAvailability.available ? "text-emerald-400" : "text-amber-400"}`}>
                    {getAvailabilityMessage(slugAvailability.value, slugAvailability.available, "slug")}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Telefone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="(47) 99999-0000"
                  inputMode="tel"
                  autoComplete="tel"
                />
                {!phoneIsValid && <p className="mt-1 text-[11px] text-amber-400">Use 10 ou 11 d&iacute;gitos.</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="contato@loja.com"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                />
                {!emailIsValid && <p className="mt-1 text-[11px] text-amber-400">Informe um email v&aacute;lido.</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Cidade</label>
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="Joinville"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">UF</label>
                <input
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase().slice(0, 2) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="SC"
                  maxLength={2}
                />
              </div>
            </div>
          </div>

          {/* Plano */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Plano</h3>
            <div className="grid grid-cols-4 gap-2">
              {(["trial", "basic", "pro", "enterprise"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setForm({ ...form, plan: p, maxSellers: p === "enterprise" ? 50 : p === "pro" ? 30 : p === "basic" ? 15 : 10 })}
                  className={`py-2 rounded-lg text-sm font-semibold border transition-all ${form.plan === p ? "bg-red-600/20 border-red-500 text-red-400" : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"}`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Max Vendedores</label>
                <input
                  type="number"
                  value={form.maxSellers}
                  onChange={(e) => setForm({ ...form, maxSellers: Number(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Max Admins</label>
                <input
                  type="number"
                  value={form.maxAdmins}
                  onChange={(e) => setForm({ ...form, maxAdmins: Number(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Admin da Loja */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Admin da Loja (primeiro acesso)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Nome do Admin *</label>
                <input
                  value={form.adminName}
                  onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="João Silva"
                  autoComplete="name"
                />
                {!adminNameIsValid && <p className="mt-1 text-[11px] text-amber-400">Informe o nome do admin responsável.</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Login *</label>
                <input
                  value={form.adminUsername}
                  onChange={(e) => setForm({ ...form, adminUsername: normalizeUsername(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="admin"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="username"
                />
                <p className="mt-1 text-[11px] text-gray-500">Use letras min&uacute;sculas, n&uacute;meros, ponto, h&iacute;fen ou underscore.</p>
                {usernameIsValid && debouncedAdminUsername === normalizedAdminUsername && usernameAvailability && (
                  <p className={`mt-1 text-[11px] ${usernameAvailability.available ? "text-emerald-400" : "text-amber-400"}`}>
                    {getAvailabilityMessage(usernameAvailability.value, usernameAvailability.available, "username")}
                  </p>
                )}
              </div>
              <div className="relative">
                <label className="text-xs text-gray-500 mb-1 block">Senha *</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.adminPassword}
                  onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-11 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="Mínimo 4 caracteres"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-[29px] text-gray-400 transition-colors hover:text-white"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <p className="mt-1 text-[11px] text-gray-500">Recomendação: pelo menos 8 caracteres com letras e números.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-800 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => createMut.mutate({
              ...form,
              token,
              name: trimmedName,
              slug: trimmedSlug,
              phone: trimmedPhone,
              email: trimmedEmail,
              city: form.city.trim(),
              state: form.state.trim().toUpperCase(),
              adminName: trimmedAdminName,
              adminUsername: normalizedAdminUsername,
              adminPassword: trimmedAdminPassword,
            })}
            disabled={!canSubmit}
            className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
          >
            {createMut.isPending ? "Criando..." : "Criar Loja"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== TENANT DETAIL MODAL =====
function TenantDetailModal({ token, tenantId, onClose }: { token: string; tenantId: number; onClose: () => void }) {
  const { data: tenant, refetch } = trpc.superAdmin.getTenant.useQuery({ token, tenantId });
  const { data: adminsData } = trpc.superAdmin.listTenantAdmins.useQuery({ token, tenantId });
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [resetPwAdmin, setResetPwAdmin] = useState<number | null>(null);
  const [newPw, setNewPw] = useState("");

  const updateMut = trpc.superAdmin.updateTenant.useMutation({
    onSuccess: () => { toast.success("Loja atualizada!"); refetch(); setEditMode(false); },
    onError: (err) => toast.error(err.message),
  });

  const resetPwMut = trpc.superAdmin.resetTenantAdminPassword.useMutation({
    onSuccess: () => { toast.success("Senha resetada!"); setResetPwAdmin(null); setNewPw(""); },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    if (tenant) setEditForm({
      name: tenant.name, phone: tenant.phone, email: tenant.email,
      city: tenant.city, state: tenant.state, plan: tenant.plan,
      maxSellers: tenant.maxSellers, maxAdmins: tenant.maxAdmins,
      status: tenant.status, primaryColor: tenant.primaryColor,
    });
  }, [tenant]);

  const editPhone = (editForm.phone || "").trim();
  const editPhoneDigits = editPhone.replace(/\D/g, "");
  const editPhoneIsValid = !editPhone || editPhoneDigits.length === 10 || editPhoneDigits.length === 11;
  const editEmail = (editForm.email || "").trim();
  const editEmailIsValid = !editEmail || isValidEmail(editEmail);
  const editNameIsValid = (editForm.name || "").trim().length >= 2;
  const canSaveTenant = editNameIsValid && editPhoneIsValid && editEmailIsValid && !updateMut.isPending;

  if (!tenant) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{tenant.name}</h2>
            <p className="text-sm text-gray-400">{tenant.slug}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={tenant.status || "trial"} />
            <PlanBadge plan={tenant.plan || "trial"} />
            <button onClick={onClose} className="text-gray-400 hover:text-white ml-2">×</button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{tenant.sellerCount}</div>
              <div className="text-xs text-gray-400">Vendedores</div>
              <div className="text-xs text-gray-500">máx: {tenant.maxSellers}</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{tenant.adminCount}</div>
              <div className="text-xs text-gray-400">Admins</div>
              <div className="text-xs text-gray-500">máx: {tenant.maxAdmins}</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <div className="text-xs text-gray-400 mb-1">Criada em</div>
              <div className="text-sm font-medium text-white">
                {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString("pt-BR") : "-"}
              </div>
            </div>
          </div>

          {/* Info / Edit */}
          {editMode ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nome</label>
                  <input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                  {!editNameIsValid && <p className="mt-1 text-[11px] text-amber-400">Informe um nome com pelo menos 2 caracteres.</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Status</label>
                  <select value={editForm.status || "trial"} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none">
                    <option value="active">Ativa</option>
                    <option value="trial">Trial</option>
                    <option value="suspended">Suspensa</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Plano</label>
                  <select value={editForm.plan || "trial"} onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none">
                    <option value="trial">Trial</option>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Max Vendedores</label>
                  <input type="number" value={editForm.maxSellers || 10} onChange={(e) => setEditForm({ ...editForm, maxSellers: Number(e.target.value) })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Telefone</label>
                  <input value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: formatPhone(e.target.value) })}
                    inputMode="tel"
                    autoComplete="tel"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                  {!editPhoneIsValid && <p className="mt-1 text-[11px] text-amber-400">Use 10 ou 11 d&iacute;gitos.</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Email</label>
                  <input value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                  {!editEmailIsValid && <p className="mt-1 text-[11px] text-amber-400">Informe um email v&aacute;lido.</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Cidade</label>
                  <input value={editForm.city || ""} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Cor Principal</label>
                  <div className="flex gap-2">
                    <input type="color" value={editForm.primaryColor || "#DC2626"} onChange={(e) => setEditForm({ ...editForm, primaryColor: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer" />
                    <input value={editForm.primaryColor || "#DC2626"} onChange={(e) => setEditForm({ ...editForm, primaryColor: e.target.value })}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditMode(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
                <button
                  onClick={() => updateMut.mutate({
                    token,
                    tenantId,
                    ...editForm,
                    name: (editForm.name || "").trim(),
                    phone: editPhone,
                    email: editEmail,
                    city: (editForm.city || "").trim(),
                    state: (editForm.state || "").trim().toUpperCase(),
                  })}
                  disabled={!canSaveTenant}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {updateMut.isPending ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Informações</h3>
                <button onClick={() => setEditMode(true)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                  <Edit className="w-3 h-3" /> Editar
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {tenant.phone && <div className="flex items-center gap-2 text-gray-300"><Phone className="w-4 h-4 text-gray-500" /> {tenant.phone}</div>}
                {tenant.email && <div className="flex items-center gap-2 text-gray-300"><Mail className="w-4 h-4 text-gray-500" /> {tenant.email}</div>}
                {tenant.city && <div className="flex items-center gap-2 text-gray-300"><MapPin className="w-4 h-4 text-gray-500" /> {tenant.city}/{tenant.state}</div>}
                {tenant.primaryColor && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: tenant.primaryColor }} />
                    {tenant.primaryColor}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Admins da Loja */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Admins da Loja</h3>
            <div className="space-y-2">
              {(adminsData as any[])?.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white">
                      {a.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{a.name}</div>
                      <div className="text-xs text-gray-400">@{a.username} · {a.role}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.active ? (
                      <span className="text-xs text-emerald-400">Ativo</span>
                    ) : (
                      <span className="text-xs text-red-400">Inativo</span>
                    )}
                    {resetPwAdmin === a.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="password"
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                          placeholder="Nova senha"
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs w-24 outline-none"
                        />
                        <button
                          onClick={() => resetPwMut.mutate({ token, adminId: a.id, newPassword: newPw })}
                          disabled={!newPw || newPw.length < 4}
                          className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                        >
                          OK
                        </button>
                        <button onClick={() => { setResetPwAdmin(null); setNewPw(""); }} className="text-xs text-gray-400">×</button>
                      </div>
                    ) : (
                      <button onClick={() => setResetPwAdmin(a.id)} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
                        <Key className="w-3 h-3" /> Reset Senha
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!(adminsData as any[])?.length && (
                <p className="text-sm text-gray-500 text-center py-4">Nenhum admin cadastrado</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN DASHBOARD =====
function SuperDashboard({ token, admin, onLogout }: { token: string; admin: any; onLogout: () => void }) {
  const { data: dashboard, refetch } = trpc.superAdmin.dashboard.useQuery({ token });
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const filteredTenants = (dashboard?.tenants || []).filter((t: any) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase()) ||
    (t.city || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Kafka Rank</h1>
              <p className="text-xs text-gray-400">Portal Super Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">{admin?.name}</span>
            <button onClick={onLogout} className="text-gray-400 hover:text-red-400 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{dashboard?.totalTenants || 0}</div>
                <div className="text-xs text-gray-400">Lojas Total</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{dashboard?.activeTenants || 0}</div>
                <div className="text-xs text-gray-400">Ativas</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{dashboard?.totalSellers || 0}</div>
                <div className="text-xs text-gray-400">Vendedores</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{dashboard?.totalSalesThisMonth || 0}</div>
                <div className="text-xs text-gray-400">Vendas (mês)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tenants List */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Store className="w-5 h-5 text-red-500" /> Lojas
            </h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar loja..."
                  className="bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm w-48 focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              >
                <Plus className="w-4 h-4" /> Nova Loja
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-800">
            {filteredTenants.map((t: any) => (
              <div
                key={t.id}
                onClick={() => setSelectedTenant(t.id)}
                className="flex items-center justify-between px-4 py-4 hover:bg-gray-800/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: t.primaryColor || "#DC2626" }}
                  >
                    {t.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{t.name}</span>
                      <StatusBadge status={t.tenant_status || "trial"} />
                      <PlanBadge plan={t.plan || "trial"} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                      <span>{t.slug}</span>
                      {t.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{t.city}/{t.state}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-sm font-bold text-white">{t.sellerCount || 0}</div>
                    <div className="text-xs text-gray-500">vendedores</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-white">{t.salesThisMonth || 0}</div>
                    <div className="text-xs text-gray-500">vendas/mês</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-white">{t.leadCount || 0}</div>
                    <div className="text-xs text-gray-500">leads</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </div>
              </div>
            ))}

            {filteredTenants.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma loja encontrada</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreate && <CreateTenantModal token={token} onClose={() => setShowCreate(false)} onCreated={() => refetch()} />}
      {selectedTenant && <TenantDetailModal token={token} tenantId={selectedTenant} onClose={() => setSelectedTenant(null)} />}
    </div>
  );
}

// ===== MAIN EXPORT =====
export default function SuperAdmin() {
  const { token, admin, login, logout, isLoggedIn } = useSuperAuth();

  if (!isLoggedIn) {
    return <SuperLoginScreen onLogin={login} />;
  }

  return <SuperDashboard token={token!} admin={admin} onLogout={logout} />;
}


