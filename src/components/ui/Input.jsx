import React from 'react'
import { cn } from '../../lib/utils'

export function Input({ className, error, ...props }) {
  return (
    <input
      className={cn(
        'w-full h-10 px-md rounded-md font-body text-body-md bg-surface-sunken border transition-all duration-200 outline-none',
        'border-border placeholder:text-text-muted',
        'focus:border-2 focus:border-border-active',
        error && 'border-error border-2 bg-error-bg',
        className
      )}
      {...props}
    />
  )
}
