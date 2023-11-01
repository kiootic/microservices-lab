import reactAria from "tailwindcss-react-aria-components";
import colors from "tailwindcss/colors";
import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["src/**/*.{html,tsx,ts}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      gray: colors.slate,
      primary: colors.sky,
      red: colors.red,
      yellow: colors.yellow,
      green: colors.green,
    },
    extend: {
      ringColor: ({ theme }) => ({ DEFAULT: theme("colors.primary.400") }),
      animation: {
        "loading":  "loading 2s ease-out",
        "fade-in": "fade 150ms ease-out",
        "fade-out": "fade 150ms reverse ease-in",
      },
      keyframes: {
        fade: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        loading: {
          from: { opacity: 0 },
          '60%': { opacity: 0 },
          to: { opacity: 1 },
        },
      },
    },
  },
  future: { hoverOnlyWhenSupported: true },
  plugins: [reactAria({ prefix: "ra" })],
};
