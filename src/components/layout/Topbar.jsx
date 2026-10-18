import React, { useEffect, useState } from 'react';
import { Search, Bell } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { getLocalUser, getContext } from '../../utils/storage';
import { ModeToggle } from '../ui/ModeToggle';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import './Topbar.css';

export function Topbar({ onOpenSearch }) {
  const { username } = getContext();
  const [user, setUser] = useState(() => getLocalUser(username));
  const displayName = user.name?.split(' ')[0] || 'Freelancer';

  useEffect(() => {
    const onDataChange = (e) => {
      if (!e.detail?.key || e.detail.key === 'user') {
        setUser(getLocalUser(getContext().username));
      }
    };
    window.addEventListener('vertex-data-change', onDataChange);
    return () => window.removeEventListener('vertex-data-change', onDataChange);
  }, []);

  return (
    <header className="topbar">
      <div className="flex items-center gap-md">
        <WorkspaceSwitcher />
      </div>
      <div className="topbar-search" onClick={onOpenSearch}>
        <Input
          placeholder="Search everywhere... (Press ⌘K)"
          icon={<Search size={16} />}
          className="global-search"
          readOnly
        />
      </div>

      <div className="topbar-actions">
        <ModeToggle size="default" />
        <div className="notification-wrapper">
          <Button variant="ghost" className="icon-only">
            <Bell size={20} />
          </Button>
          <span className="notification-dot"></span>
        </div>
        <div className="user-profile">
          <Avatar name={displayName} size="sm" />
        </div>
      </div>
    </header>
  );
}
