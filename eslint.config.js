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

      // Config files (JS)
      '*.config.js',
      '*.config.cjs',
      '*.config.mjs',
      'eslint.config.js',

      // Build/Debug scripts
      'vite-debug.js',
      'scripts/**/*.js',

      // Bất kỳ .js file nào ở root
      '*.js',
      '!eslint.config.js',
    ],
  },
  // 1️ Bật Type-Checked Rules (quan trọng nhất!)
  ...tseslint.configs.recommendedTypeChecked,

  // 2️ Cấu hình parser để đọc 2 tsconfig
  {
    languageOptions: {
      parserOptions: {
        // Chỉ định CẢ 2 file tsconfig.json
        project: [
          './tsconfig.json',         // Backend (AdonisJS)
          './inertia/tsconfig.json'  // Frontend (Inertia/React)
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },

    //  Quy tắc giống hệt Nest.js
    rules: {
      //  BẮT BUỘC - Cấm dùng any
      '@typescript-eslint/no-explicit-any': 'error',

      //  Tắt các rule type-unsafe (giống Nest.js)
      // recommendedTypeChecked bật chúng lên, ta tắt lại để giống thói quen
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'error',

      //  Giữ một số rule quan trọng ở mức warn
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      'no-console': 'off',
    },
  }
)
