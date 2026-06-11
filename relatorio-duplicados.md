# Relatório de Lançamentos Duplicados - Kafka Rank

Data da análise: 11/06/2026

---

## VENDAS - Duplicados por Placa

**Nenhuma venda duplicada por placa encontrada no momento.**

---

## VENDAS - Duplicados por CPF (mesmo CPF, mês diferente de veículo)

| ID | Veículo | Placa | CPF | Cliente | Valor | Status | Data | Vendedor |
|---|---|---|---|---|---|---|---|---|
| 1350002 | Fiat Punto 2014 | MMD0E15 | 526.989.804-78 | Carlos Herbert neves | R$ 38.990 | Aprovado | 19/05/2026 | Guilherme Constantino |
| 1350003 | New fiesta | MFU1710 | 526.989.804-78 | Raquel Diogo gonçalves | R$ 33.500 | Aprovado | 23/05/2026 | Guilherme Constantino |
| 1080001 | Outlander branca | PXC9I89 | 62163744949 | Joana Ferreira | R$ 89 | Aprovado | 18/05/2026 | Matheus |
| 1080002 | Ix35 branca | - | 62163744949 | Daniel Avila | R$ 0 | Aprovado | 18/05/2026 | Matheus |

**Observação:** O CPF 526.989.804-78 aparece em 2 vendas diferentes (Fiat Punto e New Fiesta) pelo mesmo vendedor Guilherme Constantino em maio/2026. Pode ser legítimo (cliente comprou 2 carros) ou erro de CPF.

O CPF 62163744949 aparece em 2 vendas do Matheus com valores suspeitos (R$ 89 e R$ 0).

---

## F&I - Duplicados por Placa

| ID | Placa | CPF | Cliente | Banco | Valor Financiado | Status | Data | Vendedor |
|---|---|---|---|---|---|---|---|---|
| 30001 | QIM6D40 | - | - | SANTANDER | R$ 57.000 | Aprovado | 27/03/2026 | Andréia Vieegas |
| (outro) | QIM6D40 | - | - | SANTANDER | R$ 57.000 | Aprovado | 27/03/2026 | Andréia Vieegas |

---

## DESPACHANTE - Duplicados por Placa (Transferências)

| Placa | Registros Duplicados | Vendedor | Mês |
|---|---|---|---|
| **FHA7I14** | 2 registros (IDs 180016, 180037) | Rafaela Simões | Jun/2026 |
| **ISM4F62** | 2 registros (IDs 1, 30009) | Rafaela Simões | Mar/2026 |
| **MIQ3757** | 2 registros (IDs 180019, 180020) | Rafaela Simões | Jun/2026 |
| **PQE7A07** | 3 registros (IDs 180025, 180027, 180028) | Rafaela Simões | Jun/2026 |
| **PUM8E12** | 2 registros (IDs 180022, 180038) | Rafaela Simões | Jun/2026 |
| **QHM8075** | 2 registros (IDs 90001, 90003) | Rafaela Simões | Mai/2026 |
| **QIM6D40** | 2 registros (IDs 30005, 30006) | Rafaela Simões | Mar/2026 |
| **RVI3G63** | 3 registros (IDs 180023, 180024, 210002) | Rafaela Simões | Jun/2026 |

**Observação importante:** Muitos dos duplicados no despachante são da **Rafaela Simões** que registrou a mesma placa 2-3 vezes no mesmo dia. Parece ser um padrão: ela registra uma vez sem "cliente pagou" e outra vez com "cliente pagou" para a mesma placa. Isso está inflando os pontos dela.

---

## Resumo

| Setor | Duplicados Encontrados |
|---|---|
| Vendas (placa) | 0 |
| Vendas (CPF) | 4 registros (2 pares) |
| F&I (placa) | 2 registros |
| Despachante (placa) | 18 registros (8 placas) |
| **Total** | **24 registros duplicados** |

---

## Ação Implementada

A partir de agora, o sistema **bloqueia automaticamente** lançamentos duplicados:
- Mesma placa no mesmo mês = BLOQUEADO
- Mesmo CPF no mesmo mês = BLOQUEADO
- Funciona em: Vendas, F&I, Despachante, Consignação
