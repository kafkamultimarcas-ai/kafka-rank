# Relatório de Auditoria SaaS - Kafka Rank

> ⚠️ **Desatualizado**: este documento é anterior à branch `feat/multi-tenant`. Os itens críticos apontados aqui (tenantId no JWT, Z-API global, hardcode "kafka") já foram resolvidos nessa branch — ver [`docs/multi-tenant/09-analise-prontidao-vendas.md`](docs/multi-tenant/09-analise-prontidao-vendas.md) pro estado atual reconciliado.

**Data:** 03/04/2026  
**Versão:** fb9b15ca → b96d9fe1  
**Objetivo:** Avaliar a prontidão do sistema para implantação multi-loja (SaaS)

---

## 1. Resumo Executivo

O sistema Kafka Rank está **85% pronto para implantação SaaS**. A arquitetura multi-tenant está sólida com isolamento completo de dados. Os 15% restantes são ajustes de UX, onboarding automatizado e configurações por loja.

---

## 2. Pontos Fortes (O que já funciona)

### 2.1 Isolamento Multi-Tenant
- **57 tabelas** com campo `tenantId` para isolamento de dados
- **338 pontos** de filtragem com `getCurrentTenantId()` no código
- **257 queries** filtradas por tenant no backend
- **Testes de segurança** automatizados verificando isolamento
- Cache de tenant com TTL para performance

### 2.2 Gestão de Lojas (SuperAdmin)
- Portal SuperAdmin com login independente
- CRUD completo de lojas (criar, editar, suspender, cancelar)
- Configuração de branding por loja (logo, cores)
- Configuração de plano e limites (max vendedores, max admins)
- Módulos habilitáveis por loja (ranking, CRM, financeiro, etc.)
- Integração WhatsApp (Z-API) por loja
- Reset de senha de admins pelo SuperAdmin

### 2.3 Login Independente
- Login admin com usuário/senha (sem depender de Manus OAuth)
- Primeiro acesso com troca de senha obrigatória
- SuperAdmin cria login para novos admins
- Reset de senha pelo painel

### 2.4 Módulos Completos
| Módulo | Status | Observações |
|--------|--------|-------------|
| Ranking de Vendas | Completo | Vendas, F&I, Consignação, Despachante, SDR |
| CRM | Completo | Pipeline, leads, mensagens, integrações |
| Financeiro | Completo | Dashboard, contas, pós-venda, relatórios |
| Pós-Venda | Completo | Chamados, oficinas, orçamentos, gastos |
| Competições | Completo | Mata-mata, equipes, brackets |
| Metas | Completo | Individuais com aceitação, histórico |
| Treinamentos | Completo | Vídeos, planos de ação |
| Marketing | Completo | Estratégias, tarefas |
| Mesa de Crédito | Completo | Fichas, bancos, status |
| IAM | Completo | Permissões por módulo |
| Aniversariantes | Completo | Disparo WhatsApp |

---

## 3. Problemas Identificados e Melhorias Necessárias

### 3.1 CRÍTICO - Login Admin sem TenantId no JWT

**Problema:** O JWT do admin (`adminAuth.login`) não inclui `tenantId` explicitamente. O sistema resolve o tenant pelo `admin.tenantId` na tabela `admins`, mas se um admin for criado sem `tenantId` correto, ele pode acessar dados de outra loja.

**Solução:** Incluir `tenantId` no JWT e validar no middleware.

**Prioridade:** ALTA

### 3.2 CRÍTICO - Hardcoded "kafka" no autoLogin

**Problema:** A rota `adminAuth.autoLogin` busca o admin com username "kafka" hardcoded. Isso só funciona para a loja Kafka Multimarcas.

**Solução:** Remover ou tornar dinâmico baseado no tenant do contexto.

**Prioridade:** ALTA

### 3.3 IMPORTANTE - Onboarding de Nova Loja

**Problema:** Ao criar uma nova loja, o sistema cria:
- Tenant com dados básicos
- 1 admin com usuário/senha
- Pipeline stages padrão
- Categorias financeiras padrão

