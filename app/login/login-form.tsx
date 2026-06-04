"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, ArrowLeft, Mail, Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Por favor, insira um endereço de e-mail válido"),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentTo, setSentTo] = useState("");

  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";
  const errorParam = searchParams.get("error");

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: LoginForm) {
    setIsLoading(true);

    try {
      const supabase = createClient();

      // Use canonical app URL from env when set (recommended for production + Supabase dashboard config).
      // Falls back to current origin for local/dev. Always configure the exact URL(s) in Supabase Auth settings.
      const appOrigin = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          emailRedirectTo: `${appOrigin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (error) {
        throw error;
      }

      setSentTo(data.email);
      setEmailSent(true);
      toast.success("Link mágico enviado! Verifique sua caixa de entrada.", {
        description: "O link fará o login instantaneamente e o redirecionará de volta aqui.",
      });
    } catch (error: unknown) {
      // SECURITY: Do not log full error objects (may contain tokens, emails, internal details).
      // Log only safe info in production; consider a proper logging service.
      console.error("Magic link error (safe):", (error as { message?: string })?.message || 'unknown');
      const message =
        (error as { message?: string })?.message ||
        "Não foi possível enviar o link mágico. Verifique se o Supabase está configurado corretamente em .env.local.";
      toast.error("Falha ao enviar link mágico", { description: message });
    } finally {
      setIsLoading(false);
    }
  }

  if (emailSent) {
    return (
      <Card className="border-[#d9d0c3] shadow-sm">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#e8e0d5]">
            <CheckCircle className="h-7 w-7 text-[#8b5e3c]" />
          </div>
          <CardTitle className="text-2xl tracking-tight">Verifique seu e-mail</CardTitle>
          <CardDescription className="text-base pt-2">
            Enviamos um link mágico para<br />
            <span className="font-medium text-[#2c2522]">{sentTo}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center text-sm text-[#6b6057]">
          <p>Clique no link do e-mail para entrar. Ele expira em alguns minutos por segurança.</p>
          <p>
            Não recebeu? Verifique o spam, ou{" "}
            <button
              onClick={() => {
                setEmailSent(false);
                form.reset({ email: sentTo });
              }}
              className="text-[#8b5e3c] underline hover:no-underline font-medium"
            >
              tente novamente
            </button>
            .
          </p>
          <div className="pt-4">
            <Link href="/">
              <Button variant="ghost" className="text-[#6b6057]">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao início
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#d9d0c3] shadow-sm">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-3xl tracking-tighter">Bem-vindo de volta</CardTitle>
        <CardDescription className="text-base">
          Entre com um link mágico. Sem senha necessária.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorParam && (
          <Alert variant="destructive" className="mb-6 border-[#b85c38]/30 bg-[#fdf2ef]">
            <AlertDescription>
              Falha na autenticação. Por favor, solicite um novo link mágico.
            </AlertDescription>
          </Alert>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Endereço de e-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="voce@familia.com"
              className="h-12 bg-white border-[#d9d0c3] text-base"
              {...form.register("email")}
              disabled={isLoading}
              autoComplete="email"
              autoFocus
            />
            {form.formState.errors.email && (
              <p className="text-sm text-[#b85c38]">{form.formState.errors.email.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base rounded-full bg-[#8b5e3c] hover:bg-[#6f4a30] disabled:opacity-70"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando link mágico...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" /> Enviar link mágico
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-[#6b6057]">
            Ao continuar, você concorda em manter as histórias da família privadas e respeitosas.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
