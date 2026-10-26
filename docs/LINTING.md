# Linting dan Format

## Alat
| Alat | Tugas |
|---|---|
| TypeScript (`strict`) | Pemeriksaan tipe |
| ESLint (flat config) | Kualitas kode, aturan React/Next, impor |
| Prettier | Format; satu-satunya yang mengatur gaya |
| `prettier-plugin-tailwindcss` | Mengurutkan class Tailwind |
| Husky + lint-staged | Menjalankan cek pada file yang di-commit |
| commitlint | Memeriksa format Conventional Commits |

ESLint tidak mengurus format; Prettier tidak mengurus kualitas. Pasang `eslint-config-prettier` agar tidak bentrok.

## Instalasi
```bash
npm i -D eslint typescript-eslint eslint-config-next eslint-config-prettier \
  eslint-plugin-import prettier prettier-plugin-tailwindcss \
  husky lint-staged @commitlint/cli @commitlint/config-conventional
npx husky init
```

## `tsconfig.json` (bagian penting)
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```

## `eslint.config.mjs`
```js
import { FlatCompat } from '@eslint/eslintrc';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'prisma/migrations/**', 'coverage/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
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
    // Larang Prisma di luar lapisan server
    files: ['src/app/**', 'src/components/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@/server/db', '@prisma/client'], message: 'Akses database hanya lewat server/services.' }] },
      ],
    },
  },
  prettier,
);
```
Aturan terakhir menegakkan arsitektur: komponen dan halaman tidak boleh mengimpor Prisma langsung. Pengecualian: Server Component yang memang memanggil service, bukan Prisma.

## `.prettierrc`
```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

## `.editorconfig`
```
root = true
[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
insert_final_newline = true
trim_trailing_whitespace = true
```

## lint-staged (`package.json`)
```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css,yml}": ["prettier --write"]
  }
}
```

## Git hooks
`.husky/pre-commit`:
```sh
npx lint-staged
```
`.husky/commit-msg`:
```sh
npx commitlint --edit "$1"
```
`commitlint.config.mjs`:
```js
export default { extends: ['@commitlint/config-conventional'] };
```
Pre-commit sengaja ringan (hanya file yang berubah). Typecheck dan tes penuh dijalankan di CI, bukan di hook.

## Skrip
```json
{
  "lint": "eslint .",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "typecheck": "tsc --noEmit"
}
```

## Pengaturan editor (VS Code)
`.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Aturan praktis
- Peringatan (warning) dianggap utang; jangan dibiarkan menumpuk.
- `// eslint-disable` wajib disertai alasan di komentar dan sebisa mungkin hanya satu baris.
- Jangan menonaktifkan aturan global hanya karena satu file bermasalah.
