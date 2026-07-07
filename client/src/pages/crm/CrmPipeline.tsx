import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft, Phone, MessageCircle, User, LayoutGrid, SlidersHorizontal,
  Calendar, Flame, Thermometer, Snowflake, Car, ChevronLeft, ChevronRight
} from "lucide-react";
import { useBranding } from "@/contexts/TenantContext";
import { buildTenantPath, getCurrentTenantSlug } from "@/lib/tenant";

const SCORE_ICONS: Record<string, any> = { hot: Flame, warm: Thermometer, cold: Snowflake };
const SCORE_COLORS: Record<string, string> = { hot: "text-red-400", warm: "text-amber-400", cold: "text-blue-400" };

const DEPT_LABELS: Record<string, string> = {
  vendas: "Vendas", pre_vendas: "Pre-Vendas/SDR", consignacao: "Consignacao", fei: "F&I",
};

export default function CrmPipeline() {
  const { name: brandName } = useBranding();
  const [, navigate] = useLocation();
  const tenantSlug = getCurrentTenantSlug();
  const { data: sellerSession } = trpc.sellers.me.useQuery();
  const sellerId = sellerSession?.id || 0;
  const dept = sellerSession?.department || "vendas";
  const [selectedDept, setSelectedDept] = useState(dept);
  const [activeStageIdx, setActiveStageIdx] = useState(0);

  const { data: stages } = trpc.crmPipeline.getStages.useQuery({ department: selectedDept });
  const { data: leads, refetch } = trpc.crmLeads.listBySeller.useQuery(
    { sellerId, department: selectedDept, archived: false },
    { enabled: sellerId > 0 }
  );

  const moveStage = trpc.crmLeads.moveStage.useMutation({
    onSuccess: () => { refetch(); toast.success("Lead movido!"); },
    onError: (e) => toast.error(e.message),
  });

  const addActivity = trpc.crmLeads.addActivity.useMutation({ onSuccess: () => refetch() });

  // Group leads by stage
  const leadsByStage = useMemo(() => {
    if (!leads || !stages) return {};
    const map: Record<string, typeof leads> = {};
    for (const s of stages) map[s.name] = [];
    for (const l of leads) {
      if (map[l.stage]) map[l.stage].push(l);
      else if (stages.length > 0) {
        // Lead in unknown stage, put in first
        const first = stages[0].name;
        if (!map[first]) map[first] = [];
        map[first].push(l);
      }
    }
    return map;
  }, [leads, stages]);

  const currentStage = stages?.[activeStageIdx];
  const currentLeads = currentStage ? (leadsByStage[currentStage.name] || []) : [];

  const handleWhatsApp = (lead: any) => {
    if (!lead.phone) { toast.error("Lead sem telefone"); return; }
    const phone = lead.phone.replace(/\D/g, "");
    const msg = encodeURIComponent(`Ola ${lead.name}! Tudo bem? Aqui e da ${brandName}.`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
    addActivity.mutate({ leadId: lead.id, sellerId, type: "whatsapp", description: "WhatsApp enviado" });
  };

  const handleCall = (lead: any) => {
    if (!lead.phone) { toast.error("Lead sem telefone"); return; }
    window.open(`tel:+55${lead.phone.replace(/\D/g, "")}`, "_self");
    addActivity.mutate({ leadId: lead.id, sellerId, type: "ligacao", description: "Ligacao realizada" });
  };

  const moveLeadToNextStage = (lead: any) => {
    if (!stages) return;
    const currentIdx = stages.findIndex(s => s.name === lead.stage);
    if (currentIdx < stages.length - 1) {
      moveStage.mutate({ id: lead.id, newStage: stages[currentIdx + 1].name, sellerId });
    }
  };

  const moveLeadToPrevStage = (lead: any) => {
    if (!stages) return;
    const currentIdx = stages.findIndex(s => s.name === lead.stage);
    if (currentIdx > 0) {
      moveStage.mutate({ id: lead.id, newStage: stages[currentIdx - 1].name, sellerId });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(buildTenantPath(tenantSlug, "/crm"))} className="p-1.5 hover:bg-accent rounded-lg">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <h1 className="text-sm font-bold text-foreground">Pipeline</h1>
          </div>
        </div>

        {/* Department tabs */}
        <div className="flex gap-1 px-3 pb-2 overflow-x-auto no-scrollbar">
          {Object.entries(DEPT_LABELS).map(([key, label]) => (
            <button key={key} onClick={() => { setSelectedDept(key); setActiveStageIdx(0); }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedDept === key ? "bg-primary/20 border-primary/40 text-primary" : "bg-accent/50 border-border text-muted-foreground"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Stage tabs - horizontal scroll */}
        {stages && stages.length > 0 && (
          <div className="flex items-center px-1 pb-2">
            <button onClick={() => setActiveStageIdx(Math.max(0, activeStageIdx - 1))}
              disabled={activeStageIdx === 0}
              className="p-1 shrink-0 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="flex-1 overflow-x-auto no-scrollbar">
              <div className="flex gap-1">
                {stages.map((s, i) => {
                  const count = leadsByStage[s.name]?.length || 0;
                  return (
                    <button key={s.id} onClick={() => setActiveStageIdx(i)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${activeStageIdx === i ? "bg-primary/20 border-primary/40 text-primary" : "bg-accent/30 border-border text-muted-foreground"}`}>
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: s.color + "33", color: s.color }}>
                        {count}
                      </span>
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <button onClick={() => setActiveStageIdx(Math.min((stages?.length || 1) - 1, activeStageIdx + 1))}
              disabled={activeStageIdx >= (stages?.length || 1) - 1}
              className="p-1 shrink-0 disabled:opacity-30">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>

      {/* Current stage leads */}
      <div className="px-3 mt-3 space-y-2">
        {currentStage && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentStage.color }} />
            <span className="text-sm font-bold text-foreground">{currentStage.name}</span>
            <span className="text-xs text-muted-foreground">({currentLeads.length})</span>
          </div>
        )}

        {currentLeads.length > 0 ? (
          currentLeads.map(lead => {
            const ScoreIcon = SCORE_ICONS[lead.score] || Thermometer;
            const scoreColor = SCORE_COLORS[lead.score] || "text-amber-400";
            return (
              <div key={lead.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between mb-2" onClick={() => navigate(buildTenantPath(tenantSlug, `/crm/lead/${lead.id}`))}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground truncate">{lead.name}</h3>
                      <ScoreIcon className={`w-3.5 h-3.5 shrink-0 ${scoreColor}`} />
                    </div>
                    {lead.vehicleInterest && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Car className="w-3 h-3" /> {lead.vehicleInterest}
                      </p>
                    )}
                    {lead.phone && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{lead.phone}</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5">
                  <button onClick={() => handleWhatsApp(lead)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-green-500/15 border border-green-500/25 active:scale-95 transition-all">
                    <MessageCircle className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-[10px] font-medium text-green-400">Zap</span>
                  </button>
                  <button onClick={() => handleCall(lead)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/25 active:scale-95 transition-all">
                    <Phone className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] font-medium text-blue-400">Ligar</span>
                  </button>
                  <button onClick={() => moveLeadToPrevStage(lead)}
                    disabled={!stages || stages.findIndex(s => s.name === lead.stage) <= 0}
                    className="flex items-center justify-center p-1.5 rounded-lg bg-accent/50 border border-border active:scale-95 transition-all disabled:opacity-30">
                    <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => moveLeadToNextStage(lead)}
                    disabled={!stages || stages.findIndex(s => s.name === lead.stage) >= stages.length - 1}
                    className="flex items-center justify-center p-1.5 rounded-lg bg-primary/20 border border-primary/30 active:scale-95 transition-all disabled:opacity-30">
                    <ChevronRight className="w-3.5 h-3.5 text-primary" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <User className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Nenhum lead nesta etapa</p>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border z-50">
        <div className="flex justify-around py-2">
          <button onClick={() => navigate(buildTenantPath(tenantSlug, `/minha-area/${sellerId}`))} className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground">
            <User className="w-5 h-5" />
            <span className="text-[10px]">Minha Area</span>
          </button>
          <button onClick={() => navigate(buildTenantPath(tenantSlug, "/crm"))} className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground">
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[10px]">CRM</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 px-3 py-1 text-primary">
            <SlidersHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-bold">Pipeline</span>
          </button>
          <button onClick={() => navigate(buildTenantPath(tenantSlug, `/agendamentos/${sellerId}`))} className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground">
            <Calendar className="w-5 h-5" />
            <span className="text-[10px]">Agenda</span>
          </button>
        </div>
      </div>
    </div>
  );
}
