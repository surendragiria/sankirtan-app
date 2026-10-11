/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}', './public/index.html'],
  theme: {
    extend: {
      // The app uses /8 and /12 colour-opacity modifiers; they are not in
      // Tailwind's default 5-step scale, so declare them here.
      opacity: { 8: '0.08', 12: '0.12' },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
