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
        'day-primary': '#FFF',
        'day-secondary': '#FFF',
        'day-accent': '#FFF',
        'day-text': '#FFF',
        'night-primary': '#FFF',
        'night-secondary': '#FFF',
        'night-accent': '#FFF',
        'night-text': '#FFF',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
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
        'dnd-gray': 'rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [tailwindcssForms, require('tailwindcss-animate')],
};

export default config;
