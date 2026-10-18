import React from 'react'
import { cn } from '../../lib/utils'

export function Badge({ variant = 'neutral', className, ...props }) {
  const variants = {
    success: 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]',
    warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]',
    error: 'bg-[var(--color-error-bg)] text-[var(--color-error-text)]',
    danger: 'bg-[var(--color-error-bg)] text-[var(--color-error-text)]',
    blue: 'bg-[var(--color-info-bg)] text-[var(--color-info-text)]',
    violet: 'bg-[var(--accent-light)] text-[var(--color-link)]',
    neutral: 'bg-surface-elevated text-text-muted border border-border-subtle',
    purple: 'bg-[var(--accent-light)] text-[var(--color-link)]',
    green: 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]',
    amber: 'bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]',
    gray: 'bg-surface-elevated text-text-muted border border-border-subtle',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-tight',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
