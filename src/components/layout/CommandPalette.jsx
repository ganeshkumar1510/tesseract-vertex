import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Folder, Users, FileText, CheckSquare, Settings as SettingsIcon } from 'lucide-react';
import { getData } from '../../utils/storage';
import './CommandPalette.css';

const QUICK_ACTIONS = [
  { id: 'new-client', label: 'Add new client', icon: <Users size={16} />, path: '/clients?action=new' },
  { id: 'new-project', label: 'Create project', icon: <Folder size={16} />, path: '/projects?action=new' },
  { id: 'new-invoice', label: 'Draft invoice', icon: <FileText size={16} />, path: '/invoices?action=new' },
  { id: 'new-task', label: 'Add task', icon: <CheckSquare size={16} />, path: '/tasks?action=new' },
  { id: 'settings', label: 'Go to Settings', icon: <SettingsIcon size={16} />, path: '/settings' },
];

export function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Data Fetching
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setClients(getData('clients') || []);
      setProjects(getData('projects') || []);
    }
  }, [isOpen]);

  const handleAction = useCallback((path) => {
    navigate(path);
    onClose();
    setQuery('');
  }, [navigate, onClose]);

  const filteredResults = query ? [
    ...clients.filter(c => (c.name || '').toLowerCase().includes(query.toLowerCase())).map(c => ({
      id: `client-${c.id}`,
      label: c.name,
      sub: c.company ? `Client • ${c.company}` : 'Client',
      icon: <Users size={16} />,
      path: `/clients/${c.id}`
    })),
    ...projects.filter(p => (p.name || p.title || '').toLowerCase().includes(query.toLowerCase())).map(p => ({
      id: `project-${p.id}`,
      label: p.name || p.title || 'Untitled Project',
      sub: p.client ? `Project • ${p.client}` : 'Project',
      icon: <Folder size={16} />,
      path: `/projects/${p.id}`
    }))
  ] : QUICK_ACTIONS;

  const totalResults = filteredResults.length;

  // Key Handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % totalResults);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + totalResults) % totalResults);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          handleAction(filteredResults[selectedIndex].path);
        }
      }
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, totalResults, selectedIndex, filteredResults, handleAction]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <>
      <div className="cmd-backdrop" onClick={onClose}></div>
      <div className="cmd-palette">
        <div className="cmd-input-wrap">
          <Search size={20} className="cmd-icon" />
          <input 
            autoFocus
            type="text" 
            className="cmd-input" 
            placeholder="Search clients, projects, or type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="cmd-esc-tag">ESC</div>
        </div>

        <div className="cmd-results">
          <div className="cmd-group">
            <div className="cmd-group-title">{query ? 'Search Results' : 'Quick Actions'}</div>
            {filteredResults.length > 0 ? filteredResults.map((item, idx) => (
              <button 
                key={item.id} 
                className={`cmd-item ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleAction(item.path)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="cmd-item-icon">{item.icon}</div>
                <div className="cmd-item-info">
                  <span className="cmd-item-label">{item.label}</span>
                  {item.sub && <span className="cmd-item-sub">{item.sub}</span>}
                </div>
                {idx === selectedIndex && <div className="cmd-enter-tag">↵</div>}
              </button>
            )) : (
              <div className="cmd-empty">No results found for "{query}"</div>
            )}
          </div>
        </div>

        <div className="cmd-footer">
          Navigate with <kbd>↑</kbd> <kbd>↓</kbd> • Select with <kbd>Enter</kbd>
        </div>
      </div>
    </>
  );
}
