/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand — deep pine green (calm, "money" without generic fintech blue/emerald)
        brand: {
          50:  '#EAF1ED',
          100: '#D3E3DB',
          200: '#A9C8BB',
          300: '#7FAD9A',
          400: '#4E8A72',
          500: '#2C6B53',
          600: '#1F5C4A',
          700: '#184A3B',
          800: '#123B2F',
          900: '#0D2C23',
          950: '#071A15',
        },
        // Semantic tokens (ledger-paper world)
        paper:    '#F6F3EC',
        card:     '#FFFFFF',
        ink:      '#1B2420',
        'ink-soft': '#5A655F',
        line:     '#E7E2D6',
        income:   '#2E9E6B',
        expense:  '#C2543D',
        attention:'#B9812A',
      },
      fontFamily: {
        display: ['"DM Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
