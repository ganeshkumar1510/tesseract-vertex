import React from 'react'
import { cn } from '../../lib/utils'

export function Card({ variant = 'base', className, ...props }) {
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
        'rounded-lg p-lg transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.05)]',
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

export function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn('font-display text-h3 font-semibold text-text-primary leading-none tracking-tight', className)}
      {...props}
    />
  )
}

export function CardContent({ className, ...props }) {
  return <div className={cn('', className)} {...props} />
}
