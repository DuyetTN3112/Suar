import { describe, expect, it } from 'vitest'

import {
  getTaskWorkAreaStarter,
  mergeTaskWorkAreaStarter,
} from '@/apps/org/modules/tasks/lib/task_work_area_starters'

describe('task work area starters', () => {
  it('returns work area starter by key', () => {
    const starter = getTaskWorkAreaStarter('authentication')

    expect(starter).toEqual(
      expect.objectContaining({
        key: 'authentication',
        suggestedTaskType: 'feature_development',
      })
    )
  })

  it('fills blank task context fields from work area starter', () => {
    const starter = getTaskWorkAreaStarter('review_dispute')
    if (!starter) {
      throw new Error('Expected review_dispute starter to exist')
    }

    const merged = mergeTaskWorkAreaStarter(
      {
        task_type: '',
        context_background: '',
        acceptance_criteria: '',
        domain_tags_text: '',
        learning_objectives_text: '',
      },
      starter
    )

    expect(merged.task_type).toBe('qa_testing')
    expect(merged.context_background).toContain('review/dispute')
    expect(merged.acceptance_criteria).toContain('Review/dispute flow')
    expect(merged.domain_tags_text).toContain('governance')
    expect(merged.learning_objectives_text).toContain('fairness')
  })
})
