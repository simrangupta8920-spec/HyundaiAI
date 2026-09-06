import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./frontend/index.html', './frontend/src/**/*.{ts,tsx}', './index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        hyundai: {
          blue: '#002C5F',
          'blue-light': '#00AAD2',
          silver: '#C0C0C0',
          dark: '#1A1A1A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave': 'wave 1.5s ease-in-out infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1.0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
