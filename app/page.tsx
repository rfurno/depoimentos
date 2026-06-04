import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Camera, Heart, Shield } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f8f5f2] text-[#2c2522]">
      {/* Nav */}
      <nav className="border-b border-[#d9d0c3] bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8b5e3c] text-white">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold tracking-tight text-xl">Storyloom</div>
              <div className="text-[10px] text-[#6b6057] -mt-1">histórias de família, preservadas</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-[#2c2522] hover:bg-[#f0e9df]">
                Entrar
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-[#8b5e3c] hover:bg-[#6f4a30] text-white rounded-full px-6">
                Começar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="mx-auto max-w-5xl px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1 text-sm text-[#6b6057] shadow-sm border border-[#d9d0c3]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8b5e3c] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8b5e3c]"></span>
          </span>
          Privado por design. Feito para famílias.
        </div>

        <h1 className="mt-8 text-6xl md:text-7xl font-semibold tracking-tighter leading-none text-balance">
          As histórias de família<br />que você nunca quer esquecer.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-xl text-[#6b6057]">
          Reúna fotos, legendas e histórias pessoais de forma colaborativa com todos que estavam lá.
          Galerias bonitas, apresentações de slides encantadoras e exportação com um clique para o seu criador de histórias com LLM.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login">
            <Button size="lg" className="h-14 px-10 text-lg rounded-full bg-[#8b5e3c] hover:bg-[#6f4a30] text-white shadow-sm">
              Iniciar um projeto familiar <ArrowRight className="ml-2" />
            </Button>
          </Link>
          <Link href="#how">
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-[#8b5e3c]/30 text-[#2c2522] hover:bg-white">
              Ver como funciona
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-[#6b6057]">Sem senhas. Apenas links mágicos. Funciona maravilhosamente em celulares.</p>
      </div>

      {/* Features */}
      <div id="how" className="bg-white border-y border-[#d9d0c3]">
        <div className="mx-auto max-w-6xl px-6 py-16 grid md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0e9df] text-[#8b5e3c]">
              <Camera className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-2xl tracking-tight">Histórias em fotos, juntos</h3>
            <p className="text-[#6b6057] leading-relaxed">
              Cada foto recebe um título, legenda e a história real por trás dela. Envie sozinho ou convide toda a família.
            </p>
          </div>
          <div className="space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0e9df] text-[#8b5e3c]">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-2xl tracking-tight">Convites e papéis seguros</h3>
            <p className="text-[#6b6057] leading-relaxed">
              O proprietário cria um link único. Colaboradores entram com link mágico e participam instantaneamente. Papéis granulares para tranquilidade.
            </p>
          </div>
          <div className="space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0e9df] text-[#8b5e3c]">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-2xl tracking-tight">Seu para sempre, exporte a qualquer momento</h3>
            <p className="text-[#6b6057] leading-relaxed">
              Apresentações de slides em tela cheia com deslize, threads de comentários e exportação em ZIP com um clique com MEMORIES.md estruturado, pronto para o Grok ou qualquer LLM.
            </p>
          </div>
        </div>
      </div>

      {/* Trust / mobile note */}
      <div className="mx-auto max-w-3xl px-6 py-14 text-center text-[#6b6057]">
        <p className="text-sm">
          Construído com Supabase para autenticação e armazenamento sólidos. Prioridade mobile. Apresentações amigáveis ao polegar. 
          Nenhum dado sai do projeto privado da sua família a menos que você exporte.
        </p>
      </div>

      {/* CTA footer */}
      <div className="border-t border-[#d9d0c3] bg-white">
        <div className="mx-auto max-w-6xl px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="font-medium">Pronto para começar a preservar histórias?</div>
            <div className="text-[#6b6057] text-sm">Leva 30 segundos para criar seu primeiro projeto.</div>
          </div>
          <Link href="/login">
            <Button className="rounded-full bg-[#8b5e3c] hover:bg-[#6f4a30] px-8 h-12 text-base">
              Crie seu primeiro Storyloom
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
