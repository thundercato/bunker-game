import eslint from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

const typedConfigs = tseslint.configs.strictTypeChecked.map((config) => ({
  ...config,
  files: ["src/**/*.ts", "tests/**/*.ts"],
}));

export default tseslint.config(
  { ignores: ["dist/**", "coverage/**", "node_modules/**", "vite.config.ts"] },
  {
    ...eslint.configs.recommended,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  ...typedConfigs,
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
    },
  },
  {
    files: [
      "src/scenes/BunkerRoomScene.ts",
      "src/scenes/ControllerTestScene.ts",
    ],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-unnecessary-type-conversion": "off",
    },
  },
  {
    files: ["src/scenes/KnifeTrainingScene.ts"],
    rules: {
      "@typescript-eslint/no-unnecessary-type-conversion": "off",
    },
  },
  {
    files: [
      "src/scenes/ScrollingBunkerV3Scene.ts",
      "src/scenes/BunkerV5Scene.ts",
      "src/scenes/BunkerV6Scene.ts",
    ],
    rules: {
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-unnecessary-boolean-literal-compare": "off",
    },
  },
  {
    files: ["src/scenes/BunkerV7Scene.ts"],
    rules: {
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-unnecessary-type-parameters": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["src/scenes/BunkerV8Scene.ts"],
    rules: {
      "@typescript-eslint/no-unnecessary-condition": "off",
    },
  },
  {
    files: [
      "src/scenes/BunkerV9Scene.ts",
      "src/scenes/BunkerV10Scene.ts",
      "src/scenes/BunkerV16Scene.ts",
      "src/scenes/BunkerV17Scene.ts",
    ],
    rules: {
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
    },
  },
  {
    files: ["src/scenes/BunkerV19Scene.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
    },
  },
  {
    files: ["src/labyrinth/**/*.ts", "src/scenes/BunkerV29Scene.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/unbound-method": "off",
    },
  },
  prettier,
);
