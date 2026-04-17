import { test } from '@japa/runner'

import { calculateSkillAggregation } from '#modules/users/domain/profile_metrics_rules'

test.group('ProfileMetricsRules', () => {
  test('skill aggregation ignores imported-only skill percentages from verified average', ({
    assert,
  }) => {
    const result = calculateSkillAggregation({
      skills: [
        {
          skill_id: 'skill-reviewed',
          skill_name: 'TypeScript',
          verified_public_proficiency_code: 'l8',
          avg_percentage: 84,
          total_reviews: 3,
          category_code: 'technology',
        },
        {
          skill_id: 'skill-imported',
          skill_name: 'Svelte',
          verified_public_proficiency_code: 'l7',
          avg_percentage: 72,
          total_reviews: 0,
          category_code: 'technology',
        },
      ],
    })

    assert.deepEqual(result, {
      total_skills: 2,
      reviewed_skills: 1,
      avg_percentage: 84,
    })
  })
})
