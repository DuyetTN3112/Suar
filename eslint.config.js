// @ts-check
import { configApp } from '@adonisjs/eslint-config'
import tseslint from 'typescript-eslint'

export default configApp(
  {
    ignores: [
      'public/**',
      'build/**',
      'resources/**',
      'node_modules/**',
      'tmp/**',
      'storage/**',
      '*.config.js',
      '*.config.cjs',
      '*.config.mjs',
      'eslint.config.js',
      'vite-debug.js',
      'scripts/**/*.js',
      '*.js',
      '!eslint.config.js',
    ],
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: [
          './tsconfig.json',
          './inertia/tsconfig.json'
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },

    rules: {
      //  CỨNG RẮN - Những rule quan trọng nhất
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',  // Nâng từ warn → error để code sạch hơn
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      //  CÂN BẰNG - Quan trọng nhưng linh hoạt
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',

      //  PROMISE HANDLING - Quan trọng cho stability
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'warn',

      //  VÔ HIỆU HÓA - Không cần thiết
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-console': 'off',

      // THÊM - Rules hữu ích cho refactor
      '@typescript-eslint/consistent-type-imports': 'warn',

      // FIX: 'prefer-const' is a core ESLint rule, not a typescript-eslint one.
      'prefer-const': 'warn',
    },
  }
)
