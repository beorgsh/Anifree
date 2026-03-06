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

    const customLayers = [];
    
    // Swipe blocker layer to prevent seek on swipe
    customLayers.push({
      name: 'swipe-blocker',
      html: '<div style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;"></div>',
      mounted: function ($el: HTMLElement) {
        $el.addEventListener('touchmove', (e) => {
          e.stopPropagation();
        }, { passive: false });
      }
    });

    // Top Bar Layer
    if (onBack || option.title || onNext) {
      customLayers.push({
        name: 'top-bar',
        html: `<div class="art-custom-top-bar" style="position:absolute;top:0;left:0;width:100%;display:flex;align-items:center;justify-content:space-between;padding:16px;background:linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);z-index:90;transition:opacity 0.3s;pointer-events:none;">
                 <div style="display:flex;align-items:center;gap:16px;pointer-events:auto;">
                   ${onBack ? `<div id="back-btn" style="cursor:pointer;display:flex;align-items:center;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg></div>` : ''}
                   <span style="font-weight:bold;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:50vw;text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">${option.title || ''}</span>
                 </div>
                 <div style="display:flex;align-items:center;gap:16px;pointer-events:auto;">
                   <div id="lock-btn" style="cursor:pointer;display:flex;align-items:center;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
                   ${onNext ? `<div id="next-btn" style="cursor:pointer;font-weight:bold;font-size:14px;background:rgba(255,255,255,0.2);padding:4px 8px;border-radius:4px;">Next Ep</div>` : ''}
                 </div>
               </div>`,
        click: function (art: Artplayer, e: any) {
          if (onBack && (e.target.id === 'back-btn' || e.target.closest('#back-btn'))) {
            onBack();
          }
          if (e.target.id === 'lock-btn' || e.target.closest('#lock-btn')) {
            (art as any).lock = !(art as any).lock;
            const lockBtn = document.getElementById('lock-btn');
            if (lockBtn) {
              lockBtn.style.color = (art as any).lock ? '#facc15' : 'white';
            }
          }
          if (onNext && (e.target.id === 'next-btn' || e.target.closest('#next-btn'))) {
            onNext();
          }
        },
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
      fastForward: false,
      miniProgressBar: false,
      autoOrientation: true,
      autoplay: true,
      lock: true,
      layers: [...(option.layers || []), ...customLayers],
    });

    art.on('control', (state) => {
      const topBar = art.template.$player.querySelector('.art-custom-top-bar') as HTMLElement;
      if (topBar) {
        topBar.style.opacity = state ? '1' : '0';
        topBar.style.pointerEvents = state ? 'none' : 'none'; // Keep parent none, children handle it
        
        // Toggle children pointer events
        const children = topBar.querySelectorAll('div[style*="pointer-events:auto"]');
        children.forEach((child: any) => {
          child.style.pointerEvents = state ? 'auto' : 'none';
        });
      }
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
