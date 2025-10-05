/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00BFA6',
        dark: '#0F172A',
        accent: '#7C3AED',
        success: '#22C55E',
        danger: '#EF4444',
        neutral: '#F8FAFC',
        'text-dark': '#111827',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'base': '16px',
      },
      borderRadius: {
        'soft': '8px',
        'soft-lg': '16px',
      },
    },
  },
  plugins: [],
}