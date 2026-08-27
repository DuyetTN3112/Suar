import { spawnSync } from 'node:child_process'

import { test } from '@japa/runner'

test.group('Database configuration', () => {
  test('uses PG_TEST_DATABASE for NODE_ENV=test even when PG_DATABASE is set', ({ assert }) => {
    const result = spawnSync(
      process.execPath,
      [
        '--import=@poppinss/ts-exec',
        '--input-type=module',
        '-e',
        "const { default: config } = await import('./config/database.ts'); console.log(config.connections.pg.connection.database)",
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          NODE_ENV: 'test',
          PG_DATABASE: 'suar',
          PG_TEST_DATABASE: 'suar_test',
        },
      }
    )

    assert.equal(result.status, 0)
    assert.equal(result.stdout.trim(), 'suar_test')
  })

  test('accepts the test runner overriding PG_DATABASE to the dedicated test database', ({ assert }) => {
    const result = spawnSync(
      process.execPath,
      [
        '--import=@poppinss/ts-exec',
        '--input-type=module',
        '-e',
        "const { default: config } = await import('./config/database.ts'); console.log(config.connections.pg.connection.database)",
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          NODE_ENV: 'test',
          PG_DATABASE: 'suar_test',
          PG_TEST_DATABASE: 'suar_test',
        },
      }
    )

    assert.equal(result.status, 0)
    assert.equal(result.stdout.trim(), 'suar_test')
  })
})
