import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Calendar, Tv, Play, ChevronLeft } from 'lucide-react';
import AnimeCard from '../components/AnimeCard';
import Player from '../components/Player';
import { convertM3U8toMP4 } from '../utils/player';

type Tab = 'overview' | 'episodes' | 'recommended';

import { motion } from 'motion/react';
import { useCache } from '../context/CacheContext';

import { fetchWithProxy } from '../utils/api';

const AnimeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCache, setCache } = useCache();
  const [anime, setAnime] = useState<any>(null);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  
  // Initialize loading based on cache existence
  const [loading, setLoading] = useState(() => !getCache(`anime-${id}`));
  
  const [epLoading, setEpLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [error, setError] = useState<string | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<any>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');

  useEffect(() => {
    const loadAnime = async () => {
      if (!id) {
        setError('Invalid anime ID.');
        setLoading(false);
        return;
      }

      // Check cache
      const cachedAnime = getCache(`anime-${id}`);
      if (cachedAnime) {
        setAnime(cachedAnime.anime);
        setSeasons(cachedAnime.seasons || []);
        setEpisodes(cachedAnime.episodes || []);
        setLoading(false);
        
        // If episodes were cached, we don't need to fetch them again
        // But if they weren't (e.g. partial cache), we might want to fetch
        if (!cachedAnime.episodes || cachedAnime.episodes.length === 0) {
           const title = cachedAnime.anime.info?.name || cachedAnime.anime.title || cachedAnime.anime.japanese_title;
           if (title) fetchEpisodes(title, cachedAnime.anime, cachedAnime.seasons);
        }
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch anime details first to get the title
        const json = await fetchWithProxy(`https://aniwatch-api-one-rose.vercel.app/api/v2/hianime/anime/${id}`);
        
        const data = json.data || json.results || json;
        const animeData = data.anime || data.data || (data.info ? data : null);

        if (animeData) {
          setAnime(animeData);
          setSeasons(data.seasons || []);
          
          // Start fetching episodes immediately after getting the title
          // This runs in parallel with the state update and rendering
          const title = animeData.info?.name || animeData.title || animeData.japanese_title;
          if (title) {
            fetchEpisodes(title, animeData, data.seasons);
          }
          
          // Cache what we have so far (episodes will be added later)
          setCache(`anime-${id}`, { anime: animeData, seasons: data.seasons });
        } else {
          console.error('Invalid data format:', json);
          throw new Error('Invalid data format received');
        }
      } catch (err: any) {
        console.error('Failed to fetch anime details:', err);
        setError(err.message || 'Failed to load anime details.');
      } finally {
        setLoading(false);
      }
    };
    loadAnime();
  }, [id, getCache, setCache]);

  const fetchEpisodes = async (title: string, currentAnime?: any, currentSeasons?: any[]) => {
    setEpLoading(true);
    try {
      const targetUrl = `https://animeapi.net/anime/${encodeURIComponent(title)}`;
      const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
        `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(targetUrl)}`
      ];

      // Create a timeout promise to fail fast if proxies are slow
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Proxy timeout')), 15000) // Increased timeout to 15s
      );

      const fetchPromises = proxies.map(async (proxyUrl) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000); // Increased per-request timeout to 12s
          
          const response = await fetch(proxyUrl, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (!response.ok) throw new Error(`Proxy failed: ${proxyUrl}`);
          const json = await response.json();
          
          if (json.status !== 'success' || !json.results || json.results.length === 0) {
            throw new Error(`Invalid data from proxy: ${proxyUrl}`);
          }
          return json;
        } catch (e) {
          throw e;
        }
      });

      try {
        // Race against the timeout
        const data: any = await Promise.race([
          Promise.any(fetchPromises),
          timeoutPromise
        ]);
        
        const fetchedEpisodes = data.results[0].episodes || [];
        setEpisodes(fetchedEpisodes);
        
        // Update cache with episodes
        const animeToCache = currentAnime || anime;
        const seasonsToCache = currentSeasons || seasons;
        
        if (animeToCache) {
             setCache(`anime-${id}`, { anime: animeToCache, seasons: seasonsToCache, episodes: fetchedEpisodes });
        }
      } catch (error) {
        console.warn('All proxies failed or timed out fetching episodes');
        // Don't clear episodes here, in case we have some from cache or previous fetch
      }
    } catch (error) {
      console.error('Failed to fetch episodes:', error);
    } finally {
      setEpLoading(false);
    }
  };

  const handleRetryEpisodes = () => {
    const title = anime?.info?.name || anime?.title || anime?.japanese_title;
    if (title) {
      fetchEpisodes(title, anime, seasons);
    }
  };

  const handleEpisodeClick = (ep: any) => {
    setSelectedEpisode(ep);
    const m3u8Url = ep.sub?.url || ep.dub?.url;
    const url = m3u8Url ? convertM3U8toMP4(m3u8Url, anime.info?.name, ep.episode) : '';
    setVideoUrl(url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20 animate-pulse">
        {/* Banner Placeholder */}
        <div className="h-[30vh] sm:h-[40vh] bg-white/5 w-full"></div>
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-32 relative z-10">
          {/* Header Placeholder (Poster + Title) */}
          <div className="flex flex-row gap-4 sm:gap-8 mb-8">
            <div className="w-28 sm:w-48 aspect-[2/3] bg-white/10 rounded-lg shadow-2xl flex-shrink-0"></div>
            <div className="flex-1 pt-4 sm:pt-0 space-y-4 text-left">
              <div className="h-6 sm:h-10 bg-white/10 w-3/4 rounded"></div>
              <div className="h-4 sm:h-6 bg-white/10 w-1/2 rounded"></div>
              <div className="flex flex-wrap justify-start gap-2 mt-4">
                <div className="h-5 w-12 bg-white/10 rounded"></div>
                <div className="h-5 w-12 bg-white/10 rounded"></div>
                <div className="h-5 w-12 bg-white/10 rounded"></div>
              </div>
            </div>
          </div>

          {/* Tabs Placeholder */}
          <div className="h-12 bg-white/10 w-full rounded mb-8"></div>

          {/* Content Placeholder */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              <div className="h-6 bg-white/10 w-1/4 rounded"></div>
              <div className="h-4 bg-white/10 w-full rounded"></div>
              <div className="h-4 bg-white/10 w-full rounded"></div>
              <div className="h-4 bg-white/10 w-3/4 rounded"></div>
            </div>
            <div className="h-64 bg-white/10 rounded-lg"></div>
          </div>
        </div>
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

  const info = anime.info || {};
  const moreInfo = anime.moreInfo || {};
  const cleanDescription = info.description?.replace(/<[^>]*>?/gm, '') || 'No description available.';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pb-10 relative"
    >
      <button
        onClick={() => {
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/');
          }
        }}
        className="fixed top-4 left-4 z-[100] p-3 bg-black/50 rounded-full text-white backdrop-blur-sm hover:bg-black/70 transition-colors cursor-pointer shadow-lg border border-white/10"
        aria-label="Go back"
      >
        <ChevronLeft size={24} />
      </button>

      {/* Player Area (Only visible when watching) */}
      {activeTab === 'episodes' ? (
        <div className="w-full bg-black">
          <div className="w-full aspect-video max-h-[75vh] mx-auto relative">
            {videoUrl ? (
              <Player 
                key={videoUrl}
                option={{
                  url: videoUrl,
                  title: `${info.name} - Episode ${selectedEpisode?.episode || ''}`,
                  poster: selectedEpisode?.image || info.poster,
                  fullscreen: true,
                }}
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 text-anilist-text p-4 text-center border-b border-white/10">
                <Play size={48} className="mb-4 opacity-50" />
                <p className="text-lg font-bold">Select an episode to start watching</p>
                <p className="text-sm opacity-70 mt-2">Click on any episode from the list below</p>
                <img 
                  src={info.poster} 
                  alt={info.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm -z-10"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Banner Cover Image */
        <div className="relative w-full h-[30vh] sm:h-[40vh] overflow-hidden">
          <img 
            src={info.poster} 
            alt={info.name}
            className="h-full w-full object-cover blur-sm"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-anilist-bg via-transparent to-transparent"></div>
        </div>
      )}

      {/* Header Section (Poster + Info) - Overlapping Banner */}
      {activeTab !== 'episodes' && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-32 relative z-20 mb-8">
          <div className="flex flex-row gap-4 sm:gap-8">
            {/* Left Column: Poster */}
            <div className="w-28 sm:w-48 flex-shrink-0">
              <div className="w-full aspect-[2/3] rounded-lg shadow-2xl overflow-hidden">
                <img 
                  src={info.poster} 
                  alt={info.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Right Column: Info */}
            <div className="flex-1 flex flex-col justify-end text-left pb-2">
              <h1 className="text-xl sm:text-4xl font-black text-anilist-heading leading-tight line-clamp-2 sm:line-clamp-none drop-shadow-md">{info.name}</h1>
              
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm text-anilist-text font-medium drop-shadow-sm">
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-400" fill="currentColor" />
                  <span>{moreInfo.malscore || '?'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>{moreInfo.premiered || 'TBA'}</span>
                </div>
                <div className="px-2 py-0.5 rounded bg-white/10 text-white text-[10px] sm:text-xs backdrop-blur-sm">
                  {moreInfo.status || 'Unknown'}
                </div>
                <div className="px-2 py-0.5 rounded bg-anilist-accent text-black text-[10px] sm:text-xs font-bold shadow-sm">
                  {info.stats?.quality || 'HD'}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {moreInfo.genres?.slice(0, 3).map((genre: string) => (
                  <span key={genre} className="rounded-full bg-white/5 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs border border-white/10 text-anilist-heading backdrop-blur-sm">
                    {genre}
                  </span>
                ))}
              </div>

              <button
                onClick={() => {
                  setActiveTab('episodes');
                  if (episodes.length > 0) handleEpisodeClick(episodes[0]);
                }}
                className="mt-4 w-fit flex items-center gap-2 bg-anilist-accent text-black px-6 py-2 rounded-full font-bold text-sm hover:scale-105 transition-transform shadow-lg"
              >
                <Play size={16} fill="currentColor" />
                Watch Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Tabs Header (Full Width) */}
      <div className={`sticky top-0 z-30 w-full bg-black/80 backdrop-blur-md border-b border-white/10 transition-all duration-300 ${activeTab === 'episodes' ? '' : ''}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex overflow-x-auto hide-scrollbar">
          {['overview', 'episodes', 'seasons', 'recommended'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                activeTab === tab 
                  ? 'text-anilist-accent border-b-2 border-anilist-accent' 
                  : 'text-anilist-text hover:text-anilist-heading'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row gap-8">
                {/* Left Column: Info Panel */}
                <div className="w-full md:w-64 flex-shrink-0 space-y-6">
                  <div className="bg-white/5 p-5 rounded-xl border border-white/10 space-y-4">
                    <h3 className="font-bold text-anilist-heading uppercase tracking-wider text-sm border-b border-white/10 pb-2">Information</h3>
                    <div className="space-y-3 text-xs sm:text-sm">
                      <div>
                        <span className="text-anilist-text block text-xs">Format</span>
                        <span className="text-anilist-heading font-medium">{info.stats?.type || 'Unknown'}</span>
                      </div>
                      <div>
                        <span className="text-anilist-text block text-xs">Episodes</span>
                        <span className="text-anilist-heading font-medium">{info.stats?.episodes?.sub || 'Unknown'}</span>
                      </div>
                      <div>
                        <span className="text-anilist-text block text-xs">Studios</span>
                        <span className="text-anilist-heading font-medium">{moreInfo.studios || 'Unknown'}</span>
                      </div>
                      <div>
                        <span className="text-anilist-text block text-xs">Status</span>
                        <span className="text-anilist-heading font-medium">{moreInfo.status || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Details */}
                <div className="flex-1 space-y-6 text-center md:text-left">
                  <div>
                    <h3 className="text-xl font-bold text-anilist-heading mb-2">Synopsis</h3>
                    <p className="text-sm text-anilist-text leading-relaxed text-justify md:text-left" dangerouslySetInnerHTML={{ __html: cleanDescription }} />
                  </div>
                  
                  {moreInfo.trailer && (
                    <div className="pt-4">
                      <h3 className="text-xl font-bold text-anilist-heading mb-4">Trailer</h3>
                      <div className="w-full aspect-video rounded-lg overflow-hidden border border-white/10 bg-black">
                        <iframe
                          src={moreInfo.trailer.replace('watch?v=', 'embed/')}
                          className="w-full h-full"
                          allowFullScreen
                          referrerPolicy="no-referrer"
                          title="Trailer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'episodes' && (
            <div className="w-full">
              {selectedEpisode && (
                <div className="mb-6">
                  <h3 className="text-lg sm:text-xl font-bold text-anilist-heading mb-2">
                    Episode {selectedEpisode.episode}: {selectedEpisode.title || `Episode ${selectedEpisode.episode}`}
                  </h3>
                  <p className="text-xs sm:text-sm text-anilist-text line-clamp-3 leading-relaxed">
                      {cleanDescription}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                {epLoading ? (
                  <div className="flex flex-col gap-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex gap-4 p-4 animate-pulse border-b border-white/5">
                        <div className="w-32 aspect-video rounded bg-white/5" />
                        <div className="flex-1 space-y-3">
                          <div className="h-4 w-3/4 bg-white/5 rounded" />
                          <div className="h-3 w-1/2 bg-white/5 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : episodes.length > 0 ? (
                  <div className="flex flex-col">
                    {episodes.map((ep, index) => (
                      <button 
                        onClick={() => handleEpisodeClick(ep)}
                        key={ep.id} 
                        className={`flex gap-4 p-4 transition-colors text-left group border-b border-white/5 hover:bg-white/5 ${
                          selectedEpisode?.id === ep.id ? 'bg-white/5' : ''
                        }`}
                      >
                        <div className="text-xl font-bold text-anilist-text/50 w-8 flex-shrink-0 flex items-center justify-center">
                          {index + 1}
                        </div>
                        <div className="relative w-32 aspect-video flex-shrink-0 rounded overflow-hidden bg-black/20">
                          <img 
                            src={ep.image || info.poster} 
                            alt={`Ep ${index + 1}`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className={`absolute inset-0 flex flex-col items-center justify-center bg-black/60 ${selectedEpisode?.id === ep.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                            <Play size={20} fill="currentColor" className="text-white" />
                          </div>
                          {/* Progress bar simulation (optional) */}
                          {selectedEpisode?.id === ep.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-anilist-accent"></div>
                          )}
                        </div>
                        <div className="flex flex-col justify-center flex-1 min-w-0 py-1">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className={`text-sm sm:text-base font-bold line-clamp-1 ${selectedEpisode?.id === ep.id ? 'text-white' : 'text-anilist-heading'}`}>
                              {ep.title || `Episode ${index + 1}`}
                            </h4>
                            <span className="text-xs text-anilist-text whitespace-nowrap">
                              {moreInfo.duration || '24m'}
                            </span>
                          </div>
                          <p className="text-xs text-anilist-text mt-2 line-clamp-2 opacity-70">
                            {cleanDescription}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-anilist-text text-xs sm:text-sm flex flex-col items-center gap-4">
                    <p>No episodes found.</p>
                    <button 
                      onClick={handleRetryEpisodes}
                      className="bg-anilist-accent text-black px-4 py-2 rounded-md font-bold text-xs uppercase tracking-wider hover:scale-105 transition-transform"
                    >
                      Retry Loading Episodes
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'seasons' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {seasons.length > 0 ? (
                seasons.map((season: any) => (
                  <div 
                    onClick={() => {
                        setAnime(null);
                        setLoading(true);
                        navigate(`/anime/${season.id}`);
                    }}
                    key={season.id}
                    className={`relative h-24 sm:h-32 rounded-xl overflow-hidden cursor-pointer group border border-white/10 transition-transform hover:scale-[1.02] ${
                      season.isCurrent ? 'ring-2 ring-anilist-accent' : ''
                    }`}
                  >
                    {/* Background Image with Blur */}
                    <div className="absolute inset-0">
                      <img 
                        src={season.poster || info.poster} 
                        alt={season.name || season.title}
                        className="w-full h-full object-cover blur-sm opacity-60 group-hover:opacity-80 transition-opacity"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors"></div>
                    </div>

                    {/* Content Overlay */}
                    <div className="absolute inset-0 flex items-center justify-between p-4 sm:p-6 z-10">
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="font-black text-sm sm:text-lg text-white truncate drop-shadow-md">
                          {season.name || season.title}
                        </h4>
                        <p className="text-xs sm:text-sm text-white/80 truncate mt-1 drop-shadow-sm">
                          {season.title || season.name}
                        </p>
                      </div>
                      
                      {season.isCurrent && (
                        <div className="flex-shrink-0 bg-anilist-accent text-black text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                          CURRENT
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-anilist-text text-xs sm:text-sm">
                  No seasons found.
                </div>
              )}
            </div>
          )}

          {activeTab === 'recommended' && (
            <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-6 snap-x snap-mandatory hide-scrollbar">
              {anime.recommendedAnimes?.map((node: any, i: number) => (
                <AnimeCard 
                  key={node.id} 
                  anime={node} 
                  index={i}
                  className="flex-shrink-0 w-32 sm:w-44 md:w-48 lg:w-56 snap-start"
                />
              ))}
              {(!anime.recommendedAnimes || anime.recommendedAnimes.length === 0) && (
                <div className="w-full text-center py-12 text-anilist-text text-xs sm:text-sm">
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
