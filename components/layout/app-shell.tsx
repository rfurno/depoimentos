import Link from 'next/link'
import { Button } from '@/components/ui/button'

type AppShellProps = {
  displayName: string
  children: React.ReactNode
}

export function AppShell({ displayName, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#f8f5f2]">
      <header className="border-b border-[#d9d0c3] bg-white/90 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold tracking-tight text-xl text-[#2c2522]"
          >
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
      {children}
    </div>
  )
}