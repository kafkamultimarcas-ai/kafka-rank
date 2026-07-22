import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ArrowLeft, GraduationCap, BookOpen, Video } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { Button } from "@/components/ui/button";
import { useState } from "react";

function getEmbedUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

export default function TrainingsList() {
  const [, setLocation] = useLocation();
  const goBack = useGoBack("/admin");
  const { data: trainings } = trpc.trainings.list.useQuery({ activeOnly: true });
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center gap-4 h-16">
          <Button variant="ghost" size="icon" onClick={goBack}>
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
            {trainings.map(training => {
              const embedUrl = training.videoUrl ? getEmbedUrl(training.videoUrl) : null;
              const isDirect = training.videoUrl ? isDirectVideo(training.videoUrl) : false;
              const hasVideo = !!training.videoUrl;

              return (
                <div key={training.id} className="racing-card overflow-hidden">
                  <button
                    onClick={() => setExpandedId(expandedId === training.id ? null : training.id)}
                    className="w-full p-4 sm:p-5 flex items-start gap-3 text-left hover:bg-accent/30 transition-colors"
                  >
                    <BookOpen className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{training.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {training.category && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary inline-block">
                            {training.category}
                          </span>
                        )}
                        {hasVideo && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 inline-flex items-center gap-1">
                            <Video className="h-3 w-3" /> Vídeo
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  {expandedId === training.id && (
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-border">
                      {/* Vídeo */}
                      {training.videoUrl && (
                        <div className="pt-4 mb-4">
                          {embedUrl ? (
                            <div className="aspect-video rounded-lg overflow-hidden bg-black/20">
                              <iframe
                                src={embedUrl}
                                className="w-full h-full"
                                allowFullScreen
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              />
                            </div>
                          ) : isDirect ? (
                            <video
                              src={training.videoUrl}
                              controls
                              className="w-full rounded-lg"
                              preload="metadata"
                              playsInline
                            />
                          ) : (
                            <a
                              href={training.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 underline"
                            >
                              <Video className="h-4 w-4" /> Assistir vídeo
                            </a>
                          )}
                        </div>
                      )}
                      {/* Conteúdo texto */}
                      <div className={`text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed ${!training.videoUrl ? "pt-4" : ""}`}>
                        {training.content}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
