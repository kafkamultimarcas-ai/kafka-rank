import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getPublicTenantBySlug } from "../tenantService";

export const tenantPublicRouter = router({
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ input }) => {
      return getPublicTenantBySlug(input.slug.trim().toLowerCase());
    }),

  current: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantSlug) return null;
    return getPublicTenantBySlug(ctx.tenantSlug);
  }),
});
