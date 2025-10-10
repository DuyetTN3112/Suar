import { test } from '@japa/runner'

import { buildRecordSearchUiEventInput } from '#modules/http/controllers/mappers/request/search_event_request_mapper'

test.group('Unit | Search Event Request Mapper', () => {
  test('preserves safe search telemetry metadata for ranking diagnostics', ({ assert }) => {
    const input = buildRecordSearchUiEventInput({
      eventName: 'search.ui.result_clicked',
      surface: 'search_page',
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
    })

    assert.deepEqual(input.metadata, {
      rank: 2,
      source_label: 'Task description',
      matched_fields: ['description'],
      active_type: 'all',
      active_field: 'Task description',
    })
  })
})
