import React, { useEffect, useRef } from 'react';
import Artplayer from 'artplayer';
import type { Option } from 'artplayer';

interface PlayerProps {
  option: Partial<Option>;
  className?: string;
  getInstance?: (art: Artplayer) => void;
  onBack?: () => void;
  onNext?: () => void;
}

const Player: React.FC<PlayerProps> = ({ option, className, getInstance, onBack, onNext }) => {
  const artRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!artRef.current) return;

    const art = new Artplayer({
      ...option,
      container: artRef.current,
      theme: '#ffffff',
      fullscreen: true,
      fullscreenWeb: false,
      autoSize: true,
      playbackRate: true,
      aspectRatio: true,
      setting: true,
      pip: true,
      fastForward: true,
      autoOrientation: true,
      autoplay: true,
      controls: [
        ...(onBack ? [{
          position: 'left',
          index: 10,
          html: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>',
          tooltip: 'Back',
          click: function () {
            onBack();
          },
        }] : []),
        ...(onNext ? [{
          position: 'right',
          index: 10,
          html: 'Next Ep',
          tooltip: 'Next Episode',
          style: {
            fontWeight: 'bold',
            padding: '0 10px',
          },
          click: function () {
            onNext();
          },
        }] : []),
      ],
    });

    // Disable mobile swipe gestures for seeking/volume to prevent "peek duration"
    if (art.template.$video) {
      art.template.$video.style.pointerEvents = 'auto';
    }
    art.on('ready', () => {
      // Remove default mobile gestures if possible
      const mobileMask = art.template.$player.querySelector('.art-mobile-mask');
      if (mobileMask) {
        (mobileMask as HTMLElement).style.display = 'none';
      }
    });

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

    art.on('play', () => {
      if (window.innerWidth <= 768) {
        if (!art.fullscreen) {
          art.fullscreen = true;
        }
        lockLandscape();
      }
    });

    art.on('fullscreen', (state) => {
      if (state) {
        lockLandscape();
      } else {
        unlockOrientation();
      }
    });

    if (getInstance) {
      getInstance(art);
    }

    return () => {
      unlockOrientation();
      if (art && art.destroy) {
        art.destroy(false);
      }
    };
  }, [option, getInstance, onBack, onNext]);

  return <div ref={artRef} className={className} />;
};

export default Player;
