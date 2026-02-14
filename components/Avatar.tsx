
import React, { useMemo } from 'react';
import { AnimationType } from '../types';

interface AvatarProps {
  animation: AnimationType;
}

const Avatar: React.FC<AvatarProps> = ({ animation }) => {
  const getAvatarContent = useMemo(() => {
    switch (animation) {
      case 'thinking':
        return (
          <g className="animate-pulse">
            <circle cx="100" cy="100" r="80" fill="#3b82f6" fillOpacity="0.2" stroke="#60a5fa" strokeWidth="2" />
            <path d="M80 120 Q100 140 120 120" stroke="#60a5fa" fill="none" strokeWidth="3" />
            <circle cx="80" cy="85" r="5" fill="#60a5fa" />
            <circle cx="120" cy="85" r="5" fill="#60a5fa" />
            <path d="M90 60 Q100 40 110 60" stroke="#60a5fa" fill="none" strokeWidth="2" />
          </g>
        );
      case 'warning':
        return (
          <g>
            <circle cx="100" cy="100" r="80" fill="#ef4444" fillOpacity="0.2" stroke="#f87171" strokeWidth="2" />
            <path d="M80 130 Q100 110 120 130" stroke="#f87171" fill="none" strokeWidth="3" />
            <circle cx="80" cy="85" r="5" fill="#f87171" />
            <circle cx="120" cy="85" r="5" fill="#f87171" />
            <path d="M100 50 L100 70 M100 40 L100 42" stroke="#f87171" strokeWidth="4" />
          </g>
        );
      case 'wave_hand':
        return (
          <g>
            <circle cx="100" cy="100" r="80" fill="#10b981" fillOpacity="0.2" stroke="#34d399" strokeWidth="2" />
            <path d="M80 120 Q100 135 120 120" stroke="#34d399" fill="none" strokeWidth="3" />
            <circle cx="80" cy="85" r="5" fill="#34d399" />
            <circle cx="120" cy="85" r="5" fill="#34d399" />
            <g className="origin-center animate-bounce">
                <path d="M150 120 L170 100 L165 95 L145 115" fill="#34d399" />
            </g>
          </g>
        );
      case 'nod_yes':
        return (
          <g className="animate-bounce">
            <circle cx="100" cy="100" r="80" fill="#8b5cf6" fillOpacity="0.2" stroke="#a78bfa" strokeWidth="2" />
            <path d="M80 125 Q100 140 120 125" stroke="#a78bfa" fill="none" strokeWidth="3" />
            <circle cx="80" cy="85" r="5" fill="#a78bfa" />
            <circle cx="120" cy="85" r="5" fill="#a78bfa" />
          </g>
        );
      default:
        return (
          <g>
            <circle cx="100" cy="100" r="80" fill="#64748b" fillOpacity="0.1" stroke="#94a3b8" strokeWidth="2" />
            <path d="M80 125 Q100 130 120 125" stroke="#94a3b8" fill="none" strokeWidth="3" />
            <circle cx="80" cy="85" r="5" fill="#94a3b8" />
            <circle cx="120" cy="85" r="5" fill="#94a3b8" />
          </g>
        );
    }
  }, [animation]);

  return (
    <div className="relative w-48 h-48 md:w-64 md:h-64 mx-auto animate-float">
      <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full scale-110"></div>
      <svg viewBox="0 0 200 200" className="w-full h-full relative z-10 drop-shadow-2xl">
        {getAvatarContent}
      </svg>
    </div>
  );
};

export default Avatar;
