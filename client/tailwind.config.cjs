/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html','./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#1B6392',
        brandAlt: '#FF7F2A',
        brandAccent: '#EBC80C',
        dark: '#191C1F',
      },
      boxShadow: {
        soft: '0 8px 30px rgba(0,0,0,0.08)'
      },
      borderRadius: {
        sm: '6px'
      }
    }
  },
  plugins: []
}
