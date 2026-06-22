import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Radio, User, Bell } from 'lucide-react';
import { useSocial } from '../context/SocialContext';

const TABS = [
  { path: '/feed',          icon: Home,   label: 'Home',   id: 'feed' },
  { path: '/search',        icon: Search, label: 'Search', id: 'search' },
  { path: '/rooms',         icon: Radio,  label: 'Rooms',  id: 'rooms' },
  { path: '/notifications', icon: Bell,   label: 'Notifs', id: 'notifs' },
  { path: '/profile',       icon: User,   label: 'Profile',id: 'profile' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { unreadCount } = useSocial();

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {TABS.map(({ path, icon: Icon, label, id }) => {
        const active = pathname.startsWith(path);
        return (
          <button
            key={id}
            id={`nav-${id}`}
            onClick={() => navigate(path)}
            className={`nav-item ${active ? 'active' : ''}`}
            aria-label={label}
          >
            <div className="relative">
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              {id === 'notifs' && unreadCount > 0 && (
                <span className="badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </div>
            <span className="nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
