import { test } from '@japa/runner'

import User from '#modules/users/infra/models/user'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'

test.group('Integration | Testing Routes Safety', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('health reports the connected database name', async ({ assert, client }) => {
    const response = await client.get('/api/testing/health')

    response.assertStatus(200)

    const body = response.body() as { data: { status: string; database: string | null } }
    assert.equal(body.data.status, 'ok')
    assert.isString(body.data.database)
  })

  test('seed cleanup removes E2E-created rows by timestamp token', async ({ assert, client }) => {
    const timestamp = Date.now()
    const nonce = 'cleanup'

    const seedResponse = await client.post('/api/testing/seed-project-member-flow').form({
      timestamp,
      nonce,
    })
    seedResponse.assertStatus(201)

    const seedBody = seedResponse.body() as {
      data: { ownerEmail: string; memberEmail: string; candidateEmail: string }
    }
    const seededEmails = [
      seedBody.data.ownerEmail,
      seedBody.data.memberEmail,
      seedBody.data.candidateEmail,
    ]

    const beforeCleanup = await User.query().whereIn('email', seededEmails)
    assert.isAbove(beforeCleanup.length, 0)

    const cleanupResponse = await client.post('/api/testing/seed-cleanup').form({ timestamp })
    cleanupResponse.assertStatus(200)

    const body = cleanupResponse.body() as {
      data: { deleted: Record<string, number>; tokens: string[] }
    }
    assert.include(body.data.tokens, String(timestamp))
    assert.isAtLeast(body.data.deleted['users'] ?? 0, beforeCleanup.length)

    const afterCleanup = await User.query().whereIn('email', seededEmails)
    assert.lengthOf(afterCleanup, 0)
  })
})
