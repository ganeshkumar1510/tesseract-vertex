import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, GitBranch, CheckSquare, Settings } from 'lucide-react';
import './MobileNav.css';

export function MobileNav() {
  return (
    <nav className="mobile-nav">
      <NavLink to="/dashboard" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
        <LayoutDashboard size={20} />
        <span>Home</span>
      </NavLink>
      <NavLink to="/clients" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
        <Users size={20} />
        <span>Clients</span>
      </NavLink>
      <NavLink to="/pipeline" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
        <GitBranch size={20} />
        <span>Pipeline</span>
      </NavLink>
      <NavLink to="/tasks" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
        <CheckSquare size={20} />
        <span>Tasks</span>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `m-nav-item ${isActive ? 'active' : ''}`}>
        <Settings size={20} />
        <span>Settings</span>
      </NavLink>
    </nav>
  );
}
