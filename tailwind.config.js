/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // allowing manual class override if needed, though standard prefers-color-scheme also works
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
      serif: ['Cinzel', 'serif'],
    },
    extend: {
      colors: {
        epic: {
          900: 'rgb(var(--epic-900) / <alpha-value>)', 
          800: 'rgb(var(--epic-800) / <alpha-value>)',
          700: 'rgb(var(--epic-700) / <alpha-value>)',
          gold: 'rgb(var(--epic-gold) / <alpha-value>)',
          gold_dim: 'rgb(var(--epic-gold-dim) / <alpha-value>)',
          ruby: 'rgb(var(--epic-ruby) / <alpha-value>)'
        }
      }
    },
  },
  plugins: [],
}
