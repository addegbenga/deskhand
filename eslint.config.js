import js from '@eslint/js'
import i18next from 'eslint-plugin-i18next'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/** Raw colors are only allowed in token CSS (FE-DOC 4.2). Seed data (tenant brand colors) is data, not styling. */
const RAW_COLOR = '/#[0-9a-fA-F]{3,8}\\b|\\b(rgb|hsl)a?\\(/'
const ARBITRARY_COLOR = '/\\b(bg|text|border|ring|outline|fill|stroke|from|via|to|shadow|decoration|divide|accent|caret)-\\[(#|rgb|hsl|color:)/'
const PALETTE_COLOR =
  '/\\b(bg|text|border|ring|outline|fill|stroke|from|via|to|shadow|decoration|divide|accent|caret)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(-\\d{2,3})?\\b/'

const colorRules = ['Literal', 'TemplateElement'].flatMap((node) => {
  const value = node === 'Literal' ? 'value' : 'value.raw'
  return [
    { selector: `${node}[${value}=${RAW_COLOR}]`, message: 'Raw colors are not allowed. Use a design token (bg-brand, text-fg-muted, ...).' },
    { selector: `${node}[${value}=${ARBITRARY_COLOR}]`, message: 'Arbitrary Tailwind colors are not allowed. Use a design token.' },
    { selector: `${node}[${value}=${PALETTE_COLOR}]`, message: 'The default Tailwind palette is disabled. Use a design token.' },
  ]
})

/** User-visible attributes must come from i18n, like JSX text. */
const VISIBLE_ATTRIBUTES = '/^(aria-label|aria-description|placeholder|title|alt|label|description|heading|roleLabel|badgeLabel|content)$/'
const stringRules = [
  {
    selector: `JSXAttribute[name.name=${VISIBLE_ATTRIBUTES}] > Literal[value=/[A-Za-z]/]`,
    message: 'User-visible text must use an i18n key (t()).',
  },
  {
    selector: `JSXAttribute[name.name=${VISIBLE_ATTRIBUTES}] > JSXExpressionContainer > Literal[value=/[A-Za-z]/]`,
    message: 'User-visible text must use an i18n key (t()).',
  },
]

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/routeTree.gen.ts', '.pnpm-store/**', '**/storybook-static/**', '**/coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['**/*.tsx'],
    plugins: { 'react-hooks': reactHooks, i18next },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-text-only',
          message: 'User-visible text must use an i18n key (t()).',
          words: { exclude: ['[0-9!-/:-@[-`{-~·•…–—\\s]+', '[A-Z_-]+'] },
        },
      ],
      'no-restricted-syntax': ['error', ...colorRules, ...stringRules],
    },
  },
  {
    files: ['**/*.ts'],
    ignores: ['packages/mock-api/src/scenarios.ts', 'packages/mock-api/src/seed.ts', 'packages/config/src/**'],
    rules: { 'no-restricted-syntax': ['error', ...colorRules] },
  },
  {
    files: ['**/*.stories.tsx', '**/*.test.{ts,tsx}'],
    rules: { 'i18next/no-literal-string': 'off', 'no-restricted-syntax': 'off' },
  },
)
