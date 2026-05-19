// craco.config.js — supports the @/ alias used throughout shadcn-ui components
const path = require("path");

module.exports = {
  // ESLint runs only via the IDE / `yarn lint` — don't fail builds on lint warnings.
  eslint: { enable: false },
  webpack: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    configure: (webpackConfig) => {
      webpackConfig.watchOptions = {
        ...webpackConfig.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/build/**",
          "**/api/**",
        ],
      };
      return webpackConfig;
    },
  },
};
