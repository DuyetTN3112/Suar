import { describe, expect, it } from 'vitest'

import {
  countTaskSkillsByCategory,
  getTaskSkillCategoryViolations,
} from '@/apps/org/modules/tasks/lib/rules/task_skill_category_rules'

describe('task skill category policy', () => {
  it('does not invent missing categories for a relevant-capability task', () => {
    const counts = countTaskSkillsByCategory(['engineering'])

    expect(getTaskSkillCategoryViolations(counts)).toEqual([])
  })
})
