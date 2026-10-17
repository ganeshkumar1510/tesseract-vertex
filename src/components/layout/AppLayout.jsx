import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';
import { UATControls } from './UATControls';
import { MobileNav } from './MobileNav';
import { getContext, setContext } from '../../utils/storage';
import { useAppStore } from '../../store/useAppStore';
import './AppLayout.css';

export function AppLayout() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const { mode } = getContext();
  const isDemoEnvironment = useAppStore((s) => s.isDemoEnvironment);

  useEffect(() => {
    if (isDemoEnvironment && mode !== 'demo') {
      setContext('demo');
    }
  }, [isDemoEnvironment, mode]);

  // Global Command Palette Shortcut
  useEffect(() => {
    const handleShortcut = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 relative overflow-hidden">
        <Topbar
          onOpenSearch={() => setIsSearchOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-lg lg:p-xl">
          <Outlet />
        </main>
        <MobileNav />
      </div>

      {mode === 'test' && <UATControls />}
      <CommandPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
