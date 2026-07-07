import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useBranding } from "@/contexts/TenantContext";
import { buildTenantPath } from "@/lib/tenant";
import { slugify, formatPhone, normalizeUsername, isValidEmail, getAvailabilityMessage } from "@/lib/tenantForm";
import { ArrowLeft, Eye, EyeOff, CheckCircle2, XCircle, Loader2, Store, UserRound } from "lucide-react";

const ADMIN_TOKEN_KEY = "crm_admin_token";
const PLAN_LABELS: Record<string, string> = {
  trial: "Trial",
  basic: "Basic",
  pro: "Pro",
  enterprise: "Enterprise",
};

export default function ComercialCadastro() {
  const [, navigate] = useLocation();
  const { name: brandName, logoUrl } = useBranding();
  const selectedPlan = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("plan") || "trial"
    : "trial";
  const selectedPlanLabel = PLAN_LABELS[selectedPlan] || PLAN_LABELS.trial;

  const [form, setForm] = useState({
    name: "", slug: "", phone: "", email: "", city: "", state: "",
    adminName: "", adminUsername: "", adminPassword: "", adminPasswordConfirm: "",
    acceptedTerms: false,
    website: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const trimmedName = form.name.trim();
  const trimmedSlug = slugify(form.slug);
  const trimmedPhone = form.phone.trim();
  const trimmedEmail = form.email.trim();
  const trimmedAdminName = form.adminName.trim();
  const normalizedAdminUsername = normalizeUsername(form.adminUsername);
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
  const emailIsValid = isValidEmail(trimmedEmail);
  const adminNameIsValid = trimmedAdminName.length >= 2;
  const usernameIsValid = normalizedAdminUsername.length >= 3;
  const passwordIsValid = form.adminPassword.length >= 6;
  const passwordsMatch = form.adminPassword === form.adminPasswordConfirm;

  const availabilityQuery = trpc.publicSignup.checkAvailability.useQuery(
    {
      slug: debouncedSlug || undefined,
      adminUsername: debouncedAdminUsername || undefined,
    },
    { enabled: slugIsValid || usernameIsValid, retry: false }
  );

  const slugAvailability = availabilityQuery.data?.slug;
  const usernameAvailability = availabilityQuery.data?.adminUsername;
  const slugAvailable = !slugIsValid || debouncedSlug !== trimmedSlug ? true : slugAvailability?.available !== false;
  const adminUsernameAvailable = !usernameIsValid || debouncedAdminUsername !== normalizedAdminUsername ? true : usernameAvailability?.available !== false;

  const canSubmit =
    nameIsValid && slugIsValid && phoneIsValid && emailIsValid &&
    adminNameIsValid && usernameIsValid && passwordIsValid && passwordsMatch &&
    form.acceptedTerms && slugAvailable && adminUsernameAvailable;

  const createMut = trpc.publicSignup.create.useMutation({
    onSuccess: (data) => {
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      toast.success(`Loja "${trimmedName}" criada! Bem-vindo(a) ao ${brandName}.`);
      navigate(buildTenantPath(data.slug, data.redirectPath));
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!canSubmit || createMut.isPending) return;
    createMut.mutate({
      name: trimmedName,
      slug: trimmedSlug,
      phone: trimmedPhone || undefined,
      email: trimmedEmail,
      city: form.city.trim() || undefined,
      state: form.state.trim().toUpperCase() || undefined,
      adminName: trimmedAdminName,
      adminUsername: normalizedAdminUsername,
      adminPassword: form.adminPassword,
      acceptedTerms: true,
      honeypot: form.website || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-lg">
        <button onClick={() => navigate("/comercial")} className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="mb-8 text-center">
          <img src={logoUrl} alt={brandName} className="mx-auto mb-3 h-12 w-12 rounded-xl object-contain" />
          <h1 className="font-heading text-2xl font-bold text-foreground">Crie sua loja grátis</h1>
          <p className="mt-1 text-sm text-muted-foreground">Trial de 30 dias, sem cartão de crédito.</p>
          {selectedPlan !== "trial" && (
            <p className="mt-2 text-xs text-primary">
              Você começa no Trial grátis e depois pode assinar o plano {selectedPlanLabel} na tela de Assinatura.
            </p>
          )}
        </div>

        <div className="racing-card space-y-6 p-6">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Dados da loja</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] text-muted-foreground">Nome da loja *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Auto Veloz Motors" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-muted-foreground">Endereço da sua loja</label>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="shrink-0 text-muted-foreground">kafkarank.com/t/</span>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="minha-loja" className="h-9" />
                </div>
                {debouncedSlug === trimmedSlug && slugIsValid && slugAvailability && (
                  <p className={`mt-1 flex items-center gap-1 text-[10px] ${slugAvailability.available ? "text-green-500" : "text-destructive"}`}>
                    {slugAvailability.available ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {getAvailabilityMessage(trimmedSlug, slugAvailability.available, "slug")}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] text-muted-foreground">Telefone</label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="(11) 99999-9999" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-muted-foreground">E-mail *</label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" placeholder="voce@loja.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] text-muted-foreground">Cidade</label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-muted-foreground">Estado (UF)</label>
                  <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} maxLength={2} placeholder="SP" />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border" />

          <div>
            <div className="mb-3 flex items-center gap-2">
              <UserRound className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Seu acesso (administrador)</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] text-muted-foreground">Seu nome *</label>
                <Input value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-muted-foreground">Login *</label>
                <Input value={form.adminUsername} onChange={(e) => setForm({ ...form, adminUsername: e.target.value })} placeholder="seu.login" />
                {debouncedAdminUsername === normalizedAdminUsername && usernameIsValid && usernameAvailability && (
                  <p className={`mt-1 flex items-center gap-1 text-[10px] ${usernameAvailability.available ? "text-green-500" : "text-destructive"}`}>
                    {usernameAvailability.available ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {getAvailabilityMessage(normalizedAdminUsername, usernameAvailability.available, "username")}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-muted-foreground">Senha * (mínimo 6 caracteres)</label>
                <div className="relative">
                  <Input value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} type={showPassword ? "text" : "password"} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-muted-foreground">Confirmar senha *</label>
                <Input value={form.adminPasswordConfirm} onChange={(e) => setForm({ ...form, adminPasswordConfirm: e.target.value })} type={showPassword ? "text" : "password"} />
                {form.adminPasswordConfirm && !passwordsMatch && (
                  <p className="mt-1 text-[10px] text-destructive">As senhas não coincidem.</p>
                )}
              </div>
            </div>
          </div>

          <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
            <label htmlFor="website">Não preencha este campo</label>
            <input
              id="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>

          <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
            <Checkbox checked={form.acceptedTerms} onCheckedChange={(v) => setForm({ ...form, acceptedTerms: v === true })} className="mt-0.5" />
            <span>
              Li e aceito os <a href="/comercial/termos" target="_blank" className="text-primary underline">Termos de Uso</a> e a{" "}
              <a href="/comercial/privacidade" target="_blank" className="text-primary underline">Política de Privacidade</a>.
            </span>
          </label>

          <Button onClick={handleSubmit} disabled={!canSubmit || createMut.isPending} className="w-full racing-gradient text-white" size="lg">
            {createMut.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Criando sua loja...</> : "Criar minha loja"}
          </Button>
        </div>
      </div>
    </div>
  );
}
