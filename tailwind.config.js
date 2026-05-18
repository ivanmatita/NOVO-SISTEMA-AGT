/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // This is a minimal config, let's see if it stops the oklch injection.
      },
    },
  },
  plugins: [],
}
