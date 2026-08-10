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
          DEFAULT: 'var(--accent-color, #e63946)',
          50: 'var(--accent-color-50, #fff1f2)',
          100: 'var(--accent-color-100, #ffe4e6)',
          200: 'var(--accent-color-200, #fecdd3)',
          300: 'var(--accent-color-300, #fda4af)',
          400: 'var(--accent-color-light, #fb7185)',
          500: 'var(--accent-color, #f43f5e)',
          600: 'var(--accent-color, #e63946)',
          700: 'var(--accent-color-dark, #be123c)',
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
    },
  },
  plugins: [],
};
