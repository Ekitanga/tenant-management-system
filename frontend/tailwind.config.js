/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        maroon: {
          50: '#FDF2F2',
          100: '#FCE4E4',
          200: '#F9C9C9',
          300: '#F5AEAE',
          400: '#EE7979',
          500: '#E74444',
          600: '#8B1538',
          700: '#7A1232',
          800: '#660F2A',
          900: '#540D23',
        },
        charcoal: {
          DEFAULT: '#1A1D23',
          50: '#F9FAFB',
          100: '#F1F5F9',
          900: '#1A1D23',
        },
        sapphire: {
          DEFAULT: '#0F62FE',
          50: '#EFF6FF',
          600: '#0F62FE',
          700: '#0D52D9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'sm': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
        'md': '0 4px 12px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.03)',
        'lg': '0 12px 24px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)',
      },
      animation: {
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
}