import { test } from '@japa/runner'

import type { ProjectLifecycleChangedOutboxPayload } from '#modules/events/domain/domain_event_outbox'
import {
  dispatchProjectLifecycleChanged,
  type ProjectLifecycleDispatchDependencies,
} from '#modules/events/infra/adapters/adonis_domain_event_dispatcher'

const baseEvent: ProjectLifecycleChangedOutboxPayload = {
  eventId: '4bb40a33-f683-5c80-a178-c46af83f17ab',
  action: 'created',
  projectId: 'project-1',
  organizationId: 'org-1',
  actorId: 'user-1',
  projectName: 'Enterprise Platform',
  occurredAt: '2026-07-26T10:00:00.000Z',
}

function dependencies(
  overrides: Partial<ProjectLifecycleDispatchDependencies> = {}
): ProjectLifecycleDispatchDependencies {
  return {
    emitStrict: () => Promise.resolve(),
    emitCompatibility: () => Promise.resolve(),
    reportCompatibilityFailure: () => undefined,
    ...overrides,
  }
}

test.group('Project lifecycle durable dispatcher', () => {
  test('does not emit compatibility events when strict delivery fails', async ({
    assert,
  }) => {
    let compatibilityCalls = 0
    await assert.rejects(
      () =>
        dispatchProjectLifecycleChanged(
          baseEvent,
          { signal: new AbortController().signal, sequence: 41 },
          dependencies({
            emitStrict: () => Promise.reject(new Error('strict delivery failed')),
            emitCompatibility: () => {
              compatibilityCalls += 1
              return Promise.resolve()
            },
          })
        ),
      /strict delivery failed/
    )
    assert.equal(compatibilityCalls, 0)
  })

  test('checks lease cancellation between strict and compatibility delivery', async ({
    assert,
  }) => {
    const controller = new AbortController()
    let compatibilityCalls = 0
    await assert.rejects(
      () =>
        dispatchProjectLifecycleChanged(
          baseEvent,
          { signal: controller.signal, sequence: 42 },
          dependencies({
            emitStrict: () => {
              controller.abort(new Error('lease lost'))
              return Promise.resolve()
            },
            emitCompatibility: () => {
              compatibilityCalls += 1
              return Promise.resolve()
            },
          })
        ),
      /lease lost/
    )
    assert.equal(compatibilityCalls, 0)
  })

  test('isolates best-effort compatibility failures after strict delivery', async ({
    assert,
  }) => {
    const reported: unknown[] = []
    await dispatchProjectLifecycleChanged(
      baseEvent,
      { signal: new AbortController().signal, sequence: 43 },
      dependencies({
        emitCompatibility: () => Promise.reject(new Error('cache unavailable')),
        reportCompatibilityFailure: (_event, error) => {
          reported.push(error)
        },
      })
    )
    assert.lengthOf(reported, 1)
  })

  test('maps every lifecycle action to one bounded compatibility event', async ({
    assert,
  }) => {
    const emitted: Array<{ eventName: string; payload: unknown }> = []
    for (const event of [
      baseEvent,
      { ...baseEvent, action: 'updated' as const, projectName: null },
      { ...baseEvent, action: 'deleted' as const, projectName: null },
    ]) {
      await dispatchProjectLifecycleChanged(
        event,
        { signal: new AbortController().signal, sequence: 44 },
        dependencies({
          emitCompatibility: (compatibilityEvent) => {
            emitted.push(compatibilityEvent)
            return Promise.resolve()
          },
        })
      )
    }

    assert.deepEqual(
      emitted.map((event) => event.eventName),
      ['project:created', 'project:updated', 'project:deleted']
    )
    assert.equal(emitted.length, 3)
  })
})
