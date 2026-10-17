import React, { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { getTheme, setTheme } from '../../utils/storage';
import './ThemeSlider.css';

export function ThemeSlider({ large = false }) {
  const [currentTheme, setCurrentTheme] = useState(() => getTheme());
  const isElegant = currentTheme === 'elegant';

  const toggleTheme = (e) => {
    e.stopPropagation();
    const nextTheme = isElegant ? 'ether' : 'elegant';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    setCurrentTheme(nextTheme);
  };

  return (
    <div className={`theme-slider-container ${isElegant ? 'elegant' : 'ether'} ${large ? 'large' : ''}`} onClick={toggleTheme} title="Toggle Theme">
      <div className="slider-track">
        <div className="slider-thumb">
          {isElegant ? <Sun size={large ? 24 : 18} className="icon-sun" /> : <Moon size={large ? 24 : 18} className="icon-moon" />}
        </div>
        {large && (
          <div className="slider-labels">
            {!isElegant && <span className="label-text active" style={{ marginLeft: 'auto', marginRight: '24px' }}>ETHER MODE</span>}
            {isElegant && <span className="label-text active" style={{ marginLeft: '24px' }}>ELEGANT MODE</span>}
          </div>
        )}
      </div>
    </div>
  );
}
