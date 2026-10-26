import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: [".next/**", "node_modules/**", "mobile/**", "test-results/**", "playwright-report/**", "next-env.d.ts", "*.config.js", "tailwind.config.ts", "public/sw.js"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Old disable comments for rules that are off are harmless.
    linterOptions: { reportUnusedDisableDirectives: "off" },
    rules: {
      // Third-party logos are rendered with <img> on purpose (no image proxy).
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];

export default config;
