/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-purple': 'linear-gradient(to right, #9333ea, #6366f1)',
        'gradient-blue': 'linear-gradient(to right, #3b82f6, #06b6d4)',
        'gradient-green': 'linear-gradient(to right, #10b981, #059669)',
        'gradient-orange': 'linear-gradient(to right, #f97316, #f59e0b)',
        'gradient-slate': 'linear-gradient(to right, #1e293b, #3b82f6)',
      },
    },
  },
  plugins: [],
}
