import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'light' | 'badge';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const IndofoodSnackTimeLogo: React.FC<LogoProps> = ({
  className = '',
  variant = 'full',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-11',
    lg: 'h-14',
    xl: 'h-18',
  }[size];

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 select-none ${className}`}>
        {/* Indofood Iconic Wave Mark */}
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 shadow-sm border border-blue-600/30 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-400/25 via-transparent to-transparent" />
          <svg viewBox="0 0 40 40" className="w-6 h-6">
            <path
              d="M6 24 C12 18, 18 28, 24 20 C28 14, 32 17, 34 16"
              stroke="#FDB813"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="10" cy="13" r="3.5" fill="#EF4444" />
            <circle cx="30" cy="24" r="3" fill="#FFFFFF" />
          </svg>
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-1">
            <span className="font-extrabold text-sm tracking-tight text-blue-900 font-sans">
              Indofood
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-400 text-blue-950 uppercase tracking-wider">
              Snack
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-500 tracking-wide block">
            GTM Karawang
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'light') {
    return (
      <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs border border-white/30 shadow-xs">
          <svg viewBox="0 0 40 40" className="w-7 h-7">
            <path
              d="M6 24 C12 18, 18 28, 24 20 C28 14, 32 17, 34 16"
              stroke="#FDB813"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="10" cy="13" r="3.5" fill="#EF4444" />
            <circle cx="30" cy="24" r="3" fill="#FFFFFF" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-tight text-white drop-shadow-xs font-sans">
              Indofood
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-400 text-blue-950 uppercase tracking-wider shadow-xs">
              SNACK TIME
            </span>
          </div>
          <p className="text-[10px] font-medium text-blue-100/90 tracking-wide">
            PT Indofood Fortuna Makmur (IFM) · Karawang
          </p>
        </div>
      </div>
    );
  }

  // Full brand header badge with official Indofood blue, red accent, and golden yellow
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${sizeClasses} ${className}`}>
      {/* Visual Emblem Badge */}
      <div className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-b from-blue-700 via-blue-800 to-blue-950 shadow-md border border-blue-600/40 shrink-0">
        <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-tr-xl rounded-bl-lg" />
        <svg viewBox="0 0 44 44" className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-xs">
          <path
            d="M7 26 C13 20, 20 30, 26 21 C30 15, 35 18, 38 17"
            stroke="#FFC72C"
            strokeWidth="3.6"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="11" cy="14" r="3.5" fill="#DC2626" />
          <path
            d="M20 12 L24 8 L28 12"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="33" cy="27" r="3.2" fill="#FFFFFF" />
        </svg>
      </div>

      {/* Brand Wordmark & Subtitle */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <span className="font-black text-lg sm:text-xl tracking-tight text-blue-900 font-sans leading-none">
            Indofood
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black bg-gradient-to-r from-amber-400 to-yellow-400 text-blue-950 uppercase tracking-wider shadow-2xs border border-amber-300">
            SNACK TIME
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[11px] font-semibold text-slate-600">
            Sales GTM Karawang
          </span>
          <span className="w-1 h-1 rounded-full bg-amber-400" />
          <span className="text-[10px] font-medium text-slate-500 hidden sm:inline">
            Area Karawang
          </span>
        </div>
      </div>
    </div>
  );
};
