import React, { useEffect, useRef } from 'react';
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

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement("video-js");
      videoElement.classList.add('vjs-big-play-centered');
      videoElement.classList.add('vjs-theme-city'); // You can change themes
      videoRef.current.appendChild(videoElement);

      const player = playerRef.current = videojs(videoElement, {
        autoplay: true,
        controls: true,
        responsive: true,
        fluid: true,
        playbackRates: [0.5, 1, 1.5, 2],
        userActions: {
          hotkeys: true
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
        
        // Set control text for accessibility
        (backButton as any).controlText('Back');
        
        // Create a custom element for the icon
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

      player.on('play', () => {
        if (window.innerWidth <= 768) {
          if (!player.isFullscreen()) {
            player.requestFullscreen();
          }
          lockLandscape();
        }
      });

      player.on('fullscreenchange', () => {
        if (player.isFullscreen()) {
          lockLandscape();
        } else {
          unlockOrientation();
        }
      });
    }
  }, [option, videoRef, onBack, onNext, getInstance]);

  // Dispose the player on unmount
  useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  return (
    <div data-vjs-player className={className}>
      <div ref={videoRef} />
      <style>{`
        .video-js {
          background-color: transparent;
        }
        .vjs-big-play-button {
          background-color: rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 50% !important;
          width: 80px !important;
          height: 80px !important;
          line-height: 80px !important;
          margin-top: -40px !important;
          margin-left: -40px !important;
        }
        .vjs-control-bar {
          background-color: rgba(0, 0, 0, 0.7) !important;
          backdrop-filter: blur(10px);
        }
        .vjs-play-progress {
          background-color: #ffffff !important;
        }
        .vjs-slider-bar {
          background-color: rgba(255, 255, 255, 0.2) !important;
        }
        .vjs-back-button, .vjs-next-button {
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  );
};

export default Player;
