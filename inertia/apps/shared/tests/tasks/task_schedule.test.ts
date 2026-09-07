import { describe, expect, it } from 'vitest'

import {
  calculateDueDateFromEstimate,
  calculateEstimateFromDueDate,
} from '@/apps/shared/tasks/task_schedule'

describe('task schedule linkage', () => {
  const now = new Date(2026, 1, 18, 18, 0, 0)

  it('moves the due date forward from the current time when hours are entered', () => {
    expect(calculateDueDateFromEstimate(8, now)).toBe('2026-02-19')
  })

  it('converts a selected calendar date into hours from today', () => {
    expect(calculateEstimateFromDueDate('2026-02-20', now)).toBe('48')
  })
})
