import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NewProjectPlaceholder() {
  return (
    <div className="min-h-screen bg-[#f8f5f2] flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold tracking-tight mb-3">Criar Novo Projeto</h1>
        <p className="text-[#6b6057] mb-8">
          Este é um placeholder para a Fase 2 (CRUD de Projetos). O formulário completo, inserção no Supabase
          e redirecionamento para o detalhe do projeto serão implementados após a revisão da fundação.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "outline" })}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao painel
          </Link>
          <Button disabled className="bg-[#8b5e3c]">Criar projeto (em breve)</Button>
        </div>
        <p className="mt-8 text-xs text-[#6b6057]">Veja o project-instructions.md para o plano completo por fases.</p>
      </div>
    </div>
  );
}
