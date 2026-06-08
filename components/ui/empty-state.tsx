import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
  compact?: boolean
  iconVariant?: 'brand' | 'primary' | 'accent'
}

const iconTileClass: Record<NonNullable<EmptyStateProps['iconVariant']>, string> = {
  brand: 'icon-tile',
  primary: 'icon-tile-primary',
  accent: 'icon-tile-accent',
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
  compact = false,
  iconVariant = 'brand',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'card-elevated rounded-2xl border text-center',
        compact ? 'p-8' : 'p-10 sm:p-12',
        className
      )}
    >
      <div
        className={cn(
          'mx-auto mb-4 flex items-center justify-center rounded-2xl',
          iconTileClass[iconVariant],
          compact ? 'h-12 w-12' : 'h-14 w-14 sm:h-16 sm:w-16'
        )}
      >
        <Icon className={cn(compact ? 'h-6 w-6' : 'h-7 w-7 sm:h-8 sm:w-8', 'icon-brand')} />
      </div>
      <h3
        className={cn(
          'font-semibold tracking-tight text-foreground',
          compact ? 'text-lg' : 'text-xl sm:text-2xl'
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            'text-muted-foreground mx-auto mt-2',
            compact ? 'text-sm max-w-sm' : 'text-sm sm:text-base max-w-md'
          )}
        >
          {description}
        </p>
      )}
      {children && <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">{children}</div>}
    </div>
  )
}