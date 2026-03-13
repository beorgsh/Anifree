import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import videojs from 'video.js';
import type PlayerType from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';

interface PlayerProps {
  option: any;
  className?: string;
  getInstance?: (player: PlayerType) => void;
  onBack?: () => void;
  onNext?: () => void;
  animeTitle?: string;
  episodeTitle?: string;
  episodeNumber?: number | string;
  hasSub?: boolean;
  hasDub?: boolean;
  currentAudio?: 'sub' | 'dub';
  onToggleAudio?: () => void;
  onExitFullscreen?: () => void;
}

const Player: React.FC<PlayerProps> = ({ option, className, getInstance, onBack, onNext, animeTitle, episodeTitle, episodeNumber, hasSub, hasDub, currentAudio, onToggleAudio, onExitFullscreen }) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerType | null>(null);
  const animeTitleRef = useRef(animeTitle);
  const episodeNumberRef = useRef(episodeNumber);

  useEffect(() => {
    animeTitleRef.current = animeTitle;
    episodeNumberRef.current = episodeNumber;
  }, [animeTitle, episodeNumber]);

  const [playerNode, setPlayerNode] = useState<HTMLElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeTimeRef = useRef<number>(0);

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement("video-js");
      videoElement.classList.add('vjs-big-play-centered');
      videoRef.current.appendChild(videoElement);

      const player = playerRef.current = videojs(videoElement, {
        autoplay: true,
        controls: true,
        responsive: true,
        fill: true,
        inactivityTimeout: 4000,
        controlBar: {
          pictureInPictureToggle: false,
          playbackRateMenuButton: false
        },
        userActions: {
          hotkeys: true,
          doubleClick: false
        },
        sources: option.url ? [{
          src: option.url,
          type: option.url.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4'
        }] : [],
        poster: option.poster,
        ...option,
      }, () => {
        setPlayerNode(player.el());
        if (getInstance) {
          getInstance(player);
        }
      });

      player.on('timeupdate', () => {
        const currentTime = player.currentTime();
        const title = animeTitleRef.current;
        const ep = episodeNumberRef.current;
        
        if (currentTime > 0 && title && ep) {
          const key = `progress_${title}_Episode ${ep}`;
          try {
            localStorage.setItem(key, currentTime.toString());
          } catch (e) {
            // Silently fail if localStorage is blocked
          }
        }
      });

      player.on('useractive', () => {
        activeTimeRef.current = Date.now();
      });

      // --- Smooth Scrubbing Hack ---
      const seekBar = (player as any).controlBar?.progressControl?.seekBar;
      if (seekBar) {
        let isDragging = false;
        let dragPercent = 0;

        const origGetPercent = seekBar.getPercent.bind(seekBar);
        seekBar.getPercent = () => {
          if (isDragging) {
            return dragPercent;
          }
          return origGetPercent();
        };

        seekBar.handleMouseMove = (event: any) => {
          isDragging = true;
          dragPercent = seekBar.calculateDistance(event);
          if (seekBar.update) {
            seekBar.update(event);
          }
          
          const duration = player.duration();
          if (duration && !isNaN(duration)) {
            const scrubTime = dragPercent * duration;
            const formatTime = (seconds: number) => {
              const h = Math.floor(seconds / 3600);
              const m = Math.floor((seconds % 3600) / 60);
              const s = Math.floor(seconds % 60);
              if (h > 0) {
                return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
              }
              return `${m}:${s < 10 ? '0' : ''}${s}`;
            };

            const cb = player.getChild('controlBar');
            if (cb) {
              const ctd = cb.getChild('currentTimeDisplay');
              if (ctd) {
                const el = ctd.contentEl();
                if (el && el.lastChild && el.lastChild.nodeType === 3) {
                  el.lastChild.nodeValue = formatTime(scrubTime);
                }
              }
              const rtd = cb.getChild('remainingTimeDisplay');
              if (rtd) {
                const el = rtd.contentEl();
                if (el && el.lastChild && el.lastChild.nodeType === 3) {
                  el.lastChild.nodeValue = '-' + formatTime(duration - scrubTime);
                }
              }
            }
          }
        };

        const origMouseUp = seekBar.handleMouseUp.bind(seekBar);
        seekBar.handleMouseUp = (event: any) => {
          if (isDragging) {
            const duration = player.duration();
            if (duration && !isNaN(duration)) {
              player.currentTime(dragPercent * duration);
            }
            isDragging = false;
          }
          origMouseUp(event);
        };
      }
      // -----------------------------

      // Custom buttons for Back and Next
      const lockLandscape = async () => {
        try {
          if (screen.orientation && (screen.orientation as any).lock) {
            await (screen.orientation as any).lock('landscape');
          }
        } catch (err) {
          console.warn('Screen orientation lock failed:', err);
        }
      };

      const unlockOrientation = () => {
        try {
          if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
          }
        } catch (err) {
          console.warn('Screen orientation unlock failed:', err);
        }
      };

      player.on('fullscreenchange', () => {
        const isFs = player.isFullscreen();
        setIsFullscreen(isFs);
        if (isFs) {
          lockLandscape();
        } else {
          unlockOrientation();
          if (onExitFullscreen) onExitFullscreen();
        }
      });
    }
  }, [videoRef, onBack, onNext, getInstance]);

  // Handle progress loading and source updates
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !option.url) return;

    const loadProgress = () => {
      const key = `progress_${animeTitle}_Episode ${episodeNumber}`;
      try {
        const savedTime = localStorage.getItem(key);
        console.log(`Loading progress for ${key}: ${savedTime}`);
        if (savedTime) {
          const time = parseFloat(savedTime);
          if (!isNaN(time) && time > 0) {
            player.currentTime(time);
            player.play().catch(() => {});
          }
        }
      } catch (e) {
        console.error("Failed to load progress", e);
      }
    };

    const currentSrc = player.src();
    if (currentSrc !== option.url) {
      player.src({
        src: option.url,
        type: option.url.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4'
      });
      if (option.poster) {
        player.poster(option.poster);
      }
      
      // Load progress when the new source is ready
      player.one('canplay', loadProgress);
      player.one('loadedmetadata', loadProgress);
      
      player.play().catch(() => {});
    } else {
      // If source is same but episode changed (unlikely but possible), still try loading progress
      player.one('canplay', loadProgress);
    }
  }, [option.url, option.poster, animeTitle, episodeNumber]);

  const handleGesture = (e: React.MouseEvent | React.TouchEvent) => {
    const player = playerRef.current;
    if (!player) return;

    const now = Date.now();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = clientX - rect.left;
    const width = rect.width;

    if (now - lastTapRef.current.time < 300) {
      // Double tap detected
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }

      if (x < width * 0.3) {
        // Left side: Seek backward
        player.currentTime(Math.max(0, player.currentTime() - 10));
      } else if (x > width * 0.7) {
        // Right side: Seek forward
        player.currentTime(Math.min(player.duration(), player.currentTime() + 10));
      } else {
        // Center: Play/Pause
        if (player.paused()) {
          player.play();
        } else {
          player.pause();
        }
      }
      lastTapRef.current = { time: 0, x: 0 }; // Reset
    } else {
      lastTapRef.current = { time: now, x };
      
      // Single tap logic: Toggle controls
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = setTimeout(() => {
        const timeSinceActive = Date.now() - activeTimeRef.current;
        // If it was already active for more than 500ms, hide it. Otherwise, keep it active.
        if (player.userActive() && timeSinceActive > 500) {
          player.userActive(false);
        } else {
          player.userActive(true);
        }
        tapTimeoutRef.current = null;
      }, 300);
    }
  };

  // Dispose the player on unmount
  useEffect(() => {
    const player = playerRef.current;
    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    };
  }, [playerRef]);

  return (
    <div data-vjs-player className={`relative group ${className} w-full h-full flex flex-col`}>
      <div ref={videoRef} className="w-full h-full flex-grow" />
      
      {playerNode && createPortal(
        <>
          {/* Gesture Overlay */}
          <div 
            className="absolute top-0 left-0 w-full z-10"
            style={{ height: 'calc(100% - 50px)' }}
            onClick={handleGesture}
          />
          
          {/* Top Bar Overlay (Fullscreen Only) */}
          {isFullscreen && (
            <div className="absolute top-0 left-0 w-full p-4 z-40 bg-gradient-to-b from-black/80 to-transparent flex items-start justify-between transition-opacity duration-300 vjs-title-overlay pointer-events-none">
              
              {/* Left Side: Back Button & Title */}
              <div className="flex items-center gap-4 pointer-events-auto">
                {onBack && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (playerRef.current?.isFullscreen()) {
                        playerRef.current.exitFullscreen();
                      } else {
                        onBack();
                      }
                    }}
                    className="p-2 bg-black/40 hover:bg-black/60 text-white backdrop-blur-md rounded-full transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                )}
                
                <div className="flex flex-col text-left">
                  {animeTitle && <h2 className="text-white font-bold text-sm md:text-lg drop-shadow-md line-clamp-1">{animeTitle}</h2>}
                  {episodeTitle && <h3 className="text-white/80 font-medium text-xs md:text-sm drop-shadow-md line-clamp-1">{episodeTitle}</h3>}
                </div>
              </div>

              {/* Right Side: Sub/Dub Toggle & Next Button */}
              <div className="flex items-center gap-3 pointer-events-auto">
                {(hasSub || hasDub) && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onToggleAudio) {
                        onToggleAudio();
                      }
                    }}
                    disabled={!(hasSub && hasDub)}
                    className={`relative w-16 h-8 rounded-full transition-all border border-white/20 bg-black/40 flex items-center ${
                      !(hasSub && hasDub) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-black/60 shadow-[0_0_0_1px_rgba(255,255,255,0.1)]'
                    }`}
                    aria-label="Toggle Sub/Dub"
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center text-[9px] font-bold text-black transform transition-transform duration-300 ease-in-out ${currentAudio === 'dub' ? 'translate-x-8' : 'translate-x-0.5'}`}>
                      {currentAudio === 'dub' ? 'DUB' : 'SUB'}
                    </div>
                  </button>
                )}

                {onNext && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onNext();
                    }}
                    className="p-3 bg-black/40 hover:bg-black/60 text-white backdrop-blur-md rounded-full transition-all flex items-center justify-center"
                    aria-label="Next Episode"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 4 15 12 5 20 5 4"/>
                      <line x1="19" y1="5" x2="19" y2="19"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </>,
        playerNode
      )}

      <style>{`
        .video-js {
          background-color: #000;
          font-family: 'Inter', sans-serif;
          width: 100% !important;
          height: 100% !important;
          position: absolute !important;
          top: 0;
          left: 0;
        }
        
        /* Minimal Big Play Button */
        .video-js .vjs-big-play-button {
          background-color: rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 50% !important;
          width: 70px !important;
          height: 70px !important;
          line-height: 70px !important;
          margin-top: -35px !important;
          margin-left: -35px !important;
          transition: all 0.3s ease !important;
          z-index: 30 !important;
        }
        .video-js:hover .vjs-big-play-button {
          background-color: rgba(255, 255, 255, 0.2) !important;
          transform: scale(1.1);
        }
        .video-js.vjs-paused .vjs-big-play-button {
          display: block !important;
        }

        /* Hide PiP and Speed Controls */
        .video-js .vjs-picture-in-picture-control,
        .video-js .vjs-playback-rate {
          display: none !important;
        }

        /* Integrated Control Bar */
        .video-js .vjs-control-bar {
          background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%) !important;
          height: 50px !important;
          display: flex !important;
          align-items: center !important;
          padding: 0 15px !important;
          z-index: 40 !important;
          bottom: 0 !important;
          position: absolute !important;
          width: 100% !important;
        }

        .video-js.vjs-user-inactive .vjs-title-overlay,
        .video-js.vjs-user-inactive .vjs-back-btn-overlay,
        .video-js.vjs-user-inactive .vjs-next-btn-overlay {
          opacity: 0;
          pointer-events: none !important;
          transition: opacity 0.5s ease;
        }
        .video-js.vjs-user-active .vjs-title-overlay {
          opacity: 1;
          transition: opacity 0.1s ease;
        }
        .video-js.vjs-user-active .vjs-back-btn-overlay,
        .video-js.vjs-user-active .vjs-next-btn-overlay {
          opacity: 1;
          pointer-events: auto;
          transition: opacity 0.1s ease;
        }

        /* Inline Progress Bar */
        .video-js .vjs-progress-control {
          flex: 1 1 auto !important;
          display: flex !important;
          align-items: center !important;
          min-width: 0 !important;
          height: 30px !important;
          margin: 0 !important;
        }
        .video-js .vjs-progress-control .vjs-progress-holder {
          height: 4px !important;
          margin: 0 !important;
          transition: height 0.2s ease !important;
          border-radius: 2px !important;
          width: 100% !important;
          position: relative !important;
        }
        .video-js.vjs-scrubbing .vjs-progress-control .vjs-progress-holder,
        .video-js.vjs-scrubbing .vjs-play-progress {
          transition: none !important;
        }
        .video-js .vjs-progress-control:hover .vjs-progress-holder {
          height: 6px !important;
        }
        .video-js .vjs-play-progress {
          background-color: #ffffff !important;
          border-radius: 2px !important;
          position: relative !important;
        }
        .video-js .vjs-play-progress:before {
          content: '' !important;
          display: block !important;
          position: absolute !important;
          top: 50% !important;
          right: -6px !important;
          transform: translateY(-50%) !important;
          width: 12px !important;
          height: 12px !important;
          background-color: #ffffff !important;
          border-radius: 50% !important;
          pointer-events: none !important;
        }
        .video-js .vjs-load-progress {
          background: rgba(255, 255, 255, 0.2) !important;
          border-radius: 2px !important;
        }
        .video-js .vjs-slider {
          background: rgba(255, 255, 255, 0.1) !important;
          border-radius: 2px !important;
        }

        /* Control Icons */
        .video-js .vjs-button > .vjs-icon-placeholder:before {
          font-size: 1.8em !important;
          line-height: 50px !important;
        }
        .video-js .vjs-button {
          height: 50px !important;
          width: 40px !important;
        }
        
        /* Custom Buttons */
        .video-js .vjs-back-button, .video-js .vjs-next-button {
          width: 3em !important;
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        .video-js .vjs-back-button:hover, .video-js .vjs-next-button:hover {
          opacity: 1;
        }

        /* Time Display */
        .video-js .vjs-current-time {
          display: block !important;
          line-height: 50px !important;
          padding: 0 10px 0 5px !important;
          font-size: 1.1em !important;
        }
        .video-js .vjs-remaining-time {
          display: block !important;
          line-height: 50px !important;
          padding: 0 5px 0 10px !important;
          font-size: 1.1em !important;
        }
        .video-js .vjs-time-divider, 
        .video-js .vjs-duration-display {
          display: none !important;
        }
        .video-js .vjs-volume-panel {
          display: flex !important;
          align-items: center !important;
        }

        /* Subtitles Positioning */
        .video-js .vjs-text-track-display {
          bottom: 60px !important;
        }

        /* Mobile Adjustments */
        @media (max-width: 768px) {
          .video-js .vjs-big-play-button {
            width: 60px !important;
            height: 60px !important;
            line-height: 60px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Player;
