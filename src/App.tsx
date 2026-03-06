import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import AnimeDetails from './pages/AnimeDetails';
import SearchResults from './pages/SearchResults';
import PlayerPage from './pages/PlayerPage';
import PlaceholderPage from './pages/PlaceholderPage';
import Browse from './pages/Browse';
import ScrollToTop from './components/ScrollToTop';
import { AnimatePresence, motion } from 'motion/react';

const AppContent = () => {
  const location = useLocation();
  const isPlayerPage = location.pathname.includes('/watch/');

  return (
    <div className="min-h-screen bg-anilist-bg">
      <ScrollToTop />
      {!isPlayerPage && <Navbar />}
      <main className={`${!isPlayerPage ? 'pt-20 pb-20 md:pb-0' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname}>
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/anime/:id" element={<AnimeDetails />} />
              <Route path="/anime/:id/watch/:epNum" element={<PlayerPage />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/trending" element={<Home />} />
              <Route path="/popular" element={<Home />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/download" element={<PlaceholderPage title="Download" />} />
              <Route path="/watchlist" element={<PlaceholderPage title="Watch List" />} />
              <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      
      {!isPlayerPage && (
        <>
          <BottomNav />
          <footer className="bg-anilist-bg py-12 mt-10 pb-32 md:pb-12">
            <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <div className="flex items-center justify-center gap-2 text-anilist-heading font-black text-xl tracking-tighter mb-4">
              <span>ANISTREAM</span>
            </div>
            <p className="text-sm text-anilist-text">
              Powered by AniList API. This site does not store any files on its server.
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
