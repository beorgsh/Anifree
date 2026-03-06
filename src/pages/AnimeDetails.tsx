import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchAniList, checkCache, ANIME_DETAILS_QUERY } from '../services/anilist';
import { Star, Calendar, Tv, Play } from 'lucide-react';
import AnimeCard from '../components/AnimeCard';

type Tab = 'overview' | 'episodes' | 'relations' | 'recommended';

import { motion } from 'motion/react';

const AnimeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [anime, setAnime] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(() => {
    const animeId = parseInt(id || '');
    return !checkCache(ANIME_DETAILS_QUERY, { id: animeId });
  });
  const [epLoading, setEpLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnime = async () => {
      const animeId = parseInt(id || '');
      if (isNaN(animeId)) {
        setError('Invalid anime ID.');
        setLoading(false);
        return;
      }

      if (!loading) {
        const cachedData = checkCache(ANIME_DETAILS_QUERY, { id: animeId });
        setAnime(cachedData.Media);
        fetchEpisodes(cachedData.Media.title.romaji || cachedData.Media.title.english);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await fetchAniList(ANIME_DETAILS_QUERY, { id: animeId });
        setAnime(data.Media);
        
        // Fetch episodes in background
        fetchEpisodes(data.Media.title.romaji || data.Media.title.english);
      } catch (err: any) {
        console.error('Failed to fetch anime details:', err);
        setError(err.message || 'Failed to load anime details. Please check your connection or try again later.');
      } finally {
        setLoading(false);
      }
    };
    loadAnime();
  }, [id]);

  const fetchEpisodes = async (title: string) => {
    setEpLoading(true);
    try {
      const targetUrl = `https://animeapi.net/anime/${encodeURIComponent(title)}`;
      const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`
      ];

      const fetchPromises = proxies.map(async (proxyUrl) => {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Proxy failed: ${proxyUrl}`);
        const json = await response.json();
        if (json.status !== 'success' || !json.results || json.results.length === 0) {
          throw new Error(`Invalid data from proxy: ${proxyUrl}`);
        }
        return json;
      });

      try {
        const data = await Promise.any(fetchPromises);
        const fetchedEpisodes = data.results[0].episodes || [];
        setEpisodes(fetchedEpisodes);
      } catch (error) {
        console.warn('All proxies failed to fetch episodes');
      }
    } catch (error) {
      console.error('Failed to fetch episodes:', error);
    } finally {
      setEpLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-anilist-accent border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] px-4 text-center">
        <div className="bg-white/5 p-8 rounded-2xl border border-white/10 max-w-md">
          <h2 className="text-2xl font-black text-anilist-heading mb-4">Oops!</h2>
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

  if (!anime) return <div className="p-20 text-center text-anilist-text">Anime not found</div>;

  const cleanDescription = anime.description?.replace(/<[^>]*>?/gm, '') || 'No description available.';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pb-20"
    >
      {/* Banner */}
      <div className="relative h-[30vh] sm:h-[40vh] w-full overflow-hidden">
        <img 
          src={anime.bannerImage || anime.coverImage.extraLarge} 
          alt={anime.title.romaji}
          className="h-full w-full object-cover opacity-30 blur-sm"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-anilist-bg to-transparent"></div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-20 sm:-mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-6 sm:gap-8">
          {/* Left Column: Poster */}
          <div className="w-32 sm:w-48 md:w-64 flex-shrink-0 mx-auto md:mx-0">
            <img 
              src={anime.coverImage.extraLarge} 
              alt={anime.title.romaji}
              className="w-full rounded-lg shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Right Column: Info */}
          <div className="flex-1 flex flex-col justify-end pt-4 sm:pt-0 text-center md:text-left">
            <h1 className="text-2xl sm:text-4xl font-black text-anilist-heading leading-tight">{anime.title.romaji}</h1>
            {anime.title.english && anime.title.english !== anime.title.romaji && (
              <h2 className="text-sm sm:text-base text-anilist-text mt-1">{anime.title.english}</h2>
            )}
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 mt-4 text-xs sm:text-sm text-anilist-text font-medium">
              <div className="flex items-center gap-1">
                <Star size={14} className="text-yellow-400" fill="currentColor" />
                <span>{anime.averageScore}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>{anime.seasonYear || 'TBA'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Tv size={14} />
                <span>{anime.format}</span>
              </div>
              <div className="px-2 py-0.5 rounded bg-white/10 text-white">
                {anime.status}
              </div>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
              {anime.genres.map((genre: string) => (
                <span key={genre} className="rounded-full bg-white/5 px-3 py-1 text-[10px] sm:text-xs border border-white/10 text-anilist-heading">
                  {genre}
                </span>
              ))}
            </div>
            
            <div className="mt-6 flex justify-center md:justify-start gap-3">
              {episodes.length > 0 ? (
                <Link 
                  to={`/anime/${anime.id}/watch/${episodes[0].episode}`}
                  className="flex items-center gap-2 rounded-md bg-anilist-accent px-6 py-2.5 text-sm sm:text-base font-bold text-black transition-transform hover:scale-105"
                >
                  <Play fill="currentColor" size={18} />
                  PLAY EP 1
                </Link>
              ) : (
                <button 
                  disabled
                  className="flex items-center gap-2 rounded-md bg-white/10 px-6 py-2.5 text-sm sm:text-base font-bold text-white/50 cursor-not-allowed"
                >
                  <Play fill="currentColor" size={18} />
                  {epLoading ? 'LOADING...' : 'NO EPISODES'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-10 border-b border-white/10 flex overflow-x-auto hide-scrollbar">
          {(['overview', 'episodes', 'relations', 'recommended'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 sm:px-6 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                activeTab === tab 
                  ? 'text-anilist-accent border-b-2 border-anilist-accent' 
                  : 'text-anilist-text hover:text-anilist-heading'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-6 sm:mt-8">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-lg font-bold text-anilist-heading">Synopsis</h3>
                <p className="text-xs sm:text-sm text-anilist-text leading-relaxed" dangerouslySetInnerHTML={{ __html: anime.description || 'No synopsis available.' }} />
              </div>
              <div className="space-y-4 bg-white/5 p-4 rounded-lg border border-white/10 h-fit">
                <h3 className="text-sm font-bold text-anilist-heading uppercase tracking-wider">Information</h3>
                <div className="space-y-3 text-xs sm:text-sm">
                  <div>
                    <span className="text-anilist-text block">Format</span>
                    <span className="text-anilist-heading">{anime.format}</span>
                  </div>
                  <div>
                    <span className="text-anilist-text block">Episodes</span>
                    <span className="text-anilist-heading">{anime.episodes || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-anilist-text block">Episode Duration</span>
                    <span className="text-anilist-heading">{anime.duration ? `${anime.duration} mins` : 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-anilist-text block">Status</span>
                    <span className="text-anilist-heading">{anime.status}</span>
                  </div>
                  <div>
                    <span className="text-anilist-text block">Season</span>
                    <span className="text-anilist-heading capitalize">{anime.season?.toLowerCase()} {anime.seasonYear}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'episodes' && (
            <div className="space-y-4">
              {epLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-anilist-accent border-t-transparent"></div>
                </div>
              ) : episodes.length > 0 ? (
                <div className="flex flex-col gap-3 sm:gap-4">
                  {episodes.map((ep) => (
                    <Link 
                      to={`/anime/${anime.id}/watch/${ep.episode}`} 
                      key={ep.id} 
                      className="flex flex-row gap-3 sm:gap-4 p-2 sm:p-3 hover:bg-white/5 rounded-lg transition-colors group border border-transparent hover:border-white/10"
                    >
                      <div className="relative w-28 sm:w-48 aspect-video flex-shrink-0 rounded-md overflow-hidden bg-anilist-fg">
                        <img 
                          src={ep.image || anime.bannerImage || anime.coverImage.extraLarge} 
                          alt={`Episode ${ep.episode}`}
                          className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                          <Play className="text-white w-8 h-8 sm:w-10 sm:h-10" fill="currentColor" />
                        </div>
                        <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-bold text-white">
                          {anime.duration ? `${anime.duration}m` : '24m'}
                        </div>
                      </div>
                      <div className="flex flex-col justify-center flex-1 min-w-0">
                        <h4 className="text-xs sm:text-base font-bold text-anilist-heading line-clamp-1 sm:line-clamp-2">
                          {ep.episode}. {ep.title || `Episode ${ep.episode}`}
                        </h4>
                        <p className="text-[10px] sm:text-xs text-anilist-text mt-1 sm:mt-2 line-clamp-2 sm:line-clamp-3">
                          {cleanDescription.substring(0, 150)}...
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-anilist-text text-sm">
                  No episodes found.
                </div>
              )}
            </div>
          )}

          {activeTab === 'relations' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {anime.relations?.edges?.map((edge: any) => (
                <AnimeCard 
                  key={edge.node.id} 
                  anime={edge.node} 
                  badge={edge.relationType.replace(/_/g, ' ')}
                />
              ))}
              {(!anime.relations?.edges || anime.relations.edges.length === 0) && (
                <div className="col-span-full text-center py-12 text-anilist-text text-sm">
                  No relations found.
                </div>
              )}
            </div>
          )}

          {activeTab === 'recommended' && (
            <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-6 snap-x snap-mandatory hide-scrollbar">
              {anime.recommendations?.nodes?.map((node: any, i: number) => (
                <AnimeCard 
                  key={node.mediaRecommendation.id} 
                  anime={node.mediaRecommendation} 
                  index={i}
                  className="flex-shrink-0 w-32 sm:w-44 md:w-48 lg:w-56 snap-start"
                />
              ))}
              {(!anime.recommendations?.nodes || anime.recommendations.nodes.length === 0) && (
                <div className="w-full text-center py-12 text-anilist-text text-sm">
                  No recommendations found.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AnimeDetails;
