/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#13a4ec",
        "primary-dark": "#0b8bc9",
        "background-light": "#f6f7f8",
        "background-dark": "#101c22",
        "surface-light": "#ffffff",
        "surface-dark": "#1a2c35",
        "text-main": "#0d171b",
        "text-muted": "#4c809a",
        "border-light": "#cfdfe7",

        // Phishing specific colors
        "danger": "#ec1313",
        "danger-bg-dark": "#221010",

        // Safe specific colors
        "safe": "#13ec49",
        "safe-bg-dark": "#102215",
        "safe-surface-dark": "#162f1d",
        "safe-border": "#23482c",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        sans: ["Noto Sans", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        full: "9999px",
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}

