import React from 'react'
import { cn } from '../../lib/utils'

export function Card({ variant = 'base', noPadding = false, className, ...props }) {
  const variants = {
    base: 'bg-surface-raised',
    elevated: 'bg-surface-elevated',
    selected: 'bg-surface-elevated',
    overlay: 'bg-surface-overlay',
    stat: 'bg-surface-raised',
  }

  return (
    <div
      className={cn(
        'rounded-lg transition-all duration-200 border border-border-subtle [box-shadow:var(--shadow-sm)]',
        !noPadding && 'p-lg',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col space-y-1.5 mb-md', className)} {...props} />
}

export function CardContent({ className, ...props }) {
  return <div className={cn('', className)} {...props} />
}
