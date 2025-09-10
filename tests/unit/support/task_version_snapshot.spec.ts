import { test } from '@japa/runner'

import {
  buildTaskVersionSnapshot,
  hasTaskVersionRelevantChanges,
} from '#actions/tasks/support/task_version_snapshot'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

function makeTaskValues(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: VALID_UUID,
    title: 'Task title',
    description: 'Task description',
    status: 'in_progress',
    label: 'feature',
    priority: 'high',
    difficulty: 'medium',
    assigned_to: VALID_UUID_2,
    due_date: '2026-04-12T00:00:00.000Z',
    parent_task_id: null,
    estimated_time: 8,
    actual_time: 5,
    organization_id: VALID_UUID,
    updated_at: '2026-04-12T00:00:00.000Z',
    ...overrides,
  }
}

test.group('Task version snapshot support', () => {
  test('buildTaskVersionSnapshot reads the persisted pre-update snapshot shape', ({ assert }) => {
    const oldValues = makeTaskValues()

    assert.deepEqual(buildTaskVersionSnapshot(oldValues), {
      task_id: VALID_UUID,
      title: 'Task title',
      description: 'Task description',
      status: 'in_progress',
      label: 'feature',
      priority: 'high',
      difficulty: 'medium',
      assigned_to: VALID_UUID_2,
    })
  })

  test('hasTaskVersionRelevantChanges only reacts to tracked fields', ({ assert }) => {
    const oldValues = makeTaskValues()

    assert.isTrue(
      hasTaskVersionRelevantChanges(oldValues, makeTaskValues({ title: 'Updated title' }))
    )
    assert.isTrue(hasTaskVersionRelevantChanges(oldValues, makeTaskValues({ assigned_to: null })))
    assert.isFalse(
      hasTaskVersionRelevantChanges(oldValues, makeTaskValues({ updated_at: '2026-04-13T00:00:00.000Z' }))
    )
  })

  test('buildTaskVersionSnapshot rejects malformed required snapshot fields', ({ assert }) => {
    assert.throws(() => buildTaskVersionSnapshot(makeTaskValues({ id: null })))
    assert.throws(() => buildTaskVersionSnapshot(makeTaskValues({ title: null })))
    assert.throws(() => buildTaskVersionSnapshot(makeTaskValues({ assigned_to: 123 })))
  })
})
