import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AnimeCard from '../components/AnimeCard';

const Browse: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      fetchSchedule();
    } else {
      const timer = setTimeout(() => {
        searchAnime(query);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [query]);

  const fetchSchedule = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://animeapi.net/schedule');
      const json = await response.json();
      // Based on sample: { status: "success", results: { Sunday: [...], ... } }
      setSchedule(json.results || json.data || json);
    } catch (err) {
      console.error('Failed to fetch schedule:', err);
      setError('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const searchAnime = async (searchQuery: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://anime.apex-cloud.workers.dev/?method=search&query=${encodeURIComponent(searchQuery)}`);
      const json = await response.json();
      // Assuming structure: { status: 200, data: [] }
      setResults(json.data || json.results || []);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const mapToAnimeCard = (item: any) => {
    // Map external API structure to AnimeCard expected structure
    // Based on common patterns for these types of APIs
    return {
      id: item.id || item.animeId || item.anime_id || Math.random().toString(),
      title: {
        romaji: item.title || item.animeTitle || item.name || item.anime_name,
        english: item.title || item.animeTitle || item.name || item.anime_name
      },
      coverImage: {
        extraLarge: item.image || item.animeImg || item.poster || item.anime_image,
        large: item.image || item.animeImg || item.poster || item.anime_image
      },
      averageScore: item.score || item.rating || item.anime_score || null
    };
  };

  const renderSchedule = () => {
    if (!schedule) return null;

    // Handle different possible schedule structures
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    return (
      <div className="space-y-10">
        {days.map(day => {
          const dayData = schedule[day] || schedule[day.charAt(0).toUpperCase() + day.slice(1)];
          if (!dayData || !Array.isArray(dayData) || dayData.length === 0) return null;

          return (
            <section key={day} className="space-y-4">
              <h2 className="text-xl font-black text-anilist-heading uppercase tracking-tighter border-l-4 border-anilist-accent pl-4">
                {day}
              </h2>
              <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar snap-x">
                {dayData.map((item: any, i: number) => (
                  <AnimeCard 
                    key={item.id || i} 
                    anime={mapToAnimeCard(item)} 
                    index={i}
                    className="flex-shrink-0 w-32 sm:w-44 snap-start"
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  };

  return (
    <div className="px-4 sm:px-8 lg:px-16 py-8 space-y-12">
      <div className="flex flex-col gap-8">
        <h1 className="text-2xl sm:text-4xl font-black text-anilist-heading uppercase tracking-tighter border-l-4 sm:border-l-8 border-anilist-accent pl-4 sm:pl-6 flex items-center gap-3 sm:gap-4">
          <Compass size={24} className="sm:w-10 sm:h-10 text-anilist-accent" />
          Browse
        </h1>

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
          <button onClick={() => query ? searchAnime(query) : fetchSchedule()} className="text-anilist-accent mt-2 hover:underline">Try again</button>
        </div>
      )}

      {!loading && !error && (
        <div className="animate-in fade-in duration-500">
          {query ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {results.map((item, i) => (
                <AnimeCard key={item.id || i} anime={mapToAnimeCard(item)} index={i} />
              ))}
              {results.length === 0 && (
                <div className="col-span-full text-center py-20 text-anilist-text">
                  No results found for "{query}"
                </div>
              )}
            </div>
          ) : (
            renderSchedule()
          )}
        </div>
      )}
    </div>
  );
};

export default Browse;
