# Kafka Rank → SaaS Multi-Tenant — Documentação (branch `feat/multi-tenant`)

Este diretório documenta, por assunto, tudo que foi construído na transformação do Kafka Rank (gamificação + CRM automotivo de uma concessionária só) em produto SaaS vendável pra várias lojas.

## Estado da branch no momento em que isso foi escrito

- Branch: `feat/multi-tenant`.
- Só 2 commits da branch estão de fato commitados (`6e5ce05` fundação inicial, `2c4edb2` continuação). **Todo o restante do trabalho descrito aqui (Fases F em diante) está em working tree, não commitado** — 69 arquivos entre modificados e novos. Isso é proposital (o usuário não pediu commit ainda), mas significa que nada disso existe em `main` nem em nenhum outro lugar além desta máquina.
- 74 migrations em `drizzle/` (`0000` a `0073`), todas geradas via `drizzle-kit generate` e aplicadas contra o banco de desenvolvimento local. **Nenhuma delas rodou em staging/produção.**
- 78 arquivos de teste em `server/*.test.ts`, todos de integração real contra banco (sem mock pesado), suíte em ~823/830 (as ~7 falhas são conhecidas e não relacionadas a este trabalho — ver documento 05).
- `tsc --noEmit` limpo em toda a branch.

## Índice

1. [Arquitetura Multi-Tenant](01-arquitetura-multitenant.md) — isolamento por loja, autenticação unificada, sessão, "esqueci minha senha".
2. [Planos, Assinaturas e Pagamentos](02-planos-assinaturas-pagamentos.md) — trial, ASAAS, checkout, troca de plano, cancelamento.
3. [E-mails, Notificações e Logs](03-emails-notificacoes-logs.md) — e-mails transacionais, sininho in-app, job de trial, tela de logs do Super Admin.
4. [Segurança e Validação de Dados](04-seguranca-validacao-dados.md) — CPF/CNPJ, telefone, e-mail, rate limiting, criptografia, isolamento cross-tenant.
5. [Pendências Críticas e Prontidão pra Lançamento](05-pendencias-criticas-lancamento.md) — o que falta, o que é bloqueante, o que é urgente.

## Como este material se relaciona com o resto de `docs/`

- [`MULTI_TENANT_IMPLEMENTACAO.md`](../MULTI_TENANT_IMPLEMENTACAO.md) é o **changelog técnico fase a fase** (Fase 1 até Fase V), cronológico, com detalhe de commit-por-commit de cada mudança — é a fonte primária, mais granular que estes documentos. Os documentos aqui reorganizam o mesmo conteúdo **por assunto**, pra quem está entrando no projeto agora e quer entender "como funciona X" sem ler 700+ linhas em ordem cronológica.
- [`multitenant-saas-implementation-plan.md`](../multitenant-saas-implementation-plan.md) é o plano **original**, anterior a toda essa implementação — várias premissas dele já foram superadas pelo código real. Mantido por histórico, não é mais a referência de estado atual.
- [`MULTITENANT_STATUS_QA.md`](../MULTITENANT_STATUS_QA.md) e [`multitenant-phase1-test-guide.md`](../multitenant-phase1-test-guide.md) documentam a fase inicial (os 2 commits já commitados) — anteriores a todo o trabalho descrito aqui.

Quando um documento aqui e o `MULTI_TENANT_IMPLEMENTACAO.md` divergirem em algum detalhe, o changelog fase a fase é a fonte de verdade (foi escrito e validado no mesmo momento em que o código foi testado).
