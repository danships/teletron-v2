import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

// Complexity budgets (ADR-041). Do not raise these to make a change pass. Split the code instead.
const budgets = {
  'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
  complexity: ['error', 10],
  'max-depth': ['error', 3],
  'max-params': ['error', 4],
  'max-nested-callbacks': ['error', 3],
};

const eslintConfig = [
  {
    ignores: ['**/node_modules/**', '**/dist/**', 'coverage/**', '**/*.js', '**/*.mjs', '**/*.cjs'],
  },
  ...tseslint.configs.recommended,
  eslintPluginUnicorn.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      ...budgets,
      'unicorn/no-useless-undefined': 'off',
      'unicorn/no-null': 'off',
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    // describe/it blocks are long by nature. Keep the other budgets.
    files: ['**/*.test.ts'],
    rules: {
      'max-lines-per-function': 'off',
      'max-nested-callbacks': ['error', 4],
    },
  },
];

export default eslintConfig;
