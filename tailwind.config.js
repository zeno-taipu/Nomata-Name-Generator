/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        charcoal: {
          50: '#f6f7f9',
          100: '#edeef2',
          200: '#d7d9e2',
          300: '#b4b8c7',
          400: '#8c92a9',
          500: '#6d738d',
          600: '#565b72',
          700: '#22232a',
          750: '#1d1e24',
          800: '#18191e',
          850: '#15161b',
          900: '#121316',
          950: '#0c0d0e',
        },
        gold: {
          50: '#fbf9eb',
          100: '#f6f1cd',
          200: '#ece29c',
          300: '#dece62',
          400: '#d0b933',
          500: '#bca024',
          600: '#9d7c1c',
          700: '#7e5d1a',
          800: '#684a1b',
          900: '#583e1b',
        },
      },
    },
  },
  plugins: [],
};
