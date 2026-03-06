import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  icon: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, icon }) => {
  const navigate = useNavigate();
  return (
    <nav className="fixed top-0 z-50 w-full bg-anilist-bg/90 backdrop-blur-xl py-4 border-b border-white/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-12 items-center justify-start gap-4">
          <button onClick={() => navigate(-1)} className="text-anilist-text hover:text-anilist-accent">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-3 text-anilist-heading font-black text-xl tracking-tighter">
            <div className="text-anilist-accent">
              {icon}
            </div>
            <span>{title}</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default PageHeader;
