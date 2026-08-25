import { test } from '@japa/runner'

import {
  calculateDeliveryMetrics,
  calculateSkillAggregation,
  calculateYearsOfExperience,
} from '#modules/users/domain/profile/profile_metrics_rules'

test.group('ProfileMetricsRules', () => {
  test('skill aggregation ignores imported-only skill percentages from verified average', ({
    assert,
  }) => {
    const result = calculateSkillAggregation({
      skills: [
        {
          avg_percentage: 84,
          total_reviews: 3,
        },
        {
          avg_percentage: 72,
          total_reviews: 0,
        },
      ],
    })

    assert.deepEqual(result, {
      total_skills: 2,
      reviewed_skills: 1,
      avg_percentage: 84,
    })
  })

  test('delivery metrics keep missing task and estimate evidence unassessed', ({ assert }) => {
    assert.deepEqual(calculateDeliveryMetrics({ assignments: [] }), {
      total_tasks_completed: 0,
      tasks_on_time: 0,
      tasks_late: 0,
      late_percentage: 0,
      estimate_accuracy_percentage: null,
      avg_hours_over_estimate: 0,
    })

    const withoutEstimate = calculateDeliveryMetrics({
      assignments: [
        {
          id: 'assignment-1',
          task_id: 'task-1',
          assignee_id: 'user-1',
          assignment_status: 'completed',
          assigned_at: new Date('2026-07-19T00:00:00.000Z'),
          completed_at: new Date('2026-07-20T00:00:00.000Z'),
          task_due_date: new Date('2026-07-21T00:00:00.000Z'),
          estimated_hours: null,
          actual_hours: null,
        },
      ],
    })

    assert.equal(withoutEstimate.estimate_accuracy_percentage, null)
  })

  test('account age does not claim one year for a new account', ({ assert }) => {
    assert.equal(
      calculateYearsOfExperience({
        account_created_at: new Date('2026-07-01T00:00:00.000Z'),
        current_date: new Date('2026-07-28T00:00:00.000Z'),
      }),
      0
    )
  })
})
