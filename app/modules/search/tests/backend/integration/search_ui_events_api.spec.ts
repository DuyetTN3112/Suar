import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, OrganizationFactory } from '#tests/helpers/factories'

test.group('Integration | Search UI Events API', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('accepts and persists structured search ui telemetry payloads', async ({
    assert,
    client,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()

    const response = await client
      .post('/api/search/events')
      .json({
        eventName: 'search.ui.submitted',
        surface: 'command_menu',
        frontendSubmissionId: 'submission-1',
        queryHash: 'abcd',
        queryTextLength: 9,
        resultCounts: {
          all: 3,
          task: 2,
          project: 1,
        },
      })
      .loginAs(owner)

    response.assertStatus(204)

    const event = (await db
      .from('audit_events')
      .where('user_id', owner.id)
      .where('action', 'search.ui.submitted')
      .where('entity_type', 'search_query')
      .firstOrFail()) as {
      new_values: {
        change?: {
          surface?: string
          query_hash?: string
          query_text_length?: number
          result_counts?: Record<string, number>
        }
        compliance?: {
          redaction_applied?: boolean
        }
      }
    }

    assert.deepInclude(event.new_values.change ?? {}, {
      surface: 'command_menu',
      query_hash: 'abcd',
      query_text_length: 9,
    })
    assert.deepEqual(event.new_values.change?.result_counts, {
      all: 3,
      task: 2,
      project: 1,
    })
    assert.isTrue(event.new_values.compliance?.redaction_applied)
  })
})
