import React, { useEffect, useState } from 'react';
import { 
  fetchAniList, 
  checkCache,
  TRENDING_ANIME_QUERY, 
  POPULAR_ANIME_QUERY, 
  TOP_RATED_ANIME_QUERY, 
  RECENTLY_UPDATED_ANIME_QUERY 
} from '../services/anilist';
import AnimeCard from '../components/AnimeCard';
import { Play, Info, ChevronLeft, ChevronRight, TrendingUp, Flame } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { HeroSkeleton, SectionSkeleton } from '../components/Skeleton';

const Home: React.FC = () => {
  const [trending, setTrending] = useState<any[]>([]);
  const [popular, setPopular] = useState<any[]>([]);
  const [topRated, setTopRated] = useState<any[]>([]);
  const [recentlyUpdated, setRecentlyUpdated] = useState<any[]>([]);
  const [loading, setLoading] = useState(() => {
    // Check if all main queries are cached
    const isCached = 
      checkCache(TRENDING_ANIME_QUERY, { page: 1, perPage: 10 }) &&
      checkCache(POPULAR_ANIME_QUERY, { page: 1, perPage: 20 }) &&
      checkCache(TOP_RATED_ANIME_QUERY, { page: 1, perPage: 20 }) &&
      checkCache(RECENTLY_UPDATED_ANIME_QUERY, { page: 1, perPage: 20 });
    return !isCached;
  });
  const [heroIndex, setHeroIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const loadData = async () => {
      // If already loading is false, it means it was cached, but we still want to fetch in background to refresh if needed
      // or just skip if we trust the cache. For now, let's fetch if loading is true.
      if (!loading) {
        // Even if cached, we populate state to ensure UI is ready
        setTrending(checkCache(TRENDING_ANIME_QUERY, { page: 1, perPage: 10 }).Page.media);
        setPopular(checkCache(POPULAR_ANIME_QUERY, { page: 1, perPage: 20 }).Page.media);
        setTopRated(checkCache(TOP_RATED_ANIME_QUERY, { page: 1, perPage: 20 }).Page.media);
        setRecentlyUpdated(checkCache(RECENTLY_UPDATED_ANIME_QUERY, { page: 1, perPage: 20 }).Page.media);
        return;
      }

      setError(null);
      try {
        const [trendingData, popularData, topRatedData, updatedData] = await Promise.all([
          fetchAniList(TRENDING_ANIME_QUERY, { page: 1, perPage: 10 }),
          fetchAniList(POPULAR_ANIME_QUERY, { page: 1, perPage: 20 }),
          fetchAniList(TOP_RATED_ANIME_QUERY, { page: 1, perPage: 20 }),
          fetchAniList(RECENTLY_UPDATED_ANIME_QUERY, { page: 1, perPage: 20 })
        ]);
        setTrending(trendingData.Page.media);
        setPopular(popularData.Page.media);
        setTopRated(topRatedData.Page.media);
        setRecentlyUpdated(updatedData.Page.media);
      } catch (err: any) {
        console.error('Failed to fetch anime:', err);
        setError(err.message || 'Failed to connect to AniList. Please check your internet connection.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (trending.length === 0) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % trending.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [trending]);

  if (loading) {
    return (
      <div className="space-y-4">
        <HeroSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] px-4 text-center">
        <div className="bg-white/5 p-8 rounded-2xl border border-white/10 max-w-md">
          <h2 className="text-2xl font-black text-anilist-heading mb-4">Oops! Something went wrong</h2>
          <p className="text-anilist-text mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-anilist-accent text-black px-8 py-3 rounded-md font-black text-sm uppercase tracking-widest hover:scale-105 transition-transform"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const hero = trending[heroIndex];
  const isTrendingRoute = location.pathname === '/trending';
  const isPopularRoute = location.pathname === '/popular';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-10"
    >
      {/* Top 10 Today Carousel (Hero) */}
      {!isTrendingRoute && !isPopularRoute && hero && (
        <section className="relative h-[60vh] sm:h-[80vh] w-full overflow-hidden group">
          <AnimatePresence mode="wait">
            <motion.div
              key={hero.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-0"
            >
              <img 
                src={hero.bannerImage || hero.coverImage.extraLarge} 
                alt={hero.title.romaji}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-anilist-bg via-anilist-bg/40 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-anilist-bg via-transparent to-transparent"></div>
            </motion.div>
          </AnimatePresence>
          
          <div className="relative flex h-full flex-col justify-end px-4 sm:px-8 lg:px-16 pb-12 sm:pb-20 max-w-5xl gap-4 sm:gap-6">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <span className="bg-anilist-accent text-black text-[10px] sm:text-xs font-black px-2 py-1 rounded uppercase tracking-widest">
                  # {heroIndex + 1} Trending Today
                </span>
              </div>
              <h1 className="text-3xl sm:text-6xl font-black text-anilist-heading leading-tight tracking-tighter drop-shadow-2xl line-clamp-2 sm:line-clamp-none">
                {hero.title.romaji}
              </h1>
              <p className="line-clamp-2 sm:line-clamp-3 text-xs sm:text-base text-anilist-text max-w-2xl leading-relaxed opacity-90" 
                 dangerouslySetInnerHTML={{ __html: hero.description }} />
              
              <div className="flex items-center gap-3 sm:gap-4 pt-4">
                <Link 
                  to={`/anime/${hero.id}`}
                  className="flex items-center gap-2 rounded-md bg-anilist-accent px-6 py-3 sm:px-10 sm:py-4 text-xs sm:text-sm font-black text-black transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(61,180,242,0.4)]"
                >
                  <Play fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5" />
                  WATCH NOW
                </Link>
                <Link 
                  to={`/anime/${hero.id}`}
                  className="flex items-center gap-2 rounded-md bg-white/5 px-6 py-3 sm:px-10 sm:py-4 text-xs sm:text-sm font-black text-white backdrop-blur-xl transition-all hover:bg-white/10 border border-white/10"
                >
                  <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                  DETAILS
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Carousel Controls */}
          <div className="absolute bottom-12 sm:bottom-20 right-4 sm:right-16 flex gap-2">
            <button 
              onClick={() => setHeroIndex((prev) => (prev - 1 + trending.length) % trending.length)}
              className="p-2 sm:p-3 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all backdrop-blur-md"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={() => setHeroIndex((prev) => (prev + 1) % trending.length)}
              className="p-2 sm:p-3 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all backdrop-blur-md"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </section>
      )}

      {/* Sections */}
      <div className="space-y-10">
        <AnimeSection title="Trending Now" data={trending} link="/trending" />
        <AnimeSection title="Recently Updated" data={recentlyUpdated} />
        <AnimeSection title="All-Time Popular" data={popular} link="/popular" />
        <AnimeSection title="Top Rated" data={topRated} />
      </div>
    </motion.div>
  );
};

const AnimeSection: React.FC<{ title: string; data: any[]; link?: string }> = ({ title, data, link }) => (
  <section className="px-4 sm:px-8 lg:px-16">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg sm:text-xl font-black text-anilist-heading uppercase tracking-tighter border-l-4 border-anilist-accent pl-4">
        {title}
      </h2>
      {link && (
        <Link to={link} className="text-xs font-bold text-anilist-accent hover:underline uppercase tracking-widest opacity-80 hover:opacity-100">
          View All
        </Link>
      )}
    </div>
    <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-6 snap-x snap-mandatory hide-scrollbar">
      {data.map((anime, i) => (
        <AnimeCard 
          key={anime.id} 
          anime={anime} 
          index={i}
          className="flex-shrink-0 w-32 sm:w-44 md:w-48 lg:w-56 snap-start"
        />
      ))}
    </div>
  </section>
);

export default Home;
