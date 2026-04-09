import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './inertia/{pages,components,app,layouts}/**/*.{ts,tsx,jsx,js,svelte}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './resources/**/*.{edge,js,ts,jsx,tsx,vue}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          border: 'hsl(var(--sidebar-border))',
        },
        neo: {
          pink: 'var(--neo-pink)',
          blue: 'var(--neo-blue)',
          green: 'var(--neo-green)',
          orange: 'var(--neo-orange)',
          purple: 'var(--neo-purple)',
          lime: 'var(--neo-lime)',
          peach: 'var(--neo-peach)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      borderWidth: {
        neo: 'var(--neo-border-width)',
      },
      boxShadow: {
        'neo': 'var(--neo-shadow)',
        'neo-sm': 'var(--neo-shadow-sm)',
        'neo-lg': 'var(--neo-shadow-lg)',
        'neo-none': '0 0 0 0 #000',
      },
      translate: {
        'neo': 'var(--neo-translate)',
        'neo-sm': 'var(--neo-translate-sm)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
}

export default config
