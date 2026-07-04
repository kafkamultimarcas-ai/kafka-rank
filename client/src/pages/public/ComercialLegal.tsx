import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/contexts/TenantContext";
import { ArrowLeft } from "lucide-react";

// Conteúdo placeholder — precisa ser revisado por alguém com autoridade jurídica
// antes de qualquer cadastro real acontecer em produção. Não representa texto legal
// vinculante.

function TermosContent() {
  return (
    <>
      <p>
        Este é um texto provisório de Termos de Uso, usado apenas para viabilizar o fluxo de cadastro durante o
        desenvolvimento da plataforma. Ele precisa ser substituído por um texto revisado juridicamente antes de
        qualquer loja real se cadastrar em produção.
      </p>
      <p>
        Ao usar a plataforma, a loja concorda em fornecer informações verdadeiras no cadastro, manter a
        confidencialidade das credenciais de acesso e utilizar o sistema de acordo com a finalidade para a qual foi
        contratado.
      </p>
    </>
  );
}

function PrivacidadeContent() {
  return (
    <>
      <p>
        Este é um texto provisório de Política de Privacidade, usado apenas para viabilizar o fluxo de cadastro
        durante o desenvolvimento da plataforma. Ele precisa ser substituído por um texto revisado juridicamente
        (incluindo conformidade com a LGPD) antes de qualquer loja real se cadastrar em produção.
      </p>
      <p>
        Os dados fornecidos no cadastro (nome, telefone, e-mail, credenciais de acesso) são usados exclusivamente
        para operação da plataforma e não são compartilhados com terceiros sem consentimento.
      </p>
    </>
  );
}

export function ComercialTermos() {
  return <LegalPage title="Termos de Uso"><TermosContent /></LegalPage>;
}

export function ComercialPrivacidade() {
  return <LegalPage title="Política de Privacidade"><PrivacidadeContent /></LegalPage>;
}

function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const { name: brandName } = useBranding();

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/comercial/cadastro")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar ao cadastro
        </Button>
        <h1 className="font-heading text-2xl font-bold text-foreground mb-1">{title}</h1>
        <p className="text-xs text-muted-foreground mb-6">{brandName} — documento provisório</p>
        <div className="racing-card p-6 space-y-4 text-sm text-muted-foreground leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}
