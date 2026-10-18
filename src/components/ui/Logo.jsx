import React from 'react'
import { Terminal } from 'lucide-react'

export function Logo({ height = 24, className = '' }) {
  return (
    <div 
      className={`flex items-center justify-center rounded-md border border-primary bg-accent-light backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-accent-glow ${className}`} 
      style={{ width: `${height * 1.3}px`, height: `${height}px` }}
    >
       <Terminal size={height * 0.7} className="text-primary" />
    </div>
  )
}
