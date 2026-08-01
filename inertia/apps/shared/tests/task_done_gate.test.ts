import { describe, expect, it } from 'vitest'

import {
  getTaskDoneGateDecision,
  isDoneCategoryStatus,
  taskHasFinalSubmission,
} from '@/apps/shared/tasks/done_gate'

describe('task done gate decision', () => {
  it('detects every done-category status without remapping non-done columns', () => {
    expect(isDoneCategoryStatus({ value: 'qa_done', category: 'done' })).toBe(true)
    expect(isDoneCategoryStatus({ value: 'done', category: 'in_progress' })).toBe(true)
    expect(isDoneCategoryStatus({ value: 'review', category: 'in_progress' })).toBe(false)
  })

  it('accepts submitted, accepted_for_review and locked submissions as final', () => {
    expect(taskHasFinalSubmission({ review_zone: { submission_status: 'submitted' } })).toBe(true)
    expect(taskHasFinalSubmission({ review_zone: { submission_status: 'accepted_for_review' } })).toBe(true)
    expect(taskHasFinalSubmission({ submission_status: 'locked' })).toBe(true)
    expect(taskHasFinalSubmission({ review_zone: { submission_status: 'draft' } })).toBe(false)
  })

  it('blocks done-category moves without final submission and offers Submit work', () => {
    const decision = getTaskDoneGateDecision({
      task: {
        task_type: 'feature_work',
        review_zone: { submission_status: 'draft' },
      },
      targetStatus: { value: 'ready_for_review', category: 'done' },
    })

    expect(decision).toMatchObject({
      allowed: false,
      code: 'missing_submission',
      action: 'submit_work',
    })
    expect(decision.reason).toContain('Submit work')
  })

  it('allows bypass task types to reach done without a submission', () => {
    for (const taskType of ['research_spike', 'poc', 'prototype', 'technical_writing', 'documentation', 'knowledge_transfer', 'mentoring', 'product_management']) {
      expect(
        getTaskDoneGateDecision({
          task: { task_type: taskType },
          targetStatus: { value: 'done-custom', category: 'done' },
        }).allowed
      ).toBe(true)
    }
  })

  it('checks permission before the submission gate to avoid leaking submission state', () => {
    const decision = getTaskDoneGateDecision({
      task: {
        canChangeStatus: false,
        task_type: 'feature_work',
        review_zone: { submission_status: null },
      },
      targetStatus: { value: 'done-custom', category: 'done' },
    })

    expect(decision).toMatchObject({
      allowed: false,
      code: 'permission_denied',
      action: null,
    })
    expect(decision.reason).not.toMatch(/submission|submit work/i)
  })
})
