/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        nox: {
          dark: '#0a0e1a',
          card: '#111827',
          border: '#1e293b',
          accent: '#6366f1',
          accentHover: '#818cf8',
          green: '#10b981',
          red: '#ef4444',
          orange: '#f59e0b',
          text: '#e2e8f0',
          muted: '#94a3b8',
        },
      },
    },
  },
  plugins: [],
};
