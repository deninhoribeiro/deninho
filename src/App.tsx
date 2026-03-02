import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Tv, 
  Search, 
  Play, 
  Settings, 
  ChevronRight, 
  MonitorPlay,
  X,
  Loader2,
  Film,
  LogOut
} from 'lucide-react';
import { parseM3U, M3UChannel } from './utils/m3uParser';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [m3uUrl, setM3uUrl] = useState(() => localStorage.getItem('iptv_m3u_url') || '');
  const [username, setUsername] = useState(() => localStorage.getItem('iptv_username') || 'User');
  const [showAbout, setShowAbout] = useState(false);
  const [channels, setChannels] = useState<M3UChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<M3UChannel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [isLoading, setIsLoading] = useState(false);
  const [showInput, setShowInput] = useState(!localStorage.getItem('iptv_m3u_url'));
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [view, setView] = useState<'dashboard' | 'live'>(() => 
    localStorage.getItem('iptv_m3u_url') ? 'live' : 'dashboard'
  );
  const firstCategoryRef = useRef<HTMLButtonElement>(null);
  const dashboardLiveRef = useRef<HTMLButtonElement>(null);
  const channelListRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const infoPanelRef = useRef<HTMLDivElement>(null);
  const loginUserRef = useRef<HTMLInputElement>(null);
  const loginUrlRef = useRef<HTMLInputElement>(null);
  const loginSubmitRef = useRef<HTMLButtonElement>(null);
  const loginDemoRef = useRef<HTMLButtonElement>(null);

  // Spatial Navigation for TV Remote
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (!active) return;

      if (view === 'live') {
        if (e.key === 'ArrowRight') {
          // If in sidebar, move to channel list
          if (sidebarRef.current?.contains(active)) {
            e.preventDefault();
            const firstChannel = channelListRef.current?.querySelector('button');
            (firstChannel as HTMLElement)?.focus();
          } 
          // If in channel list, move to info panel
          else if (channelListRef.current?.contains(active)) {
            e.preventDefault();
            const playButton = infoPanelRef.current?.querySelector('button');
            (playButton as HTMLElement)?.focus();
          }
        } else if (e.key === 'ArrowLeft') {
          // If in info panel, move to channel list
          if (infoPanelRef.current?.contains(active)) {
            e.preventDefault();
            const selectedChannelBtn = channelListRef.current?.querySelector('[data-selected="true"]');
            if (selectedChannelBtn) {
              (selectedChannelBtn as HTMLElement)?.focus();
            } else {
              const firstChannel = channelListRef.current?.querySelector('button');
              (firstChannel as HTMLElement)?.focus();
            }
          }
          // If in channel list, move to sidebar
          else if (channelListRef.current?.contains(active)) {
            e.preventDefault();
            const activeCategory = sidebarRef.current?.querySelector('[data-active="true"]');
            (activeCategory as HTMLElement)?.focus();
          }
        }
      } else if (view === 'dashboard') {
        if (e.key === 'ArrowDown' && active === dashboardLiveRef.current) {
          e.preventDefault();
          const nextBtn = document.querySelector('[data-dash="movies"]') as HTMLElement;
          nextBtn?.focus();
        } else if (e.key === 'ArrowUp' && (active.getAttribute('data-dash') === 'movies' || active.getAttribute('data-dash') === 'series')) {
          e.preventDefault();
          dashboardLiveRef.current?.focus();
        } else if (e.key === 'ArrowRight' && active.getAttribute('data-dash') === 'movies') {
          e.preventDefault();
          const nextBtn = document.querySelector('[data-dash="series"]') as HTMLElement;
          nextBtn?.focus();
        } else if (e.key === 'ArrowLeft' && active.getAttribute('data-dash') === 'series') {
          e.preventDefault();
          const prevBtn = document.querySelector('[data-dash="movies"]') as HTMLElement;
          prevBtn?.focus();
        }
      } else if (showInput) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (active === loginUserRef.current) loginUrlRef.current?.focus();
          else if (active === loginUrlRef.current) loginSubmitRef.current?.focus();
          else if (active === loginSubmitRef.current) loginDemoRef.current?.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (active === loginDemoRef.current) loginSubmitRef.current?.focus();
          else if (active === loginSubmitRef.current) loginUrlRef.current?.focus();
          else if (active === loginUrlRef.current) loginUserRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view]);

  useEffect(() => {
    if (view === 'live') {
      setTimeout(() => {
        firstCategoryRef.current?.focus();
      }, 500);
    } else if (view === 'dashboard') {
      setTimeout(() => {
        dashboardLiveRef.current?.focus();
      }, 500);
    } else if (showInput) {
      setTimeout(() => {
        loginUserRef.current?.focus();
      }, 500);
    }
  }, [view, showInput]);

  const handleChannelSelect = (channel: M3UChannel) => {
    setSelectedChannel(channel);
    openExternalPlayer(channel.url);
  };

  const openExternalPlayer = (url: string) => {
    if (!url) return;
    
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    if (isAndroid) {
      // Intent mais compatível para Android
      // S.browser_fallback_url garante que se o intent falhar, ele tenta abrir o link direto
      const intentUrl = `intent:${url}#Intent;action=android.intent.action.VIEW;type=video/*;S.browser_fallback_url=${encodeURIComponent(url)};end`;
      
      try {
        window.location.href = intentUrl;
      } catch (e) {
        window.location.href = url;
      }
    } else {
      window.open(url, '_blank');
    }
  };

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    cats.add('TODOS');
    channels.forEach(ch => {
      if (ch.group) cats.add(ch.group);
    });
    return Array.from(cats);
  }, [channels]);

  const filteredChannels = useMemo(() => {
    return channels.filter(channel => {
      const matchesSearch = channel.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'TODOS' || 
                             (channel.group === selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [channels, searchQuery, selectedCategory]);

  const handleLoadList = async (url: string = m3uUrl, autoPlayFirst = false) => {
    if (!url) return;
    
    // Transform GitHub URL to Raw if necessary
    let finalUrl = url.trim();
    if (finalUrl.includes('github.com')) {
      if (finalUrl.includes('/blob/')) {
        finalUrl = finalUrl
          .replace('github.com', 'raw.githubusercontent.com')
          .replace('/blob/', '/');
      } else if (finalUrl.includes('/raw/')) {
        finalUrl = finalUrl
          .replace('github.com', 'raw.githubusercontent.com')
          .replace('/raw/', '/');
      }
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/m3u?url=${encodeURIComponent(finalUrl)}`);
      if (!response.ok) throw new Error('Failed to fetch M3U list.');
      const text = await response.text();
      const parsed = parseM3U(text);
      if (parsed.length === 0) throw new Error('No channels found in the list');
      
      setChannels(parsed);
      localStorage.setItem('iptv_m3u_url', finalUrl);
      localStorage.setItem('iptv_username', username);
      setShowInput(false);

      if (autoPlayFirst && parsed.length > 0) {
        setTimeout(() => {
          setSelectedChannel(parsed[0]);
        }, 800);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('iptv_m3u_url');
    localStorage.removeItem('iptv_username');
    setChannels([]);
    setSelectedChannel(null);
    setShowInput(true);
    setView('dashboard');
  };

  useEffect(() => {
    // Handle URL parameters
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('url');
    const userParam = params.get('user');

    if (urlParam) {
      setM3uUrl(urlParam);
      if (userParam) setUsername(userParam);
      handleLoadList(urlParam, true);
    } else if (m3uUrl && !showInput) {
      handleLoadList(m3uUrl, false);
    }
  }, []);

  const getProxiedUrl = (url: string) => {
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  };

  const loadDemo = () => {
    const demoUrl = 'https://raw.githubusercontent.com/deninhoribeiro/deninhoribeiro/refs/heads/main/20.00.24';
    setM3uUrl(demoUrl);
    handleLoadList(demoUrl, false);
  };

  if (showInput) {
    // ... (keep existing login screen)
    return (
      <div className="min-h-screen bg-[#050505] text-white font-sans flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background Shield */}
        <div className="absolute bottom-10 right-10 opacity-10 pointer-events-none">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Atletico_mineiro_galo.png/250px-Atletico_mineiro_galo.png" 
            alt="" 
            className="w-64 h-64 grayscale brightness-50"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Background Watermark */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
          <span className="text-[50vw] font-black italic tracking-tighter select-none">DTV</span>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full z-10"
        >
          <div className="text-center mb-12">
            <div className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-white/10 mx-auto mb-8 transform -rotate-6 border-4 border-black">
              <Tv className="text-black w-16 h-16" />
            </div>
            <h2 className="text-5xl font-black mb-2 tracking-tighter italic">DENINHO TV</h2>
            <p className="text-white/40 font-bold uppercase tracking-[0.4em] text-[10px]">The Ultimate Experience</p>
          </div>

          <div className="bg-[#1a1a1a]/80 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/10 shadow-2xl">
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2 ml-2">Usuário</label>
                <input 
                  ref={loginUserRef}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Seu nome de usuário..."
                  className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-white focus:ring-4 focus:ring-white/20 transition-all text-sm placeholder:text-white/20"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2 ml-2">Playlist M3U</label>
                <div className="relative">
                  <input 
                    ref={loginUrlRef}
                    type="text"
                    value={m3uUrl}
                    onChange={(e) => setM3uUrl(e.target.value)}
                    placeholder="Cole seu link aqui..."
                    className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-white focus:ring-4 focus:ring-white/20 transition-all text-sm placeholder:text-white/20"
                  />
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold uppercase tracking-tight"
                >
                  <X className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <button 
                ref={loginSubmitRef}
                onClick={() => handleLoadList()}
                disabled={isLoading || !m3uUrl}
                className="w-full bg-white hover:bg-zinc-200 disabled:opacity-50 text-black font-black py-6 rounded-2xl transition-all flex items-center justify-center gap-4 shadow-xl shadow-white/5 group focus:ring-8 focus:ring-white/40 focus:outline-none"
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Play className="w-6 h-6 fill-black group-hover:scale-110 transition-transform" />
                    <span className="text-lg tracking-tighter">ENTRAR NO PLAYER</span>
                  </>
                )}
              </button>

              <button 
                ref={loginDemoRef}
                onClick={loadDemo}
                className="w-full py-2 text-white/20 hover:text-white/50 font-black text-[10px] uppercase tracking-[0.3em] transition-colors focus:text-white focus:ring-2 focus:ring-white/10 focus:outline-none rounded-lg"
              >
                Testar Lista Demonstrativa
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!showInput && view === 'dashboard') {
    return (
      <div className="min-h-screen bg-[#050505] text-white font-sans relative overflow-hidden flex flex-col">
        {/* Background Shield */}
        <div className="absolute bottom-10 right-10 opacity-10 pointer-events-none z-0">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Atletico_mineiro_galo.png/250px-Atletico_mineiro_galo.png" 
            alt="" 
            className="w-80 h-80 grayscale brightness-50"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Background Rays Effect */}
        <div className="absolute inset-0 z-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#0044cc_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0%,#002266_10%,transparent_20%)] animate-[spin_20s_linear_infinite]" />
        </div>

        {/* Top Bar */}
        <header className="relative z-10 flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border-2 border-black shadow-lg">
              <Tv className="text-black w-7 h-7" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-black text-2xl tracking-tighter italic">DENINHO TV</span>
              <span className="text-[8px] font-black tracking-[0.3em] text-white/40 uppercase">Professional Player</span>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-right">
              <div className="text-2xl font-light tracking-wider">
                {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-xs font-bold text-white/60 uppercase tracking-widest">
                {currentTime.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowAbout(true)}
                className="text-sm font-bold uppercase tracking-widest hover:text-white/70 transition-colors"
              >
                About
              </button>
            </div>
          </div>
        </header>

        {/* About Modal */}
        <AnimatePresence>
          {showAbout && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-[#1a1a1a] border border-white/10 rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl relative"
              >
                <button 
                  onClick={() => setShowAbout(false)}
                  className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="flex flex-col items-center text-center gap-6">
                  <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center border-4 border-black shadow-xl">
                    <Tv className="text-black w-12 h-12" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase">Deninho TV</h2>
                    <p className="text-white/40 font-bold uppercase tracking-widest text-[10px]">Version 1.0.0</p>
                  </div>

                  <div className="w-full bg-black/40 rounded-2xl p-6 text-left space-y-4 border border-white/5">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-[10px] font-black uppercase text-white/40">Module</span>
                      <span className="text-sm font-bold text-white">HttpClient</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-[10px] font-black uppercase text-white/40">Release</span>
                      <span className="text-sm font-bold text-white">4.5.6</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-[10px] font-black uppercase text-white/40">Engine</span>
                      <span className="text-sm font-bold text-white">Vite + React</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-white/40">License</span>
                      <span className="text-[10px] font-bold text-white/60">Apache License 2.0</span>
                    </div>
                  </div>

                  <p className="text-xs text-white/40 leading-relaxed italic">
                    "The ultimate IPTV experience, crafted for performance and elegance."
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Grid Dashboard */}
        <main className="flex-1 relative z-10 flex items-center justify-center p-4 overflow-hidden">
          <div className="w-full max-w-4xl flex flex-col items-center justify-center gap-6">
            
            {/* LIVE TV - Centered and Smaller */}
            <motion.button
              ref={dashboardLiveRef}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setView('live')}
              className="w-2/3 h-64 bg-gradient-to-br from-[#00d2ff] to-[#3a7bd5] rounded-[2rem] flex flex-col items-center justify-center gap-4 shadow-2xl relative overflow-hidden group border border-white/10 focus:ring-8 focus:ring-white/40 focus:outline-none"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-24 h-24 border-4 border-white/20 rounded-[2rem] flex items-center justify-center shadow-inner">
                <div className="relative">
                  <MonitorPlay className="w-14 h-14 text-white drop-shadow-2xl" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-white/20">Live TV</div>
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-3xl font-black italic tracking-tighter uppercase drop-shadow-lg">Live TV</h2>
              </div>
            </motion.button>
 
            {/* MOVIES & SERIES - Side by Side */}
            <div className="w-2/3 flex gap-4 h-24">
              {/* MOVIES - Small Tile */}
              <motion.button
                data-dash="movies"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => alert('Seção de Filmes em breve!')}
                className="flex-1 bg-gradient-to-br from-[#ff512f] to-[#dd2476] rounded-[1.5rem] flex items-center justify-center gap-4 shadow-xl relative overflow-hidden group border border-white/10 focus:ring-8 focus:ring-white/40 focus:outline-none"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shadow-lg">
                  <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                </div>
                <h2 className="text-lg font-black italic tracking-tighter uppercase drop-shadow-md">Movies</h2>
              </motion.button>
 
              {/* SERIES - Small Tile */}
              <motion.button
                data-dash="series"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => alert('Seção de Séries em breve!')}
                className="flex-1 bg-gradient-to-br from-[#8e2de2] to-[#4a00e0] rounded-[1.5rem] flex items-center justify-center gap-4 shadow-xl relative overflow-hidden group border border-white/10 focus:ring-8 focus:ring-white/40 focus:outline-none"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-lg">
                  <Film className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-black italic tracking-tighter uppercase drop-shadow-md">Series</h2>
              </motion.button>
            </div>
          </div>
        </main>

        {/* Bottom Bar */}
        <footer className="relative z-10 flex items-center justify-between px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-white/60">
          <div>Expiration : <span className="text-white/20">Unlimited</span></div>
          <div>By using this application, you agree to the <span className="text-[#3a7bd5] cursor-pointer">Terms of Services.</span></div>
          <div className="flex items-center gap-4">
            <span>Logged in : <span className="text-white">{username}</span></span>
            <button 
              onClick={handleLogout}
              className="bg-red-600/20 hover:bg-red-600/40 text-red-500 px-3 py-1 rounded-lg transition-colors flex items-center gap-2 border border-red-500/20 focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <LogOut className="w-3 h-3" />
              Logout
            </button>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#050505] text-white font-sans overflow-hidden flex items-center justify-center relative">
      {/* Background Shield */}
      <div className="absolute bottom-10 right-10 opacity-[0.05] pointer-events-none z-0">
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Atletico_mineiro_galo.png/250px-Atletico_mineiro_galo.png" 
          alt="" 
          className="w-64 h-64 grayscale brightness-50"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Dynamic Background Blur */}
      {selectedChannel?.logo && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
          <img 
            src={selectedChannel.logo} 
            alt="" 
            className="w-full h-full object-cover blur-[100px] scale-150" 
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}

      {/* Background Watermark */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none flex items-center justify-center overflow-hidden">
        <span className="text-[40vw] font-black italic tracking-tighter select-none">DTV</span>
      </div>

      {/* 16:9 TV Container */}
      <div className="w-full h-full bg-[#0a0a0a] shadow-2xl relative z-10 flex flex-col overflow-hidden border border-white/5">
        {/* Top Header */}
        <header className="h-12 px-6 flex items-center justify-between z-20 bg-[#1a1a1a] border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView('dashboard')}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all group focus:ring-2 focus:ring-[#f27d26] focus:outline-none"
            >
              <ChevronRight className="w-5 h-5 rotate-180 text-white/80 group-hover:text-white" />
            </button>
            <h1 className="text-xl font-medium text-white/90 uppercase tracking-tight">TV ao vivo</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end leading-none">
              <span className="font-black text-lg italic tracking-tighter">DENINHO</span>
              <span className="text-[7px] font-black tracking-[0.3em] text-[#f27d26] uppercase">TV Player</span>
            </div>
            <div className="w-9 h-9 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
              <Tv className="text-white w-5 h-5" />
            </div>
          </div>
        </header>

        {/* Main 3-Column Layout */}
        <main className="flex-1 flex overflow-hidden z-10">
          
          {/* Column 1: Categories Sidebar */}
          <aside ref={sidebarRef} className="w-48 flex flex-col bg-[#1a1a1b] border-r border-white/5 flex-shrink-0">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
              <button
                ref={firstCategoryRef}
                onClick={() => setSelectedCategory('RECENTES')}
                data-active={selectedCategory === 'RECENTES'}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded text-[10px] font-bold transition-all uppercase tracking-tight focus:ring-4 focus:ring-[#f27d26] focus:outline-none",
                  selectedCategory === 'RECENTES' ? "bg-[#f27d26] text-white" : "text-white/60 hover:bg-white/5"
                )}
              >
                <span>Recentes</span>
                <span className="text-[8px] opacity-60">(0)</span>
              </button>
              
              <button
                onClick={() => setSelectedCategory('TODOS')}
                data-active={selectedCategory === 'TODOS'}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded text-[10px] font-bold transition-all uppercase tracking-tight focus:ring-4 focus:ring-[#f27d26] focus:outline-none",
                  selectedCategory === 'TODOS' ? "bg-[#f27d26] text-white" : "text-white/60 hover:bg-white/5"
                )}
              >
                <span>Todos</span>
                <span className="text-[8px] opacity-60">({channels.length})</span>
              </button>

              <button
                onClick={() => setSelectedCategory('FAVORITOS')}
                data-active={selectedCategory === 'FAVORITOS'}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded text-[10px] font-bold transition-all uppercase tracking-tight focus:ring-4 focus:ring-[#f27d26] focus:outline-none",
                  selectedCategory === 'FAVORITOS' ? "bg-[#f27d26] text-white" : "text-white/60 hover:bg-white/5"
                )}
              >
                <span>Favoritos</span>
                <span className="text-[8px] opacity-60">(0)</span>
              </button>

              <div className="h-px bg-white/5 my-1 mx-3" />

              {categories.filter(c => c !== 'TODOS').map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  data-active={selectedCategory === cat}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded text-[10px] font-bold transition-all uppercase tracking-tight focus:ring-4 focus:ring-[#f27d26] focus:outline-none",
                    selectedCategory === cat ? "bg-[#f27d26] text-white" : "text-white/60 hover:bg-white/5"
                  )}
                >
                  <span className="truncate pr-2">{cat}</span>
                  <span className="text-[8px] opacity-60">
                    ({channels.filter(ch => ch.group === cat).length})
                  </span>
                </button>
              ))}
            </div>
          </aside>

          {/* Column 2: Channels List (Vertical) */}
          <section ref={channelListRef} className="w-60 flex flex-col bg-[#212124] border-r border-white/5 flex-shrink-0">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredChannels.map((channel, index) => (
                <button
                  key={channel.id}
                  onClick={() => handleChannelSelect(channel)}
                  data-selected={selectedChannel?.id === channel.id}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2 transition-all border-b border-white/[0.02] focus:ring-4 focus:ring-[#f27d26] focus:outline-none focus:z-10",
                    selectedChannel?.id === channel.id 
                      ? "bg-[#f27d26] text-white" 
                      : "text-white/80 hover:bg-white/5"
                  )}
                >
                  <span className="text-[8px] font-bold opacity-40 w-5">{index + 1}</span>
                  <div className="w-6 h-6 bg-black/40 rounded flex items-center justify-center p-1 border border-white/10">
                    {channel.logo ? (
                      <img 
                        src={channel.logo} 
                        alt="" 
                        className="max-w-full max-h-full object-contain" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(channel.name)}&backgroundColor=1a1a1a&textColor=ffffff`;
                        }}
                      />
                    ) : (
                      <Tv className="w-3 h-3 text-white/10" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold truncate flex-1 text-left uppercase tracking-tight">{channel.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Column 3: Channel Info */}
          <aside ref={infoPanelRef} className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden">
            <div className="flex-1 flex flex-col p-5 overflow-y-auto custom-scrollbar">
              {/* Channel Banner/Logo Area */}
              <div className="aspect-video bg-zinc-900/50 relative overflow-hidden rounded-xl border border-white/5 shadow-2xl flex items-center justify-center group flex-shrink-0 max-h-[45%]">
                {selectedChannel ? (
                  <div className="relative w-full h-full flex items-center justify-center p-6">
                    <div className="absolute inset-0 opacity-10 blur-3xl bg-[#f27d26]" />
                    <img 
                      src={selectedChannel.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedChannel.name)}&backgroundColor=1a1a1a&textColor=ffffff`} 
                      alt="" 
                      className="max-w-[45%] max-h-[45%] object-contain relative z-10 drop-shadow-2xl" 
                      referrerPolicy="no-referrer"
                    />
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => openExternalPlayer(selectedChannel.url)}
                      className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none"
                    >
                      <div className="w-14 h-14 bg-[#f27d26] rounded-full flex items-center justify-center shadow-2xl shadow-[#f27d26]/40 ring-4 ring-white/20">
                        <Play className="w-7 h-7 text-white fill-current ml-1" />
                      </div>
                    </motion.button>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                      <MonitorPlay className="w-7 h-7 text-white/10" />
                    </div>
                    <div className="text-center">
                      <p className="text-[7px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Deninho TV</p>
                      <p className="text-[10px] font-medium text-white/40">Selecione um canal</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Channel Details */}
              {selectedChannel && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-5"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2 py-0.5 bg-[#f27d26]/10 text-[#f27d26] text-[7px] font-black uppercase tracking-widest rounded-full border border-[#f27d26]/20">
                      {selectedChannel.group || 'Geral'}
                    </span>
                    <div className="h-1 w-1 rounded-full bg-white/20" />
                    <span className="text-[7px] font-bold text-white/40 uppercase tracking-widest">Full HD 1080p</span>
                  </div>
                  <h2 
                    onClick={() => openExternalPlayer(selectedChannel.url)}
                    className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none mb-3 cursor-pointer hover:text-[#f27d26] transition-colors"
                  >
                    {selectedChannel.name}
                  </h2>
                  <p className="text-white/40 text-[10px] leading-relaxed max-w-xs">
                    Canal pronto. O player externo será aberto automaticamente. Se não abrir, clique no botão abaixo.
                  </p>
                </motion.div>
              )}

              <div className="flex-1" />

              {/* Bottom Actions */}
              <div className="flex flex-col gap-3 mt-auto pt-4">
                {selectedChannel ? (
                  <button 
                    onClick={() => openExternalPlayer(selectedChannel.url)}
                    className="py-3.5 bg-[#f27d26] hover:bg-[#e67622] text-white font-black rounded-lg transition-all text-[9px] uppercase tracking-[0.2em] shadow-xl shadow-[#f27d26]/20 flex items-center justify-center gap-2 focus:ring-4 focus:ring-white/30 focus:outline-none"
                  >
                    <MonitorPlay className="w-3.5 h-3.5" />
                    Abrir no Player Externo
                  </button>
                ) : (
                  <div className="w-full py-3.5 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center">
                    <span className="text-[7px] font-black text-white/10 uppercase tracking-[0.3em]">Aguardando Seleção</span>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}
