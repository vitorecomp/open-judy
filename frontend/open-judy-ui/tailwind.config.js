/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      borderColor: {
        DEFAULT: 'var(--color-border, #23252d)',
      },
      divideColor: {
        DEFAULT: 'var(--color-border, #23252d)',
      },
      colors: {
        dark: {
          bg: 'color-mix(in srgb, var(--color-bg, #0d0e12) calc(<alpha-value> * 100%), transparent)',
          sidebar: 'color-mix(in srgb, var(--color-sidebar, #111216) calc(<alpha-value> * 100%), transparent)',
          header: 'color-mix(in srgb, var(--color-header, #111216) calc(<alpha-value> * 100%), transparent)',
          card: 'color-mix(in srgb, var(--color-card, #17181d) calc(<alpha-value> * 100%), transparent)',
          'card-hover': 'color-mix(in srgb, var(--color-card-hover, #1e2027) calc(<alpha-value> * 100%), transparent)',
          hover: 'color-mix(in srgb, var(--color-card-hover, #1e2027) calc(<alpha-value> * 100%), transparent)',
          border: 'color-mix(in srgb, var(--color-border, #23252d) calc(<alpha-value> * 100%), transparent)',
          'border-subtle': 'color-mix(in srgb, var(--color-border-subtle, #1a1b21) calc(<alpha-value> * 100%), transparent)',
          input: 'color-mix(in srgb, var(--color-input, #1e2026) calc(<alpha-value> * 100%), transparent)',
          pill: 'color-mix(in srgb, var(--color-pill, #25272e) calc(<alpha-value> * 100%), transparent)',
          'pill-hover': 'color-mix(in srgb, var(--color-pill-hover, #2f323c) calc(<alpha-value> * 100%), transparent)',
          muted: 'color-mix(in srgb, var(--color-muted, #7e8594) calc(<alpha-value> * 100%), transparent)',
        },
        crimson: {
          DEFAULT: 'color-mix(in srgb, var(--accent-color, #e63946) calc(<alpha-value> * 100%), transparent)',
          dark: 'color-mix(in srgb, var(--accent-color-dark, #be123c) calc(<alpha-value> * 100%), transparent)',
          hover: 'color-mix(in srgb, var(--accent-color-dark, #be123c) calc(<alpha-value> * 100%), transparent)',
          light: 'color-mix(in srgb, var(--accent-color-light, #fb7185) calc(<alpha-value> * 100%), transparent)',
          50: 'var(--accent-color-50, #fff1f2)',
          100: 'var(--accent-color-100, #ffe4e6)',
          200: 'var(--accent-color-200, #fecdd3)',
          300: 'var(--accent-color-300, #fda4af)',
          400: 'color-mix(in srgb, var(--accent-color-light, #fb7185) calc(<alpha-value> * 100%), transparent)',
          500: 'color-mix(in srgb, var(--accent-color, #f43f5e) calc(<alpha-value> * 100%), transparent)',
          600: 'color-mix(in srgb, var(--accent-color, #e63946) calc(<alpha-value> * 100%), transparent)',
          700: 'color-mix(in srgb, var(--accent-color-dark, #be123c) calc(<alpha-value> * 100%), transparent)',
          800: 'var(--accent-color-800, #9f1239)',
          900: 'var(--accent-color-900, #881337)',
          glow: 'var(--accent-color-glow, rgba(230, 57, 70, 0.25))',
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
      zIndex: {
        60: '60',
        70: '70',
      },
    },
  },
  plugins: [],
};
