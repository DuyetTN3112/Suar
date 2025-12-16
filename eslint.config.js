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
  ...tseslint.configs.strictTypeChecked, // 🚨 Thêm strict type checked
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
      // 🚨 CỨNG RẮN - Không dùng any/unknown
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // 🚨 UNSAFE OPERATIONS - Nâng lên ERROR để bắt buộc dùng đúng type
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',

      // 🚨 PROMISE HANDLING - Quan trọng cho stability
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/require-await': 'error',

      // 🚨 STRICT TYPE ASSERTIONS
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        {
          assertionStyle: 'as',
          objectLiteralTypeAssertions: 'never',
        },
      ],

      // 🚨 EMPTY TYPES - Không cho phép interface rỗng
      '@typescript-eslint/no-empty-object-type': 'error',

      // 🚨 BASE TO STRING - Đảm bảo objects có đúng string representation
      '@typescript-eslint/no-base-to-string': 'error',

      // 🚨 RESTRICT TEMPLATE EXPRESSIONS - Kiểm soát chặt template strings
      '@typescript-eslint/restrict-template-expressions': 'error',

      // ✅ VÔ HIỆU HÓA - Không cần thiết
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-console': 'off',

      // ✅ THÊM - Rules hữu ích cho refactor
      '@typescript-eslint/consistent-type-imports': 'warn',
      'prefer-const': 'warn',
    },
  }
)
