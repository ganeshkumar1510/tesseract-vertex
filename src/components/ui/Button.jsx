import React from 'react'
import { cn } from '../../lib/utils'

export function Button({ variant = 'primary', size = 'md', className, ...props }) {
  const variants = {
    primary: 'bg-primary text-primary-text hover:bg-primary-hover active:bg-primary-pressed focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-text',
    secondary: 'bg-transparent border border-border-active text-accent hover:bg-surface-elevated',
    ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-elevated',
    destructive: 'bg-[var(--color-error-bg)] border border-[var(--color-error-border)] text-[var(--color-error-text)] hover:opacity-80',
  }

  const sizes = {
    sm: 'h-8 px-3 text-[13px]',
    md: 'h-10 px-5 text-[14px]',
    lg: 'h-12 px-6 text-[16px]',
  }

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-display font-semibold whitespace-nowrap transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
}
