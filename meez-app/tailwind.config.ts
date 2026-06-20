import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    fontFamily: {
      sans: ['"Huwiya"', "system-ui", "sans-serif"],
      display: ['"Huwiya"', "system-ui", "sans-serif"],
      body: ['"Huwiya"', "system-ui", "sans-serif"],
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
      },
      backgroundImage: {
        "gradient-hero": "var(--gradient-hero)",
      },
    },
  },
  plugins: [],
} satisfies Config;
