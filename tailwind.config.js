/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#FEE8F3',
          100: '#FDD0E8',
          200: '#FCA1D1',
          300: '#F972BA',
          400: '#F243A2',
          500: '#E0177A',
          600: '#BE1268',
          700: '#960E53',
          800: '#730A40',
          900: '#4F072C',
          950: '#300418',
        },
        secondary: {
          50: '#EEF4FB',
          100: '#D4E5F8',
          200: '#A9CCF1',
          300: '#70A9E3',
          400: '#3B85D1',
          500: '#1B4E9A',
          600: '#143D88',
          700: '#0F2E6E',
          800: '#0C2058',
          900: '#081542',
          950: '#040B28',
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-out forwards',
        slideUp: 'slideUp 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
