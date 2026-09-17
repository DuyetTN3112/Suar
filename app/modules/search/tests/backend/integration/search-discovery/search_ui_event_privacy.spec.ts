import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { makeSystemHttpActionContext } from '#modules/http/actions/http_action_context'
import { platformOperationalLogger } from '#modules/observability/public_contracts/platform_observability'
import RecordSearchUiEventCommand from '#modules/search/actions/commands/search-discovery/record_search_ui_event_command'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'

test.group('Integration | Search UI event privacy boundary', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('does not persist or log caller metadata that can contain private search content', async ({
    assert,
  }) => {
    const actor = await UserFactory.create({ username: 'search_ui_privacy_actor' })
    const privateSearchTerm = 'incident-token-private-search-term'
    const loggedEvents: unknown[] = []
    const originalLog = Reflect.get(platformOperationalLogger, 'log')
    platformOperationalLogger.log = (_level, event) => {
      loggedEvents.push(event)
    }

    try {
      await new RecordSearchUiEventCommand().execute(
        {
          eventName: 'search.ui.submitted',
          surface: 'search_page',
          queryHash: 'safe-query-hash',
          queryTextLength: privateSearchTerm.length,
          resultCounts: { all: 0 },
          metadata: {
            rank: 1,
            query: privateSearchTerm,
            privateSourceWording: 'confidential incident evidence',
            nested: { token: privateSearchTerm },
          },
        },
        makeSystemHttpActionContext(actor.id)
      )
    } finally {
      platformOperationalLogger.log = originalLog
    }

    const audit = (await db
      .from('audit_events')
      .where('user_id', actor.id)
      .where('event_name', 'search.ui.submitted')
      .orderBy('created_at', 'desc')
      .first()) as { new_values: Record<string, unknown> } | null

    assert.isNotNull(audit)
    assert.lengthOf(loggedEvents, 1)
    assert.notInclude(JSON.stringify(audit), privateSearchTerm)
    assert.notInclude(JSON.stringify(loggedEvents[0]), privateSearchTerm)
    assert.notInclude(JSON.stringify(audit), 'confidential incident evidence')
    assert.notInclude(JSON.stringify(loggedEvents[0]), 'confidential incident evidence')
    assert.notProperty(audit?.new_values['change'] ?? {}, 'query')
    assert.notProperty(audit?.new_values['change'] ?? {}, 'privateSourceWording')
    assert.notProperty(audit?.new_values['change'] ?? {}, 'nested')
    assert.equal(
      (audit?.new_values['change'] as Record<string, unknown> | undefined)?.['rank'],
      1
    )
  })
})
