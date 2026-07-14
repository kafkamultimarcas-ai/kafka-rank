import React, { useState, useEffect, useMemo, useRef } from "react";
import { Line, Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Building2, Users, ShoppingCart, TrendingUp, Plus, Search,
  Settings, LogOut, Eye, Edit, Trash2, Shield, Crown,
  Store, MapPin, Phone, Mail, Palette, Zap, BarChart3,
  ChevronRight, AlertTriangle, CheckCircle2, Clock, XCircle, EyeOff,
  Key, RefreshCw, X, LayoutDashboard, Car, MessageSquare, DollarSign,
  Wallet, CreditCard, Trophy, PieChart, TrendingDown, ArrowUpRight, Download
} from "lucide-react";
import { slugify, formatPhone, normalizeUsername, isValidEmail, getAvailabilityMessage } from "@/lib/tenantForm";
import { getDefaultPlanLimits, TRIAL_PLAN_LIMITS } from "@shared/plans";

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

  const logout = () => {
    localStorage.removeItem("super_token");
    setToken(null);
    setAdmin(null);
  };

  return { token, admin, logout, isLoggedIn: !!token && !!admin };
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

// ===== CREATE TENANT MODAL =====
function CreateTenantModal({ token, onClose, onCreated }: { token: string; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<{
    name: string;
    slug: string;
    phone: string;
    email: string;
    city: string;
    state: string;
    plan: "trial" | "basic" | "pro" | "enterprise";
    maxSellers: number;
    maxAdmins: number;
    adminEmail: string;
    adminPassword: string;
    adminName: string;
  }>({
    name: "", slug: "", phone: "", email: "", city: "", state: "",
    plan: "trial" as "trial" | "basic" | "pro" | "enterprise",
    maxSellers: TRIAL_PLAN_LIMITS.maxSellers, maxAdmins: TRIAL_PLAN_LIMITS.maxAdmins,
    adminEmail: "", adminPassword: "", adminName: "",
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
  const trimmedAdminEmail = form.adminEmail.trim().toLowerCase();
  const trimmedAdminPassword = form.adminPassword.trim();
  const phoneDigits = trimmedPhone.replace(/\D/g, "");
  const [debouncedSlug, setDebouncedSlug] = useState(trimmedSlug);
  const [debouncedAdminEmail, setDebouncedAdminEmail] = useState(trimmedAdminEmail);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSlug(trimmedSlug), 350);
    return () => window.clearTimeout(timer);
  }, [trimmedSlug]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedAdminEmail(trimmedAdminEmail), 350);
    return () => window.clearTimeout(timer);
  }, [trimmedAdminEmail]);

  const nameIsValid = trimmedName.length >= 2;
  const slugIsValid = trimmedSlug.length >= 2;
  const phoneIsValid = !trimmedPhone || phoneDigits.length === 10 || phoneDigits.length === 11;
  const emailIsValid = !trimmedEmail || isValidEmail(trimmedEmail);
  const adminNameIsValid = trimmedAdminName.length >= 2;
  const adminEmailIsValid = isValidEmail(trimmedAdminEmail);
  const passwordIsValid = trimmedAdminPassword.length >= 4;
  const availabilityQuery = trpc.superAdmin.checkAvailability.useQuery(
    {
      token,
      slug: debouncedSlug || undefined,
      adminEmail: debouncedAdminEmail || undefined,
    },
    {
      enabled: slugIsValid || adminEmailIsValid,
      retry: false,
    }
  );

  const slugAvailability = availabilityQuery.data?.slug;
  const emailAvailabilityData = availabilityQuery.data?.adminEmail;
  const slugAvailable = !slugIsValid || debouncedSlug !== trimmedSlug ? true : slugAvailability?.available !== false;
  const adminEmailAvailable = !adminEmailIsValid || debouncedAdminEmail !== trimmedAdminEmail ? true : emailAvailabilityData?.available !== false;
  const canSubmit =
    !createMut.isPending &&
    nameIsValid &&
    slugIsValid &&
    phoneIsValid &&
    emailIsValid &&
    adminNameIsValid &&
    adminEmailIsValid &&
    passwordIsValid &&
    slugAvailable &&
    adminEmailAvailable;

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
                <p className="mt-1 text-[11px] text-gray-400">Link da loja: {window.location.origin}/t/{trimmedSlug || "sua-loja"}/login</p>
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
                  onClick={() => {
                    const limits = getDefaultPlanLimits(p);
                    setForm({ ...form, plan: p, maxSellers: limits.maxSellers, maxAdmins: limits.maxAdmins });
                  }}
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
                <label className="text-xs text-gray-500 mb-1 block">E-mail (login) *</label>
                <input
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="admin@loja.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="email"
                />
                <p className="mt-1 text-[11px] text-gray-500">E-mail é a identidade única de login.</p>
                {adminEmailIsValid && debouncedAdminEmail === trimmedAdminEmail && emailAvailabilityData && (
                  <p className={`mt-1 text-[11px] ${emailAvailabilityData.available ? "text-emerald-400" : "text-amber-400"}`}>
                    {emailAvailabilityData.available ? "E-mail disponível" : (emailAvailabilityData.reason === "invalid" ? "E-mail inválido" : "E-mail já está em uso")}
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
              adminEmail: trimmedAdminEmail,
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
                  <input type="number" value={editForm.maxSellers || TRIAL_PLAN_LIMITS.maxSellers} onChange={(e) => setEditForm({ ...editForm, maxSellers: Number(e.target.value) })}
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

// ===== PLATFORM LOG DETAIL MODAL (e-mail ou assinatura) =====
function PlatformLogDetailModal({ token, logType, logId, onClose, onResolved }: { token: string; logType: "email" | "subscription" | "billing_alert" | "integration"; logId: number; onClose: () => void; onResolved?: () => void }) {
  const { data: log, isLoading, refetch } = trpc.platformLogs.getById.useQuery({ token, logType, id: logId });
  const resolveMut = trpc.platformLogs.resolveBillingAlert.useMutation({
    onSuccess: () => { toast.success("Alerta marcado como resolvido."); refetch(); onResolved?.(); },
    onError: (err) => toast.error(err.message || "Erro ao resolver alerta"),
  });

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Detalhe do log</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Carregando...</div>
        ) : !log ? (
          <div className="p-8 text-center text-gray-500 text-sm">Log não encontrado.</div>
        ) : log.logType === "email" ? (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-gray-500 block">Loja</span><span className="text-white">{log.tenantName ? `${log.tenantName} (${log.tenantSlug})` : "—"}</span></div>
              <div><span className="text-gray-500 block">Tipo</span><span className="text-white">{log.emailType}</span></div>
              <div><span className="text-gray-500 block">Status</span><span className="text-white">{log.status}</span></div>
              <div><span className="text-gray-500 block">Destinatário</span><span className="text-white">{log.toEmail}</span></div>
              <div className="col-span-2"><span className="text-gray-500 block">Assunto</span><span className="text-white">{log.subject}</span></div>
              <div><span className="text-gray-500 block">ID no provedor</span><span className="text-white">{log.providerId || "—"}</span></div>
              <div><span className="text-gray-500 block">Enviado em</span><span className="text-white">{new Date(log.createdAt).toLocaleString("pt-BR")}</span></div>
            </div>
            {log.errorMessage && (
              <div>
                <span className="text-gray-500 text-xs block mb-1">Erro</span>
                <p className="bg-black/40 border border-red-900 rounded-lg p-3 text-xs text-red-400">{log.errorMessage}</p>
              </div>
            )}
          </div>
        ) : log.logType === "billing_alert" ? (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-gray-500 block">Loja</span><span className="text-white">{log.tenantName ? `${log.tenantName} (${log.tenantSlug})` : (log.tenantId ? `#${log.tenantId}` : "—")}</span></div>
              <div><span className="text-gray-500 block">Severidade</span><span className={log.severity === "critical" ? "text-red-400" : "text-amber-400"}>{log.severity === "critical" ? "Crítico" : "Aviso"}</span></div>
              <div><span className="text-gray-500 block">Código</span><span className="text-white font-mono">{log.code}</span></div>
              <div><span className="text-gray-500 block">Status</span><span className="text-white">{log.resolved ? `Resolvido${log.resolvedBy ? ` por ${log.resolvedBy}` : ""}` : "Pendente"}</span></div>
              <div className="col-span-2"><span className="text-gray-500 block">Mensagem</span><span className="text-white">{log.message}</span></div>
              <div><span className="text-gray-500 block">Criado em</span><span className="text-white">{new Date(log.createdAt).toLocaleString("pt-BR")}</span></div>
              {log.resolvedAt && <div><span className="text-gray-500 block">Resolvido em</span><span className="text-white">{new Date(log.resolvedAt).toLocaleString("pt-BR")}</span></div>}
            </div>
            {log.context && (
              <div>
                <span className="text-gray-500 text-xs block mb-1">Contexto</span>
                <pre className="bg-black/40 border border-gray-800 rounded-lg p-3 text-[10px] text-gray-300 overflow-x-auto max-h-64 overflow-y-auto">
                  {JSON.stringify(JSON.parse(log.context), null, 2)}
                </pre>
              </div>
            )}
            {!log.resolved && (
              <button
                onClick={() => resolveMut.mutate({ token, id: log.id })}
                disabled={resolveMut.isPending}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
              >
                Marcar resolvido
              </button>
            )}
          </div>
        ) : log.logType === "integration" ? (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-gray-500 block">Loja</span><span className="text-white">{log.tenantName ? `${log.tenantName} (${log.tenantSlug})` : (log.tenantId ? `#${log.tenantId}` : "—")}</span></div>
              <div><span className="text-gray-500 block">Tipo</span><span className="text-white font-mono uppercase">{log.integrationType || "—"}</span></div>
              <div><span className="text-gray-500 block">Status</span><span className={log.status === "success" ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>{log.status === "success" ? "✅ Sucesso" : "❌ Erro"}</span></div>
              <div><span className="text-gray-500 block">Disparado por</span><span className="text-white">{log.triggeredBy === "manual" ? "👤 Manual" : "⚙️ Automático"}</span></div>
              <div><span className="text-gray-500 block">Duração</span><span className="text-white">{log.duration ? `${(log.duration / 1000).toFixed(1)}s` : "—"}</span></div>
              <div><span className="text-gray-500 block">Data</span><span className="text-white">{new Date(log.createdAt).toLocaleString("pt-BR")}</span></div>
            </div>
            {log.summary && (
              <div>
                <span className="text-gray-500 text-xs block mb-1">Resumo</span>
                <p className="bg-emerald-950/30 border border-emerald-900/50 rounded-lg p-3 text-xs text-emerald-300">{log.summary}</p>
              </div>
            )}
            {log.errorMessage && (
              <div>
                <span className="text-gray-500 text-xs block mb-1">Mensagem de Erro</span>
                <p className="bg-red-950/30 border border-red-900/50 rounded-lg p-3 text-xs text-red-300 whitespace-pre-wrap">{log.errorMessage}</p>
              </div>
            )}
            {log.details && (
              <div>
                <span className="text-gray-500 text-xs block mb-1">Detalhes Técnicos</span>
                <pre className="bg-black/40 border border-gray-800 rounded-lg p-3 text-[10px] text-gray-300 overflow-x-auto max-h-64 overflow-y-auto">
                  {(() => { try { return JSON.stringify(JSON.parse(log.details), null, 2); } catch { return log.details; } })()}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-gray-500 block">Loja</span><span className="text-white">{log.tenantName} ({log.tenantSlug})</span></div>
              <div><span className="text-gray-500 block">Evento</span><span className="text-white">{log.eventType}</span></div>
              <div><span className="text-gray-500 block">Status</span><span className="text-white">{log.status || "—"}</span></div>
              <div><span className="text-gray-500 block">Valor</span><span className="text-white">{log.value ? `R$ ${log.value}` : "—"}</span></div>
              <div><span className="text-gray-500 block">Forma de pagamento</span><span className="text-white">{log.billingType || "—"}</span></div>
              <div><span className="text-gray-500 block">Cobrança ASAAS</span><span className="text-white">{log.asaasPaymentId || "—"}</span></div>
              <div><span className="text-gray-500 block">Vencimento</span><span className="text-white">{log.dueDate ? new Date(log.dueDate).toLocaleDateString("pt-BR") : "—"}</span></div>
              <div><span className="text-gray-500 block">Recebido em</span><span className="text-white">{new Date(log.createdAt).toLocaleString("pt-BR")}</span></div>
            </div>
            <div>
              <span className="text-gray-500 text-xs block mb-1">Payload cru</span>
              <pre className="bg-black/40 border border-gray-800 rounded-lg p-3 text-[10px] text-gray-300 overflow-x-auto max-h-64 overflow-y-auto">
                {log.rawPayload ? JSON.stringify(JSON.parse(log.rawPayload), null, 2) : "—"}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== PLATFORM LOGS SECTION (Super Admin) — e-mail + assinatura + alertas de cobrança no mesmo lugar =====
const LOG_TYPE_OPTIONS: { value: "" | "email" | "subscription" | "billing_alert" | "integration"; label: string }[] = [
  { value: "", label: "Todos os tipos" },
  { value: "email", label: "E-mail" },
  { value: "subscription", label: "Assinatura" },
  { value: "billing_alert", label: "Alerta de Cobrança" },
  { value: "integration", label: "Integração" },
];
const LOGS_PAGE_SIZE = 20;

function PlatformLogsSection({ token, tenants }: { token: string; tenants: any[] }) {
  const [tenantFilter, setTenantFilter] = useState<string>("");
  const [logTypeFilter, setLogTypeFilter] = useState<"" | "email" | "subscription" | "billing_alert" | "integration">(""  );
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<{ logType: "email" | "subscription" | "billing_alert" | "integration"; id: number } | null>(null);

  const { data, isLoading, refetch } = trpc.platformLogs.list.useQuery({
    token,
    tenantId: tenantFilter ? Number(tenantFilter) : undefined,
    logType: logTypeFilter || undefined,
    status: statusFilter || undefined,
    startDate: startDate ? new Date(startDate).getTime() : undefined,
    endDate: endDate ? new Date(endDate + "T23:59:59").getTime() : undefined,
    limit: LOGS_PAGE_SIZE,
    offset: page * LOGS_PAGE_SIZE,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LOGS_PAGE_SIZE)) : 1;

  const resolveMut = trpc.platformLogs.resolveBillingAlert.useMutation({
    onSuccess: () => { toast.success("Alerta marcado como resolvido."); refetch(); },
    onError: (err) => toast.error(err.message || "Erro ao resolver alerta"),
  });

  const selectClass = "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-500";
  const resetPage = () => setPage(0);

  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-xl">
      <div className="p-4 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Key className="w-5 h-5 text-red-500" /> Logs da Plataforma
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <select value={tenantFilter} onChange={(e) => { setTenantFilter(e.target.value); resetPage(); }} className={selectClass}>
            <option value="">Todas as lojas</option>
            {tenants.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={logTypeFilter} onChange={(e) => { setLogTypeFilter(e.target.value as any); resetPage(); }} className={selectClass}>
            {LOG_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }} className={selectClass}>
            <option value="">Todos os status</option>
            <option value="sent">E-mail: enviado</option>
            <option value="failed">E-mail: falhou</option>
            <option value="CONFIRMED">Assinatura: CONFIRMED</option>
            <option value="RECEIVED">Assinatura: RECEIVED</option>
            <option value="OVERDUE">Assinatura: OVERDUE</option>
            <option value="PENDING">Assinatura: PENDING</option>
            <option value="critical">Alerta: Crítico</option>
            <option value="warning">Alerta: Aviso</option>
          </select>
          <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); resetPage(); }} className={selectClass} title="Data início" />
          <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); resetPage(); }} className={selectClass} title="Data fim" />
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-500 text-sm">Carregando...</div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Key className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum log encontrado com esses filtros.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs">
                  <th className="text-left px-4 py-2 font-medium">Tipo</th>
                  <th className="text-left px-4 py-2 font-medium">Loja</th>
                  <th className="text-left px-4 py-2 font-medium">Evento</th>
                  <th className="text-left px-4 py-2 font-medium">Detalhe</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Data</th>
                  <th className="text-left px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.items.map((item: any) => {
                  const typeMeta = item.logType === "email"
                    ? { icon: <Mail className="w-3 h-3" />, label: "E-mail", className: "bg-blue-500/15 text-blue-400" }
                    : item.logType === "billing_alert"
                      ? { icon: <AlertTriangle className="w-3 h-3" />, label: "Alerta", className: item.status === "critical" ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400" }
                      : item.logType === "integration"
                        ? { icon: <Zap className="w-3 h-3" />, label: "Integração", className: item.status === "error" ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400" }
                        : { icon: <Key className="w-3 h-3" />, label: "Assinatura", className: "bg-purple-500/15 text-purple-400" };
                  return (
                    <tr key={`${item.logType}-${item.id}`} onClick={() => setDetail({ logType: item.logType, id: item.id })} className="hover:bg-gray-800/50 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${typeMeta.className}`}>
                          {typeMeta.icon}
                          {typeMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white text-xs font-medium">{item.tenantName || (item.logType === "billing_alert" && item.tenantId ? `#${item.tenantId}` : "—")}</div>
                        <div className="text-gray-500 text-[10px]">{item.tenantSlug}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-xs font-mono">{item.title}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{item.detail || "—"}</td>
                      <td className="px-4 py-3 text-xs">
                        {item.logType === "billing_alert" ? (
                          <span className={item.status === "critical" ? "text-red-400" : "text-amber-400"}>
                            {item.status === "critical" ? "Crítico" : "Aviso"}{item.resolved ? " · resolvido" : ""}
                          </span>
                        ) : (
                          <span className="text-gray-300">{item.status || "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(item.createdAt).toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3 text-right">
                        {item.logType === "billing_alert" && !item.resolved && (
                          <button
                            onClick={(e) => { e.stopPropagation(); resolveMut.mutate({ token, id: item.id }); }}
                            disabled={resolveMut.isPending}
                            className="text-xs text-green-400 hover:text-green-300 font-semibold whitespace-nowrap"
                          >
                            Marcar resolvido
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-xs text-gray-400 disabled:opacity-30 hover:text-white">← Anterior</button>
            <span className="text-xs text-gray-500">Página {page + 1} de {totalPages} ({data.total} logs)</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="text-xs text-gray-400 disabled:opacity-30 hover:text-white">Próxima →</button>
          </div>
        </>
      )}

      {detail && <PlatformLogDetailModal token={token} logType={detail.logType} logId={detail.id} onClose={() => setDetail(null)} onResolved={() => refetch()} />}
    </div>
  );
}

// ===== SUPER ADMIN DASHBOARD VIEW (cards + gráficos + modais) =====
const PERIOD_OPTIONS = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "6m", label: "6 meses" },
  { value: "year", label: "Ano atual" },
] as const;
type PeriodValue = typeof PERIOD_OPTIONS[number]["value"];

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const bom = "\uFEFF";
  const csv = bom + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function SuperAdminDashboardView({ token }: { token: string }) {
  const [chartPeriod, setChartPeriod] = useState<PeriodValue>("6m");
  const [filterTenant, setFilterTenant] = useState<number | null>(null);
  const { data: stats, isLoading, isFetching } = trpc.superAdmin.dashboardStats.useQuery({ token, period: chartPeriod, tenantId: filterTenant || undefined });
  const isRefetching = isFetching && !isLoading;
  const [detailModal, setDetailModal] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [storeSearch, setStoreSearch] = useState("");
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const storeDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target as Node)) {
        setStoreDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const formatCurrency = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const handleExportCSV = () => {
    if (!stats || exporting) return;
    setExporting(true);
    try {
      // Faturamento data
      const finMonthsExport = Array.from(new Set((stats.finByMonth || []).map((r: any) => r.month))).sort() as string[];
      const finPago = finMonthsExport.map(m => (stats.finByMonth || []).filter((r: any) => r.month === m).reduce((s: number, r: any) => s + Number(r.pago), 0));
      const finAberto = finMonthsExport.map(m => (stats.finByMonth || []).filter((r: any) => r.month === m).reduce((s: number, r: any) => s + Number(r.aberto), 0));
      // Vendas data
      const salesMonthsExport = Array.from(new Set((stats.salesByMonth || []).map((r: any) => r.month))).sort() as string[];
      const salesTotal = salesMonthsExport.map(m => (stats.salesByMonth || []).filter((r: any) => r.month === m).reduce((s: number, r: any) => s + Number(r.total), 0));
      // Mensagens data
      const msgMonthsExport = (stats.messagesByMonth || []).map((r: any) => r.month).sort() as string[];
      const msgTotals = msgMonthsExport.map((m: string) => Number((stats.messagesByMonth || []).find((r: any) => r.month === m)?.total || 0));

      // Build unified rows
      const allPeriods = Array.from(new Set([...finMonthsExport, ...salesMonthsExport, ...msgMonthsExport])).sort();
      const headers = ["Per\u00edodo", "Faturamento Pago (R$)", "Faturamento Aberto (R$)", "Vendas", "Mensagens WhatsApp"];
      const rows = allPeriods.map(p => [
        p,
        (finPago[finMonthsExport.indexOf(p)] || 0).toFixed(2).replace(".", ","),
        (finAberto[finMonthsExport.indexOf(p)] || 0).toFixed(2).replace(".", ","),
        String(salesTotal[salesMonthsExport.indexOf(p)] || 0),
        String(msgTotals[msgMonthsExport.indexOf(p)] || 0),
      ]);

      downloadCSV(`dashboard_${chartPeriod}_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
      const periodLabel = PERIOD_OPTIONS.find(o => o.value === chartPeriod)?.label || chartPeriod;
      toast.success(`CSV exportado com sucesso (${periodLabel})`, { description: `${allPeriods.length} períodos exportados` });
    } catch (err) {
      toast.error("Erro ao exportar CSV");
    } finally {
      setTimeout(() => setExporting(false), 1000);
    }
  };

  if (isLoading) return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 animate-pulse h-28" />
        ))}
      </div>
    </div>
  );

  const cards = [
    { key: "lojas", label: "Lojas Total", value: stats?.totalTenants || 0, icon: Building2, color: "blue", desc: "Total de lojas cadastradas na plataforma" },
    { key: "ativas", label: "Clientes Ativos", value: stats?.activeTenants || 0, icon: CheckCircle2, color: "emerald", desc: "Lojas com status ativo ou trial" },
    { key: "vendedores", label: "Vendedores", value: stats?.totalSellers || 0, icon: Users, color: "amber", desc: "Total de vendedores ativos em todas as lojas" },
    { key: "veiculos", label: "Veículos em Estoque", value: stats?.totalVehicles || 0, icon: Car, color: "purple", desc: "Total de veículos cadastrados no estoque" },
    { key: "leads", label: "Leads CRM", value: stats?.totalLeads || 0, icon: MessageSquare, color: "cyan", desc: "Total de leads no CRM de todas as lojas" },
    { key: "faturamento", label: "Faturamento Total", value: formatCurrency(stats?.faturamentoTotal || 0), icon: DollarSign, color: "green", desc: "Total faturado (contas pagas) de todas as lojas" },
    { key: "aberto", label: "Faturamento em Aberto", value: formatCurrency(stats?.faturamentoAberto || 0), icon: Wallet, color: "red", desc: "Total de contas pendentes e atrasadas" },
    { key: "pagamentos", label: "Pagamentos Plataforma", value: stats?.platformPaymentsTotal || 0, icon: CreditCard, color: "indigo", desc: "Total de cobranças de assinatura geradas" },
    { key: "mensagens", label: "Mensagens WhatsApp", value: (stats?.totalMessages || 0).toLocaleString(), icon: MessageSquare, color: "teal", desc: "Total de mensagens trocadas via WhatsApp" },
    { key: "competicoes", label: "Competições Ativas", value: stats?.activeCompetitions || 0, icon: Trophy, color: "orange", desc: "Competições de vendas em andamento" },
    { key: "pgto_pendente", label: "Assinaturas Pendentes", value: stats?.platformPaymentsPendentes || 0, icon: Clock, color: "yellow", desc: "Cobranças de assinatura pendentes de pagamento" },
    { key: "pgto_atrasado", label: "Assinaturas Atrasadas", value: stats?.platformPaymentsAtrasados || 0, icon: AlertTriangle, color: "red", desc: "Cobranças de assinatura em atraso" },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
    amber: "bg-amber-500/10 text-amber-400",
    purple: "bg-purple-500/10 text-purple-400",
    cyan: "bg-cyan-500/10 text-cyan-400",
    green: "bg-green-500/10 text-green-400",
    red: "bg-red-500/10 text-red-400",
    indigo: "bg-indigo-500/10 text-indigo-400",
    teal: "bg-teal-500/10 text-teal-400",
    orange: "bg-orange-500/10 text-orange-400",
    yellow: "bg-yellow-500/10 text-yellow-400",
  };

  // Aggregate finByMonth for chart
  const finMonths = Array.from(new Set((stats?.finByMonth || []).map((r: any) => r.month))).sort();
  const finPagoByMonth = finMonths.map(m => (stats?.finByMonth || []).filter((r: any) => r.month === m).reduce((s: number, r: any) => s + Number(r.pago), 0));
  const finAbertoByMonth = finMonths.map(m => (stats?.finByMonth || []).filter((r: any) => r.month === m).reduce((s: number, r: any) => s + Number(r.aberto), 0));

  // Aggregate salesByMonth for chart
  const salesMonths = Array.from(new Set((stats?.salesByMonth || []).map((r: any) => r.month))).sort();
  const salesTotalByMonth = salesMonths.map(m => (stats?.salesByMonth || []).filter((r: any) => r.month === m).reduce((s: number, r: any) => s + Number(r.total), 0));

  // Tenant list for filter
  const tenantList = (stats?.tenantDetails || []) as { id: number; name: string }[];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Store Filter */}
      <div className="flex items-center gap-3">
        <Store className="w-4 h-4 text-gray-400" />
        <div className="relative" ref={storeDropdownRef}>
          <button
            onClick={() => { setStoreDropdownOpen(!storeDropdownOpen); setStoreSearch(""); }}
            className="bg-gray-900/80 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors min-w-[240px] flex items-center justify-between gap-2"
          >
            <span className="truncate">
              {filterTenant ? tenantList.find(t => t.id === filterTenant)?.name || "Loja" : "Todas as lojas"}
            </span>
            <Search className="w-3.5 h-3.5 text-gray-500" />
          </button>
          {storeDropdownOpen && (
            <div className="absolute z-50 top-full left-0 mt-1 w-[280px] bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
              <div className="p-2 border-b border-gray-800">
                <input
                  type="text"
                  autoFocus
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  placeholder="Buscar loja..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                />
              </div>
              <div className="max-h-[240px] overflow-y-auto">
                <button
                  onClick={() => { setFilterTenant(null); setStoreDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-800 transition-colors ${
                    !filterTenant ? "text-red-400 font-medium" : "text-gray-300"
                  }`}
                >
                  Todas as lojas
                </button>
                {tenantList
                  .filter(t => t.name.toLowerCase().includes(storeSearch.toLowerCase()))
                  .map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setFilterTenant(t.id); setStoreDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-800 transition-colors ${
                        filterTenant === t.id ? "text-red-400 font-medium" : "text-gray-300"
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                {tenantList.filter(t => t.name.toLowerCase().includes(storeSearch.toLowerCase())).length === 0 && (
                  <p className="px-3 py-2 text-sm text-gray-500">Nenhuma loja encontrada</p>
                )}
              </div>
            </div>
          )}
        </div>
        {filterTenant && (
          <button
            onClick={() => setFilterTenant(null)}
            className="text-xs text-gray-400 hover:text-white bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 transition-colors"
          >
            Limpar filtro
          </button>
        )}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {isRefetching ? (
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-800 rounded w-16" />
                  <div className="h-3 bg-gray-800/60 rounded w-24" />
                </div>
              </div>
            </div>
          ))
        ) : (
          cards.map(card => {
            const Icon = card.icon;
            return (
              <button
                key={card.key}
                onClick={() => setDetailModal(card.key)}
                className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 text-left hover:border-gray-600 hover:bg-gray-800/60 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[card.color] || colorMap.blue}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xl font-bold text-white truncate">{card.value}</div>
                    <div className="text-xs text-gray-400">{card.label}</div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-gray-300 transition-colors" />
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Period Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-gray-400" /> Gráficos de Evolução
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={exporting || !stats}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              exporting
                ? "border-green-700 text-green-400 bg-green-900/20 cursor-not-allowed"
                : "text-gray-400 hover:text-white hover:bg-gray-800 border-gray-700"
            }`}
            title="Exportar dados dos gráficos em CSV"
          >
            {exporting ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Exportando...</>
            ) : (
              <><Download className="w-3.5 h-3.5" /> Exportar CSV</>
            )}
          </button>
        <div className="flex items-center gap-1 bg-gray-900/60 border border-gray-800 rounded-lg p-1">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setChartPeriod(opt.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                chartPeriod === opt.value
                  ? "bg-red-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isRefetching && (
          <>
            <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-40 mb-4" />
              <div className="h-[220px] bg-gray-800/40 rounded-lg" />
            </div>
            <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-40 mb-4" />
              <div className="h-[220px] bg-gray-800/40 rounded-lg" />
            </div>
            <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 animate-pulse md:col-span-2">
              <div className="h-4 bg-gray-800 rounded w-40 mb-4" />
              <div className="h-[220px] bg-gray-800/40 rounded-lg" />
            </div>
          </>
        )}
        {!isRefetching && (<>
        {/* Faturamento Chart - Line */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-green-400" /> Evolução do Faturamento
          </h3>
          {finMonths.length === 0 ? (
            <p className="text-gray-500 text-sm">Sem dados financeiros</p>
          ) : (
            <div style={{ height: "220px" }}>
              <Line
                data={{
                  labels: finMonths.map((m: string) => {
                    const parts = m.split("-");
                    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
                    return `${parts[1]}/${parts[0].slice(2)}`;
                  }),
                  datasets: [
                    {
                      label: "Pago",
                      data: finPagoByMonth,
                      borderColor: "#22c55e",
                      backgroundColor: "rgba(34, 197, 94, 0.1)",
                      fill: true,
                      tension: 0.4,
                      pointRadius: 4,
                      pointBackgroundColor: "#22c55e",
                    },
                    {
                      label: "Em Aberto",
                      data: finAbertoByMonth,
                      borderColor: "#ef4444",
                      backgroundColor: "rgba(239, 68, 68, 0.1)",
                      fill: true,
                      tension: 0.4,
                      pointRadius: 4,
                      pointBackgroundColor: "#ef4444",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "bottom", labels: { color: "#9ca3af", boxWidth: 12, padding: 16, font: { size: 11 } } },
                    tooltip: {
                      callbacks: {
                        label: (ctx: any) => `${ctx.dataset.label}: R$ ${Number(ctx.raw).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                      },
                    },
                  },
                  scales: {
                    x: { ticks: { color: "#6b7280", font: { size: 10 } }, grid: { color: "rgba(75,85,99,0.3)" } },
                    y: { ticks: { color: "#6b7280", font: { size: 10 }, callback: (v: any) => `R$ ${(Number(v) / 1000).toFixed(0)}k` }, grid: { color: "rgba(75,85,99,0.3)" } },
                  },
                }}
              />
            </div>
          )}
        </div>

        {/* Mensagens Chart - Line */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-teal-400" /> Evolução de Mensagens WhatsApp
          </h3>
          {(() => {
            const msgMonths = (stats?.messagesByMonth || []).map((r: any) => r.month).sort();
            const msgTotals = msgMonths.map((m: string) => Number((stats?.messagesByMonth || []).find((r: any) => r.month === m)?.total || 0));
            if (msgMonths.length === 0) return <p className="text-gray-500 text-sm">Sem dados de mensagens</p>;
            return (
              <div style={{ height: "220px" }}>
                <Line
                  data={{
                    labels: msgMonths.map((m: string) => {
                      const parts = m.split("-");
                      if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
                      return `${parts[1]}/${parts[0].slice(2)}`;
                    }),
                    datasets: [{
                      label: "Mensagens",
                      data: msgTotals,
                      borderColor: "#14b8a6",
                      backgroundColor: "rgba(20, 184, 166, 0.1)",
                      fill: true,
                      tension: 0.4,
                      pointRadius: 4,
                      pointBackgroundColor: "#14b8a6",
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: "bottom", labels: { color: "#9ca3af", boxWidth: 12, padding: 16, font: { size: 11 } } },
                      tooltip: { callbacks: { label: (ctx: any) => `${Number(ctx.raw).toLocaleString()} mensagens` } },
                    },
                    scales: {
                      x: { ticks: { color: "#6b7280", font: { size: 10 } }, grid: { color: "rgba(75,85,99,0.3)" } },
                      y: { ticks: { color: "#6b7280", font: { size: 10 } }, grid: { color: "rgba(75,85,99,0.3)" }, beginAtZero: true },
                    },
                  }}
                />
              </div>
            );
          })()}
        </div>

        {/* Vendas Chart - Bar */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" /> Vendas Aprovadas
          </h3>
          {salesMonths.length === 0 ? (
            <p className="text-gray-500 text-sm">Sem dados de vendas</p>
          ) : (
            <div style={{ height: "220px" }}>
              <Bar
                data={{
                  labels: salesMonths.map((m: string) => {
                    const parts = m.split("-");
                    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
                    return `${parts[1]}/${parts[0].slice(2)}`;
                  }),
                  datasets: [{
                    label: "Vendas",
                    data: salesTotalByMonth,
                    backgroundColor: "rgba(59, 130, 246, 0.7)",
                    borderColor: "#3b82f6",
                    borderWidth: 1,
                    borderRadius: 4,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx: any) => `${Number(ctx.raw)} vendas` } },
                  },
                  scales: {
                    x: { ticks: { color: "#6b7280", font: { size: 10 } }, grid: { display: false } },
                    y: { ticks: { color: "#6b7280", font: { size: 10 }, stepSize: 1 }, grid: { color: "rgba(75,85,99,0.3)" }, beginAtZero: true },
                  },
                }}
              />
            </div>
          )}
        </div>

        {/* Plan Distribution (Pizza) */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-purple-400" /> Distribuição de Planos
          </h3>
          <div className="flex items-center gap-6">
            <div className="relative w-28 h-28">
              {(() => {
                const plans = stats?.planDistribution || {};
                const total = Object.values(plans).reduce((a: number, b: any) => a + Number(b), 0) || 1;
                const colors = { trial: "#f59e0b", basic: "#3b82f6", pro: "#8b5cf6", enterprise: "#ef4444" };
                let cumulative = 0;
                const segments = Object.entries(plans).map(([plan, count]: [string, any]) => {
                  const pct = (Number(count) / total) * 100;
                  const start = cumulative;
                  cumulative += pct;
                  return { plan, pct, start, color: (colors as any)[plan] || "#6b7280" };
                });
                const gradientParts = segments.map(s => `${s.color} ${s.start}% ${s.start + s.pct}%`).join(", ");
                return <div className="w-28 h-28 rounded-full" style={{ background: `conic-gradient(${gradientParts})` }} />;
              })()}
            </div>
            <div className="space-y-2">
              {Object.entries(stats?.planDistribution || {}).map(([plan, count]: [string, any]) => {
                const colors: Record<string, string> = { trial: "bg-amber-500", basic: "bg-blue-500", pro: "bg-purple-500", enterprise: "bg-red-500" };
                return (
                  <div key={plan} className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${colors[plan] || "bg-gray-500"}`} />
                    <span className="text-xs text-gray-300 capitalize">{plan}</span>
                    <span className="text-xs text-gray-500">({count})</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" /> Status das Lojas
          </h3>
          <div className="space-y-3">
            {Object.entries(stats?.statusDistribution || {}).map(([status, count]: [string, any]) => {
              const total = (stats?.totalTenants || 1);
              const pct = (Number(count) / total) * 100;
              const colors: Record<string, string> = { active: "bg-emerald-500", trial: "bg-amber-500", suspended: "bg-red-500", cancelled: "bg-gray-500" };
              const labels: Record<string, string> = { active: "Ativa", trial: "Trial", suspended: "Suspensa", cancelled: "Cancelada" };
              return (
                <div key={status}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300">{labels[status] || status}</span>
                    <span className="text-gray-400">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${colors[status] || "bg-gray-600"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </>)}
      </div>

      {/* Detail Modal */}
      {detailModal && (
        <DashboardDetailModal
          cardKey={detailModal}
          stats={stats}
          filterTenant={filterTenant}
          setFilterTenant={setFilterTenant}
          onClose={() => { setDetailModal(null); setFilterTenant(null); }}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
}

// ===== DASHBOARD DETAIL MODAL =====
function DashboardDetailModal({ cardKey, stats, filterTenant, setFilterTenant, onClose, formatCurrency }: {
  cardKey: string; stats: any; filterTenant: number | null; setFilterTenant: (v: number | null) => void; onClose: () => void; formatCurrency: (v: number) => string;
}) {
  const tenantDetails = stats?.tenantDetails || [];
  const filtered = filterTenant ? tenantDetails.filter((t: any) => t.id === filterTenant) : tenantDetails;

  const getTitle = () => {
    const titles: Record<string, string> = {
      lojas: "Lojas Cadastradas", ativas: "Clientes Ativos", vendedores: "Vendedores por Loja",
      veiculos: "Veículos em Estoque", leads: "Leads por Loja", faturamento: "Faturamento Total",
      aberto: "Faturamento em Aberto", pagamentos: "Pagamentos da Plataforma", mensagens: "Mensagens WhatsApp",
      competicoes: "Competições Ativas", pgto_pendente: "Assinaturas Pendentes", pgto_atrasado: "Assinaturas Atrasadas",
    };
    return titles[cardKey] || "Detalhes";
  };

  const getDescription = () => {
    const descs: Record<string, string> = {
      lojas: "Lista de todas as lojas cadastradas na plataforma com seus planos e status.",
      ativas: "Lojas com status ativo ou em período trial que estão operando normalmente.",
      vendedores: "Distribuição de vendedores ativos por loja.",
      veiculos: "Total de veículos cadastrados no estoque, distribuídos por loja.",
      leads: "Total de leads no CRM, distribuídos por loja.",
      faturamento: "Soma de todas as transações financeiras com status 'pago' de todas as lojas.",
      aberto: "Soma de todas as transações financeiras pendentes ou atrasadas.",
      pagamentos: "Cobranças de assinatura da plataforma (via ASAAS).",
      mensagens: "Total de mensagens trocadas via WhatsApp (Z-API) em todas as lojas.",
      competicoes: "Competições de vendas atualmente em andamento.",
      pgto_pendente: "Cobranças de assinatura que ainda não foram pagas.",
      pgto_atrasado: "Cobranças de assinatura com data de vencimento ultrapassada.",
    };
    return descs[cardKey] || "";
  };

  const renderContent = () => {
    switch (cardKey) {
      case "lojas":
      case "ativas":
        const tenantList = cardKey === "ativas"
          ? filtered.filter((t: any) => t.status === "active" || t.status === "trial")
          : filtered;
        return (
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 text-xs border-b border-gray-800">
              <th className="text-left py-2">Loja</th><th className="text-left py-2">Plano</th><th className="text-left py-2">Status</th><th className="text-right py-2">Vendedores</th><th className="text-right py-2">Veículos</th><th className="text-right py-2">Leads</th>
            </tr></thead>
            <tbody>{tenantList.map((t: any) => (
              <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 text-white font-medium">{t.name}</td>
                <td className="py-2"><span className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-300 uppercase">{t.plan}</span></td>
                <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs ${t.status === "active" || t.status === "trial" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>{t.status}</span></td>
                <td className="py-2 text-right text-gray-300">{t.sellers}</td>
                <td className="py-2 text-right text-gray-300">{t.vehicles}</td>
                <td className="py-2 text-right text-gray-300">{t.leads}</td>
              </tr>
            ))}</tbody>
          </table>
        );
      case "vendedores":
        return (
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 text-xs border-b border-gray-800">
              <th className="text-left py-2">Loja</th><th className="text-right py-2">Vendedores Ativos</th>
            </tr></thead>
            <tbody>{filtered.map((t: any) => (
              <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 text-white">{t.name}</td>
                <td className="py-2 text-right text-gray-300 font-semibold">{t.sellers}</td>
              </tr>
            ))}</tbody>
          </table>
        );
      case "veiculos":
        return (
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 text-xs border-b border-gray-800">
              <th className="text-left py-2">Loja</th><th className="text-right py-2">Veículos</th>
            </tr></thead>
            <tbody>{filtered.map((t: any) => (
              <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 text-white">{t.name}</td>
                <td className="py-2 text-right text-gray-300 font-semibold">{t.vehicles}</td>
              </tr>
            ))}</tbody>
          </table>
        );
      case "leads":
        return (
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 text-xs border-b border-gray-800">
              <th className="text-left py-2">Loja</th><th className="text-right py-2">Leads</th>
            </tr></thead>
            <tbody>{filtered.map((t: any) => (
              <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 text-white">{t.name}</td>
                <td className="py-2 text-right text-gray-300 font-semibold">{t.leads}</td>
              </tr>
            ))}</tbody>
          </table>
        );
      case "faturamento":
      case "aberto":
        const finTenants = filtered.map((t: any) => {
          const tenantFin = (stats?.finByMonth || []).filter((r: any) => r.tenantId === t.id);
          const pago = tenantFin.reduce((s: number, r: any) => s + Number(r.pago), 0);
          const aberto = tenantFin.reduce((s: number, r: any) => s + Number(r.aberto), 0);
          return { ...t, pago, aberto };
        }).filter((t: any) => cardKey === "faturamento" ? t.pago > 0 : t.aberto > 0)
          .sort((a: any, b: any) => cardKey === "faturamento" ? b.pago - a.pago : b.aberto - a.aberto);
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-green-400">{formatCurrency(stats?.faturamentoTotal || 0)}</div>
                <div className="text-xs text-gray-400">Total Pago</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-yellow-400">{stats?.pagamentosPendentes || 0}</div>
                <div className="text-xs text-gray-400">Pendentes</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-red-400">{formatCurrency(stats?.faturamentoAberto || 0)}</div>
                <div className="text-xs text-gray-400">Em Aberto</div>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-gray-400 text-xs border-b border-gray-800">
                <th className="text-left py-2">Loja</th><th className="text-left py-2">Plano</th><th className="text-right py-2">Faturado</th><th className="text-right py-2">Em Aberto</th>
              </tr></thead>
              <tbody>{finTenants.length === 0 ? (
                <tr><td colSpan={4} className="py-4 text-center text-gray-500 text-xs">Nenhuma transação financeira encontrada.</td></tr>
              ) : finTenants.map((t: any) => (
                <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 text-white font-medium">{t.name}</td>
                  <td className="py-2"><span className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-300 uppercase">{t.plan}</span></td>
                  <td className="py-2 text-right text-green-400 font-medium">{formatCurrency(t.pago)}</td>
                  <td className="py-2 text-right text-red-400 font-medium">{t.aberto > 0 ? formatCurrency(t.aberto) : "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        );
      case "pagamentos":
      case "pgto_pendente":
      case "pgto_atrasado":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-white">{stats?.platformPaymentsTotal || 0}</div>
                <div className="text-xs text-gray-400">Total</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-green-400">{stats?.platformPaymentsConfirmados || 0}</div>
                <div className="text-xs text-gray-400">Confirmados</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-yellow-400">{stats?.platformPaymentsPendentes || 0}</div>
                <div className="text-xs text-gray-400">Pendentes</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-red-400">{stats?.platformPaymentsAtrasados || 0}</div>
                <div className="text-xs text-gray-400">Atrasados</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <div className="text-sm text-green-400 font-semibold">{formatCurrency(stats?.platformValorRecebido || 0)}</div>
                <div className="text-xs text-gray-400">Valor Recebido</div>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <div className="text-sm text-red-400 font-semibold">{formatCurrency(stats?.platformValorPendente || 0)}</div>
                <div className="text-xs text-gray-400">Valor Pendente</div>
              </div>
            </div>
          </div>
        );
      case "mensagens":
        const msgTenants = filtered.map((t: any) => {
          const msgs = (stats?.messagesByTenant || []).find((m: any) => m.tenantId === t.id);
          return { ...t, messages: msgs ? Number(msgs.total) : 0 };
        }).filter((t: any) => t.messages > 0).sort((a: any, b: any) => b.messages - a.messages);
        return (
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 text-xs border-b border-gray-800">
              <th className="text-left py-2">Loja</th><th className="text-left py-2">Plano</th><th className="text-right py-2">Mensagens</th>
            </tr></thead>
            <tbody>{msgTenants.length === 0 ? (
              <tr><td colSpan={3} className="py-4 text-center text-gray-500 text-xs">Nenhuma mensagem registrada.</td></tr>
            ) : msgTenants.map((t: any) => (
              <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 text-white font-medium">{t.name}</td>
                <td className="py-2"><span className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-300 uppercase">{t.plan}</span></td>
                <td className="py-2 text-right text-teal-400 font-semibold">{t.messages.toLocaleString()}</td>
              </tr>
            ))}</tbody>
          </table>
        );
      case "competicoes":
        const compTenants = filtered.map((t: any) => {
          const comps = (stats?.competitionsByTenant || []).find((c: any) => c.tenantId === t.id);
          return { ...t, competitions: comps ? Number(comps.total) : 0 };
        }).filter((t: any) => t.competitions > 0).sort((a: any, b: any) => b.competitions - a.competitions);
        return (
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 text-xs border-b border-gray-800">
              <th className="text-left py-2">Loja</th><th className="text-left py-2">Plano</th><th className="text-right py-2">Competições Ativas</th>
            </tr></thead>
            <tbody>{compTenants.length === 0 ? (
              <tr><td colSpan={3} className="py-4 text-center text-gray-500 text-xs">Nenhuma competição ativa no momento.</td></tr>
            ) : compTenants.map((t: any) => (
              <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 text-white font-medium">{t.name}</td>
                <td className="py-2"><span className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-300 uppercase">{t.plan}</span></td>
                <td className="py-2 text-right text-orange-400 font-semibold">{t.competitions}</td>
              </tr>
            ))}</tbody>
          </table>
        );
      default:
        return <p className="text-gray-400 text-sm">Dados detalhados não disponíveis para este card.</p>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{getTitle()}</h2>
            <p className="text-xs text-gray-400 mt-1">{getDescription()}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        {/* Filter */}
        <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-3">
          <span className="text-xs text-gray-400">Filtrar por loja:</span>
          <select
            value={filterTenant || ""}
            onChange={e => setFilterTenant(e.target.value ? Number(e.target.value) : null)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white"
          >
            <option value="">Todas as lojas</option>
            {tenantDetails.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {renderContent()}
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
  const [activeSection, setActiveSection] = useState<"dashboard" | "tenants" | "subscriptions">("dashboard");
  // Conta eventos raros de assinatura + alertas críticos de cobrança não
  // resolvidos — os dois viram o mesmo badge na aba "Logs" (tela unificada).
  const { data: rareEvents } = trpc.platformLogs.getRareEventsCount.useQuery({ token }, { refetchInterval: 60000 });

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
            <nav className="flex items-center gap-1 bg-gray-900/60 border border-gray-800 rounded-lg p-1 mr-2">
              <button
                onClick={() => setActiveSection("dashboard")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeSection === "dashboard" ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveSection("tenants")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeSection === "tenants" ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                Lojas
              </button>
              <button
                onClick={() => setActiveSection("subscriptions")}
                className={`relative px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeSection === "subscriptions" ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                Logs
                {!!rareEvents?.count && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-black text-[9px] font-bold flex items-center justify-center">
                    {rareEvents.count}
                  </span>
                )}
              </button>
            </nav>
            <span className="text-sm text-gray-400">{admin?.name}</span>
            <button onClick={onLogout} className="text-gray-400 hover:text-red-400 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {activeSection === "dashboard" ? (
        <SuperAdminDashboardView token={token} />
      ) : activeSection === "subscriptions" ? (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <PlatformLogsSection token={token} tenants={dashboard?.tenants || []} />
        </div>
      ) : (
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
      )}

      {/* Modals */}
      {showCreate && <CreateTenantModal token={token} onClose={() => setShowCreate(false)} onCreated={() => refetch()} />}
      {selectedTenant && <TenantDetailModal token={token} tenantId={selectedTenant} onClose={() => setSelectedTenant(null)} />}
    </div>
  );
}

// ===== MAIN EXPORT =====
export default function SuperAdmin() {
  const [, navigate] = useLocation();
  const { token, admin, logout, isLoggedIn } = useSuperAuth();

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [navigate, token]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Redirecionando para o login</h1>
          <p className="text-gray-400 mt-1">Use o mesmo login por e-mail para acessar o portal Super Admin.</p>
        </div>
      </div>
    );
  }

  return <SuperDashboard token={token!} admin={admin} onLogout={logout} />;
}


