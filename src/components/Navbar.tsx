import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Menu, X, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsMenuOpen(false);
    }
  };

  return (
    <nav className={`fixed top-0 z-50 w-full transition-all duration-500 ${
      isScrolled ? 'bg-anilist-bg/90 backdrop-blur-xl py-2 shadow-2xl' : 'bg-transparent py-4'
    }`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-12">
            <Link to="/" className="flex items-center gap-2 text-anilist-heading font-black text-2xl tracking-tighter group">
              <div className="bg-anilist-accent p-1.5 rounded-lg transform group-hover:rotate-12 transition-transform duration-300">
                <Play fill="black" size={24} className="text-black" />
              </div>
              <span>ANISTREAM</span>
            </Link>
            <div className="hidden md:flex items-center gap-8 text-xs font-black uppercase tracking-widest text-anilist-text">
              <Link to="/" className={`hover:text-anilist-accent transition-colors ${location.pathname === '/' ? 'text-anilist-accent' : ''}`}>Home</Link>
              <Link to="/trending" className={`hover:text-anilist-accent transition-colors ${location.pathname === '/trending' ? 'text-anilist-accent' : ''}`}>Trending</Link>
              <Link to="/popular" className={`hover:text-anilist-accent transition-colors ${location.pathname === '/popular' ? 'text-anilist-accent' : ''}`}>Popular</Link>
            </div>
          </div>

          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="relative w-full group">
              <input
                type="text"
                placeholder="Search anime..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full bg-white/5 px-12 py-2.5 text-sm text-anilist-heading outline-none transition-all focus:bg-white/10 border border-white/5 focus:border-anilist-accent/50"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-anilist-text group-focus-within:text-anilist-accent transition-colors" size={18} />
            </form>
          </div>

          <div className="flex md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-xl bg-white/5 text-anilist-text hover:text-anilist-heading transition-colors"
            >
              {isMenuOpen ? <X size={24} /> : <Search size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Search Modal */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-anilist-bg/98 backdrop-blur-2xl md:hidden"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <h2 className="text-xl font-black text-anilist-heading uppercase tracking-tighter">Search Anime</h2>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-full bg-white/5 text-anilist-text"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 space-y-8">
                <form onSubmit={handleSearch} className="relative w-full group">
                  <input
                    type="text"
                    placeholder="Search anime..."
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-2xl bg-white/5 px-14 py-4 text-lg text-anilist-heading outline-none border border-white/10 focus:border-anilist-accent/50 transition-all"
                  />
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-anilist-text" size={24} />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-5 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <X size={20} className="text-anilist-text" />
                    </button>
                  )}
                </form>

                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-anilist-text opacity-50">Quick Links</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Link to="/" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-center py-4 rounded-xl bg-white/5 text-sm font-bold text-anilist-heading hover:bg-anilist-accent hover:text-black transition-all">Home</Link>
                    <Link to="/trending" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-center py-4 rounded-xl bg-white/5 text-sm font-bold text-anilist-heading hover:bg-anilist-accent hover:text-black transition-all">Trending</Link>
                    <Link to="/popular" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-center py-4 rounded-xl bg-white/5 text-sm font-bold text-anilist-heading hover:bg-anilist-accent hover:text-black transition-all">Popular</Link>
                    <Link to="/browse" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-center py-4 rounded-xl bg-white/5 text-sm font-bold text-anilist-heading hover:bg-anilist-accent hover:text-black transition-all">Browse</Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
