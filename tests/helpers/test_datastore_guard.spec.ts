import { spawnSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'

import { test } from '@japa/runner'

import { assertSafeTestDatastores } from './test_datastore_guard.js'

type EnvPatch = Record<string, string | undefined>

const withEnv = async (patch: EnvPatch, callback: () => Promise<void>): Promise<void> => {
  const previous = new Map<string, string | undefined>()

  for (const [key, value] of Object.entries(patch)) {
    previous.set(key, process.env[key])

    if (value === undefined) {
      delete process.env[key]
      continue
    }

    process.env[key] = value
  }

  try {
    await callback()
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key]
        continue
      }

      process.env[key] = value
    }
  }
}

test.group('Test datastore guard', () => {
  test('safe integration script requires PG_TEST_DATABASE before side effects', ({ assert }) => {
    const isolatedCwd = mkdtempSync(join(tmpdir(), 'suar-no-test-db-'))
    const scriptPath = resolve('scripts/test_integration_safe.sh')

    const result = spawnSync('bash', [scriptPath], {
      cwd: isolatedCwd,
      encoding: 'utf8',
      env: {
        HOME: process.env['HOME'] ?? '',
        PATH: process.env['PATH'] ?? '',
      },
    })

    const output = `${result.stdout}\n${result.stderr}`

    assert.notEqual(result.status, 0)
    assert.include(result.stderr, 'PG_TEST_DATABASE is required')
    assert.notInclude(output, 'db:test:migrate')
    assert.notInclude(output, 'vite build')
  })

  test('rejects unsafe PG_DATABASE names when bypass is not enabled', async ({ assert }) => {
    await withEnv(
      {
        PG_DATABASE: 'suar_development',
        ALLOW_UNSAFE_TEST_DATASTORES: undefined,
        ALLOW_UNSAFE_TEST_DATASTORES_REASON: undefined,
      },
      async () => {
        await assert.rejects(
          () => assertSafeTestDatastores(),
          /PG_DATABASE="suar_development" is not a dedicated test database/
        )
      }
    )
  })

  test('requires and logs a reason when unsafe datastore bypass is enabled', async ({ assert }) => {
    await withEnv(
      {
        PG_DATABASE: 'suar_development',
        ALLOW_UNSAFE_TEST_DATASTORES: 'true',
        ALLOW_UNSAFE_TEST_DATASTORES_REASON: undefined,
      },
      async () => {
        await assert.rejects(
          () => assertSafeTestDatastores(),
          /ALLOW_UNSAFE_TEST_DATASTORES_REASON is required/
        )
      }
    )

    const originalWarn = console.warn
    const warnings: string[] = []
    console.warn = (message?: unknown): void => {
      warnings.push(String(message))
    }

    try {
      await withEnv(
        {
          PG_DATABASE: 'suar_development',
          ALLOW_UNSAFE_TEST_DATASTORES: 'true',
          ALLOW_UNSAFE_TEST_DATASTORES_REASON: 'local smoke against restored dump',
        },
        async () => {
          await assertSafeTestDatastores()
        }
      )
    } finally {
      console.warn = originalWarn
    }

    assert.include(
      warnings.join('\n'),
      'Unsafe datastore bypass enabled: local smoke against restored dump'
    )
  })
})
