import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Pure domain code (e.g. the money engine): no floating-point money, no framework imports.
  {
    files: ["src/modules/*/domain/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name=/^(Number|parseFloat|parseInt)$/]",
          message: "Money must stay bigint: no Number()/parseFloat()/parseInt() in domain code.",
        },
        {
          selector: "MemberExpression[object.name='Number'][property.name=/^(parseFloat|parseInt)$/]",
          message: "Money must stay bigint: no Number.parseFloat/parseInt in domain code.",
        },
        {
          selector: "MemberExpression[object.name='Math']",
          message: "Math operates on floats: use bigint arithmetic in domain code.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["next", "next/*", "react", "react/*", "@supabase/*", "@/lib/*", "@/app/*"], message: "Domain code must not depend on frameworks or infrastructure." },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
