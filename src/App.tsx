import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import PageHeader from './components/PageHeader';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import AnimeDetails from './pages/AnimeDetails';
import SearchResults from './pages/SearchResults';
import PlaceholderPage from './pages/PlaceholderPage';
import Browse from './pages/Browse';
import ScrollToTop from './components/ScrollToTop';
import { TrendingUp, Flame, Compass, Search, Download, List, Settings, Play } from 'lucide-react';

const getHeaderProps = (pathname: string) => {
  if (pathname === '/trending') return { title: 'Trending', icon: <TrendingUp size={20} /> };
  if (pathname === '/popular') return { title: 'Popular', icon: <Flame size={20} /> };
  if (pathname === '/browse') return { title: 'Browse', icon: <Compass size={20} /> };
  if (pathname.startsWith('/search')) return { title: 'Search Results', icon: <Search size={20} /> };
  if (pathname.startsWith('/anime/')) return { title: 'Anime Details', icon: <Play size={20} /> };
  if (pathname === '/download') return { title: 'Download', icon: <Download size={20} /> };
  if (pathname === '/watchlist') return { title: 'Watch List', icon: <List size={20} /> };
  if (pathname === '/settings') return { title: 'Settings', icon: <Settings size={20} /> };
  return { title: 'AniFree', icon: <Play size={20} /> };
};

const AppContent = () => {
  const location = useLocation();
  const isPlayerPage = location.pathname.includes('/watch/');
  const isAnimeDetailsPage = location.pathname.startsWith('/anime/');
  const isHome = location.pathname === '/';
  const headerProps = getHeaderProps(location.pathname);

  return (
    <div className="min-h-screen bg-anilist-bg">
      <ScrollToTop />
      {!isPlayerPage && !isAnimeDetailsPage && (
        isHome ? <Navbar /> : <PageHeader {...headerProps} />
      )}
      <main className={`${!isPlayerPage ? 'pt-20 pb-20 md:pb-0' : ''}`}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/anime/:id" element={<AnimeDetails />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/trending" element={<Home />} />
          <Route path="/popular" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/download" element={<PlaceholderPage title="Download" />} />
          <Route path="/watchlist" element={<PlaceholderPage title="Watch List" />} />
          <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
        </Routes>
      </main>
      
      {!isPlayerPage && !isAnimeDetailsPage && (
        <>
          <BottomNav />
          <footer className="bg-anilist-bg py-12 mt-10 pb-32 md:pb-12">
            <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <div className="flex items-center justify-center gap-2 text-anilist-heading font-black text-xl tracking-tighter mb-4">
              <span>AniFree</span>
            </div>
            <p className="text-sm text-anilist-text">
              Powered by Anime API. This site does not store any files on its server.
            </p>
            <div className="mt-6 flex justify-center gap-6 text-xs text-anilist-text font-medium uppercase tracking-widest">
              <a href="#" className="hover:text-anilist-accent transition-colors">Terms</a>
              <a href="#" className="hover:text-anilist-accent transition-colors">Privacy</a>
              <a href="#" className="hover:text-anilist-accent transition-colors">Contact</a>
            </div>
          </div>
        </footer>
      </>
      )}
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
