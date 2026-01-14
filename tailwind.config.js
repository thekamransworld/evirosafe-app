/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // <--- THIS IS CRITICAL for the toggle to work
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
        // Dark Mode Colors (Your current look)
        'dark-surface': '#0f172a',
        'dark-background': '#030712',
        'dark-card': 'rgba(17, 24, 39, 0.7)',
        'dark-border': 'rgba(255, 255, 255, 0.08)',
        
        // Neon Accents
        'neon-green': '#34d399',
        'neon-blue': '#38bdf8',
        'neon-purple': '#c084fc',
        'neon-pink': '#f472b6',
        'neon-orange': '#fb923c',
        'neon-yellow': '#facc15',
      },
      boxShadow: {
        'neon': '0 0 20px rgba(52, 211, 153, 0.4)',
        'glass': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    }
  },
  plugins: [],
}