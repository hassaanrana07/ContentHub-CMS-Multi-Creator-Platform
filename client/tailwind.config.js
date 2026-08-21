/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          bg: '#F5F1EA',
          surface: '#FFFFFF',
          charcoal: '#24211E',
          black: '#171513',
          brown: '#6B4F3A',
          terracotta: '#A65F46',
          gold: '#B08A57',
          text: '#292522',
          muted: '#756D65',
          border: '#DED7CF',
          hover: '#EFEBE4',
        }
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
