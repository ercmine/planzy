/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        doge: {
          50: '#fff8ea',
          100: '#ffefc7',
          200: '#f8dd93',
          300: '#efc96a',
          400: '#e5b243',
          500: '#ce8f18',
          600: '#9d6310'
        },
        cream: '#f6efe3',
        charcoal: '#0d0c0b'
      },
      boxShadow: {
        glow: '0 24px 80px rgba(206, 143, 24, 0.25)',
        soft: '0 16px 42px rgba(0, 0, 0, 0.28)'
      },
      backgroundImage: {
        'gold-grid': 'radial-gradient(circle at center, rgba(255,255,255,0.06) 1px, transparent 1px)',
        'hero-radial': 'radial-gradient(circle at top, rgba(255, 227, 163, 0.24), transparent 42%)'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-16px)' }
        },
        wobble: {
          '0%, 100%': { transform: 'rotate(-2deg) scale(1)' },
          '50%': { transform: 'rotate(2deg) scale(1.04)' }
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' }
        }
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        wobble: 'wobble 5s ease-in-out infinite',
        marquee: 'marquee 22s linear infinite'
      }
    }
  },
  plugins: [],
}
