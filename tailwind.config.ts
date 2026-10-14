import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
      },
      colors: {
        blue: {
          50: '#fff4f7',
          100: '#fbe4ec',
          200: '#f7c4d5',
          300: '#f1a5be',
          400: '#e879a0',
          500: '#d9507e',
          600: '#c13c6a',
          700: '#a82d5a',
          800: '#872348',
          900: '#72203f',
          950: '#4d142b',
        },
        sky: {
          50: '#fff4f7',
          100: '#fbe4ec',
          200: '#f7c4d5',
          300: '#f1a5be',
          400: '#e879a0',
          500: '#d9507e',
          600: '#c13c6a',
          700: '#a82d5a',
          800: '#872348',
          900: '#72203f',
          950: '#4d142b',
        },
      },
    },
    keyframes: {
      shimmer: {
        '100%': {
          transform: 'translateX(100%)',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
export default config;
