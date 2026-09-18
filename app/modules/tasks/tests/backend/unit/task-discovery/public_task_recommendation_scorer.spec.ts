import { test } from '@japa/runner'

import { calculateTaskRecommendationScore } from '#modules/tasks/infra/repositories/task-reading/read/public_task_recommendation_scorer'

test.group('Public task recommendation scorer', () => {
  test('calculates priority score without logged-in user', ({ assert }) => {
    const result = calculateTaskRecommendationScore({
      task: {
        id: 'task-1',
        task_type: 'feature',
        business_domain: 'finance',
        problem_category: 'architecture',
        task_visibility: 'all',
        acceptance_criteria: 'Must pass all tests',
        verification_method: 'code_review',
        context_background: 'Refactoring task',
        created_at: new Date(),
      },
      requiredSkills: [],
      currentUserSkills: [],
      workHistory: [],
      trustScore: 0,
      hasApplication: false,
      userId: null,
    })

    // visibilityBoost ('all' = 2) * 2 + contextBoost (1 + 1 + 1 = 3) = 4 + 3 = 7
    assert.equal(result.priorityScore, 7)
    assert.deepEqual(result.recommendationReasons, [])
    assert.isNull(result.evidenceConfidence)
  })

  test('applies application penalty and private visibility boost', ({ assert }) => {
    const result = calculateTaskRecommendationScore({
      task: {
        id: 'task-2',
        task_type: 'bug',
        task_visibility: 'external',
        created_at: new Date(),
      },
      requiredSkills: [],
      currentUserSkills: [],
      workHistory: [],
      trustScore: 0,
      hasApplication: true,
      userId: null,
    })

    // visibilityBoost ('external' = 1) * 2 = 2, contextBoost = 0, hasApplication = -20 => 2 - 20 = -18
    assert.equal(result.priorityScore, -18)
  })
})
