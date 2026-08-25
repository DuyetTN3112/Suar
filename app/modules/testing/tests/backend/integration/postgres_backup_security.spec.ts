import { existsSync, readFileSync, rmSync, statSync } from 'node:fs'
import { dirname } from 'node:path'

import { test } from '@japa/runner'

import { createPostgresBackup } from '../../../../../seed/demo_data/postgres_backup.js'

import UserOAuthProvider from '#modules/auth/infra/models/social-auth/user_oauth_provider'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'

test.group('Integration | PostgreSQL backup security', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('redacts OAuth credentials while retaining the provider record', async ({ assert }) => {
    const marker = `backup-oauth-provider-${Date.now()}`
    const accessToken = `gho_${'a'.repeat(36)}`
    const refreshToken = `refresh-${'b'.repeat(40)}`
    const user = await UserFactory.create()

    await UserOAuthProvider.create({
      user_id: user.id,
      provider: 'github',
      provider_id: marker,
      email: user.email,
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    const backupPath = await createPostgresBackup({
      logger: {
        info: () => {},
        warning: () => {},
      },
    })

    try {
      const backup = readFileSync(backupPath, 'utf8')

      assert.include(backup, marker)
      assert.notInclude(backup, accessToken)
      assert.notInclude(backup, refreshToken)
      assert.equal(statSync(backupPath).mode & 0o777, 0o600)
      assert.equal(statSync(dirname(backupPath)).mode & 0o777, 0o700)
    } finally {
      if (existsSync(backupPath)) {
        rmSync(backupPath)
      }
    }
  })
})
