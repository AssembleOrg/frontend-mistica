// eslint.config.mjs

import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import typescriptParser from "@typescript-eslint/parser"; 
import typescriptPlugin from "@typescript-eslint/eslint-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [

  ...compat.extends("next/core-web-vitals"),

  {
    
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"], 
    
    languageOptions: {
      parser: typescriptParser,
    },

    
    plugins: {
      "@typescript-eslint": typescriptPlugin,
    },
    
    
    rules: {
      ...typescriptPlugin.configs["eslint-recommended"].rules,
      ...typescriptPlugin.configs["recommended"].rules,

      "@typescript-eslint/no-unused-vars": [
        "warn", 
        {
          "args": "after-used", 
          "argsIgnorePattern": "^_", 
          "varsIgnorePattern": "^_", 
          "caughtErrors": "all", 
          "caughtErrorsIgnorePattern": "^_" 
        }
      ]
    }
  }
];

export default eslintConfig;