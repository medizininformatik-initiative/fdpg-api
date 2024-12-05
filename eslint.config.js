const tsParser = require('@typescript-eslint/parser');
const tsEslintPlugin = require('@typescript-eslint/eslint-plugin');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  {
    files: ['**/*.ts', '**/*.tsx'], // Apply to TypeScript files
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsEslintPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...tsEslintPlugin.configs.recommended.rules, // Load recommended TypeScript rules
      ...prettierConfig.rules, // Load Prettier rules
      'prettier/prettier': 'error', // Enforce Prettier formatting
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['.eslintrc.js'], // Special handling for config files
    ignores: [],
  },
];
