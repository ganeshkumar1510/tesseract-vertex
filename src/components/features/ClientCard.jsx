import React from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

export function ClientCard({ name, context, status, statusLabel, revenue, onView }) {
  return (
    <Card variant="base" className="flex flex-col gap-md">
      <div className="flex justify-between items-start">
        <h3 className="font-display text-h3 text-text-primary">{name}</h3>
        <Badge variant={status === 'active' ? 'success' : status === 'overdue' ? 'error' : 'neutral'}>
          {statusLabel}
        </Badge>
      </div>
      
      <p className="font-body text-body-md text-text-secondary line-clamp-2">
        {context}
      </p>

      {revenue !== undefined && (
        <div className="mt-auto pt-md border-t border-border-subtle flex justify-between items-center">
          <span className="font-body text-[11px] text-text-muted uppercase tracking-wider">Revenue</span>
          <span className="font-mono text-mono-md text-text-primary">
            ${revenue.toLocaleString()}
          </span>
        </div>
      )}

      <Button variant="primary" size="sm" className="w-full mt-sm" onClick={onView}>
        View orbit
      </Button>
    </Card>
  )
}
