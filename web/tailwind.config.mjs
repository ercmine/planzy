/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#edfef5',
          100: '#d5fbe7',
          400: '#36f4a0',
          500: '#13db84',
          600: '#0fa66a'
        },
        neon: {
          purple: '#9b7bff',
          green: '#36f4a0'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        soft: '0 12px 38px -14px rgba(54, 244, 160, 0.35)',
        glow: '0 0 0 1px rgba(155, 123, 255, 0.35), 0 18px 50px -24px rgba(54, 244, 160, 0.5)'
      },
      backgroundImage: {
        'hero-glow': 'radial-gradient(circle at 10% 15%, rgba(54, 244, 160, 0.2), transparent 35%), radial-gradient(circle at 90% 0%, rgba(155, 123, 255, 0.24), transparent 40%)'
      }
    }
  },
  plugins: []
};
