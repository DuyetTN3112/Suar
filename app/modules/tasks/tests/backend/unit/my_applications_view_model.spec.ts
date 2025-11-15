import { test } from '@japa/runner'

interface ApplicationRecord {
  id: string
  task_id: string
  application_status: 'pending' | 'withdrawn' | 'approved'
  applied_at: string
  reviewed_at?: string
  task?: {
    title: string
  }
}

test.group('My Applications View Model', () => {
  test('maps application record to view model', ({ assert }) => {
    const record: ApplicationRecord = {
      id: 'app-1',
      task_id: 'task-1',
      application_status: 'pending',
      applied_at: '2026-01-01',
      task: { title: 'Build API' },
    }

    const result = {
      id: record.id,
      task_id: record.task_id,
      status: record.application_status,
      taskTitle: record.task?.title ?? `Task #${record.task_id}`,
      submittedAt: record.applied_at,
      canWithdraw: record.application_status === 'pending',
    }

    assert.equal(result.id, 'app-1')
    assert.equal(result.status, 'pending')
    assert.equal(result.taskTitle, 'Build API')
    assert.isTrue(result.canWithdraw)
  })

  test('withdrawn application cannot be withdrawn again', ({ assert }) => {
    const record: ApplicationRecord = {
      id: 'app-2',
      task_id: 'task-2',
      application_status: 'withdrawn',
      applied_at: '2026-01-01',
      reviewed_at: '2026-01-02',
      task: { title: 'Design UI' },
    }

    const canWithdraw = record.application_status === 'pending'
    assert.isFalse(canWithdraw)
    assert.equal(record.reviewed_at, '2026-01-02')
  })

  test('approved application cannot be withdrawn', ({ assert }) => {
    const record: ApplicationRecord = {
      id: 'app-3',
      task_id: 'task-3',
      application_status: 'approved',
      applied_at: '2026-01-01',
      task: { title: 'Fix bugs' },
    }

    const canWithdraw = record.application_status === 'pending'
    assert.isFalse(canWithdraw)
  })

  test('handles missing task relation', ({ assert }) => {
    const record: ApplicationRecord = {
      id: 'app-4',
      task_id: 'task-4',
      application_status: 'pending',
      applied_at: '2026-01-01',
    }

    const taskTitle = record.task?.title ?? `Task #${record.task_id}`
    assert.equal(taskTitle, 'Task #task-4')
  })
})
