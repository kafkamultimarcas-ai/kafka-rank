# Auditoria de Segurança - Kafka Rank

> ⚠️ **Desatualizado**: este documento é anterior à branch `feat/multi-tenant`. Vários itens listados como pendentes aqui (rate limiting, headers de segurança) já foram resolvidos — ver [`docs/multi-tenant/09-analise-prontidao-vendas.md`](docs/multi-tenant/09-analise-prontidao-vendas.md) pro estado atual reconciliado.

## Resultados da Análise

### POSITIVO (Já implementado)
1. **SQL Injection: PROTEGIDO** - Usa Drizzle ORM com queries parametrizadas. Nenhum SQL raw com input de usuário.
2. **XSS: PROTEGIDO** - React escapa HTML automaticamente. Único dangerouslySetInnerHTML é no chart.tsx (sem input de usuário).
3. **Exposição de passwordHash: PROTEGIDO** - listSellers/getSellerById usam safeSellerColumns que exclui passwordHash.
4. **Cookies: PROTEGIDO** - httpOnly: true, secure: true (em HTTPS), sameSite: "none", path: "/".
5. **Senhas: PROTEGIDO** - Usa bcrypt com salt rounds 10 para hash de senhas.
6. **JWT: PROTEGIDO** - Tokens assinados com JWT_SECRET, expiração de 30 dias.
7. **Webhooks API: PROTEGIDO** - Validação por x-api-token header em rotas sensíveis.
8. **Validação de Input: PROTEGIDO** - Zod valida todos os inputs das rotas tRPC.
9. **Admin routes: PROTEGIDO** - adminProcedure verifica autenticação OAuth do dono.

### VULNERABILIDADES ENCONTRADAS (Para corrigir)

#### ALTA PRIORIDADE
1. **Sem Rate Limiting** - Login de vendedor/gerente sem proteção contra brute force
2. **Sem Headers de Segurança** - Falta helmet (X-Frame-Options, CSP, HSTS, etc.)
3. **Upload sem limite de tamanho** - base64 strings sem z.string().max() permite DoS
4. **Código de acesso em texto plano** - Armazenado sem hash no banco

#### MÉDIA PRIORIDADE
5. **Upload sem validação de tipo** - saleDocuments aceita qualquer base64 sem verificar mime type
6. **Widget webhook sem rate limit** - /api/webhooks/widget/lead é público e pode ser spammado
7. **Rotas de vendedor como publicProcedure** - uploadCnh/uploadComprovante deveriam verificar sellerId

#### BAIXA PRIORIDADE
8. **Body parser 50MB** - Limite alto pode permitir payloads grandes
