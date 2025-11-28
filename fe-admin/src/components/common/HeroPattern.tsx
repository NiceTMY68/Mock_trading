interface HeroPatternProps {
  pattern?: 'grid' | 'dots' | 'circuit' | 'topography' | 'waves';
  className?: string;
  opacity?: number;
}

const HeroPattern = ({ pattern = 'grid', className = '', opacity = 0.1 }: HeroPatternProps) => {
  const patterns = {
    grid: (
      <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" opacity={opacity} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    ),
    dots: (
      <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="1.5" fill="currentColor" opacity={opacity} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>
    ),
    circuit: (
      <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="circuit" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M 0 50 L 50 50 L 50 0 M 50 50 L 50 100 M 50 50 L 100 50" fill="none" stroke="currentColor" strokeWidth="2" opacity={opacity} />
            <circle cx="50" cy="50" r="3" fill="currentColor" opacity={opacity} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit)" />
      </svg>
    ),
    topography: (
      <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="topography" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M 0 20 Q 25 10 50 20 T 100 20" fill="none" stroke="currentColor" strokeWidth="1" opacity={opacity} />
            <path d="M 0 40 Q 25 30 50 40 T 100 40" fill="none" stroke="currentColor" strokeWidth="1" opacity={opacity} />
            <path d="M 0 60 Q 25 50 50 60 T 100 60" fill="none" stroke="currentColor" strokeWidth="1" opacity={opacity} />
            <path d="M 0 80 Q 25 70 50 80 T 100 80" fill="none" stroke="currentColor" strokeWidth="1" opacity={opacity} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#topography)" />
      </svg>
    ),
    waves: (
      <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="waves" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M 0 50 Q 25 30 50 50 T 100 50" fill="none" stroke="currentColor" strokeWidth="2" opacity={opacity} />
            <path d="M 0 70 Q 25 50 50 70 T 100 70" fill="none" stroke="currentColor" strokeWidth="2" opacity={opacity} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#waves)" />
      </svg>
    )
  };

  return (
    <div className={`pointer-events-none absolute inset-0 text-white ${className}`}>
      {patterns[pattern]}
    </div>
  );
};

export default HeroPattern;

