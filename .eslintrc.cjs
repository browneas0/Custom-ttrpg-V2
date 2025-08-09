module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true
  },
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module"
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  plugins: ["@typescript-eslint"],
  rules: {
    "no-global-assign": "error",
    "no-undef": "error"
  },
  overrides: [
    {
      files: ["module/**/*.js", "module/**/*.ts"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: "./tsconfig.json"
      }
    }
  ]
};
