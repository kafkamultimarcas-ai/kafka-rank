import { z } from "zod";
import jwt from "jsonwebtoken";
import { publicProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import { provisionTenant, checkSlugAndUsernameAvailability } from "../tenantProvisioning";
import { sendSignupWelcomeEmail } from "../emailService";
import { getRequestOrigin } from "../_core/cookies";

// Limites fixos para lojas criadas via autosserviço público (sem curadoria de um
// humano por trás) — mais apertados que o trial padrão criado manualmente pelo
// Super Admin (10 vendedores / 2 admins). Dá pra afrouxar depois, se fizer sentido.
const SELF_SIGNUP_MAX_SELLERS = 5;
const SELF_SIGNUP_MAX_ADMINS = 1;

const slugRegex = /^[a-z0-9-]+$/;

export const publicSignupRouter = router({
  // Checagem de disponibilidade de slug/username sem exigir autenticação — usado
  // pelo formulário público de cadastro pra dar feedback em tempo real (mesmo
  // padrão de UX do formulário do Super Admin, que continua exigindo token).
  checkAvailability: publicProcedure
    .input(z.object({
      slug: z.string().min(2).regex(slugRegex).optional(),
      adminUsername: z.string().min(3).optional(),
    }))
    .query(async ({ input }) => {
      return checkSlugAndUsernameAvailability({
        slug: input.slug,
        adminUsername: input.adminUsername,
      });
    }),

  // Cria uma loja nova em plano trial, sem intervenção do Super Admin. Protegido
  // por rate limit dedicado (ver server/_core/index.ts) e por um honeypot simples
  // contra bots — não existe CAPTCHA nem verificação de e-mail no app hoje.
  create: publicProcedure
    .input(z.object({
      name: z.string().min(2, "Nome da loja muito curto"),
      slug: z.string().min(2).regex(slugRegex, "Use apenas letras minúsculas, números e hífen"),
      phone: z.string().optional(),
      email: z.string().email("E-mail inválido"),
      city: z.string().optional(),
      state: z.string().max(2).optional(),
      adminName: z.string().min(2, "Nome muito curto"),
      adminUsername: z.string().min(3, "Login muito curto"),
      adminPassword: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
      acceptedTerms: z.literal(true, { message: "É preciso aceitar os Termos de Uso" }),
      // Campo honeypot: deve vir sempre vazio. Bots que preenchem todos os campos
      // do formulário tendem a preencher este também, já que ele é escondido via
      // CSS e não JS (não some de um scraper simples).
      honeypot: z.string().max(0, "Cadastro inválido").optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.honeypot) {
        // Falha silenciosa e genérica — não dar dica pro bot do que deu errado.
        throw new Error("Não foi possível concluir o cadastro. Tente novamente.");
      }

      const slug = input.slug.trim().toLowerCase();
      const adminUsername = input.adminUsername.trim().toLowerCase();

      const { tenantId, adminId } = await provisionTenant({
        name: input.name,
        slug,
        phone: input.phone,
        email: input.email,
        city: input.city,
        state: input.state,
        plan: "trial",
        maxSellers: SELF_SIGNUP_MAX_SELLERS,
        maxAdmins: SELF_SIGNUP_MAX_ADMINS,
        adminUsername,
        adminPassword: input.adminPassword,
        adminName: input.adminName,
      });

      // Devolve o mesmo formato de token que tenantAuth.login/adminAuth.login já
      // emitem — o frontend trata a resposta como um login de admin bem-sucedido
      // e cai direto no painel da loja recém-criada.
      const token = jwt.sign(
        { adminId, role: "owner", type: "admin_auth", tenantId, tenantSlug: slug },
        ENV.cookieSecret,
        { expiresIn: "30d" }
      );

      const storeUrl = `${getRequestOrigin(ctx.req)}/t/${slug}/login`;
      await sendSignupWelcomeEmail(input.email, input.name, storeUrl, tenantId);

      return { tenantId, slug, token, redirectPath: "/crm/admin" };
    }),
});
