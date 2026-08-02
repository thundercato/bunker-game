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
    ],
    rules: {
      "@typescript-eslint/no-unnecessary-condition": "off",
    },
  },
  prettier,
);
