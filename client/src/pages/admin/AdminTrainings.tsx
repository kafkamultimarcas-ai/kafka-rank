import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, GraduationCap, Eye, EyeOff, Video, Link2, Upload, X } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";

export default function AdminTrainings() {
  const { data: trainings } = trpc.trainings.list.useQuery({});
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", content: "", category: "", videoUrl: "" });
  const [videoMode, setVideoMode] = useState<"none" | "url" | "upload">("none");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createTraining = trpc.trainings.create.useMutation({
    onSuccess: () => { utils.trainings.list.invalidate(); setDialogOpen(false); resetForm(); toast.success("Treinamento criado!"); },
    onError: () => toast.error("Erro ao criar treinamento."),
  });
  const updateTraining = trpc.trainings.update.useMutation({
    onSuccess: () => { utils.trainings.list.invalidate(); setDialogOpen(false); resetForm(); toast.success("Treinamento atualizado!"); },
    onError: () => toast.error("Erro ao atualizar."),
  });
  const uploadVideo = trpc.trainings.uploadVideo.useMutation({
    onSuccess: () => { utils.trainings.list.invalidate(); setUploadingVideo(false); toast.success("Vídeo enviado!"); },
    onError: () => { setUploadingVideo(false); toast.error("Erro ao enviar vídeo."); },
  });
  const removeVideo = trpc.trainings.removeVideo.useMutation({
    onSuccess: () => { utils.trainings.list.invalidate(); toast.success("Vídeo removido!"); },
    onError: () => toast.error("Erro ao remover vídeo."),
  });
  const deleteTraining = trpc.trainings.delete.useMutation({
    onSuccess: () => { utils.trainings.list.invalidate(); toast.success("Treinamento removido!"); },
  });
  const toggleActive = trpc.trainings.update.useMutation({
    onSuccess: () => { utils.trainings.list.invalidate(); toast.success("Status atualizado!"); },
  });

  function resetForm() {
    setForm({ title: "", content: "", category: "", videoUrl: "" });
    setEditing(null);
    setVideoMode("none");
  }

  function openEdit(t: any) {
    setEditing(t);
    setForm({ title: t.title, content: t.content, category: t.category || "", videoUrl: t.videoUrl || "" });
    setVideoMode(t.videoUrl ? "url" : "none");
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) { toast.error("Título e conteúdo são obrigatórios"); return; }
    const payload: any = { title: form.title, content: form.content, category: form.category || undefined };
    if (videoMode === "url" && form.videoUrl.trim()) {
      payload.videoUrl = form.videoUrl.trim();
    }
    if (editing) {
      // Se removeu a URL de vídeo, enviar null
      if (videoMode === "none" && editing.videoUrl) {
        payload.videoUrl = null;
      }
      updateTraining.mutate({ id: editing.id, ...payload });
    } else {
      createTraining.mutate(payload);
    }
  }

  function handleVideoUpload(trainingId: number, file: File) {
    if (file.size > 16 * 1024 * 1024) {
      toast.error("Vídeo muito grande! Máximo 16MB. Use um link do YouTube para vídeos maiores.");
      return;
    }
    setUploadingVideo(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadVideo.mutate({
        id: trainingId,
        fileName: file.name,
        fileBase64: base64,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  }

  function getEmbedUrl(url: string): string | null {
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return null;
  }

  function isDirectVideo(url: string): boolean {
    return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-xl text-foreground">Treinamentos</h1>
            <p className="text-muted-foreground text-sm mt-1">Mini treinamentos para a equipe</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="racing-gradient text-white gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Treinamento</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-heading text-foreground">
                  {editing ? "Editar Treinamento" : "Novo Treinamento"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-foreground">Título *</Label>
                  <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Título do treinamento" className="bg-input border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Categoria</Label>
                  <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Ex: Técnicas de Fechamento" className="bg-input border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Conteúdo *</Label>
                  <textarea
                    value={form.content}
                    onChange={e => setForm({ ...form, content: e.target.value })}
                    placeholder="Conteúdo do treinamento..."
                    rows={5}
                    className="w-full rounded-md bg-input border border-border text-foreground p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {/* Seção de Vídeo */}
                <div className="space-y-2">
                  <Label className="text-foreground flex items-center gap-2">
                    <Video className="h-4 w-4" /> Vídeo (opcional)
                  </Label>
                  <div className="flex gap-2">
                    <Button type="button" variant={videoMode === "url" ? "default" : "outline"} size="sm"
                      onClick={() => setVideoMode(videoMode === "url" ? "none" : "url")} className="gap-1">
                      <Link2 className="h-3 w-3" /> Link
                    </Button>
                    {editing && (
                      <Button type="button" variant="outline" size="sm"
                        onClick={() => fileInputRef.current?.click()} className="gap-1">
                        <Upload className="h-3 w-3" /> Upload
                      </Button>
                    )}
                    {!editing && (
                      <p className="text-xs text-muted-foreground self-center">Upload disponível após criar o treinamento</p>
                    )}
                  </div>
                  {videoMode === "url" && (
                    <Input
                      value={form.videoUrl}
                      onChange={e => setForm({ ...form, videoUrl: e.target.value })}
                      placeholder="https://youtube.com/watch?v=... ou link direto do vídeo"
                      className="bg-input border-border text-foreground"
                    />
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && editing) handleVideoUpload(editing.id, file);
                      e.target.value = "";
                    }}
                  />
                </div>

                <Button type="submit" className="w-full racing-gradient text-white" disabled={createTraining.isPending || updateTraining.isPending}>
                  {createTraining.isPending || updateTraining.isPending ? "Salvando..." : editing ? "Salvar" : "Criar Treinamento"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {trainings && trainings.length > 0 ? (
          <div className="space-y-3">
            {trainings.map(t => {
              const embedUrl = t.videoUrl ? getEmbedUrl(t.videoUrl) : null;
              const isDirect = t.videoUrl ? isDirectVideo(t.videoUrl) : false;
              return (
                <div key={t.id} className={`racing-card p-4 ${!t.active ? "opacity-50" : ""}`}>
                  <div className="flex items-start gap-3">
                    <GraduationCap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{t.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {t.category && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{t.category}</span>}
                        {t.videoUrl && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 flex items-center gap-1">
                            <Video className="h-3 w-3" /> Vídeo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{t.content}</p>

                      {/* Preview do vídeo */}
                      {t.videoUrl && (
                        <div className="mt-3 relative">
                          {embedUrl ? (
                            <div className="aspect-video rounded-lg overflow-hidden bg-black/20">
                              <iframe src={embedUrl} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                            </div>
                          ) : isDirect ? (
                            <video src={t.videoUrl} controls className="w-full rounded-lg max-h-48" preload="metadata" />
                          ) : (
                            <a href={t.videoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 underline flex items-center gap-1">
                              <Link2 className="h-3 w-3" /> Abrir vídeo
                            </a>
                          )}
                          {/* Botão excluir vídeo */}
                          <Button
                            variant="destructive"
                            size="sm"
                            className="mt-2 gap-1"
                            onClick={() => { if (confirm("Remover o vídeo deste treinamento?")) removeVideo.mutate({ id: t.id }); }}
                            disabled={removeVideo.isPending}
                          >
                            <X className="h-3 w-3" /> Remover vídeo
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => toggleActive.mutate({ id: t.id, active: !t.active })}>
                        {t.active ? <Eye className="h-4 w-4 text-green-400" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Remover treinamento inteiro?")) deleteTraining.mutate({ id: t.id }); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Upload rápido de vídeo (se não tem vídeo) */}
                  {!t.videoUrl && (
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { openEdit(t); setVideoMode("url"); }}>
                        <Link2 className="h-3 w-3" /> Adicionar link
                      </Button>
                      <label className="cursor-pointer">
                        <Button variant="outline" size="sm" className="gap-1 text-xs pointer-events-none">
                          <Upload className="h-3 w-3" /> Upload vídeo
                        </Button>
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/ogg,video/quicktime"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleVideoUpload(t.id, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  )}

                  {uploadingVideo && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                      Enviando vídeo...
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="racing-card p-12 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum treinamento criado.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
