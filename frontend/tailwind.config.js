/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        dark: {
          50: '#f8f9fa',
          100: '#e9ecef',
          200: '#dee2e6',
          300: '#ced4da',
          400: '#adb5bd',
          500: '#6c757d',
          600: '#495057',
          700: '#343a40',
          800: '#212529',
          900: '#121212',
        }
      },
      boxShadow: {
        'neumorphism': '8px 8px 16px #0a0a0a, -8px -8px 16px #1e1e1e',
        'neumorphism-inset': 'inset 8px 8px 16px #0a0a0a, inset -8px -8px 16px #1e1e1e',
        'neumorphism-flat': '4px 4px 8px #0a0a0a, -4px -4px 8px #1e1e1e',
      }
    },
  },
  plugins: [],
}
