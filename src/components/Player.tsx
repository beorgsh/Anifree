import React, { useEffect, useRef } from 'react';
import Artplayer from 'artplayer';
import type { Option } from 'artplayer';

interface PlayerProps {
  option: Partial<Option>;
  className?: string;
  getInstance?: (art: Artplayer) => void;
  onBack?: () => void;
}

const Player: React.FC<PlayerProps> = ({ option, className, getInstance, onBack }) => {
  const artRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!artRef.current) return;

    const customControls = [];
    
    if (onBack) {
      customControls.push({
        position: 'top',
        index: 10,
        html: `<div style="display:flex;align-items:center;gap:12px;padding:10px;cursor:pointer;">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                 <span style="font-weight:bold;font-size:16px;">Back</span>
               </div>`,
        tooltip: 'Go Back',
        click: function () {
          onBack();
        },
      });
    }

    if (option.title) {
      customControls.push({
        position: 'top',
        index: 11,
        html: `<div style="display:flex;align-items:center;padding:10px;font-size:16px;font-weight:500;opacity:0.9;">${option.title}</div>`,
      });
    }

    const art = new Artplayer({
      ...option,
      container: artRef.current,
      theme: '#ffffff',
      fullscreen: true,
      fullscreenWeb: false,
      autoSize: true,
      playbackRate: false,
      aspectRatio: false,
      setting: false,
      pip: false,
      autoOrientation: true,
      autoplay: true,
      lock: true,
      controls: [...(option.controls || []), ...customControls],
    });

    // Attempt to lock screen orientation to landscape on mobile
    const lockLandscape = async () => {
      try {
        const orientation = screen.orientation as any;
        if (orientation && orientation.lock) {
          await orientation.lock('landscape');
        }
      } catch (err) {
        console.warn('Screen orientation lock failed:', err);
      }
    };

    const unlockOrientation = () => {
      try {
        const orientation = screen.orientation as any;
        if (orientation && orientation.unlock) {
          orientation.unlock();
        }
      } catch (err) {
        console.warn('Screen orientation unlock failed:', err);
      }
    };

    art.on('play', () => {
      // On mobile, playing the video could trigger fullscreen and landscape lock
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
  }, [option, getInstance, onBack]);

  return <div ref={artRef} className={className} />;
};

export default Player;
