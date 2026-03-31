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
import { trpc } from "@/lib/trpc";
import { LayoutDashboard, Users, Trophy, ShoppingCart, GraduationCap, ClipboardList, LogOut, PanelLeft, Flag, Home, Settings, CheckCircle, Target, Monitor, Gift, CalendarClock, Lock, Eye, EyeOff, UserCog, LayoutGrid, Warehouse, Banknote, Wrench, DollarSign, Bot, FileText, Car } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { toast } from "sonner";

const menuItems = [
  { icon: LayoutDashboard, label: "Visão Geral", path: "/admin" },
  { icon: CheckCircle, label: "Aprovar Vendas", path: "/admin/aprovacoes" },
  { icon: Users, label: "Equipe", path: "/admin/vendedores" },
  { icon: Trophy, label: "Competições", path: "/admin/competicoes" },
  { icon: ShoppingCart, label: "Vendas", path: "/admin/vendas" },
  { icon: Banknote, label: "F&I", path: "/admin/fei" },
  { icon: GraduationCap, label: "Treinamentos", path: "/admin/treinamentos" },
  { icon: ClipboardList, label: "Planos de Ação", path: "/admin/planos" },
  { icon: Target, label: "Metas", path: "/admin/metas" },
  { icon: CalendarClock, label: "Agendamentos", path: "/admin/agendamentos" },
  { icon: Gift, label: "Sorteio Feirão", path: "/admin/sorteio" },
  { icon: Settings, label: "Ajustes", path: "/admin/configuracoes" },
  { icon: LayoutGrid, label: "CRM Gerente", path: "/crm/admin" },
  { icon: Warehouse, label: "Consignação", path: "/controle-patio" },
  { icon: Wrench, label: "Pós-Venda", path: "/admin/pos-venda" },
  { icon: DollarSign, label: "Gastos Pós-Venda", path: "/admin/pv-financeiro" },
  { icon: Flag, label: "Marketing", path: "/admin/marketing" },
  { icon: DollarSign, label: "Financeiro", path: "/admin/financeiro" },
  { icon: DollarSign, label: "Caixa da Loja", path: "/financeiro" },
  { icon: LayoutGrid, label: "Meta Ads", path: "/admin/meta-integration" },
  { icon: Bot, label: "Ajustar IA", path: "/admin/iam" },
  { icon: FileText, label: "Documentos", path: "/admin/documentos" },
  { icon: Car, label: "Estoque", path: "/admin/estoque" },
];

// Items only visible to owner (not managers)
const ownerOnlyItems = [
  { icon: UserCog, label: "Gerentes", path: "/admin/gerentes" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const managerQuery = trpc.managers.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const sellerQuery = trpc.sellers.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
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

  if (!isOwner && !isManager && !isSellerGerente) {
    return <ManagerLoginScreen />;
  }

  const displayName = isOwner 
    ? (user?.name || "Admin") 
    : isManager 
      ? (managerQuery.data?.name || "Gerente") 
      : (sellerQuery.data?.nickname || sellerQuery.data?.name || "Gerente");
  const displayEmail = isOwner 
    ? (user?.email || "") 
    : isManager 
      ? "Gerente" 
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
      >
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function ManagerLoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const loginMutation = trpc.managers.login.useMutation();
  const utils = trpc.useUtils();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setIsLoading(true);
    try {
      await loginMutation.mutateAsync({ username: username.trim(), password });
      await utils.managers.me.invalidate();
      await utils.auth.me.invalidate();
      toast.success("Login realizado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Usuário ou senha inválidos");
    } finally {
      setIsLoading(false);
    }
  };

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
            Faça login para acessar o gerenciamento da competição de vendas.
          </p>
        </div>

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Digite seu usuário"
              className="w-full h-11 px-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full h-11 px-3 pr-10 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            disabled={isLoading || !username.trim() || !password.trim()}
            size="lg"
            className="w-full racing-gradient text-white font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

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
};

function DashboardLayoutContent({ children, setSidebarWidth, displayName, displayEmail, showOwnerItems, isManager, isSellerGerente }: DashboardLayoutContentProps) {
  const { logout: oauthLogout } = useAuth();
  const managerLogout = trpc.managers.logout.useMutation();
  const sellerLogout = trpc.sellers.logout.useMutation();
  const utils = trpc.useUtils();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const allItems = showOwnerItems ? [...menuItems, ...ownerOnlyItems] : menuItems;
  const activeMenuItem = allItems.find(item => item.path === location);
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
    if (isSellerGerente) {
      await sellerLogout.mutateAsync();
      await utils.sellers.me.invalidate();
      toast.success("Logout realizado!");
      window.location.href = "/";
    } else if (isManager) {
      await managerLogout.mutateAsync();
      await utils.managers.me.invalidate();
      await utils.auth.me.invalidate();
      toast.success("Logout realizado!");
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
                  <Flag className="h-5 w-5 text-primary shrink-0" />
                  <span className="font-heading font-bold text-sm tracking-tight truncate text-foreground">
                    KAFKA RANK
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setLocation("/")}
                  tooltip="Tela Inicial"
                  className="h-10 transition-all font-normal"
                >
                  <Home className="h-4 w-4" />
                  <span>Tela Inicial</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <div className="my-2 border-t border-border" />
              {allItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
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
