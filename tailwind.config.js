/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // ── GuardIQ Primary: Emerald Green ────────────────────────────────
        primary: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        // ── GuardIQ Dark: Charcoal ────────────────────────────────────────
        charcoal: {
          950: '#0a0b0d',
          900: '#0f1014',
          800: '#16181d',
          700: '#1e2128',
          600: '#262b34',
          500: '#2f3540',
          400: '#3d4452',
          300: '#545e70',
          200: '#6b7585',
          100: '#8a95a5',
          50:  '#aab4c4',
        },
        // ── Surface tokens (used throughout) ─────────────────────────────
        'dark-background': '#0f1014',
        'dark-surface':    '#16181d',
        'dark-card':       '#1e2128',
        'dark-elevated':   '#262b34',
        'dark-border':     'rgba(255, 255, 255, 0.07)',
        'dark-border-strong': 'rgba(255, 255, 255, 0.12)',
        // ── Text tokens ───────────────────────────────────────────────────
        'text-primary':    '#f4f4f5',
        'text-secondary':  '#a1a1aa',
        'text-muted':      '#71717a',
      },
      boxShadow: {
        'card':     '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
        'card-md':  '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
        'card-lg':  '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
        'emerald':  '0 0 0 3px rgba(16, 185, 129, 0.15)',
        'dark-card':'0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.4)',
        'dark-card-md': '0 4px 6px -1px rgba(0,0,0,0.5)',
      },
      borderRadius: {
        'xl':  '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease-out forwards',
        'slide-up':   'slideUp 0.3s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer':    'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}