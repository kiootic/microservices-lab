import reactAria from "tailwindcss-react-aria-components";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["src/**/*.{html,tsx,ts}"],
  theme: {
    extend: {
      ringColor: ({ theme }) => ({ DEFAULT: theme("colors.gray.300") }),
    },
  },
  plugins: [reactAria],
};
