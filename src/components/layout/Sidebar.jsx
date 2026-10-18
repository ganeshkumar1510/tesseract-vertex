import React, { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, Users, Briefcase, Kanban, 
  CheckSquare, FileText, PieChart, 
  Settings, PanelLeft, PanelLeftClose, PanelLeftOpen, 
  MousePointer2, Check
} from 'lucide-react';
import { useMode } from '../providers/ModeProvider';
import { Logo } from '../ui/Logo';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';
import './Sidebar.css';

const navItems = [
  { label: 'Dashboard', icon: Home, path: 'dashboard' },
  { label: 'Clients', icon: Users, path: 'clients' },
  { label: 'Projects', icon: Briefcase, path: 'projects' },
  { label: 'Pipeline', icon: Kanban, path: 'pipeline' },
  { label: 'Tasks', icon: CheckSquare, path: 'tasks' },
  { label: 'Invoices', icon: FileText, path: 'invoices' },
  { label: 'Reports', icon: PieChart, path: 'reports' },
];

const SIDEBAR_MODES = [
  { id: 'expanded', label: 'Expanded', icon: PanelLeftOpen, hint: 'Sidebar always stays expanded' },
  { id: 'collapsed', label: 'Collapsed', icon: PanelLeftClose, hint: 'Sidebar always stays collapsed' },
  { id: 'hover', label: 'Expand on hover', icon: MousePointer2, hint: 'Expands on hover, collapses when the pointer leaves' },
];

const VALID_MODES = SIDEBAR_MODES.map((mode) => mode.id);

function supportsHover() {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(any-hover: hover)').matches;
}

export function Sidebar() {
  const { isAether } = useMode();
  const storedMode = useAppStore((s) => s.sidebarMode);
  const setSidebarMode = useAppStore((s) => s.setSidebarMode);

  const mode = VALID_MODES.includes(storedMode) ? storedMode : 'hover';

  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [canHover] = useState(supportsHover);

  const controlWrapRef = useRef(null);
  const controlButtonRef = useRef(null);

  const hoverEnabled = mode === 'hover' && canHover;
  const isExpanded = mode === 'expanded' || isMenuOpen || (hoverEnabled && (isHovered || isFocused));
  const currentMode = SIDEBAR_MODES.find((option) => option.id === mode) || SIDEBAR_MODES[2];

  const closeMenu = (refocusControl) => {
    setIsMenuOpen(false);
    if (refocusControl) controlButtonRef.current?.focus();
  };

  // Close the mode menu on outside pointer down
  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const handlePointerDown = (event) => {
      if (controlWrapRef.current && !controlWrapRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isMenuOpen]);

  // Move focus into the menu when it opens
  useEffect(() => {
    if (isMenuOpen) {
      controlWrapRef.current?.querySelector('.sidebar-mode-item')?.focus();
    }
  }, [isMenuOpen]);

  const handleWrapKeyDown = (event) => {
    if (!isMenuOpen) return;
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeMenu(true);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const items = Array.from(controlWrapRef.current?.querySelectorAll('.sidebar-mode-item') || []);
      if (!items.length) return;
      const currentIndex = items.indexOf(document.activeElement);
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (currentIndex + delta + items.length) % items.length;
      items[nextIndex].focus();
    }
  };

  const navItemClass = (isActive) => cn(
    'sidebar-nav-item font-display text-[14px]',
    isActive
      ? (isAether
          ? 'bg-[rgba(124,58,237,0.15)] text-violet-aether border-l-[3px] border-l-border-active'
          : 'bg-primary text-primary-text')
      : 'text-text-muted hover:text-text-secondary hover:bg-surface-elevated'
  );

  return (
    <aside
      className={cn(
        'sidebar bg-surface border-r border-border-subtle flex flex-col',
        isExpanded ? 'sidebar--expanded' : 'sidebar--collapsed'
      )}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsFocused(false);
      }}
    >
      <div className="sidebar-header">
        <Logo height={28} />
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {navItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={`/${item.path}`}
            title={isExpanded ? undefined : item.label}
            className={({ isActive }) => navItemClass(isActive)}
          >
            <item.icon size={18} className="sidebar-nav-icon" />
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <NavLink 
          to="/settings"
          title={isExpanded ? undefined : 'Settings'}
          className={({ isActive }) => navItemClass(isActive)}
        >
          <Settings size={18} className="sidebar-nav-icon" />
          <span className="sidebar-label">Settings</span>
        </NavLink>

        <div className="sidebar-control-wrap" ref={controlWrapRef} onKeyDown={handleWrapKeyDown}>
          <button
            type="button"
            ref={controlButtonRef}
            className="sidebar-nav-item sidebar-control-btn"
            onClick={() => (isMenuOpen ? closeMenu(false) : setIsMenuOpen(true))}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-label={`Sidebar display mode: ${currentMode.label}. Change display mode`}
            title="Sidebar display mode"
          >
            <PanelLeft size={18} className="sidebar-nav-icon" />
            <span className="sidebar-label">Sidebar</span>
          </button>

          {isMenuOpen && (
            <div className="sidebar-mode-menu" role="menu" aria-label="Sidebar display mode">
              {SIDEBAR_MODES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={mode === option.id}
                  title={option.hint}
                  className={cn('sidebar-mode-item', mode === option.id && 'is-selected')}
                  onClick={() => {
                    setSidebarMode(option.id);
                    closeMenu(true);
                  }}
                >
                  <option.icon size={15} className="sidebar-mode-icon" />
                  <span>{option.label}</span>
                  {mode === option.id && <Check size={14} className="sidebar-mode-check" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
