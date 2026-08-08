import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#07131E',
        surface: '#0C1C2A',
        card: {
          DEFAULT: '#122535',
          foreground: '#F5FAFC',
        },
        border: '#24475F',
        primary: {
          DEFAULT: '#18C8FF',
          foreground: '#07131E',
        },
        accent: {
          DEFAULT: '#5EEAD4',
          foreground: '#07131E',
        },
        warning: '#FFB547',
        danger: '#FF5A6E',
        success: '#27D980',
        muted: {
          DEFAULT: '#122535',
          foreground: '#8FA6B8',
        },
        ocean: {
          950: '#07131E',
          900: '#0C1C2A',
          800: '#122535',
          700: '#1B354B',
          600: '#24475F',
          500: '#2C5977',
          400: '#18C8FF',
          300: '#5EEAD4',
          200: '#A3F3E6',
          100: '#E0FAF5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
    },
  },
  plugins: [],
}

export default config
