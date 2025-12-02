/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // <--- FIXED: Only scans src folder to prevent build crashes
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        // Cinematic Dark Theme Colors
        background: 'transparent',
        'border-color': 'rgba(255, 255, 255, 0.08)',
        'text-primary': 'var(--text-color)', // Uses CSS variable from index.html
        'text-secondary': '#94a3b8', // Slate 400
        
        // Specific Overrides
        'dark-surface': '#0f172a', // Solid Slate 900
        'dark-background': '#030712', // Almost pure black blue
        'dark-card': 'rgba(17, 24, 39, 0.7)', // Deep blue-grey glass
        'dark-border': 'rgba(255, 255, 255, 0.08)',
        
        // Premium Neon Accents (High Luminance)
        'neon-green': '#34d399', // Emerald 400
        'neon-blue': '#38bdf8',   // Sky 400
        'neon-purple': '#c084fc', // Purple 400
        'neon-pink': '#f472b6',   // Pink 400
        'neon-orange': '#fb923c', // Orange 400
        'neon-yellow': '#facc15', // Yellow 400
      },
      boxShadow: {
        'neon': '0 0 20px rgba(52, 211, 153, 0.4)',
        'neon-blue': '0 0 20px rgba(56, 189, 248, 0.4)',
        'glass': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        'glow-sm': '0 0 10px rgba(255,255,255,0.1)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-move': 'glowMove 20s ease-in-out infinite alternate',
        'pulse-glow': 'pulseGlow 3s infinite',
        'spin-slow': 'spin 15s linear infinite',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'bump': 'bump 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        glowMove: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '100% 100%' },
        },
        pulseGlow: {
          '0%': { boxShadow: '0 0 0 rgba(248,113,113,0)', borderColor: 'rgba(248,113,113,0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(248,113,113,0.4)', borderColor: 'rgba(248,113,113,0.8)' },
          '100%': { boxShadow: '0 0 0 rgba(248,113,113,0)', borderColor: 'rgba(248,113,113,0.3)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bump: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)', filter: 'brightness(1.5)' },
          '100%': { transform: 'scale(1)' },
        }
      }
    }
  },
  plugins: [],
}