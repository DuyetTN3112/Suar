import { describe, expect, it } from 'vitest'

import {
  formatTaskVerificationMethodForDisplay,
  parseTaskVerificationMethod,
  serializeTaskVerificationMethod,
} from '@/apps/user/modules/tasks/lib/rules/task_verification_methods'

describe('task verification method helpers', () => {
  it('parses selected and custom verification methods from persisted string', () => {
    expect(
      parseTaskVerificationMethod('code_review\nmanual_qa\ncustom:Pair walkthrough with PM')
    ).toEqual({
      selectedValues: ['code_review', 'manual_qa'],
      customValues: ['Pair walkthrough with PM'],
    })
  })

  it('serializes multiple selections and custom verification methods', () => {
    expect(
      serializeTaskVerificationMethod({
        selectedValues: ['code_review', 'manual_qa'],
        customValues: ['Pair walkthrough with PM'],
      })
    ).toBe('code_review\nmanual_qa\ncustom:Pair walkthrough with PM')
  })

  it('formats persisted verification methods for display', () => {
    expect(
      formatTaskVerificationMethodForDisplay(
        'code_review\nmanual_qa\ncustom:Pair walkthrough with PM'
      )
    ).toEqual(['Code review', 'Manual QA', 'Pair walkthrough with PM'])
  })
})
