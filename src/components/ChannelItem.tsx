import React from 'react';
import { Tv } from 'lucide-react';
import { cn } from '../utils/cn';
import { M3UChannel } from '../utils/m3uParser';
import { useLongPress } from '../hooks/useLongPress';

interface ChannelItemProps {
  channel: M3UChannel;
  index: number;
  isSelected: boolean;
  onClick: (channel: M3UChannel) => void;
  onLongPress: (channel: M3UChannel) => void;
}

export const ChannelItem: React.FC<ChannelItemProps> = ({ 
  channel, 
  index, 
  isSelected, 
  onClick, 
  onLongPress 
}) => {
  const longPressProps = useLongPress(
    () => onLongPress(channel),
    () => onClick(channel),
    { threshold: 600 }
  );

  return (
    <button
      {...longPressProps}
      data-selected={isSelected}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2 transition-all border-b border-white/[0.02] focus:ring-4 focus:ring-[#f27d26] focus:outline-none focus:z-10",
        isSelected 
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
  );
};
