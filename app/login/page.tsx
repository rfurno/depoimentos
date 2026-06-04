import Link from "next/link";
import { Heart, ArrowLeft } from "lucide-react";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#f8f5f2] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-3 text-[#2c2522]">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8b5e3c] text-white">
              <Heart className="h-5 w-5" />
            </div>
            <span className="font-semibold tracking-tight text-2xl">Storyloom</span>
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="h-96 rounded-2xl border border-[#d9d0c3] bg-white flex items-center justify-center text-[#6b6057]">
              Carregando formulário de entrada...
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-[#6b6057] hover:text-[#2c2522] inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar à página inicial
          </Link>
        </div>

        <p className="mt-8 text-center text-[10px] text-[#6b6057]">
          Primeira vez? Basta inserir seu e-mail — criaremos seu perfil automaticamente.
        </p>
      </div>
    </div>
  );
}
