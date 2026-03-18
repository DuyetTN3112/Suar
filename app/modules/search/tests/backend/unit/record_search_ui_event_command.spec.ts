import { test } from '@japa/runner'

import { makeSystemHttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type { PlatformEvent } from '#modules/observability/public_contracts/platform_event'
import { platformOperationalLogger } from '#modules/observability/public_contracts/platform_observability'
import RecordSearchUiEventCommand from '#modules/search/actions/commands/record_search_ui_event_command'

test.group('Unit | Record Search UI Event Command', () => {
  test('copies search ranking metadata into platform event change payload', async ({ assert }) => {
    const loggedEvents: PlatformEvent[] = []
    const originalLog = Reflect.get(platformOperationalLogger, 'log')
    platformOperationalLogger.log = (_level, event) => {
      loggedEvents.push(event)
    }

    try {
      await new RecordSearchUiEventCommand().execute(
        {
          eventName: 'search.ui.filter_applied',
          surface: 'search_page',
          queryTextLength: 5,
          resultCounts: { all: 3, task: 1 },
          entityType: 'task',
          entityId: 'task-1',
          metadata: {
            rank: 2,
            source_label: 'Task description',
            matched_fields: ['description'],
            active_type: 'all',
            active_field: 'Task description',
          },
        },
        makeSystemHttpActionContext('system-user')
      )
    } finally {
      platformOperationalLogger.log = originalLog
    }

    assert.deepInclude(loggedEvents[0]?.change, {
      result_counts: { all: 3, task: 1 },
      rank: 2,
      source_label: 'Task description',
      matched_fields: ['description'],
      active_type: 'all',
      active_field: 'Task description',
    })
  })
})
