import { spawnSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'

import { test } from '@japa/runner'

import {
  applyTestDatastoreOverrides,
  assertSafeTestDatastores,
  resetTestDatastoreGuardForTests,
} from '../helpers/test_datastore_guard.js'

type EnvPatch = Record<string, string | undefined>

const withEnv = async (patch: EnvPatch, callback: () => Promise<void> | void): Promise<void> => {
  const previous = new Map<string, string | undefined>()
  const effectivePatch: EnvPatch = {
    REDIS_HOST: '127.0.0.1',
    REDIS_PORT: '6379',
    REDIS_DB: '14',
    REDIS_TEST_HOST: '127.0.0.1',
    REDIS_TEST_PORT: '6379',
    REDIS_TEST_DB: '14',
    REDIS_CACHE_HOST: '127.0.0.1',
    REDIS_CACHE_PORT: '6381',
    REDIS_CACHE_DB: '13',
    REDIS_CACHE_TEST_HOST: '127.0.0.1',
    REDIS_CACHE_TEST_PORT: '6381',
    REDIS_CACHE_TEST_DB: '13',
    SUAR_TEST_BASELINE_REDIS_CACHE_CAPTURED: 'true',
    SUAR_TEST_BASELINE_REDIS_CACHE_HOST: '127.0.0.1',
    SUAR_TEST_BASELINE_REDIS_CACHE_PORT: '6380',
    ELASTICSEARCH_ENABLED: 'true',
    ELASTICSEARCH_NODE: 'http://127.0.0.1:9201',
    ELASTICSEARCH_INDEX_PREFIX: 'suar_test_guard_',
    ELASTICSEARCH_TEST_ENABLED: 'true',
    ELASTICSEARCH_TEST_NODE: 'http://127.0.0.1:9201',
    ELASTICSEARCH_TEST_INDEX_PREFIX: 'suar_test_guard_',
    SUAR_TEST_BASELINE_ELASTICSEARCH_NODE_CAPTURED: 'true',
    SUAR_TEST_BASELINE_ELASTICSEARCH_NODE: 'http://127.0.0.1:9200',
    ...patch,
  }
  resetTestDatastoreGuardForTests()

  for (const [key, value] of Object.entries(effectivePatch)) {
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
    resetTestDatastoreGuardForTests()
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

  test('safe integration script requires Elasticsearch test isolation before side effects', ({
    assert,
  }) => {
    const isolatedCwd = mkdtempSync(join(tmpdir(), 'suar-no-test-search-'))
    const scriptPath = resolve('scripts/test_integration_safe.sh')

    const result = spawnSync('bash', [scriptPath], {
      cwd: isolatedCwd,
      encoding: 'utf8',
      env: {
        HOME: process.env['HOME'] ?? '',
        PATH: process.env['PATH'] ?? '',
        PG_TEST_DATABASE: 'suar_test',
      },
    })

    const output = `${result.stdout}\n${result.stderr}`

    assert.notEqual(result.status, 0)
    assert.include(result.stderr, 'ELASTICSEARCH_TEST_NODE is required')
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

  test('applies explicit Redis test databases before application boot', async ({ assert }) => {
    await withEnv(
      {
        PG_DATABASE: 'suar_test',
        PG_TEST_DATABASE: 'suar_test',
        REDIS_DB: '0',
        REDIS_CACHE_DB: '0',
        REDIS_TEST_DB: '14',
        REDIS_CACHE_TEST_DB: '13',
      },
      () => {
        applyTestDatastoreOverrides()

        assert.equal(process.env['REDIS_DB'], '14')
        assert.equal(process.env['REDIS_CACHE_DB'], '13')
      }
    )
  })

  test('maps Elasticsearch tests onto the dedicated endpoint and prefix', async ({ assert }) => {
    await withEnv(
      {
        PG_DATABASE: 'suar_test',
        PG_TEST_DATABASE: 'suar_test',
        REDIS_TEST_DB: '14',
        REDIS_CACHE_TEST_DB: '13',
        ELASTICSEARCH_NODE: 'http://127.0.0.1:9200',
        ELASTICSEARCH_INDEX_PREFIX: 'suar_',
        ELASTICSEARCH_TEST_NODE: 'http://127.0.0.1:9201',
        ELASTICSEARCH_TEST_INDEX_PREFIX: 'suar_test_isolated_',
      },
      async () => {
        applyTestDatastoreOverrides()

        assert.equal(process.env['ELASTICSEARCH_NODE'], 'http://127.0.0.1:9201')
        assert.equal(process.env['ELASTICSEARCH_INDEX_PREFIX'], 'suar_test_isolated_')
        await assertSafeTestDatastores()
      }
    )
  })

  test('rejects Elasticsearch endpoint aliases that resolve to development', async ({ assert }) => {
    await withEnv(
      {
        PG_DATABASE: 'suar_test',
        PG_TEST_DATABASE: 'suar_test',
        REDIS_TEST_DB: '14',
        REDIS_CACHE_TEST_DB: '13',
        ELASTICSEARCH_NODE: 'http://127.0.0.1:9200',
        ELASTICSEARCH_TEST_NODE: 'http://LOCALHOST.:09200',
      },
      async () => {
        applyTestDatastoreOverrides()
        await assert.rejects(
          () => assertSafeTestDatastores(),
          /physically separate endpoint from the configured development search plane/
        )
      }
    )
  })

  test('rejects an Elasticsearch prefix without explicit test ownership', async ({ assert }) => {
    await withEnv(
      {
        PG_DATABASE: 'suar_test',
        PG_TEST_DATABASE: 'suar_test',
        REDIS_TEST_DB: '14',
        REDIS_CACHE_TEST_DB: '13',
        ELASTICSEARCH_TEST_INDEX_PREFIX: 'suar_',
      },
      async () => {
        applyTestDatastoreOverrides()
        await assert.rejects(
          () => assertSafeTestDatastores(),
          /must be a bounded test-only prefix without wildcards/
        )
      }
    )
  })

  test('rejects Redis test targets that resolve to configured development planes', async ({
    assert,
  }) => {
    await withEnv(
      {
        PG_DATABASE: 'suar_test',
        REDIS_HOST: '127.0.0.1',
        REDIS_PORT: '6379',
        REDIS_DB: '0',
        REDIS_TEST_DB: '0',
        REDIS_CACHE_HOST: '127.0.0.1',
        REDIS_CACHE_PORT: '6380',
        REDIS_CACHE_DB: '0',
        REDIS_CACHE_TEST_DB: '0',
        ALLOW_UNSAFE_TEST_DATASTORES: undefined,
        ALLOW_UNSAFE_TEST_DATASTORES_REASON: undefined,
      },
      async () => {
        await assert.rejects(
          () => assertSafeTestDatastores(),
          /configured non-test main Redis data plane/
        )
      }
    )
  })

  test('rejects a cache test DB on the same physical endpoint as development cache', async ({
    assert,
  }) => {
    await withEnv(
      {
        PG_DATABASE: 'suar_test',
        PG_TEST_DATABASE: 'suar_test',
        REDIS_HOST: '127.0.0.1',
        REDIS_PORT: '6379',
        REDIS_DB: '0',
        REDIS_TEST_HOST: '127.0.0.1',
        REDIS_TEST_PORT: '6379',
        REDIS_TEST_DB: '14',
        REDIS_CACHE_HOST: '127.0.0.1',
        REDIS_CACHE_PORT: '6380',
        REDIS_CACHE_DB: '0',
        REDIS_CACHE_TEST_HOST: '127.0.0.1',
        REDIS_CACHE_TEST_PORT: '6380',
        REDIS_CACHE_TEST_DB: '15',
        ALLOW_UNSAFE_TEST_DATASTORES: undefined,
        ALLOW_UNSAFE_TEST_DATASTORES_REASON: undefined,
      },
      async () => {
        applyTestDatastoreOverrides()
        await assert.rejects(
          () => assertSafeTestDatastores(),
          /physically separate host\/port from the configured development cache plane/
        )
      }
    )
  })

  test('rejects cache test endpoint aliases that hide the development cache process', async ({
    assert,
  }) => {
    await withEnv(
      {
        PG_DATABASE: 'suar_test',
        PG_TEST_DATABASE: 'suar_test',
        REDIS_HOST: '127.0.0.1',
        REDIS_PORT: '6379',
        REDIS_DB: '0',
        REDIS_TEST_HOST: '127.0.0.1',
        REDIS_TEST_PORT: '6379',
        REDIS_TEST_DB: '14',
        REDIS_CACHE_HOST: '127.0.0.1',
        REDIS_CACHE_PORT: '6380',
        REDIS_CACHE_DB: '0',
        REDIS_CACHE_TEST_HOST: 'LOCALHOST.',
        REDIS_CACHE_TEST_PORT: '06380',
        REDIS_CACHE_TEST_DB: '15',
        ALLOW_UNSAFE_TEST_DATASTORES: undefined,
        ALLOW_UNSAFE_TEST_DATASTORES_REASON: undefined,
      },
      async () => {
        applyTestDatastoreOverrides()
        await assert.rejects(
          () => assertSafeTestDatastores(),
          /physically separate host\/port from the configured development cache plane/
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
