import { test } from '@japa/runner'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  assertCreateProjectSprintStatus,
  buildProjectSprintUpdateAttributes,
  normalizeProjectSprintGoal,
  normalizeProjectSprintName,
  parseProjectSprintSchedule,
} from '#modules/sprints/domain/project_sprint_policy'

function captureThrown(run: () => void): unknown {
  try {
    run()
    return null
  } catch (error) {
    return error
  }
}

test.group('Project sprint input', () => {
  test('normalizes sprint names and optional goals', ({ assert }) => {
    assert.equal(normalizeProjectSprintName('  Sprint 7  '), 'Sprint 7')
    assert.equal(normalizeProjectSprintGoal('  Ship onboarding  '), 'Ship onboarding')
    assert.isNull(normalizeProjectSprintGoal('   '))
    assert.isNull(normalizeProjectSprintGoal(null))
  })

  test('rejects invalid creation status and schedule', ({ assert }) => {
    const invalidStatus = captureThrown(() => assertCreateProjectSprintStatus('review_open'))
    const invalidSchedule = captureThrown(() =>
      parseProjectSprintSchedule('2026-07-30T00:00:00.000Z', '2026-07-16T00:00:00.000Z')
    )

    assert.instanceOf(invalidStatus, ValidationException)
    assert.equal((invalidStatus as ValidationException).status, 422)
    assert.instanceOf(invalidSchedule, ValidationException)
  })

  test('builds a normalized update while enforcing lifecycle transitions', ({ assert }) => {
    const updates = buildProjectSprintUpdateAttributes(
      {
        name: '  Delivery Sprint  ',
        goal: '  Reduce cycle time  ',
        status: 'active',
      },
      {
        starts_at: '2026-07-16T00:00:00.000Z',
        ends_at: '2026-07-30T00:00:00.000Z',
        status: 'draft',
      }
    )

    assert.deepEqual(updates, {
      name: 'Delivery Sprint',
      goal: 'Reduce cycle time',
      status: 'active',
    })

    const transitionConflict = captureThrown(() =>
      buildProjectSprintUpdateAttributes(
        { status: 'review_closed' },
        {
          starts_at: '2026-07-16T00:00:00.000Z',
          ends_at: '2026-07-30T00:00:00.000Z',
          status: 'draft',
        }
      )
    )
    assert.instanceOf(transitionConflict, ConflictException)
    assert.equal((transitionConflict as ConflictException).status, 409)
  })

  test('distinguishes invalid request values from corrupt persisted sprint state', ({ assert }) => {
    const invalidRequest = captureThrown(() =>
      buildProjectSprintUpdateAttributes(
        { starts_at: 'not-an-iso-date' },
        {
          starts_at: '2026-07-16T00:00:00.000Z',
          ends_at: '2026-07-30T00:00:00.000Z',
          status: 'draft',
        }
      )
    )
    const invalidPersistedDate = captureThrown(() =>
      buildProjectSprintUpdateAttributes(
        { goal: 'still valid' },
        {
          starts_at: 'persisted-corruption',
          ends_at: '2026-07-30T00:00:00.000Z',
          status: 'draft',
        }
      )
    )
    const invalidPersistedStatus = captureThrown(() =>
      buildProjectSprintUpdateAttributes(
        { goal: 'still valid' },
        {
          starts_at: '2026-07-16T00:00:00.000Z',
          ends_at: '2026-07-30T00:00:00.000Z',
          status: 'corrupt' as 'draft',
        }
      )
    )

    assert.instanceOf(invalidRequest, ValidationException)
    assert.instanceOf(invalidPersistedDate, PersistedDataIntegrityException)
    assert.equal((invalidPersistedDate as PersistedDataIntegrityException).status, 500)
    assert.instanceOf(invalidPersistedStatus, PersistedDataIntegrityException)
  })
})
