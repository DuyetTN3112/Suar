import { describe, expect, it } from 'vitest'

import {
  getTaskContractPreset,
  inferTaskTypeFromRoleCode,
  mergeTaskContractPreset,
} from '@/apps/user/modules/tasks/lib/rules/task_contract_presets'

describe('task contract presets', () => {
  it('returns preset for supported task type', () => {
    const preset = getTaskContractPreset('feature_development')

    expect(preset).toEqual(
      expect.objectContaining({
        taskType: 'feature_development',
        verificationMethod: 'code_review',
      })
    )
  })

  it('merges preset only into blank contract fields', () => {
    const preset = getTaskContractPreset('bug_fix')
    if (!preset) {
      throw new Error('Expected bug_fix preset to exist')
    }

    const merged = mergeTaskContractPreset(
      {
        task_type: 'bug_fix',
        verification_method: '',
        acceptance_criteria: '',
        context_background: 'Giữ nguyên context riêng',
        domain_tags_text: '',
        learning_objectives_text: '',
      },
      preset
    )

    expect(merged.verification_method).toBe('manual_qa')
    expect(merged.acceptance_criteria).toContain('Bug is reproduced before the fix')
    expect(merged.context_background).toBe('Giữ nguyên context riêng')
    expect(merged.domain_tags_text).toContain('bugfix')
    expect(merged.learning_objectives_text).toContain('Assess debugging skill')
  })

  it('infers task starter type from role code', () => {
    expect(inferTaskTypeFromRoleCode('qa_engineer')).toBe('qa_testing')
    expect(inferTaskTypeFromRoleCode('review_manager')).toBe('code_review')
    expect(inferTaskTypeFromRoleCode('frontend_engineer')).toBe('feature_development')
    expect(inferTaskTypeFromRoleCode('devops_engineer')).toBe('infrastructure')
  })
})
