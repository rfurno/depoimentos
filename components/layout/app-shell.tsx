import Link from 'next/link'
import { Button } from '@/components/ui/button'

type AppShellProps = {
  displayName: string
  children: React.ReactNode
}

export function AppShell({ displayName, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/90 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold tracking-tight text-xl text-foreground hover:text-brand transition-colors"
          >
            Storyloom
          </Link>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground hidden sm:inline">Olá, {displayName}</span>
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                Sair
              </Button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}