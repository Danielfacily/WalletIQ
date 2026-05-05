/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}','./components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Figtree','system-ui','sans-serif'] },
      colors: {
        brand:  '#007AFF',
        green:  '#34C759',
        red:    '#FF3B30',
        orange: '#FF9500',
        purple: '#AF52DE',
        teal:   '#5AC8FA',
        ink:    '#1C1C1E',
        muted:  '#8E8E93',
        fill:   '#E5E5EA',
        surface:'#F2F2F7',
      },
      borderRadius: { apple:'20px', chip:'14px' },
      boxShadow: {
        card: '0 2px 14px rgba(0,0,0,.06)',
        dark: '0 6px 24px rgba(0,0,0,.18)',
      },
      animation: { blink:'blink 1.5s infinite', fadeUp:'fadeUp .25s ease both' },
      keyframes: {
        blink:   { '0%,100%':{ opacity:'1' }, '50%':{ opacity:'.15' } },
        fadeUp:  { from:{ opacity:'0', transform:'translateY(10px)' }, to:{ opacity:'1', transform:'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
