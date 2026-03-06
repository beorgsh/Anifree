import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AnimeCard from '../components/AnimeCard';
import { useCache } from '../context/CacheContext';

import { fetchWithProxy } from '../utils/api';

const Browse: React.FC = () => {
  const { getCache, setCache } = useCache();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [browseData, setBrowseData] = useState<any>(null);
  
  // Initialize loading based on cache existence
  const [loading, setLoading] = useState(() => !getCache('browseData'));
  
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      const cachedBrowse = getCache('browseData');
      if (cachedBrowse) {
        setBrowseData(cachedBrowse);
        setLoading(false);
      } else {
        fetchBrowseData();
      }
    } else {
      const timer = setTimeout(() => {
        searchAnime(query);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [query, getCache, setCache]);

  const fetchBrowseData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://anime-api-iota-six.vercel.app/api');
      if (!response.ok) throw new Error('Failed to fetch browse data');
      const json = await response.json();
      if (json.success && json.results) {
        setBrowseData(json.results);
        setCache('browseData', json.results);
      } else {
        setBrowseData(null);
      }
    } catch (err) {
      console.error('Failed to fetch browse data:', err);
      setError('Failed to load browse data');
    } finally {
      setLoading(false);
    }
  };

  const searchAnime = async (searchQuery: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://anime-api-iota-six.vercel.app/api/search?keyword=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      const json = await response.json();
      if (json.success && json.results && json.results.data) {
        setResults(json.results.data);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const renderBrowseSections = () => {
    if (!browseData) return null;

    const sections = [
      { title: 'Top Airing', data: browseData.topAiring },
      { title: 'Top Upcoming', data: browseData.topUpcoming },
      { title: 'Latest Completed', data: browseData.latestCompleted },
    ];

    return (
      <div className="space-y-10">
        {sections.map(
          (section, idx) =>
            section.data && section.data.length > 0 && (
              <section key={idx} className="space-y-4">
                <h2 className="text-xl font-black text-anilist-heading uppercase tracking-tighter border-l-4 border-anilist-accent pl-4">
                  {section.title}
                </h2>
                <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar snap-x">
                  {section.data.map((item: any, i: number) => (
                    <AnimeCard
                      key={item.id || i}
                      anime={item}
                      index={i}
                      className="flex-shrink-0 w-32 sm:w-44 snap-start"
                    />
                  ))}
                </div>
              </section>
            )
        )}
      </div>
    );
  };

  return (
    <div className="px-4 sm:px-8 lg:px-16 py-8 space-y-12">
      <div className="flex flex-col gap-8">
        <div className="relative max-w-2xl">
          <input
            type="text"
            placeholder="Search for anime..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-14 py-4 text-anilist-heading outline-none focus:border-anilist-accent/50 transition-all text-lg"
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-anilist-text" size={24} />
          <AnimatePresence>
            {query && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setQuery('')}
                className="absolute right-5 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} className="text-anilist-text" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-anilist-accent" size={48} />
        </div>
      )}

      {error && (
        <div className="text-center py-20 text-anilist-text">
          <p>{error}</p>
          <button onClick={() => query ? searchAnime(query) : fetchBrowseData()} className="text-anilist-accent mt-2 hover:underline">Try again</button>
        </div>
      )}

      {!loading && !error && (
        <div className="animate-in fade-in duration-500">
          {query ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {results.map((item, i) => (
                <AnimeCard key={item.id || i} anime={item} index={i} />
              ))}
              {results.length === 0 && (
                <div className="col-span-full text-center py-20 text-anilist-text">
                  No results found for "{query}"
                </div>
              )}
            </div>
          ) : (
            renderBrowseSections()
          )}
        </div>
      )}
    </div>
  );
};

export default Browse;
