/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ibm: {
          blue: '#4589ff',
          'blue-dark': '#0f62fe',
          'blue-hover': '#0353e9',
          'gray-10': '#f4f4f4',
          'gray-20': '#e0e0e0',
          'gray-30': '#c6c6c6',
          'gray-50': '#8d8d8d',
          'gray-70': '#525252',
          'gray-80': '#393939',
          'gray-90': '#262626',
          'gray-100': '#161616',
          cyan: '#33b1ff',
          teal: '#08bdba',
          green: '#42be65',
          purple: '#a56eff',
          red: '#ff8389',
          yellow: '#f1c21b',
          orange: '#ff832b',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(69,137,255,0.4)' },
          '50%': { boxShadow: '0 0 20px 10px rgba(69,137,255,0.1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
}
