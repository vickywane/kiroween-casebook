import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

// Next.js 15's eslint-config-next ships legacy configs; FlatCompat adapts them.
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", ".next-check/**", ".netlify/**", "out/**", "build/**", "next-env.d.ts", "public/**"],
  },
];

export default eslintConfig;
