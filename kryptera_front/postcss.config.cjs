const path = require('path');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');

const tailwindConfig = path.join(__dirname, 'tailwind.config.cjs');

/**
 * PostCSS for CLI, editors, and any tool outside Vite.
 * Vite also sets postcss in vite.config.ts with the same config path.
 */
module.exports = {
  plugins: [tailwindcss({ config: tailwindConfig }), autoprefixer],
};
