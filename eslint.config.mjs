// @ts-check
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: [".next/**", "node_modules/**", "public/**"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ["**/*.{ts,tsx,mts}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      react: { version: "detect" },
    },
  },
  {
    files: ["**/*.tsx"],
    plugins: {
      react: reactPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
  {
    files: ["**/*.tsx"],
    ...reactHooksPlugin.configs.flat["recommended-latest"],
  },
  {
    // A deliberate subset of `configs.recommended`, not the whole bundle:
    // `enforce-consistent-class-order`/`enforce-consistent-line-wrapping`
    // are large, invasive reformats (near every multi-class `className`)
    // this project never asked for — everything kept here catches an
    // actual defect (typo, contradiction, duplication) or the exact
    // canonical-class drift this plugin was added for.
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "better-tailwindcss": betterTailwindcss,
    },
    rules: {
      // "dark" is this project's manual dark-mode toggle class (not a
      // Tailwind utility); "nodrag"/"nopan" are @xyflow/react's own marker
      // classes for the Whiteboard's draggable nodes — neither is Tailwind's
      // to know about.
      "better-tailwindcss/no-unknown-classes": [
        "error",
        { ignore: ["^dark$", "^nodrag$", "^nopan$"] },
      ],
      "better-tailwindcss/no-conflicting-classes": "error",
      "better-tailwindcss/no-concatenated-classes": "error",
      "better-tailwindcss/no-duplicate-classes": "error",
      "better-tailwindcss/no-deprecated-classes": "error",
      "better-tailwindcss/enforce-canonical-classes": "error",
      "better-tailwindcss/no-unnecessary-whitespace": "warn",
    },
    settings: {
      "better-tailwindcss": {
        entryPoint: "src/app/globals.css",
      },
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: globals.node,
    },
  },
  eslintConfigPrettier,
);
