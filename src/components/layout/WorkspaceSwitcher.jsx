import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, Check, Plus } from 'lucide-react';
import { Input } from '../ui/Input';
import { getLocalUser, getContext } from '../../utils/storage';
import { cn } from '../../lib/utils';
import './WorkspaceSwitcher.css';

// Workspace identity + switcher shell.
//
// Data reality (verified): the app has exactly ONE workspace per user today
// (user.workspace, a name string managed in Settings). The list below reflects
// that single source of truth honestly. Multi-workspace switching, workspace
// logos, team management, and workspace creation require the workspace model
// decision and are intentionally NOT faked here:
// - "Manage team" is omitted (no team route or permission model exists).
// - "New workspace" is a disabled placeholder (no creation flow exists).
export function WorkspaceSwitcher() {
  const [workspaceName, setWorkspaceName] = useState(() => getLocalUser().workspace || 'Untitled workspace');
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const wrapRef = useRef(null);
  const controlRef = useRef(null);

  // Live-update when the profile (workspace name) changes elsewhere, e.g. Settings.
  useEffect(() => {
    const onDataChange = (e) => {
      if (!e.detail?.key || e.detail.key === 'user') {
        setWorkspaceName(getLocalUser(getContext().username).workspace || 'Untitled workspace');
      }
    };
    window.addEventListener('vertex-data-change', onDataChange);
    return () => window.removeEventListener('vertex-data-change', onDataChange);
  }, []);

  const closePopover = (refocusControl) => {
    setIsOpen(false);
    setQuery('');
    if (refocusControl) controlRef.current?.focus();
  };

  // Close on outside pointer down
  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  const handleWrapperKeyDown = (event) => {
    if (!isOpen) return;
    if (event.key === 'Escape') {
      event.stopPropagation();
      closePopover(true);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const items = Array.from(wrapRef.current?.querySelectorAll('.workspace-option') || []);
      if (!items.length) return;
      event.preventDefault();
      const currentIndex = items.indexOf(document.activeElement);
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (currentIndex + delta + items.length) % items.length;
      items[nextIndex].focus();
    }
  };

  const handleWrapperBlur = (event) => {
    // Tab/focus leaving the popover entirely closes it.
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsOpen(false);
      setQuery('');
    }
  };

  // Single real workspace: it IS the current one (name comes from the source of truth).
  const workspaces = [{ id: 'current', name: workspaceName, isActive: true }];

  const normalizedQuery = query.trim().toLowerCase();
  const visibleWorkspaces = normalizedQuery
    ? workspaces.filter((w) => w.name.toLowerCase().includes(normalizedQuery))
    : workspaces;

  const workspaceInitial = (workspaceName.trim() || 'W').charAt(0).toUpperCase();

  const handleSelect = () => {
    // The only listed workspace is already active: close without any state
    // change or reload. Actual switching lands with the multi-workspace model.
    closePopover(true);
  };

  return (
    <div
      className="workspace-switcher"
      ref={wrapRef}
      onKeyDown={handleWrapperKeyDown}
      onBlurCapture={handleWrapperBlur}
    >
      <button
        type="button"
        ref={controlRef}
        className={cn('workspace-control', isOpen && 'is-open')}
        onClick={() => (isOpen ? closePopover(false) : setIsOpen(true))}
        aria-expanded={isOpen}
        aria-label={`Workspace: ${workspaceName}. Switch workspace`}
        title={workspaceName}
      >
        <span className="workspace-badge" aria-hidden="true">{workspaceInitial}</span>
        <span className="workspace-name">{workspaceName}</span>
        <ChevronDown size={16} className="workspace-chevron" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="workspace-popover">
          <div className="workspace-search">
            <span className="workspace-search-icon" aria-hidden="true"><Search size={15} /></span>
            <Input
              placeholder="Find workspace..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Find workspace"
              autoFocus
            />
          </div>

          <div className="workspace-list-heading">YOUR WORKSPACES</div>

          {visibleWorkspaces.length === 0 ? (
            <p className="workspace-empty" role="status">No workspaces match "{query.trim()}".</p>
          ) : (
            visibleWorkspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                className={cn('workspace-option', workspace.isActive && 'is-active')}
                onClick={handleSelect}
                aria-current={workspace.isActive ? 'true' : undefined}
                title={workspace.name}
              >
                <span className="workspace-option-badge" aria-hidden="true">
                  {(workspace.name.trim() || 'W').charAt(0).toUpperCase()}
                </span>
                <span className="workspace-option-body">
                  <span className="workspace-option-name">{workspace.name}</span>
                  {workspace.isActive && <span className="workspace-option-hint">Current workspace</span>}
                </span>
                {workspace.isActive && <Check size={16} className="workspace-option-check" aria-hidden="true" />}
              </button>
            ))
          )}

          <div className="workspace-divider" />

          {/* "Manage team" is intentionally omitted: no team route or permission
              model exists yet. It will be added with the workspace/membership model. */}
          <button
            type="button"
            className="workspace-action"
            disabled
            title="Coming soon - workspace creation is not implemented yet"
          >
            <Plus size={16} aria-hidden="true" />
            <span>New workspace</span>
            <span className="workspace-action-badge">Soon</span>
          </button>
        </div>
      )}
    </div>
  );
}
