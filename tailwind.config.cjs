module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  // Safelist para classes que podem ser geradas dinamicamente no código
  safelist: [
    'bg-pink-500','hover:bg-pink-600','bg-teal-500','hover:bg-teal-600','bg-red-500','hover:bg-red-600',
    'rounded-xl','shadow-lg','p-4','p-6','text-pink-600','text-green-600','text-gray-700','text-gray-800',
    'bg-pink-100','bg-pink-900/40','bg-gray-50','dark:bg-gray-700/50','border-pink-300','border-pink-500'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

