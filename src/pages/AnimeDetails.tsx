import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Star, Calendar, Tv, Play, ChevronLeft, ChevronDown, Check, Captions, Mic, Download } from 'lucide-react';
import AnimeCard from '../components/AnimeCard';
import Player from '../components/Player';
import { convertM3U8toMP4 } from '../utils/player';

type Tab = 'overview' | 'episodes' | 'recommended';

import { motion, AnimatePresence } from 'motion/react';
import { useCache } from '../context/CacheContext';

import { fetchWithProxy } from '../utils/api';

const AnimeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [audioPref, setAudioPref] = useState<'sub' | 'dub'>('sub');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const episodesPerPage = 30;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (location.state?.tab === 'episodes') {
      setActiveTab('episodes');
    } else {
      setActiveTab('overview');
      window.scrollTo(0, 0);
    }
    setCurrentPage(1);
    setIsDropdownOpen(false);
  }, [id, location.state]);

  // Scroll to tabs and focus current season when loading finishes
  useEffect(() => {
    if (!loading && activeTab === 'episodes') {
      setTimeout(() => {
        // 1. Horizontally scroll seasons container to center the current season
        const currentSeasonEl = document.getElementById('current-season');
        const containerEl = document.getElementById('seasons-container');
        if (currentSeasonEl && containerEl) {
          const scrollLeft = currentSeasonEl.offsetLeft - (containerEl.clientWidth / 2) + (currentSeasonEl.clientWidth / 2);
          containerEl.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }

        // 2. Vertically scroll to episode list if we navigated from a season click
        if (location.state?.tab === 'episodes') {
          document.getElementById('episode-list-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [loading, activeTab, location.state]);

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

  useEffect(() => {
    if (selectedEpisode && anime?.info?.name) {
      let targetAudio = audioPref;
      if (targetAudio === 'sub' && !selectedEpisode.sub?.url && selectedEpisode.dub?.url) {
        targetAudio = 'dub';
      } else if (targetAudio === 'dub' && !selectedEpisode.dub?.url && selectedEpisode.sub?.url) {
        targetAudio = 'sub';
      }
      
      const m3u8Url = targetAudio === 'sub' ? selectedEpisode.sub?.url : selectedEpisode.dub?.url;
      const url = m3u8Url ? convertM3U8toMP4(m3u8Url, anime.info?.name, selectedEpisode.episode) : '';
      setVideoUrl(url);
    }
  }, [selectedEpisode, audioPref, anime?.info?.name]);

  const handleEpisodeClick = (ep: any, fromPlayer = false) => {
    setSelectedEpisode(ep);
    if (!fromPlayer) {
      document.getElementById('video-player-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const toggleAudio = () => {
    setAudioPref(prev => prev === 'sub' ? 'dub' : 'sub');
  };

  const handleNextEpisode = () => {
    if (!selectedEpisode || episodes.length === 0) return;
    const currentIndex = episodes.findIndex(ep => ep.id === selectedEpisode.id);
    if (currentIndex >= 0 && currentIndex < episodes.length - 1) {
      handleEpisodeClick(episodes[currentIndex + 1], true);
    }
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

  const totalPages = Math.ceil(episodes.length / episodesPerPage);
  const currentEpisodes = episodes.slice(
    (currentPage - 1) * episodesPerPage,
    currentPage * episodesPerPage
  );

  const info = anime.info || {};
  const moreInfo = anime.moreInfo || {};
  const cleanDescription = info.description?.replace(/<[^>]*>?/gm, '') || 'No description available.';

  const hasGlobalSub = info.stats?.episodes?.sub > 0 || episodes.some(ep => ep.sub);
  const hasGlobalDub = info.stats?.episodes?.dub > 0 || episodes.some(ep => ep.dub);
  const canToggleGlobal = hasGlobalSub && hasGlobalDub;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`relative ${activeTab === 'episodes' ? 'h-screen flex flex-col overflow-hidden' : 'min-h-screen pb-10'}`}
    >
      {activeTab !== 'episodes' && (
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
      )}

      {/* Player Area (Only visible when watching) */}
      <div className={activeTab === 'episodes' ? 'flex-shrink-0' : ''}>
        {activeTab === 'episodes' ? (
          <div id="video-player-section" className="w-full bg-black">
            <div className="w-full aspect-video max-h-[75vh] mx-auto relative">
              {videoUrl ? (
                <Player 
                  option={{
                    url: videoUrl,
                    title: `${info.name} - Episode ${selectedEpisode?.episode || ''}`,
                    poster: selectedEpisode?.image || info.poster,
                    fullscreen: true,
                  }}
                  animeTitle={info.name}
                  episodeTitle={`Episode ${selectedEpisode?.episode || ''}${selectedEpisode?.title ? `: ${selectedEpisode.title}` : ''}`}
                  episodeNumber={selectedEpisode?.episode}
                  onNext={
                    episodes.findIndex(ep => ep.id === selectedEpisode?.id) < episodes.length - 1 
                      ? handleNextEpisode 
                      : undefined
                  }
                  onBack={() => {
                    if (window.history.length > 1) {
                      navigate(-1);
                    } else {
                      navigate('/');
                    }
                  }}
                  hasSub={!!selectedEpisode?.sub?.url}
                  hasDub={!!selectedEpisode?.dub?.url}
                  currentAudio={audioPref}
                  onToggleAudio={toggleAudio}
                  onExitFullscreen={() => {
                    setTimeout(() => {
                      document.getElementById(`episode-${selectedEpisode?.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
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
      </div>

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
              
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3 sm:mt-4 text-[10px] sm:text-xs font-bold drop-shadow-sm">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/10 text-white backdrop-blur-sm border border-white/5">
                  <Star size={12} className="text-yellow-400" fill="currentColor" />
                  <span>{moreInfo.malscore || '?'}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/10 text-white backdrop-blur-sm border border-white/5">
                  <Calendar size={12} className="text-anilist-accent" />
                  <span>{moreInfo.premiered || 'TBA'}</span>
                </div>
                <div className="px-2 py-1 rounded bg-white/10 text-white backdrop-blur-sm border border-white/5">
                  {moreInfo.status || 'Unknown'}
                </div>
                <div className="px-2 py-1 rounded bg-anilist-accent text-black shadow-sm">
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

      {/* Tabs Header (Full Width) */}
      <div id="tabs-section" className={`flex-shrink-0 ${activeTab === 'episodes' ? 'relative' : 'sticky top-0'} z-30 w-full bg-black/80 backdrop-blur-md border-b border-white/10 transition-all duration-300 ${activeTab === 'episodes' ? 'shadow-xl' : ''}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex overflow-x-auto hide-scrollbar">
          {['overview', 'episodes', 'recommended'].map((tab) => (
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

      <div className={`${activeTab === 'episodes' ? 'flex-grow overflow-y-auto' : 'relative z-10'} w-full`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
                        <div className="flex flex-col gap-1.5 mt-1">
                          {info.stats?.episodes?.sub && (
                            <div className="flex items-center gap-2 text-anilist-heading font-medium">
                              <Captions size={14} className="text-anilist-accent" />
                              <span>{info.stats.episodes.sub}</span>
                            </div>
                          )}
                          {info.stats?.episodes?.dub && (
                            <div className="flex items-center gap-2 text-anilist-heading font-medium">
                              <Mic size={14} className="text-anilist-accent" />
                              <span>{info.stats.episodes.dub}</span>
                            </div>
                          )}
                          {!info.stats?.episodes?.sub && !info.stats?.episodes?.dub && (
                            <span className="text-anilist-heading font-medium">Unknown</span>
                          )}
                        </div>
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
              {seasons && seasons.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg sm:text-xl font-bold text-anilist-heading mb-4 px-4 sm:px-0">Seasons</h3>
                  <div id="seasons-container" className="relative flex overflow-x-auto gap-4 pb-4 px-4 sm:px-0 snap-x hide-scrollbar">
                    {seasons.map((season: any) => (
                      <div 
                        id={season.isCurrent ? 'current-season' : `season-${season.id}`}
                        onClick={() => {
                          if (!season.isCurrent) {
                            setAnime(null);
                            setLoading(true);
                            navigate(`/anime/${season.id}`, { state: { tab: 'episodes' } });
                          }
                        }}
                        key={season.id}
                        className={`relative flex-shrink-0 w-48 sm:w-64 h-28 sm:h-36 rounded-xl overflow-hidden cursor-pointer group border-2 transition-all snap-start ${
                          season.isCurrent ? 'border-anilist-accent shadow-[0_0_15px_rgba(61,180,242,0.3)]' : 'border-transparent hover:border-white/20'
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
                          <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors"></div>
                        </div>

                        {/* Content Overlay */}
                        <div className="absolute inset-0 flex flex-col justify-end p-3 sm:p-4 z-10">
                          <h4 className="font-black text-sm sm:text-base text-white line-clamp-2 drop-shadow-md">
                            {season.name || season.title}
                          </h4>
                          {season.isCurrent && (
                            <span className="absolute top-2 right-2 bg-anilist-accent text-black text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">
                              CURRENT
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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
                  <div id="episode-list-section" className="flex flex-col scroll-mt-20">
                    {/* Header with Pagination and Audio Toggle */}
                    <div className="flex flex-row items-center justify-between gap-4 mb-6 px-4 sm:px-0">
                      {/* Left: Episodes + Total */}
                      <div className="flex-1">
                        {totalPages > 1 ? (
                          <div className="relative inline-block w-full sm:w-auto" ref={dropdownRef}>
                            <button
                              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                              className="w-full sm:w-auto flex items-center justify-between gap-2 sm:gap-4 bg-white/5 border border-white/10 text-anilist-heading text-xs sm:text-sm font-bold py-2 sm:py-3 px-3 sm:px-5 rounded-xl hover:bg-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-anilist-accent/50 group shadow-lg"
                            >
                              <span className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                                <Tv size={16} className="text-anilist-accent hidden sm:block" />
                                Ep {(currentPage - 1) * episodesPerPage + 1}-{Math.min(currentPage * episodesPerPage, episodes.length)}
                                <span className="text-anilist-text font-normal ml-1">({episodes.length})</span>
                              </span>
                              <ChevronDown 
                                size={16} 
                                className={`text-anilist-text transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                              />
                            </button>

                            <AnimatePresence>
                              {isDropdownOpen && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  transition={{ duration: 0.2, ease: "easeOut" }}
                                  className="absolute left-0 right-0 mt-2 z-50 bg-anilist-fg border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
                                >
                                  <div className="max-h-64 overflow-y-auto py-2 custom-scrollbar">
                                    {[...Array(totalPages)].map((_, i) => (
                                      <button
                                        key={i}
                                        onClick={() => {
                                          setCurrentPage(i + 1);
                                          setIsDropdownOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-5 py-3 text-sm font-bold transition-colors hover:bg-anilist-fg-hover ${
                                          currentPage === i + 1 ? 'text-anilist-accent bg-white/5' : 'text-anilist-text'
                                        }`}
                                      >
                                        <span>
                                          Episodes {i * episodesPerPage + 1}-{Math.min((i + 1) * episodesPerPage, episodes.length)}
                                        </span>
                                        {currentPage === i + 1 && <Check size={16} />}
                                      </button>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ) : (
                          <h3 className="text-sm sm:text-lg font-bold text-anilist-heading flex items-center gap-2">
                            <Tv size={20} className="text-anilist-accent hidden sm:block" />
                            Episodes <span className="text-xs sm:text-sm text-anilist-text font-normal ml-1 sm:ml-2">({episodes.length})</span>
                          </h3>
                        )}
                      </div>

                      {/* Right: Sub/Dub Switch */}
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <span className="text-[10px] sm:text-xs font-bold text-anilist-text uppercase tracking-wider hidden sm:inline-block">Audio:</span>
                        <button
                          onClick={toggleAudio}
                          disabled={!canToggleGlobal}
                          className={`relative w-20 h-9 rounded-full transition-colors border border-white/20 bg-black/50 ${
                            !canToggleGlobal ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-black/70'
                          }`}
                          aria-label="Toggle Sub/Dub"
                        >
                          <div className={`absolute top-0.5 left-1 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-[10px] font-bold text-black transform transition-transform duration-300 ease-in-out ${audioPref === 'dub' ? 'translate-x-11' : 'translate-x-0'}`}>
                            {audioPref === 'dub' ? 'DUB' : 'SUB'}
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col pr-2 rounded-xl">
                      {currentEpisodes.map((ep, index) => {
                        const actualIndex = (currentPage - 1) * episodesPerPage + index;
                        const m3u8Url = ep.sub?.url || ep.dub?.url;
                        const downloadUrl = m3u8Url ? convertM3U8toMP4(m3u8Url, anime.info?.name, ep.episode) : '';
                        
                        return (
                          <div 
                            key={ep.id} 
                            id={`episode-${ep.id}`}
                            className={`flex items-center gap-4 p-4 transition-all text-left group border-b border-white/5 hover:bg-white/5 rounded-xl ${
                              selectedEpisode?.id === ep.id ? 'bg-white/10 border border-anilist-accent shadow-[0_0_10px_rgba(61,180,242,0.2)]' : 'border border-transparent'
                            }`}
                          >
                            <button 
                              onClick={() => handleEpisodeClick(ep)}
                              className="flex flex-1 items-center gap-4 min-w-0"
                            >
                              <div className="relative w-32 aspect-video flex-shrink-0 rounded overflow-hidden bg-black/20">
                                <img 
                                  src={ep.image || info.poster} 
                                  alt={`Ep ${actualIndex + 1}`}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                {(() => {
                                  const progress = localStorage.getItem(`progress_${anime.info?.name}_Episode ${ep.episode}`);
                                  const duration = 24 * 60; // Assume 24 minutes for now
                                  const percentage = progress ? (parseFloat(progress) / duration) * 100 : 0;
                                  return percentage > 0 && (
                                    <div className="absolute bottom-0 left-0 h-1 bg-anilist-accent" style={{ width: `${Math.min(percentage, 100)}%` }}></div>
                                  );
                                })()}
                                <div className={`absolute inset-0 flex flex-col items-center justify-center bg-black/60 ${selectedEpisode?.id === ep.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                  <Play size={20} fill="currentColor" className="text-white" />
                                </div>
                                {selectedEpisode?.id === ep.id && (
                                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-anilist-accent"></div>
                                )}
                              </div>
                              <div className="flex flex-col justify-center flex-1 min-w-0 py-1">
                                <div className="flex justify-between items-start gap-2">
                                  <h4 className={`text-sm sm:text-base font-bold line-clamp-1 ${selectedEpisode?.id === ep.id ? 'text-white' : 'text-anilist-heading'}`}>
                                    {ep.title || `Episode ${actualIndex + 1}`}
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
                            
                            {downloadUrl && (
                              <a 
                                href={downloadUrl}
                                download={`${anime.info?.name}_Episode_${ep.episode}.mp4`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3 rounded-full bg-white/5 text-anilist-text hover:bg-anilist-accent hover:text-black transition-all shadow-lg border border-white/10"
                                title="Download MP4"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Download size={18} />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex justify-center gap-4 mt-8 mb-4">
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          className="px-4 py-2 rounded-lg bg-white/5 text-anilist-text disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors font-bold text-sm"
                        >
                          Previous
                        </button>
                        <div className="flex items-center text-anilist-text font-bold text-sm">
                          Page {currentPage} of {totalPages}
                        </div>
                        <button
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          className="px-4 py-2 rounded-lg bg-white/5 text-anilist-text disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors font-bold text-sm"
                        >
                          Next
                        </button>
                      </div>
                    )}
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
    </div>
  </motion.div>
  );
};

export default AnimeDetails;
