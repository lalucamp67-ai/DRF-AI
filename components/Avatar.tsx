
import React, { useMemo } from 'react';
import { AnimationType, ViewMode } from '../types';

interface AvatarProps {
  animation: AnimationType;
  mode?: ViewMode;
}

const Avatar: React.FC<AvatarProps> = ({ animation, mode = 'standard' }) => {
  const isAR = mode === 'ar';
  const isVR = mode === 'vr';

  const getAvatarContent = useMemo(() => {
    let primary = '#4285f4';
    if (isVR) primary = '#a78bfa';
    if (isAR) primary = '#00f2ff';
    
    const skin = '#ffdbac';
    const tech = '#00f2ff';

    const baseHead = (
      <g>
        {/* Robotic Head Structure */}
        <path d="M60 110 Q100 135 140 110 L145 60 Q100 40 55 60 Z" fill={primary} fillOpacity={isAR ? "0.4" : "0.8"} />
        <path d="M65 105 Q100 125 135 105 L138 65 Q100 48 62 65 Z" fill="#ffffff" fillOpacity="0.1" />
        {/* Humanoid Face Plate */}
        <rect x="70" y="70" width="60" height="40" rx="20" fill={skin} fillOpacity={isAR ? "0.8" : "1"} />
        {/* Robotic Ears / Antennas */}
        <circle cx="55" cy="85" r="8" fill={primary} />
        <circle cx="145" cy="85" r="8" fill={primary} />
        <path d="M55 77 L50 60" stroke={primary} strokeWidth="3" />
        <path d="M145 77 L150 60" stroke={primary} strokeWidth="3" />
        <circle cx="50" cy="60" r="3" fill={tech} className="animate-pulse" />
        <circle cx="150" cy="60" r="3" fill={tech} className="animate-pulse" />
        
        {/* AR Tracking Data overlay */}
        {isAR && (
          <g opacity="0.6">
            <line x1="40" y1="40" x2="60" y2="40" stroke={tech} strokeWidth="1" />
            <line x1="40" y1="40" x2="40" y2="60" stroke={tech} strokeWidth="1" />
            <line x1="160" y1="40" x2="140" y2="40" stroke={tech} strokeWidth="1" />
            <line x1="160" y1="40" x2="160" y2="60" stroke={tech} strokeWidth="1" />
            <text x="40" y="35" fontSize="6" fill={tech} fontStyle="italic">TRACKING_LINK: ACTIVE</text>
          </g>
        )}
      </g>
    );

    switch (animation) {
      case 'smile':
      case 'idle':
        return (
          <g>
            {baseHead}
            <circle cx="85" cy="85" r="4" fill="#000" />
            <circle cx="115" cy="85" r="4" fill="#000" />
            <path d="M85 100 Q100 112 115 100" stroke="#ff4d4d" fill="none" strokeWidth="3" strokeLinecap="round" />
            {animation === 'smile' && <circle cx="85" cy="85" r="2" fill={tech} className="animate-ping" />}
          </g>
        );
      case 'thinking':
        return (
          <g className="animate-pulse">
            {baseHead}
            <path d="M80 85 Q85 80 90 85" stroke="#000" fill="none" strokeWidth="2" />
            <path d="M110 85 Q115 80 120 85" stroke="#000" fill="none" strokeWidth="2" />
            <path d="M90 105 Q100 100 110 105" stroke="#000" fill="none" strokeWidth="2" />
            <circle cx="100" cy="40" r="10" fill={tech} fillOpacity="0.2" stroke={tech} strokeWidth="1" strokeDasharray="3,3" />
          </g>
        );
      case 'play_game':
        return (
          <g>
            {baseHead}
            <g className="animate-bounce">
              <rect x="80" y="80" width="10" height="6" fill={tech} />
              <rect x="110" y="80" width="10" height="6" fill={tech} />
            </g>
            <path d="M85 105 L115 105" stroke="#000" strokeWidth="3" />
            <circle cx="160" cy="110" r="15" fill={primary} opacity="0.5" />
            <text x="152" y="115" fontSize="12" fill="#fff" fontWeight="bold">🎮</text>
          </g>
        );
      case 'wave_hand':
        return (
          <g>
            {baseHead}
            <circle cx="85" cy="85" r="4" fill="#000" />
            <circle cx="115" cy="85" r="4" fill="#000" />
            <path d="M85 100 Q100 110 115 100" stroke="#000" fill="none" strokeWidth="2" />
            <g className="origin-center animate-bounce">
                <path d="M160 120 L185 90 L175 80 L145 110" fill={primary} className="drop-shadow-lg" />
                <path d="M175 80 Q185 75 190 85" stroke={primary} strokeWidth="2" fill="none" />
            </g>
          </g>
        );
      default:
        return (
          <g>
            {baseHead}
            <circle cx="85" cy="85" r="4" fill="#000" />
            <circle cx="115" cy="85" r="4" fill="#000" />
            <path d="M85 100 L115 100" stroke="#000" strokeWidth="2" />
          </g>
        );
    }
  }, [animation, isAR, isVR]);

  return (
    <div className={`relative w-64 h-64 md:w-80 md:h-80 mx-auto transition-all duration-700 perspective-3d flex items-center justify-center`}>
      {/* Immersive VR Background Grid */}
      {isVR && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,_rgba(139,92,246,0.1)_0%,_transparent_70%)]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-purple-500/10 rounded-full animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[400px] border-t border-purple-500/5 rotate-X-[60deg] perspective-1000"></div>
        </div>
      )}

      {/* AR Scanning Ring */}
      {isAR && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 border-[2px] border-dashed border-cyan-500/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border border-cyan-500/10 rounded-full scale-110"></div>
        </div>
      )}

      {/* Ground Shadow/Glow */}
      <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-8 blur-2xl rounded-[100%] scale-y-50 transition-all ${
        isVR ? 'bg-purple-600/30' : isAR ? 'bg-cyan-400/20' : 'bg-blue-600/10'
      }`}></div>
      
      {/* Background Ambient Blur */}
      <div className={`absolute inset-0 blur-[80px] rounded-full scale-75 transition-all duration-1000 ${
        isVR ? 'bg-purple-500/40' : isAR ? 'bg-cyan-400/20' : 'bg-blue-500/30'
      }`}></div>
      
      <svg viewBox="0 0 200 200" className={`w-full h-full relative z-10 transition-all duration-500 ${
        isVR ? 'drop-shadow-[0_0_60px_rgba(139,92,246,0.6)]' : isAR ? 'drop-shadow-[0_0_40px_rgba(0,242,255,0.4)]' : 'drop-shadow-[0_0_40px_rgba(66,133,244,0.4)]'
      } card-3d`}>
        {getAvatarContent}
      </svg>

      {/* Orbital Rings */}
      <div className={`absolute inset-0 border-[1px] border-white/5 rounded-full scale-110 animate-spin ${isAR ? 'border-cyan-500/20' : ''}`} style={{ animationDuration: '25s' }}></div>
      <div className="absolute inset-0 border-[0.5px] border-white/10 rounded-full scale-150 animate-pulse opacity-20"></div>

      {/* Mode Indicators */}
      {(isAR || isVR) && (
        <div className="absolute top-0 right-0 p-2 glass rounded-lg text-[8px] font-black tracking-widest uppercase text-white/60 animate-in fade-in zoom-in">
          {isAR ? 'PASSTHROUGH_ON' : 'IMMERSIVE_LINK'}
        </div>
      )}
    </div>
  );
};

export default Avatar;
