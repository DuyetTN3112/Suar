import { test } from '@japa/runner'

import {
  canStartProjectSprint,
  classifySprintTaskOutcome,
  normalizeBacklogRank,
} from '#modules/sprints/domain/project-backlog/product_backlog_rules'

test.group('Product backlog rules', () => {
  test('classifies completed, cancelled, rejected, and incomplete task outcomes', ({ assert }) => {
    assert.equal(classifySprintTaskOutcome({ statusCategory: 'done' }), 'historical_done')
    assert.equal(classifySprintTaskOutcome({ statusCategory: 'cancelled' }), 'historical_cancelled')
    assert.equal(classifySprintTaskOutcome({ statusCategory: 'rejected' }), 'historical_rejected')
    assert.equal(classifySprintTaskOutcome({ statusCategory: 'todo' }), 'requires_destination')
    assert.equal(
      classifySprintTaskOutcome({ statusCategory: 'in_progress' }),
      'requires_destination'
    )
    assert.equal(
      classifySprintTaskOutcome({ statusCategory: 'unknown' }),
      'requires_destination'
    )
  })

  test('allows only a valid manager-controlled draft sprint to start', ({ assert }) => {
    const valid = canStartProjectSprint({
      currentStatus: 'draft',
      activeSprintCount: 0,
      actorCanManageSprint: true,
      startsAt: new Date('2026-08-10T00:00:00.000Z'),
      endsAt: new Date('2026-08-11T00:00:00.000Z'),
    })
    assert.isTrue(valid.allowed)

    assert.isFalse(
      canStartProjectSprint({ ...validInput(), actorCanManageSprint: false }).allowed
    )
    assert.isFalse(canStartProjectSprint({ ...validInput(), currentStatus: 'active' }).allowed)
    assert.isFalse(canStartProjectSprint({ ...validInput(), activeSprintCount: 1 }).allowed)
    assert.isFalse(
      canStartProjectSprint({
        ...validInput(),
        endsAt: new Date('2026-08-09T00:00:00.000Z'),
      }).allowed
    )
  })

  test('normalizes backlog rank to a finite non-negative number', ({ assert }) => {
    assert.equal(normalizeBacklogRank(12), 12)
    assert.equal(normalizeBacklogRank('4.5'), 4.5)
    assert.equal(normalizeBacklogRank(-3), 0)
    assert.equal(normalizeBacklogRank('not-a-rank'), 0)
  })
})

function validInput() {
  return {
    currentStatus: 'draft' as const,
    activeSprintCount: 0,
    actorCanManageSprint: true,
    startsAt: new Date('2026-08-10T00:00:00.000Z'),
    endsAt: new Date('2026-08-11T00:00:00.000Z'),
  }
}
