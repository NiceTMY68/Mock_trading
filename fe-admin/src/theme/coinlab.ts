/**
 * CoinLab Design System
 * Theme: Scientific Lab + Future Tech
 * Colors: Cyan (Tech), Emerald (Crypto), Purple (Lab), Slate (Base)
 */

export const coinlabTheme = {
  colors: {
    // Primary - Tech Blue/Cyan (Future Technology)
    tech: {
      50: '#ecfeff',
      100: '#cffafe',
      200: '#a5f3fc',
      300: '#67e8f9',
      400: '#22d3ee',
      500: '#06b6d4',
      600: '#0891b2',
      700: '#0e7490',
      800: '#155e75',
      900: '#164e63',
    },
    // Secondary - Emerald (Crypto/Blockchain)
    crypto: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },
    // Accent - Purple (Lab/Science)
    lab: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7e22ce',
      800: '#6b21a8',
      900: '#581c87',
    },
    // Neutral - Slate (Base)
    base: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    },
  },
  effects: {
    glass: {
      light: 'bg-white/5 backdrop-blur-xl border border-white/10',
      medium: 'bg-white/10 backdrop-blur-xl border border-white/20',
      dark: 'bg-slate-900/80 backdrop-blur-xl border border-white/10',
    },
    glow: {
      tech: 'shadow-lg shadow-cyan-500/20',
      crypto: 'shadow-lg shadow-emerald-500/20',
      lab: 'shadow-lg shadow-purple-500/20',
    },
    neon: {
      tech: 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]',
      crypto: 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]',
      lab: 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]',
    },
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
    },
    sizes: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl',
    },
  },
  spacing: {
    card: {
      padding: 'p-6',
      gap: 'gap-4',
      rounded: 'rounded-2xl',
    },
  },
  animations: {
    pulse: 'animate-pulse',
    glow: 'animate-pulse',
    fadeIn: 'animate-in fade-in duration-300',
    slideUp: 'animate-in slide-in-from-bottom-4 duration-300',
  },
};

export default coinlabTheme;

