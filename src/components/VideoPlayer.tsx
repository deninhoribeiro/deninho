import React, { useState, useEffect } from 'react';
import { X, RotateCcw, AlertCircle, Maximize, Minimize } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface VideoPlayerProps {
  url: string;
  onClose: () => void;
  title?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, onClose, title }) => {
  const [retryWithDirect, setRetryWithDirect] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [debug, setDebug] = useState(false);
  const [engine, setEngine] = useState<'hlsjs' | 'shaka' | 'mpegts' | 'native'>('hlsjs');
  const [error, setError] = useState<string | null>(null);

  // Auto-detect engine for TS files
  useEffect(() => {
    if (url.toLowerCase().includes('.ts') || url.toLowerCase().includes('type=ts')) {
      setEngine('mpegts');
    } else {
      setEngine('hlsjs');
    }
  }, [url]);

  const isHttp = url.toLowerCase().startsWith('http://');
  const playUrl = (retryWithDirect && !isHttp)
    ? url 
    : `/api/proxy?url=${encodeURIComponent(url)}`;

  const playerIframeUrl = `/player.html?url=${encodeURIComponent(playUrl)}${debug ? '&debug=true' : ''}&engine=${engine}`;

  const toggleFullscreen = () => {
    const container = document.getElementById('player-container');
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div 
      id="player-container"
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent z-[110] flex items-center justify-between opacity-0 hover:opacity-100 transition-opacity duration-300 group">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all border border-white/5"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-[#f27d26] uppercase tracking-widest mb-0.5">Deninho TV Pro</span>
            <h2 className="text-xl font-black text-white italic uppercase tracking-tighter leading-none">{title || 'Reproduzindo...'}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white/10 rounded-xl p-1 backdrop-blur-md border border-white/5">
            {(['hlsjs', 'shaka', 'mpegts', 'native'] as const).map((e) => (
              <button
                key={e}
                onClick={() => setEngine(e)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                  engine === e ? "bg-[#f27d26] text-white shadow-lg" : "text-white/40 hover:text-white"
                )}
              >
                {e === 'hlsjs' ? 'HLS' : e === 'shaka' ? 'Shaka' : e === 'mpegts' ? 'TS' : 'Nativo'}
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => setDebug(!debug)}
            className={cn(
              "px-3 py-2 rounded-xl backdrop-blur-md transition-all border text-[8px] font-black uppercase tracking-widest",
              debug ? "bg-[#f27d26] border-[#f27d26] text-white" : "bg-white/10 border-white/5 text-white/60 hover:text-white"
            )}
          >
            Debug
          </button>

          <button 
            onClick={() => !isHttp && setRetryWithDirect(!retryWithDirect)}
            disabled={isHttp}
            className={cn(
              "px-4 py-2 rounded-xl backdrop-blur-md transition-all border text-[10px] font-black uppercase tracking-widest flex items-center gap-2",
              isHttp 
                ? "bg-white/5 border-white/5 text-white/20 cursor-not-allowed" 
                : "bg-white/10 hover:bg-white/20 border-white/5 text-white"
            )}
          >
            <RotateCcw className="w-3 h-3" />
            {isHttp ? 'Proxy Forçado (HTTP)' : (retryWithDirect ? 'Usar Proxy' : 'Direto')}
          </button>

          <button 
            onClick={toggleFullscreen}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all border border-white/5"
          >
            {isFullscreen ? <Minimize className="w-5 h-5 text-white" /> : <Maximize className="w-5 h-5 text-white" />}
          </button>
        </div>
      </div>

      {/* The Iframe Player */}
      <iframe 
        src={playerIframeUrl}
        className="w-full h-full border-none"
        allow="autoplay; fullscreen; encrypted-media"
        title="Deninho TV Player"
      />

      {/* Error Handling (Simple) */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[120] bg-black flex flex-col items-center justify-center p-8 text-center"
          >
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h3 className="text-xl font-black text-white uppercase italic mb-2">Erro de Conexão</h3>
            <p className="text-white/40 text-sm mb-6 max-w-xs">{error}</p>
            <button 
              onClick={onClose}
              className="px-8 py-3 bg-[#f27d26] text-white font-black uppercase italic rounded-full"
            >
              Voltar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
