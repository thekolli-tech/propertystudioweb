import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      'apps/api/src/generated/**',
      '**/eslint.config.*',
      '**/prettier.config.*',
      '**/next.config.*',
      '**/postcss.config.*',
      '**/vitest.config.*',
      '**/tailwind.config.*',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      boundaries,
    },
    settings: {
      'boundaries/include': ['apps/**/*', 'packages/**/*'],
      'boundaries/elements': [
        { type: 'api', pattern: 'apps/api/*' },
        { type: 'web', pattern: 'apps/web/*' },
        { type: 'contracts', pattern: 'packages/contracts/*' },
        { type: 'permissions', pattern: 'packages/permissions/*' },
        { type: 'public-id', pattern: 'packages/public-id/*' },
        { type: 'api-client', pattern: 'packages/api-client/*' },
        { type: 'ui', pattern: 'packages/ui/*' },
        { type: 'tsconfig', pattern: 'packages/tsconfig/*' },
      ],
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            {
              from: 'api',
              allow: ['contracts', 'permissions', 'public-id'],
            },
            {
              from: 'web',
              allow: ['contracts', 'permissions', 'public-id', 'api-client', 'ui'],
            },
            {
              from: 'api-client',
              allow: ['contracts'],
            },
            {
              from: 'ui',
              allow: [],
            },
            {
              from: 'contracts',
              allow: [],
            },
            {
              from: 'permissions',
              allow: [],
            },
            {
              from: 'public-id',
              allow: [],
            },
            {
              from: 'tsconfig',
              allow: [],
            },
          ],
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@prisma/client', '**/generated/prisma/**'],
              message:
                'Prisma Client is restricted to apps/api. Web and shared packages must not import it.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/api/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
      // NestJS DI relies on runtime class imports retained for emitDecoratorMetadata.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  eslintConfigPrettier,
);
