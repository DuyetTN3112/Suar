import { describe, expect, it } from 'vitest'

import {
  createEmptyTaskBrief,
  isTaskBriefV2,
} from '@/apps/shared/tasks/task_brief_contract'

describe('TaskBriefV2', () => {
  it('accepts the complete empty shape used by a new Task form', () => {
    expect(isTaskBriefV2(createEmptyTaskBrief())).toBe(true)
  })

  it('rejects an incomplete or malformed saved rich-content value', () => {
    expect(isTaskBriefV2({
      schemaVersion: 'suar.task_brief.v2',
      workItems: [],
      scope: [],
      outOfScope: [],
      businessRules: [],
      constraints: [],
      dependencies: [],
      deliverables: [],
      qualityRequirements: [],
      acceptanceCriteria: [],
    })).toBe(false)

    const malformedItem = createEmptyTaskBrief()
    malformedItem.workItems = [{
      id: 'work-1', affectedArea: 'Chi tiết Task', requiredChange: 'Thêm lịch sử', resultingBehaviour: 1 as never,
    }]
    expect(isTaskBriefV2(malformedItem)).toBe(false)
  })
})
