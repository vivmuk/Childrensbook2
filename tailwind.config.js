/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#258cf4',
        'background-light': '#f5f7f8',
        'background-dark': '#101922',
        'sunny-yellow': '#FFD966',
        coral: '#FF8C69',
        'dark-navy': '#1A237E',
        'soft-cream': '#FAF3E0',
        'sky-blue': '#E3F2FD',
        // KinderQuill Design System
        'kq-navy': '#0d1b3e',
        'kq-navy-mid': '#152352',
        'kq-electric': '#f5d000',
        'kq-coral': '#ff5247',
        'kq-mint': '#00e5a0',
        'kq-sky': '#4dc9ff',
        'kq-purple': '#9b5de5',
        'kq-card': '#1a2a5e',
        'kq-text': '#fefcf5',
        'kq-dim': '#a0b4d6',
      },
      fontFamily: {
        display: ['Fredoka One', 'Spline Sans', 'Plus Jakarta Sans', 'sans-serif'],
        body: ['Nunito', 'Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg: '2rem',
        xl: '3rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
}