**Faltam:**
- Configuração inicial de departamentos
- Template de mensagens WhatsApp
- Configuração de pontuação padrão
- Guia de primeiro acesso para o admin

**Prioridade:** MÉDIA

### 3.4 IMPORTANTE - WhatsApp por Loja

**Problema:** As credenciais Z-API estão como variáveis de ambiente globais (`ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN`). Para multi-loja, cada loja precisa ter suas próprias credenciais.

**Status:** A tabela `tenants` já tem campos `zapiInstanceId`, `zapiToken`, `zapiClientToken`, mas o código do WhatsApp ainda usa as variáveis de ambiente globais.

**Solução:** Alterar o serviço de WhatsApp para buscar credenciais do tenant atual.

**Prioridade:** ALTA

### 3.5 IMPORTANTE - Branding Dinâmico

**Problema:** As cores e logo do sistema são fixas (Kafka Rank). Para SaaS, cada loja precisa ver seu próprio branding.

**Status:** A tabela `tenants` já tem `primaryColor`, `secondaryColor`, `logoUrl`, mas o frontend não usa esses valores dinamicamente.

**Solução:** Criar um contexto de branding que carrega as cores/logo do tenant e aplica no CSS.

**Prioridade:** MÉDIA

### 3.6 MENOR - Backup por Loja

**Problema:** Não existe funcionalidade de backup/exportação de dados por loja.

**Solução:** Criar endpoint que exporta todos os dados de um tenant em JSON/CSV.

**Prioridade:** BAIXA

### 3.7 MENOR - Relatórios por Loja no SuperAdmin

**Problema:** O dashboard do SuperAdmin mostra estatísticas básicas (vendedores, vendas, leads). Faltam relatórios detalhados por loja.

**Solução:** Adicionar relatórios de uso, receita, engajamento por loja.

**Prioridade:** BAIXA

---

## 4. Checklist de Implantação de Nova Loja

### Pré-requisitos
- [ ] Dados da loja (nome, endereço, telefone, email)
- [ ] Logo da loja (PNG/JPG)
- [ ] Cores da marca (primária e secundária)
- [ ] Credenciais Z-API da loja (se usar WhatsApp)
- [ ] Lista de vendedores com departamentos
- [ ] Definição de módulos a habilitar

### Passos de Implantação
1. [ ] Acessar Portal SuperAdmin
2. [ ] Criar nova loja com dados básicos
3. [ ] Configurar branding (logo, cores)
4. [ ] Configurar módulos habilitados
5. [ ] Criar admin da loja (email + senha temporária)
6. [ ] Configurar integração WhatsApp (Z-API)
7. [ ] Admin faz primeiro acesso e troca senha
8. [ ] Admin cadastra vendedores
9. [ ] Admin configura pipeline CRM
10. [ ] Admin configura categorias financeiras
11. [ ] Testar fluxo completo (venda → aprovação → ranking)

---

## 5. Estimativa de Esforço para 100% SaaS

| Item | Esforço | Prioridade |
|------|---------|------------|
| Fix autoLogin hardcoded | 1h | ALTA |
| WhatsApp por tenant | 3h | ALTA |
| TenantId no JWT admin | 2h | ALTA |
| Branding dinâmico | 4h | MÉDIA |
| Onboarding wizard | 6h | MÉDIA |
| Backup por loja | 3h | BAIXA |
| Relatórios SuperAdmin | 4h | BAIXA |
| **Total estimado** | **23h** | - |

---

## 6. Conclusão

O Kafka Rank tem uma base sólida para SaaS. Os itens críticos (3.1, 3.2, 3.4) devem ser resolvidos antes da primeira implantação externa. Os demais podem ser implementados gradualmente.

**Recomendação:** Resolver os 3 itens críticos (6h de trabalho) e fazer a primeira implantação como piloto, coletando feedback para priorizar as melhorias seguintes.
