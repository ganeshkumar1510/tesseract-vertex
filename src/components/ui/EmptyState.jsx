import React from 'react'

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-section-lg bg-canvas">
      {Icon && (
        <div className="text-text-muted mb-lg">
          <Icon size={48} strokeWidth={1} />
        </div>
      )}
      <h2 className="font-display text-4xl font-bold text-text-primary mb-sm tracking-tight">
        {title}
      </h2>
      <p className="font-body text-body-lg text-text-secondary max-w-md mx-auto mb-xl">
        {description}
      </p>
      {action}
    </div>
  )
}
