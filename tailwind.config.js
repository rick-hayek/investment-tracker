/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: {
          dark: '#090D16',
          card: 'rgba(18, 26, 43, 0.75)',
          'card-hover': 'rgba(26, 38, 62, 0.85)',
          drawer: '#0E1626',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.08)',
          glow: 'rgba(56, 189, 248, 0.35)',
        },
        status: {
          profit: '#10B981',
          'profit-bg': 'rgba(16, 185, 129, 0.15)',
          loss: '#EF4444',
          'loss-bg': 'rgba(239, 68, 68, 0.15)',
        },
        brand: {
          blue: '#3B82F6',
          'blue-deep': '#2563EB',
          cyan: '#38BDF8',
        },
        content: {
          primary: '#F8FAFC',
          muted: '#94A3B8',
          dim: '#64748B',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
};
