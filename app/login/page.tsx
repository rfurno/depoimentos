import Link from "next/link";
import { Heart, ArrowLeft } from "lucide-react";
import { Suspense } from "react";
import { getInvitePreview } from "@/lib/invites/queries";
import { parseInviteToken } from "@/lib/auth/safe-redirect";
import { LoginForm } from "./login-form";

type PageProps = {
  searchParams: Promise<{ invite?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const { invite: inviteParam } = await searchParams;
  const inviteToken = parseInviteToken(inviteParam);
  const invitePreview = inviteToken ? await getInvitePreview(inviteToken) : null;
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-3 text-foreground">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl btn-primary-gradient shadow-md">
              <Heart className="h-5 w-5" />
            </div>
            <span className="font-semibold tracking-tight text-2xl">Storyloom</span>
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="h-96 rounded-2xl border border-border bg-card flex items-center justify-center text-muted-foreground">
              Carregando formulário de entrada...
            </div>
          }
        >
          <LoginForm suggestedEmail={invitePreview?.email} />
        </Suspense>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar à página inicial
          </Link>
        </div>

        <p className="mt-8 text-center text-[10px] text-muted-foreground">
          Primeira vez? Basta inserir seu e-mail — criaremos seu perfil automaticamente.
        </p>
      </div>
    </div>
  );
}
