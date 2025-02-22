import tailwindcssForms from '@tailwindcss/forms';

import type { Config } from 'tailwindcss';

// TODO: Update colors here, see if they need to be integrated anywhere.
const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './utils/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        border: 'hsl(var(--border))',
      backgroundColor: {
        white: '#FFFFFF',
        'hoagieplan-dark-blue': '#3366FF',
        'hoagieplan-light-blue': '#EBF0FF',
        'dnd-gray': 'rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [tailwindcssForms, require('tailwindcss-animate')],
};

export default config;
