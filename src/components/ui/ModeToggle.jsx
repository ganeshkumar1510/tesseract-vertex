'use client'

import React from 'react'
import { useMode } from '../providers/ModeProvider'
import { cn } from '../../lib/utils'

const sizeConfig = {
  sm: {
    track: 'w-[96px] h-[28px]',
    thumb: 'w-[calc(50%-4px)] h-[22px]',
    font: 'text-[9px]',
    spacing: 'px-1',
  },
  default: {
    track: 'w-[160px] h-[40px]',
    thumb: 'w-[calc(50%-4px)] h-[34px]',
    font: 'text-[11px]',
    spacing: 'px-1.5',
  },
  lg: {
    track: 'w-[200px] h-[52px]',
    thumb: 'w-[calc(50%-4px)] h-[46px]',
    font: 'text-[13px]',
    spacing: 'px-2',
  },
}

export function ModeToggle({ size = 'default', className }) {
  const { toggle, isAether } = useMode()
  const config = sizeConfig[size] || sizeConfig.default

  return (
    <div
      onClick={toggle}
      className={cn(
        'mode-toggle-track relative flex items-center cursor-pointer rounded-full p-[3px] select-none',
        config.track,
        className
      )}
    >
      {/* Sliding Thumb */}
      <div
        className={cn(
          'mode-toggle-thumb absolute rounded-full',
          config.thumb
        )}
      />

      {/* Labels */}
      <div className={cn('relative z-10 flex w-full h-full items-center justify-around font-display font-bold uppercase tracking-wider', config.font)}>
        <span
          className={cn(
            'transition-colors duration-300',
            isAether ? 'mode-toggle-label-active' : 'mode-toggle-label-inactive'
          )}
        >
          Aether
        </span>
        <span
          className={cn(
            'transition-colors duration-300',
            !isAether ? 'mode-toggle-label-active' : 'mode-toggle-label-inactive'
          )}
        >
          Quasar
        </span>
      </div>
    </div>
  )
}
