module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#050505",
        card: "#111111",
        elevated: "#171717",
        text: "#F5F5F5",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      borderRadius: {
        xl: "20px",
        "2xl": "28px",
      },
      boxShadow: {
        glow: "0 0 32px rgba(255,255,255,0.04)",
        amber: "0 0 36px rgba(245,158,11,0.25)",
        red: "0 0 36px rgba(239,68,68,0.25)",
        green: "0 0 36px rgba(34,197,94,0.25)",
      },
    },
  },
  plugins: [],
};
