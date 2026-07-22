import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";

export default function NotFound() {
  const goBack = useGoBack("/admin");

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center px-4">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-5xl font-bold text-foreground mb-2">404</h1>
        <h2 className="text-xl font-semibold text-muted-foreground mb-4">
          Página não encontrada
        </h2>
        <p className="text-muted-foreground mb-8">
          A página que você procura não existe ou foi removida.
        </p>
        <Button onClick={goBack} size="lg">
          <Home className="w-4 h-4 mr-2" />
          Voltar ao Início
        </Button>
      </div>
    </div>
  );
}
