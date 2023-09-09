import reactAria from "tailwindcss-react-aria-components";
import colors from "tailwindcss/colors";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["src/**/*.{html,tsx,ts}"],
  theme: {
    colors: {
      gray: colors.slate,
      primary: colors.sky,
    },
    extend: {
      ringColor: ({ theme }) => ({ DEFAULT: theme("colors.gray.300") }),
    },
  },
  future: { hoverOnlyWhenSupported: true },
  plugins: [reactAria({ prefix: "ra" })],
};
