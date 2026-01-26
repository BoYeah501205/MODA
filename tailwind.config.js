/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./weekly-board-popout.html",
    "./js/**/*.{js,jsx}",
    "./moda-components.js",
  ],
  theme: {
    extend: {
      colors: {
        'autovol-navy': '#1E3A5F',
        'autovol-teal': '#2DD4BF',
        'autovol-light': '#F0F2F5',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
