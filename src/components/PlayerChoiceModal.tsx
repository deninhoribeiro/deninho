import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MonitorPlay, ExternalLink, X } from 'lucide-react';
import { cn } from '../utils/cn';

interface PlayerChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChoice: (choice: 'internal' | 'external') => void;
  title: string;
}

export const PlayerChoiceModal: React.FC<PlayerChoiceModalProps> = ({ isOpen, onClose, onChoice, title }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % 2);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + 2) % 2);
      } else if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        onChoice(selectedIndex === 0 ? 'internal' : 'external');
        onClose();
      } else if (e.key === 'Escape' || e.key === 'Backspace' || e.keyCode === 4) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, onChoice, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-[#1a1a1a] border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl relative"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex flex-col items-center text-center gap-6">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                <MonitorPlay className="text-[#f27d26] w-8 h-8" />
              </div>
              
              <div>
                <h2 className="text-xl font-black italic tracking-tighter uppercase mb-1">{title}</h2>
                <p className="text-white/40 font-bold uppercase tracking-widest text-[8px]">Escolha como deseja assistir</p>
              </div>

              <div className="grid grid-cols-1 gap-3 w-full">
                <button
                  onClick={() => {
                    onChoice('internal');
                    onClose();
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl border border-white/10 transition-all group focus:outline-none",
                    selectedIndex === 0 ? "bg-[#f27d26] ring-4 ring-[#f27d26]/40" : "bg-white/5 hover:bg-white/10"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                    selectedIndex === 0 ? "bg-white/20" : "bg-white/10 group-hover:bg-white/20"
                  )}>
                    <MonitorPlay className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="block text-sm font-black uppercase italic leading-none mb-1">Player Interno</span>
                    <span className={cn(
                      "block text-[8px] font-bold uppercase tracking-widest transition-colors",
                      selectedIndex === 0 ? "text-white/80" : "text-white/40 group-hover:text-white/60"
                    )}>Reproduzir no App</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onChoice('external');
                    onClose();
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl border border-white/10 transition-all group focus:outline-none",
                    selectedIndex === 1 ? "bg-blue-600 ring-4 ring-blue-600/40" : "bg-white/5 hover:bg-white/10"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                    selectedIndex === 1 ? "bg-white/20" : "bg-white/10 group-hover:bg-white/20"
                  )}>
                    <ExternalLink className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="block text-sm font-black uppercase italic leading-none mb-1">Player Externo</span>
                    <span className={cn(
                      "block text-[8px] font-bold uppercase tracking-widest transition-colors",
                      selectedIndex === 1 ? "text-white/80" : "text-white/40 group-hover:text-white/60"
                    )}>Abrir no VLC/MX Player</span>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
