import { describe, expect, it } from 'vitest'

import {
  buildPrefilledTaskSkills,
  findRoleMatchedProjectMembers,
} from '@/apps/org/modules/tasks/lib/create_prefill'

describe('buildPrefilledTaskSkills', () => {
  it('uses canonical requiredLevelCode from helper API response', () => {
    const skills = buildPrefilledTaskSkills([
      {
        skillId: 'skill-1',
        skillName: 'API Design',
        requiredLevelCode: 'L7',
        minimumLevelId: 'level-min',
        targetLevelId: 'level-target',
        assessmentCeilingLevelId: 'level-ceiling',
        rubricVersionId: 'rubric-version-1',
        minimumLevelCode: 'L3',
        targetLevelCode: 'L7',
        assessmentCeilingLevelCode: 'L9',
        isMandatory: true,
        importance: 'critical',
        weight: 1.25,
        requirementSource: 'professional_role_prefill',
        requirementNotes: 'Inherited from Backend Lead role baseline.',
      },
    ])

    expect(skills).toEqual([
      expect.objectContaining({
        id: 'skill-1',
        name: 'API Design',
        level: 'l7',
        minimum_level_id: 'level-min',
        target_level_id: 'level-target',
        assessment_ceiling_level_id: 'level-ceiling',
        rubric_version_id: 'rubric-version-1',
        minimum_level_code: 'l3',
        target_level_code: 'l7',
        assessment_ceiling_level_code: 'l9',
        is_mandatory: true,
        importance: 'critical',
        weight: 1.25,
        requirement_source: 'professional_role_prefill',
        requirement_notes: 'Inherited from Backend Lead role baseline.',
      }),
    ])
  })

  it('falls back to l4 when helper API response does not include a canonical level code', () => {
    const skills = buildPrefilledTaskSkills([
      {
        skillId: 'skill-2',
        skillName: 'Testing',
      },
    ])

    expect(skills[0]?.level).toBe('l4')
  })

  it('returns only project members that currently hold the selected professional role', () => {
    const members = findRoleMatchedProjectMembers('role-2', [
      {
        id: 'user-1',
        username: 'alice',
        email: 'alice@example.com',
        projectProfessionalRoleId: 'role-1',
      },
      {
        id: 'user-2',
        username: 'bob',
        email: 'bob@example.com',
        projectProfessionalRoleId: 'role-2',
      },
      {
        id: 'user-3',
        username: 'cara',
        email: 'cara@example.com',
        projectProfessionalRoleId: null,
      },
    ])

    expect(members).toEqual([
      expect.objectContaining({
        id: 'user-2',
        username: 'bob',
      }),
    ])
  })
})
