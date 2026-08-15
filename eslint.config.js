import js from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.recommended,
  reactHooks.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'esnext',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        browser: true,
        es2024: true,
        node: true,
      },
    },
    settings: {
      react: { version: '18.3' },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  prettier,
  {
    ignores: ['dist/', 'node_modules/', '*.config.*', 'scripts/', 'e2e/', 'server/'],
  }
)