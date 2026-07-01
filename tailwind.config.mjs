/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F3F0E8',
        ink: {
          DEFAULT: '#16150F',
          secondary: '#413d34',
        },
        accent: '#FF4B54',
        yellow: '#FFC01E',
        muted: {
          1: '#6b675c',
          2: '#8a867b',
          3: '#9a968b',
        },
        sand: '#c9c5ba',
      },
      fontFamily: {
        bricolage: ['"Bricolage Grotesque"', 'serif'],
        manrope: ['Manrope', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
      keyframes: {
        mq: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        mqr: {
          from: { transform: 'translateX(-50%)' },
          to: { transform: 'translateX(0)' },
        },
        'spin-ring': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        orbit: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'floaty-b': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.25' },
        },
      },
      animation: {
        mq: 'mq 28s linear infinite',
        mqr: 'mqr 32s linear infinite',
        'spin-slow': 'spin-ring 60s linear infinite',
        orbit: 'orbit 9s linear infinite',
        floaty: 'floaty 5s ease-in-out infinite',
        'floaty-b': 'floaty-b 6s ease-in-out 0.8s infinite',
        blink: 'blink 1.6s ease-in-out infinite',
        'badge-spin': 'spin-ring 16s linear infinite',
      },
      transitionTimingFunction: {
        reveal: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
