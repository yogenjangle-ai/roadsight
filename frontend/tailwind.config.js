/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        road: {
          dark: '#0a0d14',
          card: '#111726',
          border: '#1e293b',
          warning: '#f59e0b',
          danger: '#ef4444',
          caution: '#eab308',
          success: '#10b981',
          accent: '#38bdf8',
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-once': 'ping 0.5s cubic-bezier(0, 0, 0.2, 1) 1',
      }
    },
  },
  plugins: [],
}
