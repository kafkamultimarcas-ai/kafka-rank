import { trpc } from "@/lib/trpc";

const ADMIN_TOKEN_KEY = "crm_admin_token";

export function useAdminAuth() {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  const { data: admin, isLoading } = trpc.adminAuth.me.useQuery(
    { token: token || "" },
    { enabled: !!token, retry: false, refetchOnWindowFocus: false }
  );
  const logout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    window.location.reload();
  };
  return { admin, isLoading, isAuthenticated: !!admin, token, logout };
}
