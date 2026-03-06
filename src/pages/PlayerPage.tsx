import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAniList, ANIME_DETAILS_QUERY, convertM3U8toMP4 } from '../services/anilist';
import Player from '../components/Player';
import { ArrowLeft, Loader2 } from 'lucide-react';

const PlayerPage: React.FC = () => {
  const { id, epNum } = useParams<{ id: string; epNum: string }>();
  const navigate = useNavigate();
  const [anime, setAnime] = useState<any>(null);
  const [episode, setEpisode] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchAniList(ANIME_DETAILS_QUERY, { id: parseInt(id!) });
        setAnime(data.Media);
        
        const title = data.Media.title.romaji || data.Media.title.english;
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

        const epData = await Promise.any(fetchPromises);
        const fetchedEpisodes = epData.results[0].episodes || [];
        const currentEp = fetchedEpisodes.find((ep: any) => ep.episode === epNum);
        
        if (currentEp) {
          setEpisode(currentEp);
        } else {
          setError('Episode not found');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load episode');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, epNum]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 text-white">
        <Loader2 className="w-12 h-12 animate-spin text-anilist-accent mb-4" />
        <p>Loading Episode {epNum}...</p>
      </div>
    );
  }

  if (error || !episode) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 text-white">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-white/10 rounded hover:bg-white/20">
          Go Back
        </button>
      </div>
    );
  }

  const m3u8Url = episode.sub?.url || episode.dub?.url;
  const videoUrl = m3u8Url ? convertM3U8toMP4(m3u8Url, anime.title.romaji, episode.episode) : '';

  const handleNext = () => {
    const nextEpNum = parseInt(epNum!) + 1;
    navigate(`/anime/${id}/watch/${nextEpNum}`);
  };

  const handleInteraction = async () => {
    if (window.innerWidth <= 768) {
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
        const orientation = screen.orientation as any;
        if (orientation && orientation.lock) {
          await orientation.lock('landscape');
        }
      } catch (e) {
        console.warn('Fullscreen/Orientation lock failed:', e);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col" onClick={handleInteraction}>
      <div className="flex-1 w-full h-full">
        {videoUrl ? (
          <Player 
            key={videoUrl}
            option={{
              url: videoUrl,
              title: `${anime.title.romaji} - Episode ${episode.episode}`,
              poster: episode.image || anime.bannerImage || anime.coverImage.extraLarge,
              fullscreen: true,
            }}
            onBack={() => navigate(-1)}
            onNext={handleNext}
            className="w-full h-full"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white flex-col gap-4">
            <p>No video source available for this episode.</p>
            <button onClick={() => navigate(-1)} className="px-4 py-2 bg-white/10 rounded hover:bg-white/20">
              Go Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerPage;
