import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'light' | 'badge' | 'image-only';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export const IndofoodSnackTimeLogo: React.FC<LogoProps> = ({
  className = '',
  variant = 'full',
  size = 'md',
  showSubtitle = true,
}) => {
  const logoImageSrc = '/logo-indofood-snacktime.jpg';

  const imgDimensions = {
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  }[size];

  if (variant === 'image-only') {
    return (
      <div className={`inline-flex items-center justify-center bg-white rounded-2xl p-1 shadow-xs border border-slate-200/80 overflow-hidden ${imgDimensions} ${className}`}>
        <img
          src={logoImageSrc}
          alt="Indofood Snack Time Logo"
          className="w-full h-full object-contain"
          loading="eager"
        />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
        {/* Official Indofood Snack Time Logo Image */}
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white shadow-xs border border-slate-200/90 overflow-hidden p-0.5 shrink-0">
          <img
            src={logoImageSrc}
            alt="Indofood Snack Time Logo"
            className="w-full h-full object-contain"
            loading="eager"
          />
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-1">
            <span className="font-extrabold text-sm tracking-tight text-blue-900 font-sans">
              Indofood
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-400 text-blue-950 uppercase tracking-wider">
              Snack Time
            </span>
          </div>
          {showSubtitle && (
            <span className="text-[10px] font-semibold text-slate-500 tracking-wide block">
              GTM Karawang
            </span>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'light') {
    return (
      <div className={`inline-flex items-center gap-3 select-none ${className}`}>
        {/* Logo Card with White Background for optimal contrast on dark blue headers */}
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white shadow-sm border border-white/60 p-0.5 shrink-0 overflow-hidden">
          <img
            src={logoImageSrc}
            alt="Indofood Snack Time Logo"
            className="w-full h-full object-contain"
            loading="eager"
          />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-base tracking-tight text-white drop-shadow-xs font-sans">
              Indofood
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-400 text-blue-950 uppercase tracking-wider shadow-xs">
              SNACK TIME
            </span>
          </div>
          {showSubtitle && (
            <p className="text-[10px] font-medium text-blue-100/90 tracking-wide">
              PT Indofood Fortuna Makmur (IFM) · Karawang
            </p>
          )}
        </div>
      </div>
    );
  }

  // Full brand header badge with official Indofood Snack Time logo
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Official Indofood Snack Time Emblem */}
      <div className={`relative flex items-center justify-center rounded-2xl bg-white shadow-xs border border-blue-100/90 shrink-0 p-1 overflow-hidden ${imgDimensions}`}>
        <img
          src={logoImageSrc}
          alt="Indofood Snack Time"
          className="w-full h-full object-contain"
          loading="eager"
        />
      </div>

      {/* Brand Wordmark & Subtitle */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <span className="font-black text-lg sm:text-xl tracking-tight text-blue-950 font-sans leading-none">
            Indofood
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black bg-gradient-to-r from-amber-400 to-yellow-400 text-blue-950 uppercase tracking-wider shadow-2xs border border-amber-300">
            SNACK TIME
          </span>
        </div>
        {showSubtitle && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] font-semibold text-slate-600">
              Sales GTM Karawang
            </span>
            <span className="w-1 h-1 rounded-full bg-amber-400" />
            <span className="text-[10px] font-medium text-slate-500 hidden sm:inline">
              Area Karawang
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
