# Pendências Críticas e Prontidão pra Lançamento

Consolidado de tudo que ainda falta, organizado por urgência real — não por ordem de descoberta. Se for ler um documento só antes de decidir "dá pra vender pra loja de verdade", é este.

## 0. Risco operacional imediato (não é sobre features — é sobre não perder o trabalho)

Isso é o item mais urgente de todos, e é o único que não tem nada a ver com código:

- **69 arquivos entre modificados e novos na branch `feat/multi-tenant` nunca foram commitados.** Tudo documentado nesta pasta (`docs/multi-tenant/`) e no changelog fase a fase (`docs/MULTI_TENANT_IMPLEMENTACAO.md`) — Fases F até V inteiras — existe **só nesta máquina, no working tree**. Se o ambiente local for perdido/resetado antes de um commit, esse trabalho todo some.
- **Ação recomendada, antes de qualquer outra coisa desta lista**: revisar e commitar esse trabalho (em um ou mais commits organizados por assunto), e depois decidir sobre push pro remoto. Isso não foi feito até agora porque não foi pedido — mas é literalmente o item de maior risco no projeto neste momento.

## 1. P0 — bloqueiam qualquer venda/piloto real com dinheiro de verdade

Sem isso, não abrir pra nenhuma loja fora de um teste 100% controlado.

1. **Rodar as migrations 0064–0073 em staging/produção.** Só validadas contra o banco de desenvolvimento local. A migration `0065` (unicidade de username por tenant) exige auditoria prévia de duplicatas nos dados reais antes de aplicar — se já existir duplicata, a migration falha. As demais são mais simples (`CREATE TABLE`/`ALTER TABLE ADD COLUMN`), mas nenhuma foi testada contra volume de produção.
2. **Validar a integração com ASAAS contra o sandbox real.** Toda a Fase S/T foi construída em cima da documentação oficial pesquisada e de mocks nos testes — nunca rodou uma chamada de verdade pra API da ASAAS (`ASAAS_API_KEY` não configurada neste ambiente). Antes de qualquer loja pagar de verdade: preencher a chave sandbox, cadastrar o webhook no painel deles apontando pra `/api/webhooks/asaas`, e rodar o fluxo completo manualmente (assinar → pagar no sandbox → confirmar que o webhook chega e ativa a loja → testar troca de plano → testar cancelamento).
3. **Nada foi verificado visualmente em navegador em toda esta sessão de trabalho** (sem ferramenta de preview disponível pro projeto neste ambiente). Cadastro self-service, checkout/assinatura, "esqueci minha senha", tela de logs do Super Admin — tudo validado via `curl`/testes automatizados de integração contra banco real, nunca aberto numa tela de verdade. Antes de qualquer usuário real usar essas telas, alguém precisa clicar em cada uma.
4. **E-mail nunca testado com o Resend de verdade.** Toda a Fase V (boas-vindas, confirmação de assinatura, aviso de trial, reset de senha) foi validada só com o log no console (sem `RESEND_API_KEY` configurada) — o HTML dos e-mails nunca foi visto renderizado numa caixa de entrada real, nem testado spam score/deliverability.

## 2. P1 — importante, mas não impede um piloto controlado com poucas lojas de confiança

5. **Sem revogação de sessão.** JWT de admin/gerente/vendedor dura 30 dias e não existe blacklist — um funcionário demitido ou uma senha trocada não invalida um token já emitido antes disso. Numa venda real (não só um piloto interno), isso é o tipo de gap que vira problema de segurança/compliance.
6. **Cobertura incompleta de eventos do webhook ASAAS.** Só `PAYMENT_CONFIRMED`/`RECEIVED`/`OVERDUE` mudam o estado da loja automaticamente. `PAYMENT_DELETED`, `PAYMENT_REFUNDED` e eventos de chargeback ficam só no log (com um badge de alerta pro Super Admin desde a Fase V) — **não há reação automática** (ex: suspender a loja num chargeback confirmado é uma decisão manual hoje).
7. **Sem rede de segurança se um webhook se perder.** Se o servidor cair no exato momento de uma confirmação de pagamento, a loja fica presa em "trial vencido"/"suspenso" mesmo tendo pago, até alguém perceber manualmente. Falta um job de reconciliação (ex: de hora em hora, comparar assinaturas com pagamento pendente há muito tempo contra o estado real na ASAAS).
8. **`moduleRequiredProcedure` só está em Marketing.** CRM, Financeiro, Pós-venda, Estoque e IAM não têm esse enforcement de módulo/plano na própria procedure — hoje protegidos por outras camadas, mas sem essa defesa em profundidade específica.
9. **Auditoria de segurança cross-tenant cobre só os pontos críticos** (auth, webhooks, Z-API, config de IA, limites de plano, uploads, reset de senha). Não existe uma suíte sistemática de "ataque" cobrindo todo o CRM/financeiro linha a linha.
10. **Auditoria completa de SQL raw no fluxo do Atendente IA** (`ai-attendant.ts` tem dezenas de queries filtradas só por `leadId`, não por `tenantId` direto) — hoje seguro transitivamente (todo `leadId` já pertence ao tenant certo), mas sem defesa em profundidade.

## 3. P2 — crescimento comercial, não bloqueia lançamento controlado

11. **"Primeiras 100 lojas" não tem enforcement real** — é só texto fixo na tela de preço, ninguém conta quantas lojas já assinaram nem trava o preço promocional depois da 100ª.
12. **Super Admin sem dashboard de negócio** (MRR, churn, taxa de conversão trial→pago) — a tela de logs (Fase V) só lista eventos crus, não agrega métricas.
13. **Sem tela de atualizar dados de cobrança** (CPF/CNPJ, e-mail) depois que já foram informados uma vez no checkout.
14. **Branding dos templates de campanha em `CrmAdminDashboard.tsx`** bloqueado por uma questão de encoding de arquivo — precisa de outra abordagem de edição pra resolver.
15. **Error tracking com correlação de `tenantId`, expurgo de dado no soft-delete de tenant, e-mail automático de onboarding mais completo** — relevantes pra operar com múltiplos clientes reais, não bloqueantes pra um piloto.
16. **E-mail de boas-vindas de vendedor/gerente linka só pro login geral**, não pra um link de primeiro acesso direto e seguro.

## 4. P3 — fora de escopo por decisão deliberada (não é dívida técnica, é escopo)

17. Emissão de nota fiscal (NF-e) — responsabilidade separada, ASAAS não emite automaticamente.
18. Cupom/desconto genérico configurável (além do fixo de lançamento).
19. Textos de "Quem Somos", Termos de Uso e Política de Privacidade no cadastro self-service são placeholder — precisam de revisão jurídica/humana antes de produção, não é um problema técnico.

## 5. Resumo executivo: se eu só pudesse fazer 3 coisas antes de vender pra loja de verdade

1. **Commitar o trabalho** (item 0) — sem isso, tudo abaixo é teórico, o código nem está seguro.
2. **Rodar as migrations em staging + validar ASAAS no sandbox real** (itens 1 e 2) — sem isso, "funciona" só quer dizer "funciona na minha máquina".
3. **Abrir cada tela nova num navegador de verdade pelo menos uma vez** (item 3) — todo o resto foi validado por trás (banco, API), mas ninguém olhou a experiência real de quem vai usar.

Depois disso, o item 5 (revogação de sessão) é o próximo com maior risco/impacto por esforço relativamente baixo.
