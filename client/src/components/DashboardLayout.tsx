import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { buildTenantPath, getCurrentTenantSlug, getTenantLoginPath } from "@/lib/tenant";
import { useBranding } from "@/contexts/TenantContext";
import { trpc } from "@/lib/trpc";
import { LayoutDashboard, Users, Trophy, ShoppingCart, GraduationCap, ClipboardList, LogOut, PanelLeft, Flag, Home, Settings, CheckCircle, Target, Monitor, Gift, CalendarClock, Lock, UserCog, LayoutGrid, Warehouse, Banknote, Wrench, DollarSign, Bot, FileText, Car, CalendarDays, Cake, CreditCard, Tv, ChevronDown, Building2 } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import TrialStatusBanner from "./TrialStatusBanner";
import { StoreLoginPicker } from "./StoreLoginPicker";
import { Button } from "./ui/button";
import { toast } from "sonner";

type MenuItem = { icon: typeof Home; label: string; path: string; ownerOnly?: boolean };
type MenuGroup = { key: string; label: string; items: MenuItem[] };

// Menu agrupado por módulo. Cada grupo pode ser recolhido/expandido na sidebar.
const MENU_GROUPS: MenuGroup[] = [
  {
    key: "principal", label: "Principal", items: [
      { icon: LayoutDashboard, label: "Visão Geral", path: "/admin" },
      { icon: CheckCircle, label: "Aprovar Vendas", path: "/admin/aprovacoes" },
      { icon: Tv, label: "TV / Corrida", path: "/tv" },
    ],
  },
  {
    key: "vendas", label: "Vendas", items: [
      { icon: ShoppingCart, label: "Vendas", path: "/admin/vendas" },
      { icon: Banknote, label: "F&I", path: "/admin/fei" },
      { icon: Target, label: "Metas", path: "/admin/metas" },
      { icon: Trophy, label: "Competições", path: "/admin/competicoes" },
      { icon: Gift, label: "Carros Bônus", path: "/admin/bonus-veiculos" },
    ],
  },
  {
    key: "equipe", label: "Equipe", items: [
      { icon: Users, label: "Equipe", path: "/admin/vendedores" },
      { icon: UserCog, label: "Gerentes", path: "/admin/gerentes", ownerOnly: true },
      { icon: GraduationCap, label: "Treinamentos", path: "/admin/treinamentos" },
      { icon: ClipboardList, label: "Planos de Ação", path: "/admin/planos" },
    ],
  },
  {
    key: "crm", label: "CRM & Marketing", items: [
      { icon: LayoutGrid, label: "CRM Gerente", path: "/crm/admin" },
      { icon: CalendarClock, label: "Agendamentos", path: "/admin/agendamentos" },
      { icon: Cake, label: "Aniversariantes", path: "/admin/aniversariantes" },
      { icon: Flag, label: "Marketing", path: "/admin/marketing" },
    ],
  },
  {
    key: "estoque", label: "Estoque", items: [
      { icon: Car, label: "Estoque", path: "/admin/estoque" },
      { icon: Car, label: "Custo por Veículo", path: "/admin/custo-veiculo" },
      { icon: Warehouse, label: "Consignação", path: "/controle-patio" },
    ],
  },
  {
    key: "financeiro", label: "Financeiro", items: [
      { icon: DollarSign, label: "Financeiro", path: "/admin/financeiro" },
      { icon: DollarSign, label: "Caixa da Loja", path: "/financeiro" },
      { icon: Users, label: "Financeiro Vendedores", path: "/admin/financeiro-vendedores" },
      { icon: Warehouse, label: "Fornecedores", path: "/admin/fornecedores" },
      { icon: CalendarDays, label: "Virada de Mês", path: "/admin/virada-mes" },
    ],
  },
  {
    key: "posvenda", label: "Pós-Venda", items: [
      { icon: Wrench, label: "Pós-Venda", path: "/admin/pos-venda" },
      { icon: Building2, label: "Oficinas", path: "/admin/oficinas" },
      { icon: DollarSign, label: "Gastos Pós-Venda", path: "/admin/pv-financeiro" },
    ],
  },
  {
    key: "ferramentas", label: "Ferramentas & Conta", items: [
      { icon: Bot, label: "Ajustar IA", path: "/admin/iam" },
      { icon: FileText, label: "Documentos", path: "/admin/documentos" },
      { icon: Settings, label: "Ajustes", path: "/admin/configuracoes" },
      { icon: CreditCard, label: "Assinatura", path: "/assinatura" },
    ],
  },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const SIDEBAR_GROUPS_OPEN_KEY = "sidebar-groups-open";
const MAX_OPEN_GROUPS = 2;
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

function TenantLoginRedirect({ tenantSlug }: { tenantSlug: string }) {
  useEffect(() => {
    window.location.replace(getTenantLoginPath(tenantSlug));
  }, [tenantSlug]);

  return <DashboardLayoutSkeleton />;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenantSlug = getCurrentTenantSlug();
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const managerQuery = trpc.managers.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const sellerQuery = trpc.sellers.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const billingQuery = trpc.billing.getMyPlan.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !!user && user.role === "admin",
  });
  const isManagerLoading = managerQuery.isLoading;
  const isSellerLoading = sellerQuery.isLoading;

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading || isManagerLoading || isSellerLoading) {
    return <DashboardLayoutSkeleton />
  }

  // Owner logged in via OAuth
  const isOwner = user && user.role === "admin" && (user.id > 0);
  // Manager logged in via password (managers table)
  const isManager = managerQuery.data && managerQuery.data.role === "manager";
  // Seller-gerente logged in via seller login
  const isSellerGerente = sellerQuery.data && sellerQuery.data.sellerRole === 'gerente';
  const isSellerFinanceiro = sellerQuery.data?.department === "financeiro";
  const canAccessFinanceiroAdmin = isSellerFinanceiro && /\/admin\/financeiro(?:\/)?$/i.test(currentPath);

  if (!isOwner && !isManager && !isSellerGerente && !canAccessFinanceiroAdmin) {
    if (tenantSlug) {
      return <TenantLoginRedirect tenantSlug={tenantSlug} />;
    }
    window.location.replace("/login");
    return <DashboardLayoutSkeleton />;
  }

  const displayName = isOwner 
    ? (user?.name || "Gerente") 
    : isManager 
      ? (managerQuery.data?.name || "Gerente") 
      : (sellerQuery.data?.nickname || sellerQuery.data?.name || "Gerente");
  const displayEmail = isOwner 
    ? (user?.email || "") 
    : isManager 
      ? "Gerente" 
      : isSellerFinanceiro
        ? "Financeiro"
        : "Gerente";
  const showOwnerItems = !!isOwner;

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <DashboardLayoutContent
        setSidebarWidth={setSidebarWidth}
        displayName={displayName}
        displayEmail={displayEmail}
        showOwnerItems={showOwnerItems}
        isManager={!!isManager || !!isSellerGerente}
        isSellerGerente={!!isSellerGerente}
        isSellerFinanceiro={!!isSellerFinanceiro}
        tenantSlug={tenantSlug}
        trialEndsAt={
          managerQuery.data?.trialEndsAt ??
          sellerQuery.data?.trialEndsAt ??
          billingQuery.data?.trialEndsAt ??
          null
        }
        subscriptionSuspended={
          managerQuery.data?.subscriptionSuspended ??
          sellerQuery.data?.subscriptionSuspended ??
          (billingQuery.data?.status === "suspended")
        }
      >
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function ManagerLoginScreen() {
  useEffect(() => {
    window.location.replace("/login");
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-heading font-bold tracking-tight text-center text-foreground">
            Painel Administrativo
          </h1>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Selecione sua loja para acessar o gerenciamento da competição de vendas.
          </p>
        </div>

        <div className="w-full rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
          O acesso agora acontece pelo login único com e-mail e senha.
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>ou</span>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Login como Proprietário (Manus)
          </Button>
        </div>
      </div>
    </div>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
  displayName: string;
  displayEmail: string;
  showOwnerItems: boolean;
  isManager: boolean;
  isSellerGerente?: boolean;
  isSellerFinanceiro?: boolean;
  tenantSlug: string | null;
  trialEndsAt: number | null;
  subscriptionSuspended: boolean;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
  displayName,
  displayEmail,
  showOwnerItems,
  isManager,
  isSellerGerente,
  isSellerFinanceiro,
  tenantSlug,
  trialEndsAt,
  subscriptionSuspended,
}: DashboardLayoutContentProps) {
  const { logout: oauthLogout } = useAuth();
  const { logoUrl, name: brandName } = useBranding();
  const managerLogout = trpc.managers.logout.useMutation();
  const sellerLogout = trpc.sellers.logout.useMutation();
  const utils = trpc.useUtils();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  // Grupos visíveis: aplica owner-only e o filtro do login financeiro, escondendo grupos vazios.
  const visibleGroups = MENU_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (item.ownerOnly && !showOwnerItems) return false;
      if (isSellerFinanceiro && item.path !== "/admin/financeiro") return false;
      return true;
    }),
  })).filter(group => group.items.length > 0);
  const activeMenuItem = visibleGroups
    .flatMap(g => g.items)
    .find(item => buildTenantPath(tenantSlug, item.path) === location);
  const activeGroupKey = visibleGroups.find(g =>
    g.items.some(item => buildTenantPath(tenantSlug, item.path) === location)
  )?.key;

  // Estado de recolher/expandir dos módulos (persistido).
  // Primeira carga: apenas "Principal" aberto.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_GROUPS_OPEN_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
      return { principal: true };
    } catch {
      return { principal: true };
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_GROUPS_OPEN_KEY, JSON.stringify(openGroups));
    } catch { /* ignore */ }
  }, [openGroups]);
  // O grupo com a rota ativa fica sempre aberto; os demais respeitam a preferência.
  const isGroupOpen = (key: string) => key === activeGroupKey || openGroups[key] === true;
  const toggleGroup = (key: string) => {
    setOpenGroups(prev => {
      const currentlyOpenKeys = visibleGroups
        .map(group => group.key)
        .filter(groupKey => groupKey === activeGroupKey || prev[groupKey] === true);

      const nextIsOpening = !currentlyOpenKeys.includes(key);
      if (!nextIsOpening) {
        return { ...prev, [key]: false };
      }

      const nextState = { ...prev, [key]: true };
      const nextOpenKeys = visibleGroups
        .map(group => group.key)
        .filter(groupKey => groupKey === activeGroupKey || nextState[groupKey] === true);

      if (nextOpenKeys.length <= MAX_OPEN_GROUPS) {
        return nextState;
      }

      const keyToClose = nextOpenKeys.find(groupKey => groupKey !== key && groupKey !== activeGroupKey);
      if (!keyToClose) {
        return nextState;
      }

      return { ...nextState, [keyToClose]: false };
    });
  };

  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const handleLogout = async () => {
    if (isSellerGerente || isSellerFinanceiro) {
      await sellerLogout.mutateAsync();
      await utils.sellers.me.invalidate();
      toast.success("Logout realizado!");
      window.location.href = getTenantLoginPath(tenantSlug);
    } else if (isManager) {
      await managerLogout.mutateAsync();
      await utils.managers.me.invalidate();
      await utils.auth.me.invalidate();
      toast.success("Logout realizado!");
      if (tenantSlug) {
        window.location.href = getTenantLoginPath(tenantSlug);
      }
    } else {
      await oauthLogout();
    }
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt={brandName} className="h-6 w-6 rounded object-contain shrink-0" />
                  ) : (
                    <Flag className="h-5 w-5 text-primary shrink-0" />
                  )}
                  <span className="font-heading font-bold text-sm tracking-tight truncate text-foreground">
                    {brandName}
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setLocation(buildTenantPath(tenantSlug, isSellerFinanceiro ? "/financeiro" : "/admin"))}
                  tooltip="Tela Inicial"
                  className="h-10 transition-all font-normal"
                >
                  <Home className="h-4 w-4" />
                  <span>Tela Inicial</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <div className="mx-2 my-1 border-t border-border group-data-[collapsible=icon]:hidden" />

            {visibleGroups.map(group => {
              const open = isGroupOpen(group.key);
              return (
                <SidebarGroup key={group.key} className="px-0 py-0.5">
                  <SidebarGroupLabel asChild>
                    <button
                      onClick={() => toggleGroup(group.key)}
                      className="flex w-full cursor-pointer items-center justify-between px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                      aria-expanded={open}
                    >
                      <span>{group.label}</span>
                      <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
                    </button>
                  </SidebarGroupLabel>
                  {(open || isCollapsed) && (
                    <SidebarGroupContent>
                      <SidebarMenu className="px-2">
                        {group.items.map(item => {
                          const itemPath = buildTenantPath(tenantSlug, item.path);
                          const isActive = location === itemPath;
                          return (
                            <SidebarMenuItem key={itemPath}>
                              <SidebarMenuButton
                                isActive={isActive}
                                onClick={() => setLocation(itemPath)}
                                tooltip={item.label}
                                className="h-10 transition-all font-normal"
                              >
                                <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                                <span>{item.label}</span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  )}
                </SidebarGroup>
              );
            })}
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary text-primary-foreground">
                      {displayName?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-foreground">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">{displayEmail}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (isCollapsed) return; setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        <TrialStatusBanner
          tenantSlug={tenantSlug}
          trialEndsAt={trialEndsAt}
          subscriptionSuspended={subscriptionSuspended}
        />
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <span className="tracking-tight text-foreground font-heading text-sm">
                  {activeMenuItem?.label ?? "Menu"}
                </span>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
