import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

interface VideoPlayerProps {
  url: string;
  onClose: () => void;
  title?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, onClose, title }) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement("video-js");

      videoElement.classList.add('vjs-big-play-centered');
      videoElement.classList.add('vjs-theme-city');
      videoRef.current.appendChild(videoElement);

      const getStreamType = (streamUrl: string) => {
        const decodedUrl = decodeURIComponent(streamUrl).toLowerCase();
        if (decodedUrl.includes('.m3u8')) return 'application/x-mpegURL';
        if (decodedUrl.includes('.ts') || decodedUrl.includes('/ts/')) return 'video/mp2t';
        // Many IPTV streams are extensionless TS streams
        if (!decodedUrl.includes('.') || decodedUrl.split('/').pop()?.match(/^\d+$/)) return 'video/mp2t';
        return 'video/mp4';
      };

      const player = playerRef.current = videojs(videoElement, {
        autoplay: true,
        controls: true,
        responsive: true,
        fluid: true,
        liveui: true,
        html5: {
          vhs: {
            overrideNative: true,
            fastQualityChange: true,
            useDevicePixelRatio: true
          }
        },
        sources: [{
          src: url,
          type: getStreamType(url)
        }],
        userActions: {
          hotkeys: true
        }
      }, () => {
        console.log('player is ready');
      });

      // Handle remote control keys for the player
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' || e.key === 'Back' || e.key === 'Backspace') {
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [onClose, url]);

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
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Player Header */}
      <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center justify-between opacity-0 hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors focus:ring-4 focus:ring-white/40 outline-none"
            autoFocus
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">{title || 'Reproduzindo...'}</h2>
        </div>
      </div>

      <div data-vjs-player className="flex-1">
        <div ref={videoRef} className="w-full h-full" />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .video-js {
          width: 100% !important;
          height: 100% !important;
          background-color: #000;
        }
        .vjs-big-play-button {
          background-color: #f27d26 !important;
          border-color: #f27d26 !important;
          border-radius: 50% !important;
          width: 80px !important;
          height: 80px !important;
          line-height: 80px !important;
          margin-top: -40px !important;
          margin-left: -40px !important;
        }
        .vjs-control-bar {
          background-color: rgba(0,0,0,0.7) !important;
          height: 60px !important;
        }
        .vjs-button > .vjs-icon-placeholder:before {
          line-height: 60px !important;
        }
      `}} />
    </div>
  );
};
