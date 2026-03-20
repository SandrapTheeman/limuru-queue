import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        hospital: {
          primary: '#0F766E',
          secondary: '#14B8A6',
          accent: '#5EEAD4',
          background: '#F0FDFA',
          surface: '#FFFFFF',
          text: '#134E4A',
          muted: '#99F6E4',
          emergency: '#DC2626',
          warning: '#F59E0B',
          success: '#10B981',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
