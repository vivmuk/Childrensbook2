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
        /* ── Cosy Night-Light ──
           The world, in tokens. Ground tones, one cream reading surface,
           one amber accent. Nothing neon. */
        'kq-ink': '#14122A',
        'kq-navy': '#1B1D3A',
        'kq-navy-mid': '#232247',
        'kq-plum': '#3A2340',
        'kq-plum-soft': '#4A2E4E',
        'kq-card': '#232044',
        'kq-cream': '#F6E7C9',
        'kq-cream-dim': '#E8D6B2',
        'kq-text': '#F4F2EC',
        'kq-dim': '#A9A5CC',
        'kq-line': 'rgba(244,242,236,0.14)',

        /* The single accent, used once per screen */
        'kq-amber': '#E0A046',
        'kq-amber-dark': '#B87C2E',
        'kq-amber-ink': '#241A12',

        /* Legacy accent names, remapped into the night so any older class
           renders muted rather than neon. */
        'kq-electric': '#E0A046',
        'kq-coral': '#C97A6B',
        'kq-mint': '#6FA894',
        'kq-sky': '#8FA6D8',
        'kq-purple': '#9B7BC4',

        /* Older page colours, kept so untouched screens still compile */
        primary: '#E0A046',
        'background-light': '#F6E7C9',
        'background-dark': '#14122A',
        'sunny-yellow': '#E0A046',
        coral: '#C97A6B',
        'dark-navy': '#1B1D3A',
        'soft-cream': '#F6E7C9',
        'sky-blue': '#8FA6D8',
      },
      fontFamily: {
        /* Fraunces for anything read, Inter for anything operated. */
        display: ['var(--font-fraunces)', 'Fraunces', 'Georgia', 'serif'],
        body: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        ui: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      /* Rounded rectangles, not pills. */
      borderRadius: {
        DEFAULT: '0.625rem',
        md: '0.75rem',
        lg: '0.875rem',
        xl: '1.375rem',
        '2xl': '1.75rem',
        full: '9999px',
      },
      maxWidth: {
        content: '1120px',
      },
    },
  },
  plugins: [],
}
