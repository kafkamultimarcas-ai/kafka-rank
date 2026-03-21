import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Warehouse, Car, Clock, CheckCircle2, LogOut, AlertTriangle, ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Tab = "patio" | "completed" | "history";

export default function ConsignmentControl() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("patio");
  const [now] = useState(() => new Date());
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [exitRecordId, setExitRecordId] = useState<number | null>(null);
  const [exitDate, setExitDate] = useState("");

  // Dados
  const { data: yardVehicles, refetch: refetchYard } = trpc.consignment.yard.useQuery();
  const { data: completed7Days, refetch: refetchCompleted } = trpc.consignment.completed7Days.useQuery(
    { month: now.getMonth() + 1, year: now.getFullYear() }
  );
  const { data: exitedVehicles, refetch: refetchExited } = trpc.consignment.exited.useQuery(
    { month: now.getMonth() + 1, year: now.getFullYear() }
  );
  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: false });

  const updateExit = trpc.consignment.updateExit.useMutation({
    onSuccess: () => {
      toast.success("Saída registrada com sucesso!");
      refetchYard();
      refetchCompleted();
      refetchExited();
      setExitDialogOpen(false);
      setExitRecordId(null);
      setExitDate("");
    },
    onError: (err) => toast.error(err.message),
  });

  const getSellerName = (sellerId: number) => {
    const seller = sellers?.find(s => s.id === sellerId);
    return seller?.nickname || seller?.name || "Desconhecido";
  };

  const getDaysInYard = (entryDate: number, exitDate?: number | null) => {
    const end = exitDate || Date.now();
    return Math.floor((end - entryDate) / (1000 * 60 * 60 * 24));
  };

  const handleExitClick = (recordId: number) => {
    setExitRecordId(recordId);
    setExitDate(new Date().toISOString().split('T')[0]);
    setExitDialogOpen(true);
  };

  const handleConfirmExit = () => {
    if (!exitRecordId || !exitDate) return;
    updateExit.mutate({ id: exitRecordId, exitDate: new Date(exitDate).getTime() });
  };

  const tabs: { key: Tab; label: string; icon: any; count?: number }[] = [
    { key: "patio", label: "No Pátio", icon: Car, count: yardVehicles?.length || 0 },
    { key: "completed", label: "7 Dias ✓", icon: CheckCircle2, count: completed7Days?.length || 0 },
    { key: "history", label: "Histórico", icon: Clock, count: exitedVehicles?.length || 0 },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
        <div className="container py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Warehouse className="w-5 h-5 text-blue-400" />
            <h1 className="font-heading font-bold text-lg text-foreground">CONTROLE DE PÁTIO</h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[53px] z-30 bg-card/95 backdrop-blur border-b border-border">
        <div className="container flex gap-1 py-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-blue-500/30 text-blue-300' : 'bg-muted text-muted-foreground'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="container py-4 space-y-3">
        {/* VEÍCULOS NO PÁTIO */}
        {activeTab === "patio" && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Car className="w-4 h-4 text-blue-400" />
              <h2 className="font-heading font-bold text-sm text-foreground">
                VEÍCULOS NO PÁTIO — {yardVehicles?.length || 0} veículos
              </h2>
            </div>
            {!yardVehicles || yardVehicles.length === 0 ? (
              <div className="racing-card p-8 text-center">
                <Car className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Nenhum veículo no pátio no momento.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {yardVehicles.map((v: any) => {
                  const days = getDaysInYard(v.entryDate);
                  const isNear7 = days >= 5 && days < 7;
                  const isOver7 = days >= 7;
                  return (
                    <div key={v.id} className={`racing-card p-3 ${
                      isOver7 ? 'border-emerald-500/30 bg-emerald-500/5' :
                      isNear7 ? 'border-yellow-500/30 bg-yellow-500/5' : ''
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sm text-foreground bg-muted/50 px-2 py-0.5 rounded">
                              {v.vehiclePlate || '---'}
                            </span>
                            <span className="text-xs text-muted-foreground">{v.vehicleModel}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span>Dono: <strong className="text-foreground">{v.ownerName}</strong></span>
                            {v.ownerPhone && <span>Tel: {v.ownerPhone}</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>Entrada: {new Date(v.entryDate).toLocaleDateString('pt-BR')}</span>
                            <span>Vendedor: {getSellerName(v.sellerId)}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`text-lg font-bold font-heading ${
                            isOver7 ? 'text-emerald-400' : isNear7 ? 'text-yellow-400' : 'text-foreground'
                          }`}>
                            {days}d
                          </div>
                          <div className="text-[10px] text-muted-foreground">no pátio</div>
                        </div>
                      </div>
                      {isOver7 && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 rounded px-2 py-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Completou 7 dias — conta para meta!
                        </div>
                      )}
                      {isNear7 && !isOver7 && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-yellow-400 bg-yellow-500/10 rounded px-2 py-1">
                          <AlertTriangle className="w-3 h-3" />
                          Faltam {7 - days} dia(s) para completar 7 dias
                        </div>
                      )}
                      <div className="mt-2 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 border-red-500/30 text-red-400 hover:bg-red-500/10"
                          onClick={() => handleExitClick(v.id)}
                        >
                          <LogOut className="w-3 h-3 mr-1" />
                          Dar Saída
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* COMPLETARAM 7 DIAS */}
        {activeTab === "completed" && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h2 className="font-heading font-bold text-sm text-foreground">
                COMPLETARAM 7 DIAS — {now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
              </h2>
            </div>
            <div className="racing-card p-3 mb-3 bg-emerald-500/5 border-emerald-500/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-sm font-bold text-emerald-400">{completed7Days?.length || 0} veículos</p>
                  <p className="text-[10px] text-muted-foreground">completaram 7 dias no pátio este mês</p>
                </div>
              </div>
            </div>
            {!completed7Days || completed7Days.length === 0 ? (
              <div className="racing-card p-6 text-center">
                <p className="text-muted-foreground text-sm">Nenhum veículo completou 7 dias este mês.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {completed7Days.map((v: any) => {
                  const days = getDaysInYard(v.entryDate, v.exitDate);
                  return (
                    <div key={v.id} className="racing-card p-3 border-emerald-500/20">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-foreground bg-muted/50 px-2 py-0.5 rounded">
                              {v.vehiclePlate || '---'}
                            </span>
                            <span className="text-xs text-muted-foreground">{v.vehicleModel}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Dono: {v.ownerName} | Vendedor: {getSellerName(v.sellerId)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Entrada: {new Date(v.entryDate).toLocaleDateString('pt-BR')}
                            {v.exitDate && ` → Saída: ${new Date(v.exitDate).toLocaleDateString('pt-BR')}`}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-lg font-bold text-emerald-400">{days}d</div>
                          <div className="text-[10px] text-emerald-400/60">✓ válido</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* HISTÓRICO (SAÍRAM) */}
        {activeTab === "history" && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-heading font-bold text-sm text-foreground">
                HISTÓRICO DE SAÍDAS — {now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
              </h2>
            </div>
            {!exitedVehicles || exitedVehicles.length === 0 ? (
              <div className="racing-card p-6 text-center">
                <p className="text-muted-foreground text-sm">Nenhum veículo saiu do pátio este mês.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {exitedVehicles.map((v: any) => {
                  const days = getDaysInYard(v.entryDate, v.exitDate);
                  return (
                    <div key={v.id} className={`racing-card p-3 ${v.isValid ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-foreground bg-muted/50 px-2 py-0.5 rounded">
                              {v.vehiclePlate || '---'}
                            </span>
                            <span className="text-xs text-muted-foreground">{v.vehicleModel}</span>
                            {v.isValid ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">7d ✓</span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-semibold">&lt;7d</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Dono: {v.ownerName} | Vendedor: {getSellerName(v.sellerId)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {new Date(v.entryDate).toLocaleDateString('pt-BR')} → {v.exitDate ? new Date(v.exitDate).toLocaleDateString('pt-BR') : '—'}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`text-lg font-bold ${v.isValid ? 'text-emerald-400' : 'text-red-400'}`}>{days}d</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog de Saída */}
      <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Registrar Saída do Pátio</DialogTitle>
            <DialogDescription>
              O veículo será marcado como retirado. O registro permanece no histórico.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-foreground">Data de saída</Label>
              <Input
                type="date"
                value={exitDate}
                onChange={e => setExitDate(e.target.value)}
                className="bg-muted border-border text-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExitDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleConfirmExit}
              disabled={!exitDate || updateExit.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {updateExit.isPending ? "Registrando..." : "Confirmar Saída"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
