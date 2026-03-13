import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import type PlayerType from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';

interface PlayerProps {
  option: any;
  className?: string;
  getInstance?: (player: PlayerType) => void;
  onBack?: () => void;
  onNext?: () => void;
}

const Player: React.FC<PlayerProps> = ({ option, className, getInstance, onBack, onNext }) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerType | null>(null);
  const [showFeedback, setShowFeedback] = useState<'forward' | 'backward' | 'play' | 'pause' | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        playbackRates: [0.5, 1, 1.5, 2],
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
        if (getInstance) {
          getInstance(player);
        }
      });

      // Custom buttons for Back and Next
      if (onBack) {
        const Button = videojs.getComponent('Button');
        const backButton = new Button(player, {
          className: 'vjs-visible-text vjs-back-button',
        });
        (backButton as any).controlText('Back');
        const icon = document.createElement('span');
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 7px;"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>';
        backButton.el().appendChild(icon);
        backButton.on('click', () => onBack());
        (player as any).controlBar.addChild(backButton, {}, 0);
      }

      if (onNext) {
        const Button = videojs.getComponent('Button');
        const nextButton = new Button(player, {
          className: 'vjs-visible-text vjs-next-button',
        });
        (nextButton as any).controlText('Next Episode');
        const label = document.createElement('span');
        label.innerText = 'Next Ep';
        label.style.fontSize = '12px';
        label.style.fontWeight = 'bold';
        label.style.lineHeight = '30px';
        nextButton.el().appendChild(label);
        nextButton.on('click', () => onNext());
        (player as any).controlBar.addChild(nextButton, {}, 1);
      }

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
        if (player.isFullscreen()) {
          lockLandscape();
        } else {
          unlockOrientation();
        }
      });
    }
  }, [option, videoRef, onBack, onNext, getInstance]);

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
        triggerFeedback('backward');
      } else if (x > width * 0.7) {
        // Right side: Seek forward
        player.currentTime(Math.min(player.duration(), player.currentTime() + 10));
        triggerFeedback('forward');
      } else {
        // Center: Play/Pause
        if (player.paused()) {
          player.play();
          triggerFeedback('play');
        } else {
          player.pause();
          triggerFeedback('pause');
        }
      }
      lastTapRef.current = { time: 0, x: 0 }; // Reset
    } else {
      lastTapRef.current = { time: now, x };
      
      // Single tap logic: Toggle controls
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = setTimeout(() => {
        if (player.userActive()) {
          player.userActive(false);
        } else {
          player.userActive(true);
        }
        tapTimeoutRef.current = null;
      }, 300);
    }
  };

  const triggerFeedback = (type: 'forward' | 'backward' | 'play' | 'pause') => {
    setShowFeedback(type);
    setTimeout(() => setShowFeedback(null), 500);
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
      
      {/* Gesture Overlay */}
      <div 
        className="absolute inset-0 z-10 touch-none"
        onClick={handleGesture}
      />

      {/* Feedback UI */}
      {showFeedback && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 backdrop-blur-md rounded-full p-6 animate-ping">
            {showFeedback === 'forward' && <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>}
            {showFeedback === 'backward' && <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>}
            {showFeedback === 'play' && <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
            {showFeedback === 'pause' && <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>}
          </div>
        </div>
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

        /* Inline Progress Bar */
        .video-js .vjs-progress-control {
          flex: 1 1 auto !important;
          display: flex !important;
          align-items: center !important;
          min-width: 0 !important;
          height: 100% !important;
          margin: 0 15px !important;
        }
        .video-js .vjs-progress-control .vjs-progress-holder {
          height: 4px !important;
          margin: 0 !important;
          transition: all 0.2s ease !important;
          border-radius: 2px !important;
          width: 100% !important;
        }
        .video-js .vjs-progress-control:hover .vjs-progress-holder {
          height: 6px !important;
        }
        .video-js .vjs-play-progress {
          background-color: #ffffff !important;
          border-radius: 2px !important;
        }
        .video-js .vjs-play-progress:before {
          display: block !important;
          font-size: 1em !important;
          top: -0.3em !important;
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
        .video-js .vjs-current-time, 
        .video-js .vjs-time-divider, 
        .video-js .vjs-duration-display {
          display: block !important;
          line-height: 50px !important;
          padding: 0 2px !important;
          font-size: 1.1em !important;
        }
        .video-js .vjs-remaining-time {
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
