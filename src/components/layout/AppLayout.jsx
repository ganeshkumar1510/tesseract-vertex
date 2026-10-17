import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';
import { UATControls } from './UATControls';
import { MobileNav } from './MobileNav';
import { getContext, setContext, getStorageMode } from '../../utils/storage';
import { useAppStore } from '../../store/useAppStore';
import './AppLayout.css';

export function AppLayout() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showLocalBanner, setShowLocalBanner] = useState(
    () => getStorageMode() === 'local' && sessionStorage.getItem('vtx_local_banner_dismissed') !== '1'
  );

  const dismissLocalBanner = () => {
    sessionStorage.setItem('vtx_local_banner_dismissed', '1');
    setShowLocalBanner(false);
  };

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
        {showLocalBanner && (
          <div
            role="status"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '8px 16px',
              fontSize: '12.5px',
              background: 'rgba(234, 179, 8, 0.12)',
              borderBottom: '1px solid rgba(234, 179, 8, 0.3)',
              color: 'var(--text-secondary)',
            }}
          >
            <span>
              <strong>Local mode</strong> — no database is configured, so your data is stored in this browser only.
            </span>
            <button
              type="button"
              onClick={dismissLocalBanner}
              aria-label="Dismiss local mode notice"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '15px', lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        )}
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
