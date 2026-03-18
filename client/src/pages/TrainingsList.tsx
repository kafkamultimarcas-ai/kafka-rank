import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ArrowLeft, GraduationCap, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function TrainingsList() {
  const [, setLocation] = useLocation();
  const { data: trainings } = trpc.trainings.list.useQuery({ activeOnly: true });
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center gap-4 h-16">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h1 className="font-heading font-bold text-sm sm:text-base text-foreground">TREINAMENTOS</h1>
          </div>
        </div>
      </header>

      <div className="container py-6 sm:py-8">
        {trainings && trainings.length > 0 ? (
          <div className="space-y-3 max-w-3xl mx-auto">
            {trainings.map(training => (
              <div key={training.id} className="racing-card overflow-hidden">
                <button
                  onClick={() => setExpandedId(expandedId === training.id ? null : training.id)}
                  className="w-full p-4 sm:p-5 flex items-start gap-3 text-left hover:bg-accent/30 transition-colors"
                >
                  <BookOpen className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{training.title}</h3>
                    {training.category && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary mt-1 inline-block">
                        {training.category}
                      </span>
                    )}
                  </div>
                </button>
                {expandedId === training.id && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-border">
                    <div className="pt-4 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {training.content}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="racing-card p-12 text-center max-w-md mx-auto">
            <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-bold text-lg text-foreground mb-2">Nenhum treinamento disponível</h3>
            <p className="text-muted-foreground text-sm">O administrador ainda não publicou treinamentos.</p>
          </div>
        )}
      </div>
    </div>
  );
}
