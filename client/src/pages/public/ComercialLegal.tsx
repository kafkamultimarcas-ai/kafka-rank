import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/contexts/TenantContext";
import { ArrowLeft } from "lucide-react";

// Minuta completa (Termos de Uso + Política de Privacidade) preparada para
// revisão de um advogado antes de publicação definitiva — não é aconselhamento
// jurídico. Os campos marcados com [PREENCHER: ...] precisam de dado real da
// empresa (razão social, CNPJ, endereço, canal de contato do encarregado de
// dados) antes de ir para produção. Ver LEGAL_LAST_UPDATED abaixo.

const LEGAL_LAST_UPDATED = "5 de julho de 2026";
const COMPANY_LEGAL_NAME = "[PREENCHER: Razão social completa, ex: Kafka Multimarcas Comércio de Veículos Ltda.]";
const COMPANY_CNPJ = "[PREENCHER: CNPJ]";
const COMPANY_ADDRESS = "[PREENCHER: endereço completo da sede — cidade usada como referência: Joinville/SC]";
const COMPANY_FORUM_CITY = "[PREENCHER: comarca/cidade do foro — sugestão: Joinville/SC]";
const CONTACT_EMAIL = "[PREENCHER: e-mail de contato geral, ex: contato@kafkarank.com]";
const DPO_EMAIL = "[PREENCHER: e-mail do encarregado de dados/DPO, ex: privacidade@kafkarank.com]";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pt-2">
      <h2 className="font-heading text-base font-bold text-foreground uppercase tracking-wide mb-2 border-b border-border pb-1.5">
        {title}
      </h2>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pt-1">
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function UL({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return <span className="text-amber-500 font-medium">{children}</span>;
}

function TermosContent() {
  return (
    <>
      <p className="text-xs text-muted-foreground/80 italic">
        Minuta completa preparada para revisão jurídica antes da publicação definitiva — ainda não é um contrato
        vinculante. Campos entre colchetes (<Placeholder>[PREENCHER: ...]</Placeholder>) precisam de dado real da
        empresa antes de ir ao ar.
      </p>

      <Section title="1. Objeto e Aceitação">
        <p>
          Estes Termos de Uso ("Termos") regulam a contratação e utilização da plataforma Kafka Rank
          ("Plataforma", "Sistema" ou "Kafka Rank"), um software como serviço (SaaS) de gestão comercial, CRM,
          ranking e gamificação de vendas voltado a revendas de veículos, oferecido por{" "}
          <Placeholder>{COMPANY_LEGAL_NAME}</Placeholder>, inscrita no CNPJ sob o nº{" "}
          <Placeholder>{COMPANY_CNPJ}</Placeholder>, com sede em <Placeholder>{COMPANY_ADDRESS}</Placeholder>{" "}
          ("Kafka Rank", "nós" ou "Contratada").
        </p>
        <p>
          Ao concluir o cadastro, marcar a caixa de aceite no formulário de contratação ou, na ausência desta,
          simplesmente utilizar a Plataforma, a pessoa jurídica contratante ("Loja", "Cliente" ou "Contratante")
          declara ter lido, compreendido e concordado integralmente com estes Termos e com a{" "}
          <a href="/comercial/privacidade" className="text-primary underline">
            Política de Privacidade
          </a>
          , que é parte integrante e inseparável deste instrumento. Caso não concorde com qualquer disposição, a
          Loja não deve se cadastrar nem utilizar a Plataforma.
        </p>
        <p>
          A pessoa física que realiza o cadastro em nome da Loja declara ter poderes de representação suficientes
          para vincular a pessoa jurídica contratante a estes Termos.
        </p>
      </Section>

      <Section title="2. Definições">
        <UL
          items={[
            <>
              <strong>Plataforma:</strong> o software Kafka Rank, incluindo todos os seus módulos (ranking de
              vendas, CRM, WhatsApp integrado, F&I, consignação, estoque, financeiro, pós-venda, gestão de equipe) e
              o Portal Super Admin.
            </>,
            <>
              <strong>Loja / Tenant / Contratante:</strong> a pessoa jurídica (revenda de veículos) que contrata a
              Plataforma e cujos dados operacionais são mantidos de forma logicamente isolada dos de outras Lojas.
            </>,
            <>
              <strong>Usuário:</strong> qualquer pessoa física autorizada pela Loja a acessar a Plataforma em seu
              nome — administrador, gerente ou vendedor.
            </>,
            <>
              <strong>Conta:</strong> o conjunto de credenciais (usuário e senha, ou vínculo via autenticação
              social) que dá acesso à Plataforma.
            </>,
            <>
              <strong>Cliente Final / Lead:</strong> pessoa física ou jurídica que interage comercialmente com a
              Loja (por exemplo, um comprador de veículo), cujos dados a Loja processa através da Plataforma
              (CRM, WhatsApp, financiamento).
            </>,
            <>
              <strong>Assinatura:</strong> o plano pago contratado pela Loja para uso continuado da Plataforma
              após o período de teste gratuito.
            </>,
          ]}
        />
      </Section>

      <Section title="3. Cadastro e Elegibilidade">
        <p>
          O cadastro na Plataforma exige o fornecimento de informações verdadeiras, completas e atualizadas sobre
          a Loja (razão social, CNPJ, endereço) e sobre o responsável pelo cadastro (nome, e-mail, telefone). A
          Loja é integralmente responsável pela veracidade dessas informações e por mantê-las atualizadas.
        </p>
        <p>
          A Loja é responsável por manter a confidencialidade das credenciais de acesso de todos os seus Usuários
          e por toda atividade realizada através de suas Contas, devendo comunicar a Kafka Rank imediatamente em
          caso de uso não autorizado ou suspeita de violação de segurança.
        </p>
        <p>
          A Kafka Rank reserva-se o direito de recusar, suspender ou cancelar cadastros que contenham informações
          falsas, incompletas, ou que estejam associados a atividades ilícitas.
        </p>
      </Section>

      <Section title="4. Planos, Preços e Forma de Pagamento">
        <p>
          A Plataforma é oferecida nas modalidades Trial (avaliação gratuita) e planos pagos recorrentes (Basic,
          Pro e Enterprise), cujas condições, limites (número de vendedores/administradores) e valores vigentes
          estão descritos na página de planos da Plataforma e podem ser atualizados periodicamente, com aviso
          prévio de, no mínimo, 30 (trinta) dias para contratos em vigor.
        </p>
        <p>
          O processamento de pagamentos é realizado por meio de parceiro de pagamento terceirizado (ASAAS),
          mediante cobrança recorrente (cartão de crédito, PIX ou boleto, conforme disponibilidade). Ao contratar
          um plano pago, a Loja autoriza a Kafka Rank a compartilhar com o processador de pagamento os dados
          estritamente necessários à cobrança (nome/razão social, CPF/CNPJ, e-mail, telefone), conforme detalhado
          na Política de Privacidade.
        </p>
        <p>
          Os preços não incluem tributos incidentes sobre a operação, que serão acrescidos conforme legislação
          aplicável quando cabível.
        </p>
        <Sub title="4.1. Período de Teste Gratuito (Trial)">
          <p>
            Novas Lojas têm direito a um período de teste gratuito de 10 (dez) dias, limitado a até 3 (três)
            vendedores e 1 (um) administrador, sem necessidade de cartão de crédito. Ao final do período de teste,
            o acesso à Plataforma será suspenso automaticamente caso nenhum plano pago seja contratado, sem
            prejuízo da preservação dos dados já inseridos pelo prazo indicado na Política de Privacidade.
          </p>
        </Sub>
        <Sub title="4.2. Inadimplência e Suspensão">
          <p>
            O não pagamento de qualquer cobrança na data de vencimento poderá acarretar a suspensão automática do
            acesso da Loja à Plataforma até a regularização, sem prejuízo da cobrança dos valores em aberto. A
            Kafka Rank enviará comunicação prévia (e-mail e/ou notificação no sistema) alertando sobre a pendência
            antes da suspensão.
          </p>
        </Sub>
      </Section>

      <Section title="5. Cancelamento e Reembolso">
        <p>
          A Loja pode cancelar sua Assinatura a qualquer momento, diretamente pelo painel administrativo da
          Plataforma ou mediante solicitação ao suporte. O cancelamento produz efeitos ao final do ciclo de
          cobrança vigente, sem reembolso proporcional de valores já pagos, salvo disposição em contrário prevista
          em lei aplicável (como o direito de arrependimento em contratações realizadas fora do estabelecimento
          comercial, nos termos do art. 49 do Código de Defesa do Consumidor, quando aplicável).
        </p>
      </Section>

      <Section title="6. Obrigações da Loja e Uso Aceitável">
        <p>A Loja compromete-se a:</p>
        <UL
          items={[
            "Utilizar a Plataforma exclusivamente para finalidades lícitas, relacionadas à sua atividade comercial de revenda de veículos.",
            <>
              Cumprir a legislação aplicável ao tratamento de dados pessoais de seus próprios Clientes Finais
              (LGPD), assumindo o papel de <strong>controladora</strong> desses dados nos termos descritos na
              Política de Privacidade.
            </>,
            <>
              Respeitar as políticas de uso do WhatsApp Business e das demais integrações de terceiros ao utilizar
              os recursos de CRM/mensageria, sendo vedado o envio de mensagens em massa não solicitadas (spam) a
              destinatários que não tenham relação comercial ou consentimento prévio.
            </>,
            "Não utilizar a Plataforma para armazenar, processar ou transmitir conteúdo ilegal, fraudulento, difamatório ou que viole direitos de terceiros.",
            "Não tentar acessar dados de outras Lojas, realizar engenharia reversa, testes de invasão não autorizados ou qualquer ação que comprometa a segurança ou disponibilidade da Plataforma.",
            "Não revender, sublicenciar ou disponibilizar a Plataforma a terceiros sem autorização expressa e por escrito da Kafka Rank.",
            "Manter backups próprios de informações críticas ao seu negócio, sem prejuízo das rotinas de backup mantidas pela Kafka Rank.",
          ]}
        />
      </Section>

      <Section title="7. Dados da Loja, de seus Usuários e de Clientes Finais">
        <p>
          O tratamento de dados pessoais realizado através da Plataforma é regido pela{" "}
          <a href="/comercial/privacidade" className="text-primary underline">
            Política de Privacidade
          </a>
          . Em resumo: a Kafka Rank atua como <strong>operadora</strong> dos dados pessoais dos Clientes Finais que
          a Loja insere ou coleta através da Plataforma (CRM, WhatsApp, fichas de financiamento), e a Loja atua
          como <strong>controladora</strong> desses dados, sendo responsável por possuir base legal adequada para
          seu tratamento (LGPD, Lei nº 13.709/2018).
        </p>
      </Section>

      <Section title="8. Propriedade Intelectual">
        <p>
          Todos os direitos de propriedade intelectual sobre a Plataforma — incluindo código-fonte, design,
          marca, layout, funcionalidades e documentação — pertencem exclusivamente à Kafka Rank ou a seus
          licenciantes. Estes Termos não transferem à Loja qualquer direito de propriedade sobre a Plataforma,
          apenas uma licença de uso, não exclusiva, intransferível e limitada ao período de vigência da
          Assinatura.
        </p>
        <p>
          Os dados inseridos pela Loja na Plataforma (registros de vendas, cadastro de clientes, configurações)
          permanecem de propriedade da Loja, que poderá solicitar sua exportação nos termos da Política de
          Privacidade.
        </p>
      </Section>

      <Section title="9. Integrações com Terceiros">
        <p>
          A Plataforma se integra a serviços de terceiros — processamento de pagamentos (ASAAS), envio de
          mensagens via WhatsApp (Z-API), envio de e-mails transacionais (Resend), armazenamento de arquivos
          (Amazon Web Services), captação de leads (Meta/Instagram/Facebook, Google Ads) e portais de anúncio de
          veículos (Webmotors, OLX, iCarros), entre outros que possam ser adicionados. O uso desses serviços está
          sujeito aos termos e políticas próprios de cada fornecedor, sobre os quais a Kafka Rank não exerce
          controle e não assume responsabilidade por indisponibilidades, alterações ou descontinuações que
          eventualmente afetem a experiência de uso da Plataforma.
        </p>
      </Section>

      <Section title="10. Disponibilidade e Suporte">
        <p>
          A Kafka Rank empenha melhores esforços para manter a Plataforma disponível de forma contínua, porém não
          garante disponibilidade ininterrupta (uptime de 100%), estando sujeita a manutenções programadas (com
          aviso prévio quando possível), manutenções emergenciais e eventos fora de seu controle razoável (caso
          fortuito, força maior, falhas de provedores de infraestrutura ou de terceiros integrados).
        </p>
        <p>
          O suporte técnico é prestado pelos canais informados no painel da Plataforma, em horário comercial,
          podendo variar conforme o plano contratado.
        </p>
      </Section>

      <Section title="11. Limitação de Responsabilidade">
        <p>
          Na máxima extensão permitida pela legislação aplicável, a Kafka Rank não será responsável por danos
          indiretos, lucros cessantes, perda de dados decorrente de uso indevido pela Loja, ou danos decorrentes
          de decisões comerciais tomadas com base em informações geradas pela Plataforma (incluindo sugestões e
          qualificações automatizadas de leads pela IA Atendente).
        </p>
        <p>
          A responsabilidade total e agregada da Kafka Rank perante a Loja, por qualquer motivo relacionado a
          estes Termos, fica limitada ao valor efetivamente pago pela Loja nos 12 (doze) meses anteriores ao
          evento que originou a reclamação.
        </p>
        <p>
          Nada nestes Termos exclui ou limita responsabilidade que não possa ser legalmente excluída ou limitada,
          incluindo em casos de dolo ou culpa grave da Kafka Rank.
        </p>
      </Section>

      <Section title="12. Confidencialidade">
        <p>
          Cada parte compromete-se a manter sigilo sobre informações confidenciais da outra parte obtidas em
          razão da relação contratual, utilizando-as exclusivamente para os fins aqui previstos, pelo prazo de
          vigência do contrato e por mais 2 (dois) anos após seu término.
        </p>
      </Section>

      <Section title="13. Vigência e Rescisão">
        <p>
          Estes Termos vigoram enquanto durar a relação contratual entre a Loja e a Kafka Rank. Qualquer das
          partes pode rescindir o contrato a qualquer momento, nos termos da Seção 5. A Kafka Rank poderá
          suspender ou encerrar unilateralmente o acesso da Loja em caso de violação relevante destes Termos, não
          sanada em até 15 (quinze) dias após notificação, ou imediatamente em casos de uso ilícito ou fraudulento
          da Plataforma.
        </p>
        <p>
          Encerrada a relação contratual, a Loja terá um prazo de 30 (trinta) dias para solicitar a exportação de
          seus dados, findo o qual a Kafka Rank poderá eliminá-los, observados os prazos de retenção legal
          descritos na Política de Privacidade.
        </p>
      </Section>

      <Section title="14. Alterações destes Termos">
        <p>
          A Kafka Rank pode alterar estes Termos a qualquer momento, mediante comunicação prévia à Loja (e-mail
          e/ou aviso no painel) com antecedência mínima de 15 (quinze) dias da entrada em vigor das alterações,
          exceto quando a alteração for exigida por lei ou determinação de autoridade competente. O uso continuado
          da Plataforma após a entrada em vigor das alterações implica concordância com os novos Termos.
        </p>
      </Section>

      <Section title="15. Disposições Gerais">
        <p>
          Caso qualquer disposição destes Termos seja considerada inválida ou inexequível, as demais disposições
          permanecerão em pleno vigor. A tolerância de qualquer das partes quanto ao descumprimento de qualquer
          obrigação não implicará novação ou renúncia ao direito de exigi-la posteriormente.
        </p>
      </Section>

      <Section title="16. Legislação Aplicável e Foro">
        <p>
          Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de{" "}
          <Placeholder>{COMPANY_FORUM_CITY}</Placeholder> para dirimir quaisquer controvérsias decorrentes deste
          instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja, ressalvadas as
          hipóteses de foro de eleição obrigatório previstas em lei.
        </p>
      </Section>

      <Section title="17. Contato">
        <p>
          Dúvidas sobre estes Termos podem ser encaminhadas para <Placeholder>{CONTACT_EMAIL}</Placeholder>.
        </p>
      </Section>
    </>
  );
}

function PrivacidadeContent() {
  return (
    <>
      <p className="text-xs text-muted-foreground/80 italic">
        Minuta completa preparada para revisão jurídica (incluindo conformidade com a LGPD) antes da publicação
        definitiva — ainda não é um documento vinculante. Campos entre colchetes (
        <Placeholder>[PREENCHER: ...]</Placeholder>) precisam de dado real da empresa antes de ir ao ar.
      </p>

      <Section title="1. Introdução">
        <p>
          Esta Política de Privacidade descreve como <Placeholder>{COMPANY_LEGAL_NAME}</Placeholder>, inscrita no
          CNPJ sob o nº <Placeholder>{COMPANY_CNPJ}</Placeholder> ("Kafka Rank", "nós"), coleta, usa, armazena,
          compartilha e protege dados pessoais no contexto da plataforma Kafka Rank, em conformidade com a Lei
          Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — "LGPD").
        </p>
        <p>
          Esta Política se aplica a três grupos distintos de titulares de dados, tratados de formas diferentes
          conforme explicado abaixo: (i) visitantes do site institucional/comercial; (ii) Usuários das Lojas
          clientes (administradores, gerentes e vendedores); e (iii) Clientes Finais das Lojas, cujos dados são
          inseridos ou coletados pelas próprias Lojas através da Plataforma.
        </p>
      </Section>

      <Section title="2. Papéis: Quem é Controlador e Quem é Operador">
        <p>
          A LGPD distingue o <strong>Controlador</strong> (quem decide o que fazer com os dados) do{" "}
          <strong>Operador</strong> (quem trata os dados em nome do Controlador, seguindo suas instruções). Essa
          distinção é central para entender esta Política:
        </p>
        <UL
          items={[
            <>
              Para os dados dos <strong>Usuários das Lojas</strong> (quem acessa o sistema — administradores,
              gerentes, vendedores) e para os dados de <strong>visitantes do site comercial</strong>, a{" "}
              <strong>Kafka Rank é Controladora</strong>.
            </>,
            <>
              Para os dados dos <strong>Clientes Finais das Lojas</strong> (compradores/interessados em veículos,
              cujos dados a Loja insere no CRM, recebe via WhatsApp/formulários, ou coleta em fichas de
              financiamento), a <strong>Loja contratante é Controladora</strong> e a{" "}
              <strong>Kafka Rank atua como Operadora</strong>, tratando esses dados exclusivamente conforme as
              instruções da Loja e para viabilizar o funcionamento da Plataforma. Cabe à Loja garantir que possui
              base legal adequada para coletar e tratar os dados de seus próprios clientes, inclusive obtendo
              consentimento quando exigido (por exemplo, para envio de mensagens comerciais via WhatsApp).
            </>,
          ]}
        />
      </Section>

      <Section title="3. Quais Dados Coletamos">
        <Sub title="3.1. De visitantes do site comercial">
          <UL
            items={[
              "Dados de navegação (páginas visitadas, origem do acesso) via ferramentas de analytics.",
              "Dados fornecidos voluntariamente em formulários de contato ou cadastro de nova Loja (nome, e-mail, telefone, nome da empresa).",
            ]}
          />
        </Sub>
        <Sub title="3.2. De Usuários das Lojas (administradores, gerentes, vendedores)">
          <UL
            items={[
              "Dados de identificação e contato: nome, apelido, e-mail, telefone, foto de perfil (opcional, inclusive foto para competições internas).",
              "Credenciais de acesso: nome de usuário e senha (armazenada apenas em formato criptografado/hash, nunca em texto legível).",
              "Dados de desempenho profissional: vendas registradas, metas, pontuação, comissões, adiantamentos, histórico de acesso.",
              "Documentos eventualmente enviados no fluxo de vendas (ex.: CNH e comprovantes vinculados a uma venda), quando o cargo do Usuário exigir esse tipo de registro.",
              "Dados técnicos: endereço IP, identificadores de sessão/cookies, informações de dispositivo, registros de push notification (quando habilitado).",
            ]}
          />
        </Sub>
        <Sub title="3.3. De Clientes Finais das Lojas (tratados pela Kafka Rank como Operadora)">
          <UL
            items={[
              "Dados de identificação e contato inseridos pela Loja no CRM: nome, telefone, e-mail, CPF/CNPJ.",
              "Conteúdo de conversas via WhatsApp integrado (incluindo atendimento automatizado por Inteligência Artificial), quando a Loja utiliza esse canal.",
              "Dados de interesse comercial: veículo de interesse, origem do lead (portal de anúncio, redes sociais, indicação).",
              "Dados financeiros sensíveis inseridos em fichas de financiamento (quando aplicável): renda, dados de emprego, referências pessoais e respectivos telefones, CPF, endereço — sempre inseridos pela Loja ou pelo próprio Cliente Final, nunca coletados de forma independente pela Kafka Rank.",
            ]}
          />
        </Sub>
      </Section>

      <Section title="4. Como Coletamos os Dados">
        <UL
          items={[
            "Diretamente, quando o titular preenche formulários no site ou na Plataforma.",
            "Por meio da própria Loja, que insere dados de seus Usuários e Clientes Finais durante o uso do sistema.",
            "Automaticamente, por meio de cookies e tecnologias semelhantes durante a navegação.",
            "Por meio de integrações autorizadas pela Loja: Meta (Instagram/Facebook Lead Ads), Google Ads, portais de anúncio de veículos (via leitura automatizada de e-mails de lead), e sistemas DMS de terceiros (SIG Web).",
          ]}
        />
      </Section>

      <Section title="5. Bases Legais para o Tratamento">
        <p>Conforme o art. 7º da LGPD, tratamos dados pessoais com fundamento em uma ou mais das seguintes bases:</p>
        <UL
          items={[
            <>
              <strong>Execução de contrato</strong> — para viabilizar a prestação do serviço contratado pela Loja
              (inciso V).
            </>,
            <>
              <strong>Legítimo interesse</strong> — para prevenção a fraudes, segurança da Plataforma e
              melhoria dos serviços, sempre de forma proporcional e com respeito aos direitos e liberdades
              fundamentais dos titulares (inciso IX).
            </>,
            <>
              <strong>Cumprimento de obrigação legal ou regulatória</strong> — por exemplo, guarda de registros
              fiscais e contábeis pelo prazo exigido em lei (inciso II).
            </>,
            <>
              <strong>Consentimento</strong> — para finalidades específicas que exijam, como envio de comunicações
              de marketing pela própria Loja aos seus Clientes Finais (inciso I), quando aplicável.
            </>,
            <>
              <strong>Exercício regular de direitos</strong> em processo judicial, administrativo ou arbitral,
              quando necessário (inciso VI).
            </>,
          ]}
        />
      </Section>

      <Section title="6. Para que Usamos os Dados (Finalidades)">
        <UL
          items={[
            "Viabilizar o cadastro, autenticação e uso da Plataforma pelos Usuários das Lojas.",
            "Processar cobranças e gerenciar assinaturas dos planos contratados.",
            "Permitir que a Loja gerencie seu relacionamento com Clientes Finais (CRM, WhatsApp, agendamentos, propostas de financiamento).",
            "Operar o Atendente com Inteligência Artificial para qualificação automatizada de leads recebidos via WhatsApp, quando habilitado pela Loja.",
            "Enviar comunicações transacionais (confirmação de cadastro, cobrança, redefinição de senha, avisos de sistema) por e-mail e notificações no aplicativo.",
            "Gerar relatórios, rankings e métricas de desempenho de vendas dentro de cada Loja.",
            "Prevenir fraudes, investigar incidentes de segurança e garantir a integridade da Plataforma.",
            "Cumprir obrigações legais e regulatórias aplicáveis.",
          ]}
        />
      </Section>

      <Section title="7. Com Quem Compartilhamos os Dados">
        <p>
          Não vendemos dados pessoais a terceiros. Compartilhamos dados, na medida do necessário, com os seguintes
          tipos de parceiros, todos vinculados contratualmente a obrigações de confidencialidade e segurança:
        </p>
        <UL
          items={[
            <>
              <strong>Processador de pagamentos (ASAAS)</strong> — dados de cobrança da Loja (razão social,
              CPF/CNPJ, e-mail, telefone) para viabilizar a cobrança das assinaturas.
            </>,
            <>
              <strong>Provedor de mensageria (Z-API / WhatsApp Business)</strong> — mensagens trocadas entre a
              Loja e seus Clientes Finais, incluindo conteúdo processado pelo Atendente com IA quando habilitado.
            </>,
            <>
              <strong>Provedor de e-mail transacional (Resend)</strong> — endereço de e-mail e conteúdo das
              comunicações enviadas pela Plataforma.
            </>,
            <>
              <strong>Provedor de armazenamento em nuvem (Amazon Web Services)</strong> — arquivos, fotos e
              documentos enviados à Plataforma.
            </>,
            <>
              <strong>Plataformas de anúncio e captação de leads (Meta/Instagram/Facebook, Google Ads)</strong> —
              recebimento de dados de leads gerados por campanhas configuradas pela própria Loja.
            </>,
            "Autoridades públicas, quando exigido por lei, ordem judicial ou requisição de autoridade competente.",
            "Eventual adquirente, em caso de operação societária (fusão, aquisição, reorganização), mediante manutenção do mesmo nível de proteção previsto nesta Política.",
          ]}
        />
      </Section>

      <Section title="8. Transferência Internacional de Dados">
        <p>
          Alguns dos prestadores de serviço mencionados na Seção 7 (por exemplo, provedores de nuvem e de
          mensageria) podem processar dados em servidores localizados fora do Brasil. Nesses casos, a Kafka Rank
          adota as salvaguardas exigidas pelo art. 33 da LGPD, buscando garantir que o país ou organismo
          internacional de destino proporcione grau de proteção de dados pessoais adequado, ou que o fornecedor
          ofereça garantias contratuais equivalentes.
        </p>
      </Section>

      <Section title="9. Cookies e Tecnologias Semelhantes">
        <p>
          Utilizamos cookies essenciais (para manter sua sessão autenticada) e, quando aplicável, cookies de
          análise de uso do site comercial. Cookies essenciais não podem ser desabilitados sem comprometer o
          funcionamento da Plataforma. O navegador do Usuário permite gerenciar/excluir cookies a qualquer
          momento, o que pode afetar a experiência de uso.
        </p>
      </Section>

      <Section title="10. Por Quanto Tempo Guardamos os Dados">
        <p>
          Mantemos os dados pessoais pelo tempo necessário ao cumprimento das finalidades para as quais foram
          coletados, observado o seguinte:
        </p>
        <UL
          items={[
            "Dados de conta e uso da Plataforma: enquanto durar o contrato com a Loja, mais o prazo indicado abaixo após seu término.",
            "Registros necessários ao cumprimento de obrigação legal ou regulatória (por exemplo, fiscal): pelo prazo exigido pela legislação aplicável (em regra, até 5 anos para documentos fiscais, podendo variar conforme a natureza do dado).",
            "Após o encerramento do contrato: os dados ficam disponíveis para exportação pela Loja por 30 (trinta) dias, findo o qual poderão ser eliminados ou anonimizados, exceto quando sua guarda for exigida por lei ou necessária para o exercício regular de direitos.",
          ]}
        />
      </Section>

      <Section title="11. Segurança da Informação">
        <p>Adotamos medidas técnicas e organizacionais para proteger os dados pessoais, incluindo:</p>
        <UL
          items={[
            "Senhas armazenadas com hash criptográfico (nunca em texto legível).",
            "Credenciais de integrações sensíveis (como WhatsApp Business) armazenadas de forma criptografada.",
            "Controle de acesso por sessão autenticada (cookies HttpOnly) e por perfil de permissão.",
            "Isolamento lógico dos dados entre diferentes Lojas (arquitetura multi-tenant).",
            "Limitação de taxa de requisições (rate limiting) para mitigar tentativas de acesso indevido.",
            "Monitoramento e alertas internos sobre falhas e eventos de segurança no fluxo de pagamento e autenticação.",
          ]}
        />
        <p>
          Nenhum sistema é 100% imune a incidentes de segurança. Em caso de incidente que possa acarretar risco ou
          dano relevante aos titulares, a Kafka Rank notificará a ANPD e os titulares afetados (ou a Loja
          responsável, quando o incidente envolver dados de Clientes Finais) conforme exigido pela LGPD.
        </p>
      </Section>

      <Section title="12. Direitos do Titular de Dados">
        <p>
          Nos termos do art. 18 da LGPD, o titular de dados pessoais tem direito a, mediante requisição:
        </p>
        <UL
          items={[
            "Confirmar a existência de tratamento de seus dados.",
            "Acessar os dados que tratamos sobre si.",
            "Corrigir dados incompletos, inexatos ou desatualizados.",
            "Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a lei.",
            "Solicitar a portabilidade dos dados a outro fornecedor de serviço, mediante requisição expressa.",
            "Solicitar a eliminação dos dados tratados com base em consentimento, quando aplicável.",
            "Obter informações sobre as entidades públicas e privadas com as quais compartilhamos dados.",
            "Revogar o consentimento previamente fornecido, quando essa for a base legal do tratamento.",
            "Solicitar a revisão de decisões tomadas unicamente com base em tratamento automatizado (por exemplo, qualificações geradas pelo Atendente com IA), quando essas decisões afetarem seus interesses.",
          ]}
        />
        <p>
          Para exercer esses direitos: se o titular for Usuário de uma Loja ou visitante do site comercial, o
          pedido deve ser dirigido diretamente à Kafka Rank pelo canal indicado na Seção 17. Se o titular for
          Cliente Final de uma Loja, o pedido deve ser dirigido preferencialmente à própria Loja (Controladora
          desses dados); a Kafka Rank, na condição de Operadora, prestará à Loja o suporte técnico necessário para
          atender à solicitação dentro dos prazos legais.
        </p>
      </Section>

      <Section title="13. Decisões Automatizadas">
        <p>
          A Plataforma oferece um recurso opcional de Atendente com Inteligência Artificial, que pode qualificar
          automaticamente leads recebidos via WhatsApp com base em regras e modelos de linguagem, sugerindo
          respostas ou classificando o estágio do lead no funil de vendas. Essas qualificações auxiliam a equipe
          da Loja, mas não têm efeito jurídico definitivo por si sós — a decisão comercial final é sempre humana,
          tomada pela equipe da Loja. O titular pode solicitar revisão humana de qualquer classificação
          automatizada que o afete, nos termos do art. 20 da LGPD.
        </p>
      </Section>

      <Section title="14. Dados de Crianças e Adolescentes">
        <p>
          A Plataforma não se destina ao uso por crianças ou adolescentes e não coleta intencionalmente dados
          dessas pessoas. Caso a Loja identifique que um Cliente Final é menor de idade, deve observar as
          exigências adicionais de consentimento previstas no art. 14 da LGPD antes de tratar seus dados.
        </p>
      </Section>

      <Section title="15. Responsabilidades da Loja como Controladora">
        <p>
          A Loja, na condição de Controladora dos dados de seus Clientes Finais, é responsável por: (i) possuir
          base legal adequada para coletar e tratar esses dados, inclusive obtendo consentimento quando exigido
          (por exemplo, para disparos de WhatsApp fora do atendimento iniciado pelo cliente); (ii) atender
          diretamente as solicitações de titulares relativas a esses dados; (iii) utilizar os recursos de
          disparo em massa e automações da Plataforma em conformidade com a LGPD e com as políticas do WhatsApp
          Business; e (iv) informar adequadamente seus próprios clientes sobre o tratamento de dados realizado.
        </p>
      </Section>

      <Section title="16. Alterações desta Política">
        <p>
          Esta Política pode ser atualizada periodicamente para refletir mudanças legais, técnicas ou de negócio.
          Alterações relevantes serão comunicadas por e-mail e/ou aviso na Plataforma com antecedência mínima de
          15 (quinze) dias da entrada em vigor. A data da última atualização consta no rodapé desta página.
        </p>
      </Section>

      <Section title="17. Encarregado de Dados (DPO) e Contato">
        <p>
          Para exercer seus direitos, esclarecer dúvidas sobre esta Política ou reportar incidentes de segurança,
          entre em contato com nosso Encarregado de Dados (DPO) pelo e-mail{" "}
          <Placeholder>{DPO_EMAIL}</Placeholder>. Dúvidas gerais também podem ser dirigidas a{" "}
          <Placeholder>{CONTACT_EMAIL}</Placeholder>.
        </p>
        <p>
          Caso não fique satisfeito com a resposta recebida, o titular pode apresentar reclamação à Autoridade
          Nacional de Proteção de Dados (ANPD), pelo site{" "}
          <span className="text-primary">gov.br/anpd</span>.
        </p>
      </Section>
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
        <p className="text-xs text-muted-foreground mb-6">
          {brandName} — minuta em revisão jurídica · última atualização em {LEGAL_LAST_UPDATED}
        </p>
        <div className="racing-card p-6 space-y-1 text-sm text-muted-foreground leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}
