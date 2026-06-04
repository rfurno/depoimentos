import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Plus, Image as ImageIcon } from "lucide-react";
import type { Profile } from "@/lib/types";

// This page requires authentication and Supabase at request time.
// Force dynamic rendering so Next.js doesn't try to prerender it at build
// time when env vars may not be present.
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile (will be empty until trigger + Phase 2). Safe for pre-schema.
  let displayName = user.email?.split("@")[0] || "você";
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();
    if (profile?.full_name) displayName = profile.full_name;
  } catch {
    // table may not exist yet — fine for foundation phase
  }

  return (
    <div className="min-h-screen bg-[#f8f5f2]">
      {/* Simple top nav for foundation */}
      <header className="border-b border-[#d9d0c3] bg-white/90 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight text-xl text-[#2c2522]">
            Storyloom
          </Link>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-[#6b6057] hidden sm:inline">Olá, {displayName}</span>
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="ghost" size="sm" className="text-[#6b6057]">
                Sair
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-4xl tracking-tighter font-semibold">Seus projetos</h1>
            <p className="text-[#6b6057] mt-1">Bem-vindo de volta, {displayName}. Suas histórias de família vivem aqui.</p>
          </div>
          <Link
            href="/projects/new"
            className={buttonVariants({
              className: "rounded-full bg-[#8b5e3c] hover:bg-[#6f4a30] px-5 text-white",
            })}
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Projeto
          </Link>
        </div>

        {/* Placeholder empty state - real CRUD in Phase 2 */}
        <div className="rounded-2xl border border-[#d9d0c3] bg-white p-16 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f0e9df]">
            <ImageIcon className="h-8 w-8 text-[#8b5e3c]" />
          </div>
          <h3 className="text-2xl tracking-tight font-semibold mb-2">Nenhum projeto ainda</h3>
          <p className="text-[#6b6057] max-w-sm mx-auto mb-8">
            Crie seu primeiro projeto de história familiar. Você pode convidar parentes via convites seguros por link mágico.
          </p>
          <Link
            href="/projects/new"
            className={buttonVariants({
              size: "lg",
              className: "rounded-full px-8 bg-[#8b5e3c] hover:bg-[#6f4a30] text-white",
            })}
          >
            Criar seu primeiro projeto
          </Link>
          <div className="mt-4 text-xs text-[#6b6057]">
            (CRUD de projetos, galeria, convites e mais chegando nas próximas fases — esta é a fundação da Fase 0/1)
          </div>
        </div>

        <div className="mt-12 text-xs text-center text-[#6b6057]">
          Conectado como <span className="font-mono">{user.email}</span> • Autenticação por link mágico do Supabase ativa
        </div>
      </main>
    </div>
  );
}
