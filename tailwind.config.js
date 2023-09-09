import reactAria from "tailwindcss-react-aria-components";
import colors from "tailwindcss/colors";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["src/**/*.{html,tsx,ts}"],
  theme: {
    colors: {
      transparent: "transparent",
      gray: colors.slate,
      primary: colors.sky,
      red: colors.red,
    },
    extend: {
      ringColor: ({ theme }) => ({ DEFAULT: theme("colors.primary.400") }),
    },
  },
  future: { hoverOnlyWhenSupported: true },
  plugins: [reactAria({ prefix: "ra" })],
};
