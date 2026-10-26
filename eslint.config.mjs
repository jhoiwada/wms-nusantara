import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
    'prisma/migrations/**',
    'coverage/**',
  ]),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
    },
  },
  {
    // Larang Prisma di luar lapisan server (menegakkan arsitektur)
    files: ['src/app/**', 'src/components/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/server/db', '@prisma/client'],
              message: 'Akses database hanya lewat server/services.',
            },
          ],
        },
      ],
    },
  },
  {
    // Izinkan console output pada skrip database dan CLI
    files: ['prisma/**', 'scripts/**'],
    rules: {
      'no-console': 'off',
    },
  },
  prettier,
]);

export default eslintConfig;
