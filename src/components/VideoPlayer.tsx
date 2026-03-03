import React, { useState, useEffect } from 'react';
import { X, RotateCcw, AlertCircle, Maximize, Minimize, ExternalLink, ArrowLeft } from 'lucide-react';
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
  initialMinimized?: boolean;
  isEmbedded?: boolean;
  onToggleFullscreen?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  url, 
  onClose, 
  title, 
  initialMinimized = false,
  isEmbedded = false,
  onToggleFullscreen
}) => {
  const [retryWithDirect, setRetryWithDirect] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(initialMinimized);
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    setIsMinimized(initialMinimized);
  }, [initialMinimized]);

  const handleToggleFullscreen = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
    } else {
      setIsMinimized(!isMinimized);
    }
  };
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

  const openExternalPlayer = () => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      const intentUrl = `intent:${url}#Intent;action=android.intent.action.VIEW;type=video/*;end`;
      window.location.href = intentUrl;
    } else {
      // For PC, we can't easily trigger "Open with", but we can try to open the URL directly
      // or show a prompt.
      const win = window.open(url, '_blank');
      if (!win) {
        alert("Por favor, permita popups para abrir o player externo ou copie o link: " + url);
      }
    }
  };

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
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace' || e.keyCode === 27 || e.keyCode === 4) {
        // Only close if not in an input field (though there are no inputs here)
        onClose();
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <motion.div 
      id="player-container"
      layout
      layoutId={isEmbedded ? undefined : "player-overlay"}
      onDoubleClick={handleToggleFullscreen}
      initial={isEmbedded ? false : (isMinimized ? { width: '320px', height: '180px', bottom: '24px', right: '24px', borderRadius: '1.5rem' } : { inset: 0 })}
      animate={isEmbedded ? {
        width: '100%',
        height: '100%',
        borderRadius: '0.75rem',
        boxShadow: 'none'
      } : (isMinimized ? { 
        width: '320px', 
        height: '180px', 
        bottom: '24px', 
        right: '24px', 
        left: 'auto',
        top: 'auto',
        borderRadius: '1.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      } : { 
        width: '100%', 
        height: '100%', 
        bottom: 0, 
        right: 0, 
        left: 0,
        top: 0,
        borderRadius: 0,
        boxShadow: 'none'
      })}
      className={cn(
        isEmbedded ? "relative w-full h-full" : "fixed z-[100] inset-0",
        "bg-black flex flex-col items-center justify-center overflow-hidden border border-white/10",
        !isEmbedded && isMinimized && "inset-auto"
      )}
    >
      {/* Header Overlay */}
      <div className={cn(
        "absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent z-[110] flex items-center justify-between transition-opacity duration-300 group",
        isMinimized ? "p-3 opacity-0 hover:opacity-100 focus-within:opacity-100" : "opacity-100 md:opacity-0 md:hover:opacity-100 md:focus-within:opacity-100"
      )}>
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className={cn(
              "bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all border border-white/5 focus:ring-2 focus:ring-[#f27d26] focus:outline-none",
              isMinimized ? "p-2" : "p-3"
            )}
            title="Sair do Player"
          >
            <ArrowLeft className={cn("text-white", isMinimized ? "w-4 h-4" : "w-6 h-6")} />
          </button>
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-[#f27d26] uppercase tracking-widest mb-0.5">Deninho TV Pro</span>
            <h2 className={cn(
              "font-black text-white italic uppercase tracking-tighter leading-none",
              isMinimized ? "text-xs" : "text-xl"
            )}>{title || 'Reproduzindo...'}</h2>
          </div>
        </div>

        {!isMinimized && (
          <div className="flex items-center gap-3">
            <div className="flex bg-white/10 rounded-xl p-1 backdrop-blur-md border border-white/5">
              {(['hlsjs', 'shaka', 'mpegts', 'native'] as const).map((e) => (
                <button
                  key={e}
                  onClick={() => setEngine(e)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all focus:ring-2 focus:ring-[#f27d26] focus:outline-none",
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
                "px-3 py-2 rounded-xl backdrop-blur-md transition-all border text-[8px] font-black uppercase tracking-widest focus:ring-2 focus:ring-[#f27d26] focus:outline-none",
                debug ? "bg-[#f27d26] border-[#f27d26] text-white" : "bg-white/10 border-white/5 text-white/60 hover:text-white"
              )}
            >
              Debug
            </button>

            <button 
              onClick={() => !isHttp && setRetryWithDirect(!retryWithDirect)}
              disabled={isHttp}
              className={cn(
                "px-4 py-2 rounded-xl backdrop-blur-md transition-all border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 focus:ring-2 focus:ring-[#f27d26] focus:outline-none",
                isHttp 
                  ? "bg-white/5 border-white/5 text-white/20 cursor-not-allowed" 
                  : "bg-white/10 hover:bg-white/20 border-white/5 text-white"
              )}
            >
              <RotateCcw className="w-3 h-3" />
              {isHttp ? 'Proxy Forçado (HTTP)' : (retryWithDirect ? 'Usar Proxy' : 'Direto')}
            </button>

            <button 
              onClick={openExternalPlayer}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all border border-white/5 focus:ring-2 focus:ring-[#f27d26] focus:outline-none"
              title="Abrir no Player Externo"
            >
              <ExternalLink className="w-5 h-5 text-white" />
            </button>

            <button 
              onClick={() => setIsMinimized(true)}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all border border-white/5 focus:ring-2 focus:ring-[#f27d26] focus:outline-none"
              title="Minimizar"
            >
              <Minimize className="w-5 h-5 text-white" />
            </button>

            <button 
              onClick={toggleFullscreen}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all border border-white/5 focus:ring-2 focus:ring-[#f27d26] focus:outline-none"
            >
              {isFullscreen ? <Minimize className="w-5 h-5 text-white" /> : <Maximize className="w-5 h-5 text-white" />}
            </button>
          </div>
        )}

        {isMinimized && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMinimized(false)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all border border-white/5 focus:ring-2 focus:ring-[#f27d26] focus:outline-none"
              title="Maximizar"
            >
              <Maximize className="w-4 h-4 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* The Iframe Player */}
      <iframe 
        src={playerIframeUrl}
        className={cn(
          "w-full h-full border-none",
          isMinimized && "pointer-events-none"
        )}
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
    </motion.div>
  );
};
