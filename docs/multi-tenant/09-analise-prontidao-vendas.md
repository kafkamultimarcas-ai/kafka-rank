# Análise de Prontidão para Vendas — Julho/2026

## Contexto e Metodologia

Este documento consolida e **reconcilia** tudo que já foi levantado sobre o que falta pro Kafka Rank vender de verdade pra lojas reais: os 8 documentos desta pasta (`docs/multi-tenant/`), os relatórios de auditoria da raiz do projeto (`AUDIT_FINDINGS.md`, `security-audit.md`, `RELATORIO_SAAS_AUDITORIA.md`, etc.) e uma checagem fresca do código feita agora (testes, TODOs, `git status`, LGPD, CI/CD).

**Achado mais importante da reconciliação**: boa parte dos "itens críticos bloqueantes" dos relatórios da raiz (`security-audit.md`, `RELATORIO_SAAS_AUDITORIA.md`, `AUDIT_FINDINGS.md`) **já foi resolvida** pela branch `feat/multi-tenant` (rate limiting, headers de segurança/helmet, `tenantId` no JWT, credenciais Z-API por loja e criptografadas) — esses documentos são anteriores à transformação multi-tenant e estão desatualizados. O [documento 05](05-pendencias-criticas-lancamento.md) é mais recente e mais confiável; este documento 09 atualiza e complementa o 05 com o estado real de agora, incluindo o trabalho feito depois dele (docs 06-08).

## O que já está pronto (não precisa refazer)

- **Isolamento multi-tenant**: `tenantId` em toda tabela de dado, testado automaticamente (`tenant-security.test.ts` varre o schema inteiro).
- **Login unificado**: só 2 pontos de entrada (`/super-admin`, `/t/:slug/login`), com seletor de loja pesquisável — [documento 06](06-unificacao-login-selecao-loja.md).
- **Identidade do ator sem gambiarra de ID**: `actorType` explícito em vez de codificação numérica — [documento 08](08-refactor-identidade-actortype.md), corrigiu 2 bugs reais de resolução de tenant/permissão.
- **Cobrança via ASAAS**: assinar, trocar de plano, cancelar, proteção contra cobrança duplicada, webhook idempotente e transacional (bug de idempotência corrigido — [documento 07](07-observabilidade-alertas-cobranca.md)).
- **Observabilidade interna sem serviço externo**: logger estruturado (pino), alertas de cobrança com e-mail pros Super Admins, tudo numa única tela de Logs — [documento 07](07-observabilidade-alertas-cobranca.md).
- **Segurança de sessão/rede**: rate limiting por loja+IP (login, reset de senha, cadastro, webhooks), `helmet`, `bcrypt`, JWT com `tenantId` validado (`assertTenantMatch`), credenciais Z-API criptografadas (AES-256-GCM) por loja.
- **Proteção de IDOR**: vendedor não acessa dado de outro vendedor (`getPrivacySellerId`), verificado em ~16 endpoints.
- **Cadastro self-service** e **"esqueci minha senha"** self-service, ambos funcionais.
- **Código limpo**: zero `TODO`/`FIXME`/`HACK` reais no código (checado agora, não é achado antigo).
- **Suíte de testes grande**: ~79 arquivos, ~832 testes.

## P0 — Bloqueia qualquer venda com dinheiro de verdade

| # | Item | Por quê é bloqueante | Esforço |
|---|---|---|---|
| 1 | **Commitar o trabalho** — `git status` mostra **64 arquivos** modificados/novos não commitados agora, na branch `feat/multi-tenant` (inclui todo o trabalho dos documentos 06-08). Se a máquina for resetada, tudo isso some. | Risco de perda total de trabalho, não é sobre qualidade de código | 1-2h (revisar e dividir em commits por assunto) |
| 2 | **Termos de Uso / Política de Privacidade são texto-placeholder** — `client/src/pages/public/ComercialLegal.tsx` tem aviso explícito no próprio texto renderizado: *"texto provisório... precisa ser substituído por um texto revisado juridicamente antes de qualquer loja real se cadastrar em produção"*. | Bloqueio jurídico: hoje ninguém aceita um contrato válido ao se cadastrar | Depende de terceiro (advogado/consultoria) |
| 3 | **Migrations nunca rodaram fora do ambiente local** — 76 arquivos de migration em `drizzle/`, todos aplicados só contra banco de dev. Migration de unicidade de username por tenant precisa auditoria de duplicatas antes de rodar em produção. | Sem isso, staging/produção não tem as tabelas/colunas que o código já espera | 2-4h (rodar + validar + rollback plan) |
| 4 | **ASAAS nunca testado contra sandbox/produção real** — `ASAAS_API_KEY` nunca configurada neste ambiente; todo o fluxo de cobrança foi validado só com testes automatizados. | Não se sabe se cobrar de verdade funciona fora do dev local | 2-3h (configurar sandbox, rodar fluxo completo: assinar → pagar → webhook → ativa → trocar plano → cancelar) |
| 5 | **Telas nunca abertas num navegador fora deste ambiente de dev** — cadastro self-service, checkout de assinatura, "esqueci minha senha" nunca foram vistas rodando de verdade (só via teste automatizado/curl). A unificação de login (doc 06) e o painel de Logs (doc 07) **já foram** verificados ao vivo nesta sessão — não repetir esses. | Bug visual/UX só aparece olhando a tela renderizada | 2-3h |
| 6 | **E-mail nunca testado com Resend de verdade** — `RESEND_API_KEY` nunca configurada; todo e-mail cai em log de console. Ninguém viu o HTML renderizado numa caixa de entrada real. | E-mail quebrado (layout, spam score, link errado) só aparece testando de verdade | 1h (configurar chave + disparar cada tipo de e-mail uma vez) |

