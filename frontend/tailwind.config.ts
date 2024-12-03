import tailwindcssForms from '@tailwindcss/forms';

import type { Config } from 'tailwindcss';

// TODO: Update colors here, see if they need to be integrated anywhere.
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './utils/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        mono: ['var(--font-geist-mono)'],
      },
      spacing: {
        '0.5vh': '0.5vh',
        '1vh': '1vh',
        '0.5vw': '0.5vw',
        '1vw': '1vw',
      },
      colors: {
        // Darker Day Theme
        'day-primary': '#FFF',
        'day-secondary': '#FFF',
        'day-accent': '#FFF',
        'day-text': '#FFF',

        // Night Theme
        'night-primary': '#FFF',
        'night-secondary': '#FFF',
        'night-accent': '#FFF',
        'night-text': '#FFF',
      },
      textColor: {
        'hoagieplan-blue': '#0F1E2F',
        'hoagieplan-gray': '#F6F6F6',
        'hoagieplan-black': '#2C2C2C',
        'hoagieplan-purple': '#663399',
      },
      backgroundColor: {
        'hoagieplan-dark-yellow': '#FFB020',
        'hoagieplan-light-yellow': '#FFEFD2',
        'dnd-gray': 'rgba(0, 0, 0, 0.05)', // Background "on hover" color dnd uses
      },
    },
  },
  plugins: [tailwindcssForms],
};

export default config;
