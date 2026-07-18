import { useRef, useState } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export type AudioLauncherContext = "conta_pagar" | "conta_receber" | "gasolina";

interface AudioLauncherProps {
  onResult: (parsed: any) => void;
  context: AudioLauncherContext;
}

export function AudioLauncher({ onResult, context }: AudioLauncherProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const uploadMedia = trpc.crmChat.uploadMedia.useMutation();
  const parseAudio = trpc.finTransactions.parseAudio.useMutation({
    onSuccess: (data: any) => {
      onResult(data);
      setProcessing(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao processar áudio: " + error.message);
      setProcessing(false);
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setProcessing(true);

        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(",")[1];
            const { url } = await uploadMedia.mutateAsync({
              base64,
              filename: "audio.webm",
              mimeType: "audio/webm",
            });
            parseAudio.mutate({ audioUrl: url, context });
          } catch (error: any) {
            toast.error("Erro no upload do áudio: " + error.message);
            setProcessing(false);
          }
        };

        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      setRecording(true);
      toast.info("Gravando... fale os dados do lançamento.");
    } catch {
      toast.error("Não foi possível acessar o microfone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  if (processing) {
    return (
      <div className="flex w-full items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Processando áudio com IA...
      </div>
    );
  }

  if (recording) {
    return (
      <button
        onClick={stopRecording}
        className="flex w-full items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-400 animate-pulse"
      >
        <MicOff className="h-4 w-4" /> Gravando... toque para parar
      </button>
    );
  }

  return (
    <button
      onClick={startRecording}
      className="flex w-full items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-xs text-gray-400 transition-all hover:bg-gray-700 hover:text-white"
    >
      <Mic className="h-4 w-4" />
      {context === "gasolina" ? "Lançar por áudio" : "Lançar conta por áudio"}
    </button>
  );
}
