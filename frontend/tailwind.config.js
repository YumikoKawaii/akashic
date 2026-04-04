/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        parchment: '#f0e8d5',
        gold: '#9a7018',
        'gold-light': '#c89030',
        'gold-glow': '#e8a820',
        'gold-dim': '#b8942a',
        ink: '#2a1f0e',
        'ink-dim': '#7a6848',
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        'cinzel-decorative': ['Cinzel Decorative', 'serif'],
        garamond: ['EB Garamond', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
