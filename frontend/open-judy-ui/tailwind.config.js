/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: 'var(--color-bg, #0d0e12)',
          sidebar: 'var(--color-sidebar, #111216)',
          header: 'var(--color-header, #111216)',
          card: 'var(--color-card, #17181d)',
          'card-hover': 'var(--color-card-hover, #1e2027)',
          border: 'var(--color-border, #23252d)',
          'border-subtle': 'var(--color-border-subtle, #1a1b21)',
          input: 'var(--color-input, #1e2026)',
          pill: 'var(--color-pill, #25272e)',
          'pill-hover': 'var(--color-pill-hover, #2f323c)',
          muted: 'var(--color-muted, #7e8594)',
        },
        crimson: {
          DEFAULT: '#e63946',
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e63946',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          glow: 'rgba(230, 57, 70, 0.25)',
        },
        judy: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49',
          950: '#031c2e',
        },
      },
    },
  },
  plugins: [],
};
