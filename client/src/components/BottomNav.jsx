import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Radio, User, MessageCircle } from 'lucide-react';
import { useSocial } from '../context/SocialContext';
import { useFeed } from '../context/FeedContext';

const TABS = [
  { path: '/feed', icon: Home, label: 'Home', id: 'feed' },
  { path: '/search', icon: Search, label: 'Search', id: 'search' },
  { path: '/rooms', icon: Radio, label: 'Rooms', id: 'rooms' },
  { path: '/chat', icon: MessageCircle, label: 'Chat', id: 'chat' },
  { path: '/profile', icon: User, label: 'Profile', id: 'profile' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { unreadCount, unreadChatCount } = useSocial();
  const { loadFeed, setActiveIndex } = useFeed();

  const handleNavClick = (path, id) => {
    if (id === 'feed' && pathname.startsWith('/feed')) {
      setActiveIndex(0);
      loadFeed(true);
      const feedCont = document.querySelector('.feed-container');
      if (feedCont) feedCont.scrollTo({ top: 0, behavior: 'smooth' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(path);
    }
  };

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {TABS.map(({ path, icon: Icon, label, id }) => {
        const active = pathname.startsWith(path);
        return (
          <button
            key={id}
            id={`nav-${id}`}
            onClick={() => handleNavClick(path, id)}
            className={`nav-item ${active ? 'active' : ''}`}
            aria-label={label}
          >
            <div className="relative">
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              {id === 'notifs' && unreadCount > 0 && (
                <span className="badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
              {id === 'chat' && unreadChatCount > 0 && (
                <span className="badge">{unreadChatCount > 9 ? '9+' : unreadChatCount}</span>
              )}
            </div>
            <span className="nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
