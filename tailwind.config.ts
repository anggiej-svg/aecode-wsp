import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'wa-green': '#25D366',
        'wa-dark': '#111B21',
        'wa-bg': '#F0F2F5',
      },
    },
  },
  plugins: [],
}
export default config
