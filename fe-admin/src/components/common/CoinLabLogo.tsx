import { BeakerIcon } from '@heroicons/react/24/solid';

interface CoinLabLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  variant?: 'default' | 'minimal';
}

const CoinLabLogo = ({ size = 'md', showText = true, variant = 'default' }: CoinLabLogoProps) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-2">
        <div className={`${sizeClasses[size]} flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 via-emerald-500 to-purple-500 p-1.5`}>
          <BeakerIcon className="w-full h-full text-white" />
        </div>
        {showText && (
          <span className={`${textSizes[size]} font-bold bg-gradient-to-r from-cyan-400 via-emerald-400 to-purple-400 bg-clip-text text-transparent`}>
            CoinLab
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className={`${sizeClasses[size]} relative flex items-center justify-center`}>
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-emerald-500/20 to-purple-500/20 blur-xl animate-pulse" />
        {/* Main logo container */}
        <div className={`${sizeClasses[size]} relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 via-emerald-500 to-purple-500 p-1.5 shadow-lg shadow-cyan-500/30`}>
          <BeakerIcon className="w-full h-full text-white drop-shadow-lg" />
        </div>
        {/* Inner highlight */}
        <div className="absolute inset-0.5 rounded-xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={`${textSizes[size]} font-bold bg-gradient-to-r from-cyan-400 via-emerald-400 to-purple-400 bg-clip-text text-transparent`}>
            CoinLab
          </span>
          <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-medium">
            Research Terminal
          </span>
        </div>
      )}
    </div>
  );
};

export default CoinLabLogo;

