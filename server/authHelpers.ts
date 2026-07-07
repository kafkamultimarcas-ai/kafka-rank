import type { TrpcContext } from "./_core/context";

/**
 * Retorna o sellerId real da sessão autenticada (derivado do JWT, nunca do
 * input do cliente) quando quem está logado é um vendedor comum. Retorna
 * null se não houver sessão de vendedor, ou se o vendedor for "gerente"
 * (que enxerga os dados de todo mundo, igual admin).
 *
 * Uso: qualquer endpoint que recebe um `sellerId` no input e serve dados
 * pessoais/sensíveis de vendedor DEVE cruzar o valor recebido com o retorno
 * desta função antes de usar — sessão de vendedor nunca pode pedir dado de
 * outro sellerId; sessão de admin/gerente (retorno null) pode.
 */
export async function getPrivacySellerId(ctx: TrpcContext): Promise<number | null> {
  if (!ctx.user || ctx.user.actorType !== "seller") return null;
  if (ctx.user.sellerRole === "gerente") return null; // gerente vê tudo
  return ctx.user.id;
}
