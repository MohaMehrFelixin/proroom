import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        tg: {
          'bg-dark': '#0e1621',
          'bg-secondary': '#17212b',
          'bg-input': '#242f3d',
          'border': '#344051',
          'msg-out': '#2b5278',
          'msg-in': '#182533',
          'accent': '#3390ec',
          'green': '#4dcd5e',
          'text': '#f5f5f5',
          'text-secondary': '#8b9bab',
        },
      },
      keyframes: {
        'typing-dot': {
          '0%, 60%, 100%': { opacity: '0.3', transform: 'scale(0.8)' },
          '30%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'typing-dot': 'typing-dot 1.4s infinite ease-in-out',
      },
    },
  },
  plugins: [],
};

export default config;
