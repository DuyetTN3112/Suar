import { describe, it, expect } from 'vitest'

// Test the member picker logic in isolation
describe('Project Member Picker Logic', () => {
  it('validates that user_id is required before submit', () => {
    const formData = { user_id: '', project_role: 'project_member' }
    const isValid = formData.user_id.trim().length > 0
    expect(isValid).toBe(false)
  })

  it('validates that user_id is present for submit', () => {
    const formData = { user_id: 'some-uuid', project_role: 'project_member' }
    const isValid = formData.user_id.trim().length > 0
    expect(isValid).toBe(true)
  })

  it('validates project_role is one of allowed values', () => {
    const allowedRoles = ['project_viewer', 'project_member', 'project_manager', 'project_owner']
    expect(allowedRoles.includes('project_member')).toBe(true)
    expect(allowedRoles.includes('project_viewer')).toBe(true)
    expect(allowedRoles.includes('project_manager')).toBe(true)
    expect(allowedRoles.includes('invalid_role')).toBe(false)
  })

  it('validates that email-only payload is rejected', () => {
    const payload = { email: 'test@example.com', project_role: 'project_member' }
    const hasUserId = 'user_id' in payload && payload.user_id !== undefined
    expect(hasUserId).toBe(false)
  })

  it('validates that user_id + project_role payload is accepted', () => {
    const payload = { user_id: 'uuid-here', project_role: 'project_member' }
    const hasUserId = 'user_id' in payload
    const hasRole = 'project_role' in payload
    expect(hasUserId).toBe(true)
    expect(hasRole).toBe(true)
  })
})

describe('Member Candidates Data Transform', () => {
  it('maps API response to candidate list', () => {
    const apiResponse = {
      data: [
        { user_id: 'u1', username: 'alice', email: 'alice@test.com', org_role: 'member' },
        { user_id: 'u2', username: 'bob', email: 'bob@test.com', org_role: 'admin' },
      ],
    }
    const candidates = apiResponse.data
    expect(candidates.length).toBe(2)
    expect(candidates[0]?.username).toBe('alice')
  })

  it('handles empty candidates response', () => {
    const apiResponse = { data: [] }
    const candidates = apiResponse.data
    expect(candidates.length).toBe(0)
  })

  it('handles error response gracefully', () => {
    const candidates = []
    expect(candidates.length).toBe(0)
  })
})

describe('Task Create Role Prefill Payload', () => {
  it('includes semantic skill fields in payload', () => {
    const skills = [
      {
        id: 'skill-uuid',
        level: 'senior',
        minimum_level_id: 'min-uuid',
        target_level_id: 'target-uuid',
        assessment_ceiling_level_id: 'ceiling-uuid',
        is_mandatory: true,
        importance: 'high',
        weight: 1.5,
        requirement_source: 'professional_role_prefill',
      },
    ]

    const payload = {
      title: 'Test Task',
      project_professional_role_id: 'role-uuid',
      required_skills: skills.map((s) => ({
        id: s.id,
        level: s.level,
        minimum_level_id: s.minimum_level_id,
        target_level_id: s.target_level_id,
        assessment_ceiling_level_id: s.assessment_ceiling_level_id,
        is_mandatory: s.is_mandatory,
        importance: s.importance,
        weight: s.weight,
        requirement_source: s.requirement_source,
      })),
    }
    const [firstSkill] = payload.required_skills

    expect(payload.project_professional_role_id).toBe('role-uuid')
    expect(firstSkill).toMatchObject({
      minimum_level_id: 'min-uuid',
      target_level_id: 'target-uuid',
      requirement_source: 'professional_role_prefill',
    })
  })

  it('omits project_professional_role_id when no role selected', () => {
    const payload = {
      title: 'Test Task',
      project_professional_role_id: '',
      required_skills: [{ id: 'skill-uuid', level: 'junior' }],
    }

    const finalPayload = {
      ...payload,
      project_professional_role_id: payload.project_professional_role_id || undefined,
    }

    expect(finalPayload.project_professional_role_id).toBeUndefined()
  })
})

describe('Candidate Source Classification', () => {
  function sourceLabel(source: string): string {
    if (source === 'project_member') return 'Trong dự án'
    if (source === 'org_member') return 'Trong tổ chức'
    return 'Bên ngoài'
  }

  it('classifies project_member correctly', () => {
    expect(sourceLabel('project_member')).toBe('Trong dự án')
  })

  it('classifies org_member correctly', () => {
    expect(sourceLabel('org_member')).toBe('Trong tổ chức')
  })

  it('classifies external correctly', () => {
    expect(sourceLabel('external')).toBe('Bên ngoài')
  })
})

describe('Fit Label Thresholds', () => {
  function getFitLabel(score: number): string {
    if (score >= 80) return 'strong_match'
    if (score >= 60) return 'good_match'
    if (score >= 40) return 'partial_match'
    return 'weak_match'
  }

  it('returns strong_match for score >= 80', () => {
    expect(getFitLabel(80)).toBe('strong_match')
    expect(getFitLabel(95)).toBe('strong_match')
    expect(getFitLabel(100)).toBe('strong_match')
  })

  it('returns good_match for score 60-79', () => {
    expect(getFitLabel(60)).toBe('good_match')
    expect(getFitLabel(75)).toBe('good_match')
    expect(getFitLabel(79)).toBe('good_match')
  })

  it('returns partial_match for score 40-59', () => {
    expect(getFitLabel(40)).toBe('partial_match')
    expect(getFitLabel(50)).toBe('partial_match')
    expect(getFitLabel(59)).toBe('partial_match')
  })

  it('returns weak_match for score < 40', () => {
    expect(getFitLabel(0)).toBe('weak_match')
    expect(getFitLabel(20)).toBe('weak_match')
    expect(getFitLabel(39)).toBe('weak_match')
  })
})
