import { test } from '@japa/runner'

import { DomainEventProjectLifecycleEventStagerAdapter } from '#composition/adapters/events/domain_event_project_lifecycle_event_stager_adapter'
import { buildDomainEventId } from '#modules/events/public_contracts/domain_event_identity'
import type { StageDomainEventInput } from '#modules/events/public_contracts/domain_event_outbox'

test.group('Project lifecycle durable outbox staging', () => {
  test('builds a stable identity and stages the bounded event on the caller transaction', async ({
    assert,
  }) => {
    const transaction = { rawQuery: () => Promise.resolve() }
    const staged: StageDomainEventInput[] = []
    const input = {
      mutationId: '8bb3ff6e-69b0-4c07-a824-acde30ef4a2f',
      action: 'created' as const,
      projectId: 'project-1',
      organizationId: 'org-1',
      actorId: 'user-1',
      projectName: 'Enterprise Platform',
      occurredAt: '2026-07-26T10:00:00.000Z',
    }

    await new DomainEventProjectLifecycleEventStagerAdapter(
      (trx, event) => {
        assert.strictEqual(trx, transaction)
        staged.push(event)
        return Promise.resolve({ id: 'outbox-1', staged: true })
      }
    ).stage(input, transaction)
    await new DomainEventProjectLifecycleEventStagerAdapter(
      (_trx, event) => {
        staged.push(event)
        return Promise.resolve({ id: 'outbox-1', staged: false })
      }
    ).stage(input, transaction)

    assert.lengthOf(staged, 2)
    assert.deepEqual(staged[0], staged[1])
    const first = staged[0]
    if (!first || first.eventName !== 'project:lifecycle:changed:v1') {
      assert.fail('Expected a project lifecycle outbox event')
      return
    }
    assert.equal(first.aggregateType, 'project')
    assert.equal(first.aggregateId, 'project-1')
    assert.equal(first.dedupeKey, first.payload.eventId)
  })

  test('domain event identity is stable but separated by mutation identity', ({ assert }) => {
    const base = {
      eventName: 'project:lifecycle:changed:v1',
      aggregateId: 'project-1',
    }
    const created = buildDomainEventId({
      ...base,
      businessEventId: 'mutation-1',
    })
    assert.equal(
      created,
      buildDomainEventId({
        ...base,
        businessEventId: 'mutation-1',
      })
    )
    assert.notEqual(
      created,
      buildDomainEventId({
        ...base,
        businessEventId: 'mutation-2',
      })
    )
    assert.match(created, /^[0-9a-f-]{36}$/)
  })
})
