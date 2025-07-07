// @ts-check
import { configApp } from '@adonisjs/eslint-config'
import tseslint from 'typescript-eslint'
import importXPlugin from 'eslint-plugin-import-x'
import sveltePlugin from 'eslint-plugin-svelte'
import svelteParser from 'svelte-eslint-parser'
import * as svelteConfig from 'eslint-plugin-svelte'

export default configApp(
  // Argument đầu tiên cho configApp — giữ để configApp biết cần ignore gì
  {
    ignores: [
      '**/node_modules/**',
      '.adonisjs/**',
      'public/**',
      'build/**',
      'resources/**',
      'node_modules/**',
      'tmp/**',
      'storage/**',
      'database/schema.ts',
      '*.config.js',
      '*.config.cjs',
      '*.config.mjs',
      'vite-debug.js',
      'scripts/**/*.js',
      '*.js',
    ],
  },

  // ✅ GLOBAL IGNORES — standalone object không có key nào khác ngoài `ignores`
  // Đây là cách ESLint flat config yêu cầu để ignore có hiệu lực TOÀN CỤC,
  // bao gồm cả node_modules. Nếu đặt trong object có `files` hoặc `rules`
  // thì nó chỉ là ignore cục bộ, không ngăn được ESLint traverse vào node_modules.
  {
    ignores: [
      '**/node_modules/**',
      '.adonisjs/**',
      'public/**',
      'build/**',
      'resources/**',
      'tmp/**',
      'storage/**',
      'database/schema.ts',
      '*.config.js',
      '*.config.cjs',
      '*.config.mjs',
      'vite-debug.js',
      'scripts/**/*.js',
      '*.js',
    ],
  },

  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Config chính cho toàn bộ TypeScript (backend + root level)
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'import-x': importXPlugin,
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
      // Cho phép number và boolean vì đây là use case an toàn và phổ biến
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true,
          allowBoolean: true,
          allowNullish: false,
          allowAny: false,
        },
      ],

      // ⚠️ DEPRECATED APIs - Warning để có thời gian migrate
      '@typescript-eslint/no-deprecated': 'warn',

      // 🚨 PROBE RULE - Disable because of crash in current version
      '@typescript-eslint/no-useless-default-assignment': 'off',

      // ✅ VÔ HIỆU HÓA - Không cần thiết
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'prettier/prettier': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // ✅ THÊM - Rules hữu ích cho refactor
      '@typescript-eslint/consistent-type-imports': 'error',
      'prefer-const': 'error',
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE', 'PascalCase'],
        },
      ],
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          pathGroups: [
            { pattern: '#**', group: 'internal', position: 'before' },
            { pattern: '@/**', group: 'internal', position: 'before' },
            { pattern: '$lib/**', group: 'internal', position: 'before' },
            { pattern: '~/**', group: 'internal', position: 'before' },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
        },
      ],
      'import-x/no-duplicates': 'error',
      'import-x/no-cycle': [
        'warn',
        {
          ignoreExternal: true,
          maxDepth: 1,
        },
      ],
    },
  },

  // Override cho inertia TypeScript — dùng inertia/tsconfig.json thay vì root
  {
    files: ['inertia/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./inertia/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // 📁 OVERRIDE cho folder config/ - AdonisJS module augmentation pattern
  {
    files: ['config/**/*.ts'],
    rules: {
      // AdonisJS sử dụng empty interfaces để mở rộng types (module augmentation)
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },

  {
    files: ['types/**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // 📁 OVERRIDE cho BACKEND - Relax một số rules phức tạp
  {
    files: ['app/**/*.ts', 'bin/**/*.ts', 'start/**/*.ts'],
    rules: {
      // Allow enum comparison với string (common pattern in AdonisJS)
      '@typescript-eslint/no-unsafe-enum-comparison': 'warn',
      // Relax catch variable type - có thể dùng Error thay vì unknown
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'error',
      // Allow String() conversion khi cần stringify
      '@typescript-eslint/no-unnecessary-type-conversion': 'warn',
      // Deprecated warnings OK cho backend
      '@typescript-eslint/no-deprecated': 'warn',
    },
  },

  {
    files: ['tests/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // 📁 OVERRIDE cho .svelte files - Svelte 5 specific với strict checking
  // ✅ Thu hẹp glob từ `**/*.svelte` xuống `inertia/**/*.svelte` — quan trọng!
  // Glob `**/*.svelte` quá rộng, có thể match file trong node_modules nếu
  // global ignores chưa được xử lý trước. `inertia/**` chính xác và an toàn hơn.
  {
    files: ['inertia/**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.svelte'],
        // ✅ FIX CHÍNH — khai báo đúng tsconfig cho svelte files
        // Nếu không có dòng này, ESLint kế thừa project từ block cha phía trên
        // (cái block đang trỏ vào ./tsconfig.json), và root tsconfig không include
        // các file .svelte nên TypeScript từ chối parse → gây ra hàng trăm lỗi
        // "TSConfig does not include this file"
        project: ['./inertia/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
        svelteFeatures: {
          experimentalGenerics: true, // Svelte 5 generics
        },
      },
    },
    plugins: {
      svelte: sveltePlugin,
    },
    rules: {
      // Svelte plugin recommended rules
      ...svelteConfig.configs.recommended.rules,

      // Svelte-specific rules - STRICT
      'svelte/no-at-html-tags': 'error',
      'svelte/no-dom-manipulating': 'error',
      'svelte/no-dupe-else-if-blocks': 'error',
      'svelte/no-dupe-style-properties': 'error',
      'svelte/no-dupe-use-directives': 'error',
      'svelte/no-dynamic-slot-name': 'error',
      'svelte/no-export-load-in-svelte-module-in-kit-pages': 'error',
      'svelte/no-inner-declarations': 'error',
      'svelte/no-not-function-handler': 'error',
      'svelte/no-object-in-text-mustaches': 'error',
      'svelte/no-reactive-reassign': 'error',
      'svelte/no-shorthand-style-property-overrides': 'error',
      'svelte/no-store-async': 'error',
      'svelte/no-unknown-style-directive-property': 'error',
      'svelte/no-unused-class-name': 'off',
      'svelte/no-unused-svelte-ignore': 'error',
      'svelte/no-useless-mustaches': 'warn',
      'svelte/require-store-callbacks-use-set-param': 'error',
      'svelte/require-store-reactive-access': 'error',
      'svelte/valid-compile': 'error',

      // TypeScript rules for Svelte - KEEP STRICT
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-explicit-any': 'error',

      // Svelte 5 runes - allow let for props
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_|^\\$props$|^\\$state$|^\\$derived$|^\\$effect$',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // 📁 OVERRIDE cho .svelte.ts files - Svelte 5 module context
  {
    files: ['inertia/**/*.svelte.ts', 'inertia/**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        project: ['./inertia/tsconfig.json', './tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // These are module context files, apply normal TS rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
    },
  }
)
