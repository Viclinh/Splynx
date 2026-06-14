/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        splunk: {
          green: "#65c637",
          dark: "#1a1a2e",
          darker: "#0f0f1a",
          card: "#16213e",
          border: "#0f3460",
          accent: "#e94560",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
