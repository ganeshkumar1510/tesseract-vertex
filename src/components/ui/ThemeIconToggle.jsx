import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from './Button';
import { getTheme, setTheme } from '../../utils/storage';
import './ThemeIconToggle.css';

export function ThemeIconToggle() {
  const [isDark, setIsDark] = useState(() => getTheme() === 'ether');

  // Sync with stored theme on mount
  useEffect(() => {
    const stored = getTheme();
    setIsDark(stored === 'ether');
  }, []);

  const toggle = () => {
    const newTheme = isDark ? 'elegant' : 'ether';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    setIsDark(!isDark);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
      onClick={toggle}
      className="theme-icon-toggle"
    >
      {isDark ? <Moon size={18} /> : <Sun size={18} />}
    </Button>
  );
}
