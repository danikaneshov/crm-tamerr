/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        primary: {
          light: '#ffffff',
          DEFAULT: '#eef2ff',
          dark: '#e0e7ff',
        },
        success: {
          DEFAULT: '#10B981',
          dark: '#059669',
        },
        warning: {
          DEFAULT: '#F59E0B',
          dark: '#D97706',
        },
        error: {
          DEFAULT: '#EF4444',
        },
        info: {
          DEFAULT: '#3B82F6',
        },
        neutral: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          800: '#3730a3',
          900: '#312e81',
        },
        dark: {
          bg: '#1e1b4b',
          surface: '#312e81',
          border: '#4338ca',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        slideInFromRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInFromLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInFromBottom: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInFromTop: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        }
      },
      animation: {
        'slide-in-right': 'slideInFromRight 0.3s ease-out forwards',
        'slide-in-left': 'slideInFromLeft 0.3s ease-out forwards',
        'slide-in-bottom': 'slideInFromBottom 0.3s ease-out forwards',
        'slide-in-top': 'slideInFromTop 0.3s ease-out forwards',
        'scale-in': 'scaleIn 0.2s ease-out forwards',
        'shimmer': 'shimmer 2s infinite linear',
      }
    },
  },
  plugins: [],
}