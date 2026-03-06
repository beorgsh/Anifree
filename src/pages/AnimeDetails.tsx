import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Calendar, Tv, Play } from 'lucide-react';
import AnimeCard from '../components/AnimeCard';
import Player from '../components/Player';
import { convertM3U8toMP4 } from '../utils/player';

type Tab = 'overview' | 'episodes' | 'recommended';

import { motion } from 'motion/react';

import { fetchWithProxy } from '../utils/api';

const AnimeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [anime, setAnime] = useState<any>(null);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
            fetchEpisodes(title);
          }
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

      // Create a timeout promise to fail fast if proxies are slow
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Proxy timeout')), 8000)
      );

      const fetchPromises = proxies.map(async (proxyUrl) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout per request
          
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
      } catch (error) {
        console.warn('All proxies failed or timed out fetching episodes');
      }
    } catch (error) {
      console.error('Failed to fetch episodes:', error);
    } finally {
      setEpLoading(false);
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
        <div className="h-[30vh] sm:h-[40vh] bg-white/5 w-full"></div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-32 relative z-10">
          <div className="flex flex-col md:flex-row gap-6 sm:gap-8">
            <div className="w-32 sm:w-48 md:w-64 aspect-[2/3] bg-white/10 rounded-lg shadow-2xl flex-shrink-0 mx-auto md:mx-0"></div>
            <div className="flex-1 pt-4 sm:pt-0 space-y-4 text-center md:text-left">
              <div className="h-8 sm:h-10 bg-white/10 w-3/4 rounded mx-auto md:mx-0"></div>
              <div className="h-4 sm:h-6 bg-white/10 w-1/2 rounded mx-auto md:mx-0"></div>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
                <div className="h-6 w-16 bg-white/10 rounded"></div>
                <div className="h-6 w-16 bg-white/10 rounded"></div>
                <div className="h-6 w-16 bg-white/10 rounded"></div>
              </div>
            </div>
          </div>
          <div className="mt-10 h-10 bg-white/10 w-full rounded"></div>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
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
      className="min-h-screen pb-20"
    >
      {/* Banner / Player Area */}
      <div className={`relative w-full bg-black transition-all duration-300 ${activeTab === 'episodes' ? 'w-full' : 'h-[30vh] sm:h-[40vh] overflow-hidden'}`}>
        {activeTab === 'episodes' ? (
          <div className="w-full mx-auto bg-black">
            <div className="w-full aspect-video max-h-[75vh] mx-auto relative">
              {videoUrl ? (
                <Player 
                  key={videoUrl}
                  option={{
                    url: videoUrl,
                    title: `${info.name} - Episode ${selectedEpisode.episode}`,
                    poster: selectedEpisode.image || info.poster,
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
          <>
            <img 
              src={info.poster} 
              alt={info.name}
              className="h-full w-full object-cover opacity-30 blur-sm"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-anilist-bg to-transparent"></div>
          </>
        )}
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-32 relative z-10">
        {/* Right Column: Info - Only show in overview */}
        {activeTab === 'overview' && (
          <div className="flex flex-col md:flex-row gap-6 sm:gap-8">
            {/* Left Column: Poster */}
            <div className="w-32 sm:w-48 md:w-64 flex-shrink-0 mx-auto md:mx-0">
              <img 
                src={info.poster} 
                alt={info.name}
                className="w-full rounded-lg shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Right Column: Info */}
            <div className="flex-1 flex flex-col justify-end pt-4 sm:pt-0 text-center md:text-left">
              <h1 className="text-2xl sm:text-4xl font-black text-anilist-heading leading-tight">{info.name}</h1>
              {moreInfo.japanese && moreInfo.japanese !== info.name && (
                <h2 className="text-sm sm:text-base text-anilist-text mt-1">{moreInfo.japanese}</h2>
              )}
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 mt-4 text-xs sm:text-sm text-anilist-text font-medium">
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-400" fill="currentColor" />
                  <span>{moreInfo.malscore || '?'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>{moreInfo.premiered || 'TBA'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Tv size={14} />
                  <span>{info.stats?.type || 'TV'}</span>
                </div>
                <div className="px-2 py-0.5 rounded bg-white/10 text-white">
                  {moreInfo.status || 'Unknown'}
                </div>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
                {moreInfo.genres?.map((genre: string) => (
                  <span key={genre} className="rounded-full bg-white/5 px-3 py-1 text-[10px] sm:text-xs border border-white/10 text-anilist-heading">
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tabs - Sticky */}
        <div className={`mt-16 sm:mt-10 border-b border-white/10 flex overflow-x-auto hide-scrollbar sticky top-0 z-30 bg-anilist-bg/95 backdrop-blur-sm ${activeTab === 'episodes' ? 'mt-0 sm:mt-0 pt-4' : ''}`}>
          {['overview', 'episodes', 'seasons', 'recommended'].map((tab) => (
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
                <p className="text-xs sm:text-sm text-anilist-text leading-relaxed" dangerouslySetInnerHTML={{ __html: cleanDescription }} />
              </div>
              <div className="space-y-4 bg-white/5 p-4 rounded-lg border border-white/10 h-fit">
                <h3 className="text-sm font-bold text-anilist-heading uppercase tracking-wider">Information</h3>
                <div className="space-y-3 text-xs sm:text-sm">
                  <div>
                    <span className="text-anilist-text block">Format</span>
                    <span className="text-anilist-heading">{info.stats?.type || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-anilist-text block">Episodes</span>
                    <span className="text-anilist-heading">{info.stats?.episodes?.sub || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-anilist-text block">Episode Duration</span>
                    <span className="text-anilist-heading">{moreInfo.duration || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-anilist-text block">Status</span>
                    <span className="text-anilist-heading">{moreInfo.status || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-anilist-text block">Aired</span>
                    <span className="text-anilist-heading">{moreInfo.aired || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-anilist-text block">Studios</span>
                    <span className="text-anilist-heading">{moreInfo.studios || 'Unknown'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'episodes' && (
            <div className="w-full">
              {selectedEpisode && (
                <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
                  <h3 className="text-lg font-bold text-anilist-heading">
                    Episode {selectedEpisode.episode}: {selectedEpisode.title || `Episode ${selectedEpisode.episode}`}
                  </h3>
                  <p className="text-sm text-anilist-text mt-2 line-clamp-2">
                      {cleanDescription}
                  </p>
                </div>
              )}

              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                  <h3 className="font-bold text-anilist-heading">Episodes ({episodes.length})</h3>
                  <span className="text-xs text-anilist-text">Scroll to see more</span>
                </div>
                <div className="h-[60vh] overflow-y-auto p-2 custom-scrollbar">
                  {epLoading ? (
                    <div className="flex flex-col gap-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex gap-3 p-2 animate-pulse">
                          <div className="w-24 aspect-video rounded bg-white/5" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 w-3/4 bg-white/5 rounded" />
                            <div className="h-2 w-1/2 bg-white/5 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : episodes.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {episodes.map((ep, index) => (
                        <button 
                          onClick={() => handleEpisodeClick(ep)}
                          key={ep.id} 
                          className={`flex gap-3 p-2 rounded-lg transition-colors text-left group ${
                            selectedEpisode?.id === ep.id 
                              ? 'bg-anilist-accent text-black' 
                              : 'hover:bg-white/10 text-anilist-text hover:text-anilist-heading'
                          }`}
                        >
                          <div className="relative w-24 aspect-video flex-shrink-0 rounded overflow-hidden bg-black/20">
                            <img 
                              src={ep.image || info.poster} 
                              alt={`Ep ${index + 1}`}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className={`absolute inset-0 flex items-center justify-center bg-black/40 ${selectedEpisode?.id === ep.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                              <Play size={16} fill="currentColor" className={selectedEpisode?.id === ep.id ? 'text-black' : 'text-white'} />
                            </div>
                          </div>
                          <div className="flex flex-col justify-center flex-1 min-w-0">
                            <h4 className="text-sm font-bold line-clamp-1">
                              {index + 1}. {ep.title || `Episode ${index + 1}`}
                            </h4>
                            <span className={`text-[10px] mt-1 ${selectedEpisode?.id === ep.id ? 'text-black/70' : 'text-anilist-text/70'}`}>
                              {moreInfo.duration || '24m'}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-anilist-text text-sm">
                      No episodes found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'seasons' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {seasons.length > 0 ? (
                seasons.map((season: any) => (
                  <a 
                    href={`/anime/${season.id}`}
                    key={season.id}
                    className={`block p-3 rounded-lg border transition-all ${
                      season.isCurrent 
                        ? 'bg-anilist-accent/10 border-anilist-accent text-anilist-accent' 
                        : 'bg-white/5 border-white/10 text-anilist-text hover:bg-white/10 hover:text-anilist-heading'
                    }`}
                  >
                    <div className="text-center">
                      <h4 className="font-bold text-sm truncate">{season.name || season.title}</h4>
                      <p className="text-xs opacity-70 mt-1">{season.title || season.name}</p>
                    </div>
                  </a>
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-anilist-text text-sm">
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
