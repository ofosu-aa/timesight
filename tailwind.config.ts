import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0E14",
        surface: "#121722",
        raised: "#1A2133",
        line: "#222B41",
        ink: "#E9EDF6",
        muted: "#8B95AB",
        faint: "#5B6478",
        accent: "#7DA2FF",
        accent2: "#9F8CFF",
        amber: "#E8A855",
        sage: "#7DC9A2",
        rose: "#E48A9B",
      },
      borderRadius: { xl2: "1rem", xl3: "1.5rem" },
    },
  },
  plugins: [],
};
export default config;
