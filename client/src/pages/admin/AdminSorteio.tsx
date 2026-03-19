import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Gift, Shuffle, Trophy, Ticket, Plus, X, Loader2, PartyPopper } from "lucide-react";

export default function AdminSorteio() {
  const [prizes, setPrizes] = useState<string[]>(["Tanque Cheio", "Revisão Grátis", "Transferência Grátis"]);
  const [newPrize, setNewPrize] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<{ ticket: string; name: string; prize: string } | null>(null);
  const [selectedPrize, setSelectedPrize] = useState(0);
  const confettiRef = useRef<HTMLDivElement>(null);

  // Buscar agendamentos aprovados com ticket number (elegíveis para sorteio)
  const { data: sdrRecords } = trpc.sdr.list.useQuery();

  // Filtrar apenas agendamentos aprovados com ticket
  const eligibleTickets = (sdrRecords || []).filter(
    (r: any) => r.status === "approved" && r.ticketNumber && r.attendanceStatus === "confirmed"
  );

  const addPrize = () => {
    if (newPrize.trim()) {
      setPrizes([...prizes, newPrize.trim()]);
      setNewPrize("");
    }
  };

  const removePrize = (idx: number) => {
    setPrizes(prizes.filter((_, i) => i !== idx));
  };

  const doSorteio = () => {
    if (eligibleTickets.length === 0) {
      toast.error("Nenhum ticket elegível para sorteio! Precisa ter agendamentos aprovados com comparecimento confirmado.");
      return;
    }
    if (prizes.length === 0) {
      toast.error("Adicione pelo menos um prêmio!");
      return;
    }

    setIsSpinning(true);
    setWinner(null);

    // Animação de "roleta" por 3 segundos
    let count = 0;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * eligibleTickets.length);
      const ticket = eligibleTickets[randomIdx];
      setWinner({
        ticket: ticket.ticketNumber || "",
        name: ticket.customerName || "Cliente",
        prize: prizes[selectedPrize],
      });
      count++;
      if (count > 20) {
        clearInterval(interval);
        // Resultado final
        const finalIdx = Math.floor(Math.random() * eligibleTickets.length);
        const finalTicket = eligibleTickets[finalIdx];
        setWinner({
          ticket: finalTicket.ticketNumber || "",
          name: finalTicket.customerName || "Cliente",
          prize: prizes[selectedPrize],
        });
        setIsSpinning(false);
        toast.success(`Sorteio realizado! Ganhador: ${finalTicket.customerName}`);
      }
    }, 150);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
            <Gift className="w-7 h-7 text-yellow-400" />
            Sorteio do Feirão
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sorteie prêmios entre os clientes que compareceram ao feirão
          </p>
        </div>

        {/* Tickets elegíveis */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Ticket className="w-5 h-5 text-cyan-400" />
              Tickets Elegíveis ({eligibleTickets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eligibleTickets.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum ticket elegível. Os agendamentos precisam ser aprovados e o comparecimento confirmado pelo gerente.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {eligibleTickets.map((t: any) => (
                  <div key={t.id} className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-3 py-1.5 text-sm">
                    <span className="font-mono font-bold text-cyan-400">#{t.ticketNumber}</span>
                    <span className="text-muted-foreground ml-2">{t.customerName}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prêmios */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Prêmios
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {prizes.map((prize, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedPrize(idx)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                    selectedPrize === idx
                      ? "bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400"
                      : "bg-muted border border-border text-foreground hover:border-yellow-500/50"
                  }`}
                >
                  <Gift className="w-4 h-4" />
                  <span className="font-semibold text-sm">{prize}</span>
                  <button onClick={(e) => { e.stopPropagation(); removePrize(idx); }} className="text-muted-foreground hover:text-red-400 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newPrize}
                onChange={(e) => setNewPrize(e.target.value)}
                placeholder="Novo prêmio..."
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && addPrize()}
              />
              <Button onClick={addPrize} size="sm" variant="outline" className="gap-1">
                <Plus className="w-4 h-4" /> Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Botão de Sorteio */}
        <div className="flex justify-center">
          <Button
            onClick={doSorteio}
            disabled={isSpinning || eligibleTickets.length === 0}
            size="lg"
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold text-xl px-12 py-6 rounded-2xl shadow-lg shadow-yellow-500/25 gap-3"
          >
            {isSpinning ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" /> Sorteando...
              </>
            ) : (
              <>
                <Shuffle className="w-6 h-6" /> SORTEAR!
              </>
            )}
          </Button>
        </div>

        {/* Resultado */}
        {winner && !isSpinning && (
          <div ref={confettiRef} className="relative">
            <Card className="border-2 border-yellow-500 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 overflow-hidden">
              <CardContent className="py-10 text-center relative">
                <div className="absolute inset-0 flex items-center justify-center opacity-5">
                  <PartyPopper className="w-64 h-64" />
                </div>
                <div className="relative z-10">
                  <PartyPopper className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce" />
                  <h2 className="text-3xl font-bold text-yellow-400 mb-2">GANHADOR!</h2>
                  <div className="bg-card rounded-2xl p-6 inline-block border border-yellow-500/30 shadow-lg">
                    <p className="font-mono text-2xl font-bold text-cyan-400 mb-2">#{winner.ticket}</p>
                    <p className="text-2xl font-bold text-foreground mb-1">{winner.name}</p>
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <Gift className="w-6 h-6 text-yellow-400" />
                      <span className="text-xl font-bold text-yellow-400">{winner.prize}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Resultado durante animação */}
        {winner && isSpinning && (
          <Card className="border-border bg-card">
            <CardContent className="py-8 text-center">
              <div className="animate-pulse">
                <p className="font-mono text-3xl font-bold text-cyan-400">#{winner.ticket}</p>
                <p className="text-xl text-foreground mt-2">{winner.name}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
