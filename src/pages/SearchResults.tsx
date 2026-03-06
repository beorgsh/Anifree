import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchAniList, checkCache, SEARCH_ANIME_QUERY } from '../services/anilist';
import AnimeCard from '../components/AnimeCard';
import { motion } from 'motion/react';
import { Search } from 'lucide-react';
import { AnimeCardSkeleton } from '../components/Skeleton';

const SearchResults: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(() => {
    if (!query) return false;
    return !checkCache(SEARCH_ANIME_QUERY, { search: query, page: 1, perPage: 30 });
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performSearch = async () => {
      if (!query) return;

      if (!loading) {
        const cachedData = checkCache(SEARCH_ANIME_QUERY, { search: query, page: 1, perPage: 30 });
        setResults(cachedData.Page.media);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await fetchAniList(SEARCH_ANIME_QUERY, { search: query, page: 1, perPage: 30 });
        setResults(data.Page.media);
      } catch (err: any) {
        console.error('Search failed:', err);
        setError(err.message || 'Failed to search anime.');
      } finally {
        setLoading(false);
      }
    };
    performSearch();
  }, [query]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-7xl px-4 py-8 sm:px-8 lg:px-16"
    >
      <div className="mb-12">
        <h1 className="text-2xl sm:text-4xl font-black text-anilist-heading uppercase tracking-tighter border-l-4 sm:border-l-8 border-anilist-accent pl-4 sm:pl-6 flex items-center gap-3 sm:gap-4">
          <Search size={24} className="sm:w-10 sm:h-10 text-anilist-accent" />
          Search Results
        </h1>
        <p className="text-anilist-text mt-2 text-sm font-bold uppercase tracking-widest opacity-70">
          Showing results for: <span className="text-anilist-accent">"{query}"</span> — {results.length} found
        </p>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-white/5 p-8 rounded-2xl border border-white/10 max-w-md">
            <h2 className="text-xl font-black text-anilist-heading mb-4">Search Error</h2>
            <p className="text-anilist-text mb-6">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-anilist-accent text-black px-8 py-3 rounded-md font-black text-sm uppercase tracking-widest hover:scale-105 transition-transform"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {[...Array(12)].map((_, i) => (
            <AnimeCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {results.map((anime, i) => (
            <AnimeCard 
              key={anime.id} 
              anime={anime} 
              index={i}
            />
          ))}
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="text-center py-20">
          <p className="text-anilist-text text-lg">No anime found matching your search.</p>
        </div>
      )}
    </motion.div>
  );
};

export default SearchResults;
