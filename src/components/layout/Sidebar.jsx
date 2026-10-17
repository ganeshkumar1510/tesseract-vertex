import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, Users, Briefcase, Kanban, 
  CheckSquare, FileText, PieChart, 
  Settings 
} from 'lucide-react';
import { useMode } from '../providers/ModeProvider';
import { Logo } from '../ui/Logo';
import { cn } from '../../lib/utils';
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

export function Sidebar() {
  const { isAether } = useMode();

  return (
    <aside className="sidebar bg-surface border-r border-border-subtle w-[240px] flex flex-col">
      <div className="h-[64px] flex items-center px-lg border-b border-border-subtle">
        <Logo height={28} />
      </div>

      <nav className="flex-1 py-md px-sm flex flex-col gap-xxs">
        {navItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={`/${item.path}`}
            className={({ isActive }) => cn(
              'flex items-center gap-sm px-md py-sm rounded-md font-display text-[14px] transition-all duration-200',
              isActive 
                ? (isAether 
                    ? 'bg-[rgba(124,58,237,0.15)] text-violet-aether border-l-[3px] border-l-border-active' 
                    : 'bg-primary text-primary-text')
                : 'text-text-muted hover:text-text-secondary hover:bg-surface-elevated'
            )}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-md border-t border-border-subtle">
        <NavLink 
          to="/settings"
          className={({ isActive }) => cn(
            'flex items-center gap-sm px-md py-sm rounded-md font-display text-[14px] transition-all duration-200',
            isActive 
              ? (isAether 
                  ? 'bg-[rgba(124,58,237,0.15)] text-violet-aether border-l-[3px] border-l-border-active' 
                  : 'bg-primary text-primary-text')
              : 'text-text-muted hover:text-text-secondary hover:bg-surface-elevated'
          )}
        >
          <Settings size={18} />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
