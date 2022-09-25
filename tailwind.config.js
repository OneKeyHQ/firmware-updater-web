module.exports = {
  mode: 'jit',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'media', // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'rgb(235, 249, 236)',
          100: 'rgb(215, 244, 218)',
          200: 'rgb(163, 229, 169)',
          300: 'rgb(103, 213, 114)',
          400: 'rgb(51, 198, 65)',
          500: 'rgb(0, 184, 18)',
          600: 'rgb(0, 147, 14)',
          700: 'rgb(0, 111, 11)',
          800: 'rgb(0, 88, 9)',
          900: 'rgb(0, 66, 6)',
        },
      },
    },
  },
  // eslint-disable-next-line import/no-extraneous-dependencies
  plugins: [require('@tailwindcss/forms')],
};
