import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Download, Bookmark, Settings } from 'lucide-react';

const BottomNav: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Compass, label: 'Browse', path: '/browse' },
    { icon: Download, label: 'Download', path: '/download' },
    { icon: Bookmark, label: 'Watch List', path: '/watchlist' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full bg-anilist-bg/90 backdrop-blur-2xl border-t border-white/5 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 flex-1 transition-colors ${
                isActive ? 'text-anilist-accent' : 'text-anilist-text hover:text-anilist-heading'
              }`}
            >
              <Icon size={20} className={isActive ? 'animate-pulse' : ''} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