## P1 — Trava venda em escala / risco de segurança-operação

| # | Item | Risco | Esforço |
|---|---|---|---|
| 7 | Sem revogação de sessão — JWT de 30 dias não pode ser invalidado antes de expirar (trocar senha não derruba token já emitido) | Funcionário demitido mantém acesso até o token expirar | 3-4h |
| 8 | Webhook ASAAS só reage a 3 eventos (`PAYMENT_CONFIRMED`/`RECEIVED`/`OVERDUE`) — chargeback/reembolso ficam só no log, sem ação automática | Loja continua ativa mesmo após chargeback, sem alguém notar manualmente | 2-3h (o log e o alerta já existem — falta a reação) |
| 9 | Sem job de reconciliação de pagamento — se o webhook se perder (servidor fora do ar no momento exato), a loja fica presa incorretamente até alguém perceber | Cliente pagou e não tem acesso, sem timeline garantida de correção | 3-4h (job periódico batendo status local vs. ASAAS) |
| 10 | `moduleRequiredProcedure` só aplicado em Marketing — CRM, Financeiro, Pós-venda, Estoque, IAM não bloqueiam por módulo/plano na própria procedure | Loja no plano errado pode acessar módulo que não pagou | 4-6h (replicar o padrão já existente pros outros routers) |
| 11 | **Sem CI/CD** — não existe `.github/workflows/`; os ~832 testes só rodam manualmente | Nada impede um push quebrado de ir pra produção | 2-3h (GitHub Actions rodando `pnpm test` + `pnpm check` no PR) |
| 12 | Auditoria de segurança cross-tenant cobre só pontos críticos (auth, webhooks, Z-API, config IA, limites de plano, upload, reset de senha) — não uma varredura sistemática de CRM/financeiro | Pode haver vazamento cross-tenant não descoberto ainda | Investigação, não estimável de cara |
| 13 | SQL raw no Atendente IA (`ai-attendant.ts`) filtra por `leadId`, não por `tenantId` direto — seguro transitivamente (todo `leadId` já pertence ao tenant certo), mas sem defesa em profundidade | Baixo risco prático, mas sem segunda camada de proteção | 2-3h |

## P2 — Crescimento comercial, não bloqueia lançamento controlado

- "Primeiras 100 lojas" sem enforcement real (só texto de marketing fixo).
- Super Admin sem dashboard de negócio (MRR, churn, taxa de conversão trial→pago).
- Sem tela de atualizar dados de cobrança (CPF/CNPJ, e-mail) depois do checkout.
- E-mail de boas-vindas de vendedor/gerente linka só pro login geral da loja, não pra um link de primeiro acesso direto.
- **Testes flaky**: entre 3 execuções seguidas da suíte completa nesta checagem, o número de falhas variou (17-20 de ~832, em 8-11 dos ~79 arquivos) — a maioria das suítes falhando muda de execução pra execução, sinal de teste dependente de estado/timing, não de bug real. `server/zapi.test.ts` é a única falha 100% consistente (credenciais reais ausentes no ambiente, esperado). Vale investigar antes de montar CI (item 11) pra não ter um pipeline vermelho por flakiness.
- Mock de `./db` desatualizado num teste (`server/routers.test.ts`, falta `createSaleDocument`) — sintoma de teste que não acompanhou uma mudança de schema.

## P3 — Fora de escopo deliberado (não é dívida técnica)

- Emissão de nota fiscal (NF-e).
- Cupom/desconto genérico configurável.

## Ordem recomendada

1. **Commitar o trabalho** (item 1) — antes de qualquer outra coisa, é reversível e rápido.
2. **Rodar migrations em staging + configurar ASAAS sandbox de verdade** (itens 3-4) — sem isso, nada do resto pode ser validado fora do dev local.
3. **Abrir cada tela nova num navegador real + testar e-mail com Resend de verdade** (itens 5-6) — barato, rápido, pega bug visual antes do cliente.
4. **Resolver a pendência jurídica** (item 2) em paralelo — não depende de código, mas é um bloqueio de verdade; não adianta esperar terminar todo o resto pra só então começar essa conversa.
5. Depois disso, P1 na ordem listada (revogação de sessão e CI/CD são os de maior retorno por esforço).

## Como Validar Este Documento no Futuro

Este tipo de análise fica desatualizado rápido (este mesmo documento já corrigiu 3 relatórios anteriores que estavam obsoletos). Antes de confiar em qualquer item aqui:
- Rodar `git status --short | wc -l` pra ver se o número de arquivos não commitados mudou.
- Rodar `pnpm test` e comparar com a contagem aqui.
- Grep rápido por `TODO|FIXME|HACK` pra ver se surgiu dívida nova.
- Confirmar se `ASAAS_API_KEY`/`RESEND_API_KEY` já foram configuradas em algum ambiente real (isso resolveria os itens 4 e 6 de uma vez).
