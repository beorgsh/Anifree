import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AnimeCard from '../components/AnimeCard';
import { motion } from 'motion/react';
import { Search } from 'lucide-react';
import { AnimeCardSkeleton } from '../components/Skeleton';
import { useCache } from '../context/CacheContext';

import { fetchWithProxy } from '../utils/api';

const SearchResults: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { getCache, setCache } = useCache();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performSearch = async () => {
      if (!query) return;

      setLoading(true);
      setError(null);
      
      // Check cache
      const cachedResults = getCache(`search-${query}`);
      if (cachedResults) {
        setResults(cachedResults);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`https://anime-api-iota-six.vercel.app/api/search?keyword=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Failed to search anime');
        const json = await response.json();
        
        if (json.success && json.results && json.results.data) {
          setResults(json.results.data);
          setCache(`search-${query}`, json.results.data);
        } else {
          setResults([]);
        }
      } catch (err: any) {
        console.error('Search failed:', err);
        setError(err.message || 'Failed to search anime.');
      } finally {
        setLoading(false);
      }
    };
    performSearch();
  }, [query, getCache, setCache]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-7xl px-4 py-8 sm:px-8 lg:px-16"
    >
      <div className="mb-12">
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
