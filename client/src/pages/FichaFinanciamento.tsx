import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { maskCpfCnpj, maskPhone } from "@/lib/masks";
import { isValidCpfCnpj, isValidBrazilianPhone, isValidEmail } from "@shared/validators";
import {
  ArrowLeft, Car, User, FileText, Phone, Mail, MapPin, Briefcase, Users,
  Camera, CheckCircle2, Loader2, CreditCard, Building2, Upload, ChevronDown, ChevronUp
} from "lucide-react";

const BANCOS = [
  "Santander", "Bradesco", "Itaú", "Pan", "C6", "Safra", "BBC", "Omni",
  "Daycoval", "BV", "Ailos", "Sicoob", "Listo", "Carbank", "Porto Seguro"
];

export default function FichaFinanciamento() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1); // 1=vendedor, 2=veículo, 3=dados pessoais, 4=complementar, 5=bancos+enviar
  const [submitted, setSubmitted] = useState(false);
  const [sellerId, setSellerId] = useState<number | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>("veiculo");

  // Dados do veículo
  const [veiculo, setVeiculo] = useState("");
  const [placa, setPlaca] = useState("");
  const [anoModelo, setAnoModelo] = useState("");
  const [valorFinanciado, setValorFinanciado] = useState("");

  // Dados pessoais
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [estadoCivil, setEstadoCivil] = useState("");
  const [nomeMae, setNomeMae] = useState("");
  const [nomePai, setNomePai] = useState("");
  const [cidadeNasceu, setCidadeNasceu] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [profissao, setProfissao] = useState("");
  const [renda, setRenda] = useState("");
  const [localTrabalho, setLocalTrabalho] = useState("");
  const [referenciaNome, setReferenciaNome] = useState("");
  const [referenciaTelefone, setReferenciaTelefone] = useState("");

  // CNH
  const [cnhPreview, setCnhPreview] = useState<string | null>(null);
  const [cnhFile, setCnhFile] = useState<{ base64: string; filename: string; mimeType: string } | null>(null);
  const cnhInputRef = useRef<HTMLInputElement>(null);

  // Observações e bancos tentados
  const [observacoes, setObservacoes] = useState("");
  const [bancosTentados, setBancosTentados] = useState<string[]>([]);

  const { data: sellersList } = trpc.sellers.list.useQuery();
  const { data: sellerSession } = trpc.sellers.me.useQuery();
  const createFicha = trpc.fichas.create.useMutation();
  const uploadCnh = trpc.fichas.uploadCnh.useMutation();

  // Vendedor comum: identidade vem da sessão, não de um dropdown (o backend já
  // rejeita sellerId diferente do da sessão pra esse tipo de login). Gerente
  // continua podendo escolher em nome de quem está lançando.
  const isLockedToSession = !!sellerSession && sellerSession.sellerRole !== "gerente";
  useEffect(() => {
    if (isLockedToSession && sellerSession) {
      setSellerId(sellerSession.id);
    }
  }, [isLockedToSession, sellerSession]);

  // Auto-lookup placa no estoque
  const cleanPlate = placa.replace(/[^A-Za-z0-9]/g, '');
  const { data: plateData } = trpc.fei.lookupPlate.useQuery(
    { plate: cleanPlate },
    { enabled: cleanPlate.length >= 7 }
  );

  // Auto-fill vehicle data when plate is found
  const [plateAutoFilled, setPlateAutoFilled] = useState(false);
  useEffect(() => {
    if (plateData?.found && !plateAutoFilled) {
      const autoVeiculo = [plateData.brand, plateData.model, plateData.version].filter(Boolean).join(' ');
      if (autoVeiculo) setVeiculo(autoVeiculo);
      if (plateData.year) setAnoModelo(String(plateData.year));
      setPlateAutoFilled(true);
    }
  }, [plateData, plateAutoFilled]);

  // Auto-lookup CEP via ViaCEP
  const cleanCep = cep.replace(/\D/g, '');
  const { data: cepData } = trpc.fei.lookupCep.useQuery(
    { cep: cleanCep },
    { enabled: cleanCep.length === 8 }
  );
  const [cepAutoFilled, setCepAutoFilled] = useState(false);
  useEffect(() => {
    if (cepData?.found && !cepAutoFilled) {
      const autoEndereco = [cepData.logradouro, cepData.bairro, cepData.localidade, cepData.uf].filter(Boolean).join(', ');
      if (autoEndereco) setEndereco(autoEndereco);
      setCepAutoFilled(true);
    }
  }, [cepData, cepAutoFilled]);

  const vendedores = (sellersList || []).filter((s: any) => s.department === "vendas" && s.active);

  const handleCnhUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 7 * 1024 * 1024) { toast.error("Arquivo muito grande (máx 7MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCnhPreview(result);
      const base64 = result.split(",")[1];
      setCnhFile({ base64, filename: file.name, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!sellerId) { toast.error("Selecione o vendedor!"); return; }
    if (!nomeCompleto) { toast.error("Informe o nome do cliente!"); return; }
    if (!cpf) { toast.error("Informe o CPF!"); return; }
    if (!isValidCpfCnpj(cpf)) { toast.error("CPF inválido!"); return; }
    if (email && !isValidEmail(email)) { toast.error("E-mail inválido!"); return; }
    if (telefone && !isValidBrazilianPhone(telefone)) { toast.error("Telefone inválido!"); return; }
    if (referenciaTelefone && !isValidBrazilianPhone(referenciaTelefone)) { toast.error("Telefone da referência inválido!"); return; }

    try {
      const result = await createFicha.mutateAsync({
        sellerId,
        veiculo: veiculo || undefined,
        placa: placa || undefined,
        anoModelo: anoModelo || undefined,
        valorFinanciado: valorFinanciado ? Math.round(parseFloat(valorFinanciado.replace(/\D/g, "")) || 0) : undefined,
        nomeCompleto,
        cpf,
        rg: rg || undefined,
        dataNascimento: dataNascimento || undefined,
        estadoCivil: estadoCivil || undefined,
        nomeMae: nomeMae || undefined,
        nomePai: nomePai || undefined,
        cidadeNasceu: cidadeNasceu || undefined,
        email: email || undefined,
        telefone: telefone || undefined,
        cep: cep || undefined,
        endereco: endereco || undefined,
        profissao: profissao || undefined,
        renda: renda || undefined,
        localTrabalho: localTrabalho || undefined,
        referenciaNome: referenciaNome || undefined,
        referenciaTelefone: referenciaTelefone || undefined,
        observacoesVendedor: observacoes || undefined,
        bancosTentados: bancosTentados.length > 0 ? bancosTentados : undefined,
      });

      // Upload CNH se tiver
      if (cnhFile) {
        await uploadCnh.mutateAsync({
          fichaId: result.id,
          base64: cnhFile.base64,
          filename: cnhFile.filename,
          mimeType: cnhFile.mimeType,
        });
      }

      toast.success(result.message);
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar ficha");
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Ficha Enviada!</h1>
          <p className="text-gray-400">A ficha foi enviada para a mesa de crédito. O F&I irá analisar e retornar o mais breve possível.</p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => { setSubmitted(false); setStep(1); setSellerId(null); setNomeCompleto(""); setCpf(""); }} className="bg-blue-600 hover:bg-blue-700">
              <CreditCard className="w-4 h-4 mr-2" /> ENVIAR OUTRA FICHA
            </Button>
            <Link href="/">
              <Button variant="outline" className="w-full border-gray-700 text-gray-300 hover:bg-gray-800">
                <ArrowLeft className="w-4 h-4 mr-2" /> VOLTAR
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const Section = ({ id, title, icon: Icon, children }: { id: string; title: string; icon: any; children: React.ReactNode }) => {
    const isOpen = expandedSection === id;
    return (
      <div className="border border-gray-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setExpandedSection(isOpen ? null : id)}
          className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-white text-sm">{title}</span>
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {isOpen && <div className="p-4 space-y-3 bg-gray-900/30">{children}</div>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4">
      <div className="w-full max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/">
            <button className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-300" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white font-racing tracking-wider flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-blue-400" />
              FICHA DE FINANCIAMENTO
            </h1>
            <p className="text-xs text-gray-400">Preencha os dados para enviar à mesa de crédito</p>
          </div>
        </div>

        {/* Selecionar vendedor */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 space-y-3">
          <Label className="text-gray-300 font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-red-400" />
            Quem é você? *
          </Label>
          {isLockedToSession ? (
            <div className="flex items-center gap-2 bg-gray-800/50 border border-gray-700 rounded-lg p-3">
              <User className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-white text-sm">Registrando como: <strong>{sellerSession?.name}</strong></span>
            </div>
          ) : (
            <select
              value={sellerId || ""}
              onChange={e => setSellerId(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 text-sm"
            >
              <option value="">Selecione seu nome...</option>
              {vendedores.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Seções do formulário */}
        <Section id="veiculo" title="DADOS DO VEÍCULO" icon={Car}>
          <div className="space-y-2">
            <Label className="text-gray-300 text-sm font-semibold">Veículo {plateData?.found && <span className="text-emerald-400 text-xs">(preenchido automaticamente)</span>}</Label>
            <Input value={veiculo} onChange={e => setVeiculo(e.target.value)}
              placeholder="Ex: Honda Civic 2024 - digite a placa para preencher automaticamente" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-semibold">Placa</Label>
              <Input value={placa} onChange={e => { setPlaca(e.target.value.toUpperCase()); setPlateAutoFilled(false); }}
                placeholder="ABC1D23" maxLength={7} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
              {plateData?.found && (
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Veículo encontrado no estoque!
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-semibold">Ano/Modelo</Label>
              <Input value={anoModelo} onChange={e => setAnoModelo(e.target.value)}
                placeholder="2024/2025" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300 text-sm font-semibold">Valor Financiado (R$)</Label>
            <MoneyInput value={valorFinanciado} onChange={setValorFinanciado} placeholder="85.000,00" />
          </div>
        </Section>

        <Section id="pessoal" title="DADOS PESSOAIS DO CLIENTE" icon={User}>
          <div className="space-y-2">
            <Label className="text-gray-300 text-sm font-semibold">Nome Completo *</Label>
            <Input value={nomeCompleto} onChange={e => setNomeCompleto(e.target.value)}
              placeholder="Nome completo do cliente" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-semibold">CPF *</Label>
              <Input value={cpf} onChange={e => setCpf(maskCpfCnpj(e.target.value))}
                placeholder="000.000.000-00" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-semibold">RG</Label>
              <Input value={rg} onChange={e => setRg(e.target.value)}
                placeholder="RG" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-semibold">Data de Nascimento</Label>
              <Input value={dataNascimento} onChange={e => setDataNascimento(e.target.value)}
                type="date" className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-semibold">Estado Civil</Label>
              <select value={estadoCivil} onChange={e => setEstadoCivil(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 text-sm">
                <option value="">Selecione...</option>
                <option value="Solteiro(a)">Solteiro(a)</option>
                <option value="Casado(a)">Casado(a)</option>
                <option value="Divorciado(a)">Divorciado(a)</option>
                <option value="Viúvo(a)">Viúvo(a)</option>
                <option value="União Estável">União Estável</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-semibold">Nome da Mãe</Label>
              <Input value={nomeMae} onChange={e => setNomeMae(e.target.value)}
                placeholder="Nome da mãe" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-semibold">Nome do Pai</Label>
              <Input value={nomePai} onChange={e => setNomePai(e.target.value)}
                placeholder="Nome do pai" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300 text-sm font-semibold">Cidade que Nasceu</Label>
            <Input value={cidadeNasceu} onChange={e => setCidadeNasceu(e.target.value)}
              placeholder="Cidade de nascimento" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
          </div>
        </Section>

        <Section id="contato" title="CONTATO E ENDEREÇO" icon={MapPin}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-semibold flex items-center gap-1">
                <Phone className="w-3 h-3" /> Telefone
              </Label>
              <Input value={telefone} onChange={e => setTelefone(maskPhone(e.target.value))}
                placeholder="(47) 99999-9999" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-semibold flex items-center gap-1">
                <Mail className="w-3 h-3" /> E-mail
              </Label>
              <Input value={email} onChange={e => setEmail(e.target.value)}
                placeholder="email@exemplo.com" type="email" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-semibold">CEP</Label>
              <Input value={cep} onChange={e => { setCep(e.target.value); setCepAutoFilled(false); }}
                placeholder="00000-000" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
              {cepData?.found && (
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Endereço preenchido!
                </p>
              )}
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-gray-300 text-sm font-semibold">Endereço e Número</Label>
              <Input value={endereco} onChange={e => setEndereco(e.target.value)}
                placeholder="Rua, nº, bairro - preencha o CEP para autocompletar" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            </div>
          </div>
        </Section>

        <Section id="profissional" title="DADOS PROFISSIONAIS" icon={Briefcase}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-semibold">Profissão</Label>
              <Input value={profissao} onChange={e => setProfissao(e.target.value)}
                placeholder="Profissão" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-semibold">Renda</Label>
              <Input value={renda} onChange={e => setRenda(e.target.value)}
                placeholder="R$ 3.000,00" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300 text-sm font-semibold">Local de Trabalho</Label>
            <Input value={localTrabalho} onChange={e => setLocalTrabalho(e.target.value)}
              placeholder="Empresa / local de trabalho" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
          </div>
        </Section>

        <Section id="referencia" title="REFERÊNCIA PESSOAL" icon={Users}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-semibold">Nome</Label>
              <Input value={referenciaNome} onChange={e => setReferenciaNome(e.target.value)}
                placeholder="Nome da referência" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-semibold">Telefone</Label>
              <Input value={referenciaTelefone} onChange={e => setReferenciaTelefone(maskPhone(e.target.value))}
                placeholder="(47) 99999-9999" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            </div>
          </div>
        </Section>

        <Section id="cnh" title="FOTO CNH / RG" icon={Camera}>
          <input
            ref={cnhInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCnhUpload}
            className="hidden"
          />
          {cnhPreview ? (
            <div className="space-y-2">
              <img src={cnhPreview} alt="CNH" className="w-full rounded-lg border border-gray-700 max-h-64 object-contain" />
              <Button variant="outline" size="sm" onClick={() => { setCnhPreview(null); setCnhFile(null); }}
                className="border-red-600 text-red-400 hover:bg-red-600/10 text-xs">
                Remover foto
              </Button>
            </div>
          ) : (
            <button
              onClick={() => cnhInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-700 rounded-xl p-8 flex flex-col items-center gap-3 hover:border-blue-500/50 transition-colors"
            >
              <Upload className="w-8 h-8 text-gray-500" />
              <span className="text-sm text-gray-400">Toque para fotografar ou selecionar CNH/RG</span>
            </button>
          )}
        </Section>

        <Section id="bancos" title="BANCOS JÁ TENTADOS" icon={Building2}>
          <p className="text-xs text-gray-400 mb-2">Marque os bancos que você já tentou passar a ficha:</p>
          <div className="grid grid-cols-3 gap-2">
            {BANCOS.map(banco => (
              <button
                key={banco}
                onClick={() => setBancosTentados(prev =>
                  prev.includes(banco) ? prev.filter(b => b !== banco) : [...prev, banco]
                )}
                className={`py-2 px-2 rounded-lg border text-xs font-semibold transition-all ${
                  bancosTentados.includes(banco)
                    ? "border-orange-500 bg-orange-500/20 text-orange-400"
                    : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                }`}
              >
                {banco}
              </button>
            ))}
          </div>
        </Section>

        <Section id="obs" title="OBSERVAÇÕES" icon={FileText}>
          <Textarea
            value={observacoes}
            onChange={e => setObservacoes(e.target.value)}
            placeholder="Observações para o F&I (bancos que já passou, situação do cliente, etc.)"
            className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 resize-none"
            rows={3}
          />
        </Section>

        {/* Botão Enviar */}
        <Button
          onClick={handleSubmit}
          disabled={createFicha.isPending || uploadCnh.isPending}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-6 text-lg rounded-xl"
        >
          {createFicha.isPending || uploadCnh.isPending ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> ENVIANDO...</>
          ) : (
            <><CreditCard className="w-5 h-5 mr-2" /> ENVIAR PARA MESA DE CRÉDITO</>
          )}
        </Button>

        <p className="text-[10px] text-gray-600 text-center pb-4">
          A ficha será enviada para a fila do F&I. Você receberá uma notificação quando houver retorno.
        </p>
      </div>
    </div>
  );
}
