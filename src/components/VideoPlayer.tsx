import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { 
  Maximize, 
  Minimize, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  X, 
  Loader2,
  ChevronDown,
  List,
  History as HistoryIcon,
  Tv
} from 'lucide-react';
import { M3UChannel } from '../utils/m3uParser';

interface VideoPlayerProps {
  url: string;
  title: string;
  onClose: () => void;
  channel?: M3UChannel | null;
  channels?: M3UChannel[];
  onSelectChannel?: (channel: M3UChannel) => void;
  hideCarousel?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  url, 
  title, 
  onClose, 
  channel,
  channels = [],
  onSelectChannel,
  hideCarousel = false
}) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [progress, setProgress] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 5000);
  };

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement('video-js');
      videoElement.classList.add('vjs-big-play-centered');
      videoElement.classList.add('vjs-vlc-theme'); // Custom class for styling
      videoRef.current.appendChild(videoElement);

      const player = playerRef.current = videojs(videoElement, {
        autoplay: true,
        controls: false, // We'll use our own controls
        responsive: true,
        fluid: true,
        liveui: true,
        sources: [{
          src: url,
          type: 'application/x-mpegURL'
        }],
      }, () => {
        setIsLoading(false);
      });

      player.on('timeupdate', () => {
        const current = player.currentTime();
        const duration = player.duration();
        if (duration > 0) {
          setProgress((current / duration) * 100);
        }
      });

      player.on('waiting', () => setIsLoading(true));
      player.on('playing', () => setIsLoading(false));
      player.on('error', () => {
        const error = player.error();
        setError(`Erro no Player: ${error ? error.message : 'Falha ao carregar o vídeo'}`);
        setIsLoading(false);
      });
    } else if (playerRef.current) {
      const player = playerRef.current;
      player.src({ src: url, type: 'application/x-mpegURL' });
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [url]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden group cursor-none"
      onMouseMove={handleMouseMove}
      onDoubleClick={toggleFullScreen}
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      <div ref={videoRef} className="w-full h-full" data-vjs-player />
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-40 pointer-events-none">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-white animate-spin" />
            <span className="text-white font-bold uppercase tracking-widest text-xs">Carregando Stream...</span>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 p-6 text-center">
          <div className="flex flex-col items-center gap-6 max-w-md">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/50">
              <X className="w-10 h-10 text-red-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-white font-black text-xl uppercase italic">Ops! Problema no Sinal</h3>
              <p className="text-white/60 text-sm leading-relaxed">{error}</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-white text-black font-black rounded-xl hover:bg-zinc-200 transition-all uppercase text-xs tracking-widest"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      )}

      {/* Custom Overlay UI */}
      <div className={`absolute inset-0 z-30 flex flex-col transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        
        {/* Top Bar */}
        <div className="p-8 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
              <span>Playlist 1</span>
              <span className="w-1 h-1 bg-white/40 rounded-full" />
              <span>{channel?.group || 'General'}</span>
            </div>
          </div>
          <div className="text-white font-medium text-xl">
            {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div className="flex-1" />

        {/* Middle Info Panel */}
        <div className="px-10 pb-6 flex flex-col gap-6">
          <div className="flex items-end gap-8">
            {/* Channel Logo */}
            <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center p-4 border border-white/10 shadow-2xl">
              {channel?.logo ? (
                <img src={channel.logo} alt="" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
              ) : (
                <Tv className="w-12 h-12 text-white/20" />
              )}
            </div>

            <div className="flex-1 flex flex-col gap-2">
              <h2 className="text-4xl font-bold text-white tracking-tight">Program</h2>
              <div className="flex items-center gap-4 text-white/60 font-medium">
                <span>11:58 — 12:51 PM</span>
                <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white/40" style={{ width: '40%' }} />
                </div>
                <span>26 min</span>
                <div className="flex items-center gap-2 text-white">
                  <span className="font-bold">3</span>
                  <span>{channel?.name || title}</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-bold text-white/80 border border-white/10">HD</span>
                  <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-bold text-white/80 border border-white/10">30 FPS</span>
                  <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-bold text-white/80 border border-white/10">STEREO</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-white/40 text-sm font-medium">
                <span>12:51 — 01:51 PM</span>
                <span className="text-white/60">Program</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative h-1.5 bg-white/10 rounded-full overflow-visible">
            <div className="absolute inset-y-0 left-0 bg-[#3a7bd5] rounded-full shadow-[0_0_10px_rgba(58,123,213,0.5)]" style={{ width: `${progress}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-[#3a7bd5]" style={{ left: `${progress}%`, marginLeft: '-8px' }} />
          </div>
        </div>

        {/* Bottom Carousel */}
        {!hideCarousel && (
          <div className="px-10 pb-10 flex flex-col gap-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {/* TV Guide Button */}
              <button className="flex-shrink-0 w-44 h-28 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-xl flex flex-col items-center justify-center gap-3 transition-colors border border-white/5 group/btn">
                <List className="w-8 h-8 text-white group-hover/btn:scale-110 transition-transform" />
                <span className="text-sm font-bold uppercase tracking-widest text-white/80">TV guide</span>
              </button>

              {/* History Button */}
              <button className="flex-shrink-0 w-44 h-28 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-xl flex flex-col items-center justify-center gap-3 transition-colors border border-white/5 group/btn">
                <HistoryIcon className="w-8 h-8 text-white group-hover/btn:scale-110 transition-transform" />
                <span className="text-sm font-bold uppercase tracking-widest text-white/80">History</span>
              </button>

              {/* Channel Cards */}
              {channels.slice(0, 10).map((ch, idx) => (
                <button 
                  key={ch.id}
                  onClick={() => onSelectChannel?.(ch)}
                  className={`flex-shrink-0 w-44 h-28 rounded-xl flex flex-col items-center justify-center gap-2 transition-all border border-white/5 relative overflow-hidden group/card ${ch.id === channel?.id ? 'bg-[#3a7bd5] border-[#3a7bd5]/50' : 'bg-[#1a1a1a] hover:bg-[#252525]'}`}
                >
                  <span className="text-sm font-bold text-white truncate w-full px-4 text-center">{ch.name}</span>
                  <span className="text-[10px] font-medium text-white/40 uppercase tracking-widest">Program</span>
                  {ch.id === channel?.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/40" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex justify-center">
              <ChevronDown className="w-8 h-8 text-white/20 animate-bounce" />
            </div>
          </div>
        )}

        {/* Close Button (Top Left) */}
        <div className="absolute top-8 left-8 flex gap-4 z-50">
          <button 
            onClick={onClose}
            className="p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors border border-white/10"
          >
            <X className="w-6 h-6" />
          </button>
          <button 
            onClick={toggleFullScreen}
            className="p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors border border-white/10"
          >
            {isFullScreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Custom CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .video-js {
          width: 100% !important;
          height: 100% !important;
        }
      `}} />
    </div>
  );
};
