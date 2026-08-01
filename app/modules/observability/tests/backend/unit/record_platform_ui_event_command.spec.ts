import { test } from '@japa/runner'

import RecordPlatformUiEventCommand from '#modules/observability/actions/commands/record_platform_ui_event_command'
import type { PlatformEvent } from '#modules/observability/public_contracts/platform_event'

const FIXED_DATE = new Date('2026-07-23T03:00:00.000Z')

const EVENT_INPUT = {
  eventName: 'notifications.ui.item_clicked',
  module: 'notifications',
  subsystem: 'notification_dropdown',
  workflow: 'notification_dropdown',
  eventFamily: 'ui',
  surface: 'notification_dropdown',
}

const EXECUTION_CONTEXT = {
  userId: 'user-1',
  organizationId: 'org-1',
  ip: '127.0.0.1',
  userAgent: 'unit-test',
}

test.group('Record platform UI event command', () => {
  test('always records operational telemetry without persisting transient events', async ({
    assert,
  }) => {
    const operationalEvents: PlatformEvent[] = []
    const auditEvents: PlatformEvent[] = []
    const command = new RecordPlatformUiEventCommand(
      () => FIXED_DATE,
      {
        log: (_level, event) => operationalEvents.push(event),
      },
      {
        record: (_context, event) => {
          auditEvents.push(event)
          return Promise.resolve()
        },
      }
    )

    await command.execute(EVENT_INPUT, EXECUTION_CONTEXT)

    assert.lengthOf(operationalEvents, 1)
    assert.lengthOf(auditEvents, 0)
    assert.equal(operationalEvents[0]?.occurred_at, FIXED_DATE.toISOString())
    assert.equal(operationalEvents[0]?.severity, 'info')
    assert.equal(operationalEvents[0]?.outcome, 'success')
    assert.equal(operationalEvents[0]?.actor.user_id, 'user-1')
    assert.equal(operationalEvents[0]?.compliance.retention_class, 'transient_runtime')
  })

  test('persists events only when the input requests persistence', async ({ assert }) => {
    const auditEvents: PlatformEvent[] = []
    const command = new RecordPlatformUiEventCommand(
      () => FIXED_DATE,
      { log: () => {} },
      {
        record: (_context, event) => {
          auditEvents.push(event)
          return Promise.resolve()
        },
      }
    )

    await command.execute({ ...EVENT_INPUT, persist: true }, EXECUTION_CONTEXT)

    assert.lengthOf(auditEvents, 1)
    assert.equal(auditEvents[0]?.compliance.retention_class, 'support_trace')
  })

  test('infers failed event semantics and user-input compliance', async ({ assert }) => {
    const operationalEvents: PlatformEvent[] = []
    const command = new RecordPlatformUiEventCommand(
      () => FIXED_DATE,
      {
        log: (_level, event) => operationalEvents.push(event),
      },
      { record: () => Promise.resolve() }
    )

    await command.execute(
      {
        ...EVENT_INPUT,
        eventName: 'search.ui.submit.failed',
        module: 'search',
        subsystem: 'global_search',
        workflow: 'global_search',
        surface: 'search_dialog',
        userInputHash: 'sha256:query',
        userInputLength: 12,
      },
      EXECUTION_CONTEXT
    )

    assert.equal(operationalEvents[0]?.severity, 'warn')
    assert.equal(operationalEvents[0]?.outcome, 'failure')
    assert.isTrue(operationalEvents[0]?.compliance.redaction_applied)
    assert.isTrue(operationalEvents[0]?.compliance.contains_user_input)
  })
})
