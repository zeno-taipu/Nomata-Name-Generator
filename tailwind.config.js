function withOpacity(rgbVar, hexVar) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${rgbVar}), ${opacityValue})`;
    }
    return `var(${hexVar})`;
  };
}

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
          700: withOpacity('--color-border-rgb', '--color-border'),
          750: withOpacity('--color-border-rgb', '--color-border'),
          800: withOpacity('--bg-card-rgb', '--bg-card'),
          850: withOpacity('--bg-panel-rgb', '--bg-panel'),
          900: withOpacity('--bg-panel-rgb', '--bg-panel'),
          950: withOpacity('--bg-app-rgb', '--bg-app'),
        },
        gold: {
          50: '#fbf9eb',
          100: '#f6f1cd',
          200: withOpacity('--color-accent-secondary-rgb', '--color-accent-secondary'),
          300: withOpacity('--color-accent-secondary-rgb', '--color-accent-secondary'),
          400: withOpacity('--color-accent-rgb', '--color-accent'),
          500: withOpacity('--color-accent-rgb', '--color-accent'),
          600: withOpacity('--color-accent-rgb', '--color-accent'),
          700: '#7e5d1a',
          800: '#684a1b',
          900: '#583e1b',
        },
        amber: {
          200: withOpacity('--color-accent-secondary-rgb', '--color-accent-secondary'),
          300: withOpacity('--color-accent-secondary-rgb', '--color-accent-secondary'),
          400: withOpacity('--color-accent-rgb', '--color-accent'),
          500: withOpacity('--color-accent-rgb', '--color-accent'),
          600: withOpacity('--color-accent-rgb', '--color-accent'),
        },
        slate: {
          100: 'rgba(var(--color-text-primary-rgb), <alpha-value>)',
          200: 'rgba(var(--color-text-primary-rgb), <alpha-value>)',
          300: 'rgba(var(--color-text-primary-rgb), <alpha-value>)',
          400: 'rgba(var(--color-text-muted-rgb), <alpha-value>)',
          500: 'rgba(var(--color-text-muted-rgb), <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgba(var(--color-accent-rgb), <alpha-value>)',
          secondary: 'rgba(var(--color-accent-secondary-rgb), <alpha-value>)',
        },
        theme: {
          app: 'rgba(var(--bg-app-rgb), <alpha-value>)',
          panel: 'rgba(var(--bg-panel-rgb), <alpha-value>)',
          header: 'rgba(var(--bg-header-rgb), <alpha-value>)',
          card: 'rgba(var(--bg-card-rgb), <alpha-value>)',
          border: 'rgba(var(--color-border-rgb), <alpha-value>)',
          accent: 'rgba(var(--color-accent-rgb), <alpha-value>)',
          accentSecondary: 'rgba(var(--color-accent-secondary-rgb), <alpha-value>)',
          primary: 'rgba(var(--color-text-primary-rgb), <alpha-value>)',
          muted: 'rgba(var(--color-text-muted-rgb), <alpha-value>)',
        },
      },
      boxShadow: {
        'accent-sm': '0 0 8px rgba(var(--color-accent-rgb), 0.25)',
        'accent-md': '0 0 15px rgba(var(--color-accent-rgb), 0.3)',
        'accent-lg': '0 0 25px rgba(var(--color-accent-rgb), 0.45)',
        'accent-glow': '0 0 20px rgba(var(--color-accent-rgb), 0.35)',
      },
    },
  },
  plugins: [],
};
