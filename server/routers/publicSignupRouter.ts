import { z } from "zod";
import jwt from "jsonwebtoken";
import { publicProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import { provisionTenant, checkSignupAvailability } from "../tenantProvisioning";
import { sendSignupWelcomeEmail } from "../emailService";
import { getRequestOrigin } from "../_core/cookies";
import { TRIAL_PLAN_LIMITS } from "../../shared/plans";

export const publicSignupRouter = router({
  // Checagem em tempo real de disponibilidade de email (obrigatório) e do slug (opcional,
  // usuário pode ver o preview do slug gerado antes de submeter).
  checkAvailability: publicProcedure
    .input(z.object({
      slug: z.string().min(2).optional(),
      adminEmail: z.string().min(3).optional(),
    }))
    .query(async ({ input }) => {
      return checkSignupAvailability({
        slug: input.slug,
        adminEmail: input.adminEmail,
      });
    }),

  // Cria uma loja nova em plano trial. O slug é gerado automaticamente a partir
  // do nome da loja; o email do admin é a identidade única de login.
  create: publicProcedure
    .input(z.object({
      name: z.string().min(2, "Nome da loja muito curto"),
      phone: z.string().optional(),
      email: z.string().email("E-mail inválido"),
      city: z.string().optional(),
      state: z.string().max(2).optional(),
      adminName: z.string().min(2, "Nome muito curto"),
      adminEmail: z.string().email("E-mail do administrador inválido"),
      adminPassword: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
      acceptedTerms: z.literal(true, { message: "É preciso aceitar os Termos de Uso" }),
      honeypot: z.string().max(0, "Cadastro inválido").optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.honeypot) {
        throw new Error("Não foi possível concluir o cadastro. Tente novamente.");
      }

      const { tenantId, slug, adminId, adminEmail } = await provisionTenant({
        name: input.name,
        slug: input.name,
        phone: input.phone,
        email: input.email,
        city: input.city,
        state: input.state,
        plan: "trial",
        maxSellers: TRIAL_PLAN_LIMITS.maxSellers,
        maxAdmins: TRIAL_PLAN_LIMITS.maxAdmins,
        adminEmail: input.adminEmail,
        adminPassword: input.adminPassword,
        adminName: input.adminName,
      });

      const token = jwt.sign(
        { adminId, role: "owner", type: "admin_auth", tenantId, tenantSlug: slug },
        ENV.cookieSecret,
        { expiresIn: "30d" }
      );

      const loginUrl = `${getRequestOrigin(ctx.req)}/login`;
      await sendSignupWelcomeEmail(adminEmail, input.name, loginUrl, tenantId);

      return { tenantId, slug, token, redirectPath: "/admin", adminEmail };
    }),
});
