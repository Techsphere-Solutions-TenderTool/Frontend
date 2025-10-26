/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      borderRadius: { xl2: "1rem" },           // used by your CSS
      boxShadow: { panel: "0 8px 24px rgba(0,0,0,.35)" },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      "business",
      "emerald",
      "light",
      {
        techsphere: {
          primary:   "#2E7CF6",
          secondary: "#16C2F2",
          accent:    "#D946EF",
          neutral:   "#1f2937",
          "base-100":"#0b1421",
          info:      "#16C2F2",
          success:   "#16a34a",
          warning:   "#f59e0b",
          error:     "#ef4444",
        },
      },
    ],
  },
};
