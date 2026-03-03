import React from 'react';
import { Play, MonitorPlay } from 'lucide-react';
import { cn } from '../utils/cn';
import { useLongPress } from '../hooks/useLongPress';

interface PlayButtonProps {
  onClick: () => void;
  onDoubleClick: () => void;
  onLongPress: () => void;
  className?: string;
  variant?: 'icon' | 'full';
  label?: string;
}

export const PlayButton: React.FC<PlayButtonProps> = ({ 
  onClick, 
  onDoubleClick,
  onLongPress, 
  className, 
  variant = 'icon',
  label = 'Reproduzir'
}) => {
  const longPressProps = useLongPress(
    onLongPress,
    onClick,
    { 
      threshold: 600,
      onDoubleClick
    }
  );

  if (variant === 'full') {
    return (
      <button 
        {...longPressProps}
        className={cn(
          "py-3.5 bg-[#f27d26] hover:bg-[#e67622] text-white font-black rounded-lg transition-all text-[9px] uppercase tracking-[0.2em] shadow-xl shadow-[#f27d26]/20 flex items-center justify-center gap-2 focus:ring-4 focus:ring-white/30 focus:outline-none",
          className
        )}
      >
        <MonitorPlay className="w-3.5 h-3.5" />
        {label}
      </button>
    );
  }

  return (
    <button
      {...longPressProps}
      className={cn(
        "absolute inset-0 z-20 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none",
        className
      )}
    >
      <div className="w-14 h-14 bg-[#f27d26] rounded-full flex items-center justify-center shadow-2xl shadow-[#f27d26]/40 ring-4 ring-white/20">
        <Play className="w-7 h-7 text-white fill-current ml-1" />
      </div>
    </button>
  );
};
