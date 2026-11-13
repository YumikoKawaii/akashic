/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F3ECE8',
        lab: '#A3222D',
        'lab-dark': '#7E1822',
        rose: '#F6D9DC',
        'rose-soft': '#FBECEE',
        ink: '#2B1D1F',
        'ink-dim': '#6E5E58',
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
