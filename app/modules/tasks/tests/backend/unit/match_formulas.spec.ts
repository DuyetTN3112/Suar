import { test } from '@japa/runner'

import { calculateApplicantMatch } from '#modules/tasks/domain/match_formulas'

test.group('Task match formulas', () => {
  test('normalizes legacy and canonical proficiency codes onto one comparison scale', ({
    assert,
  }) => {
    const result = calculateApplicantMatch(
      {
        requiredSkills: [
          {
            skill_id: 'skill-1',
            required_public_proficiency_code: 'l10',
            is_mandatory: true,
            skill_name: 'TypeScript',
          },
        ],
        business_domain: null,
        problem_category: null,
        task_type: null,
      },
      {
        skills: [
          {
            skill_id: 'skill-1',
            verified_public_proficiency_code: 'l10',
            source: 'reviewed',
          },
        ],
        workHistory: [],
        trustScore: 0,
      }
    )

    assert.equal(result.skill_match, 100)
    assert.deepEqual(result.risks, [])
  })

  test('penalizes canonical gaps proportionally instead of falling back to broad-band shortcuts', ({
    assert,
  }) => {
    const result = calculateApplicantMatch(
      {
        requiredSkills: [
          {
            skill_id: 'skill-1',
            required_public_proficiency_code: 'l12',
            is_mandatory: true,
            skill_name: 'Architecture',
          },
        ],
        business_domain: null,
        problem_category: null,
        task_type: null,
      },
      {
        skills: [
          {
            skill_id: 'skill-1',
            verified_public_proficiency_code: 'l4',
            source: 'reviewed',
          },
        ],
        workHistory: [],
        trustScore: 0,
      }
    )

    assert.isBelow(result.skill_match, 50)
    assert.exists(result.risks.find((risk) => risk.includes('Level lower than mandatory')))
  })

  test('marks rankings with missing task requirements and applicant evidence as low confidence', ({
    assert,
  }) => {
    const result = calculateApplicantMatch(
      {
        requiredSkills: [],
        business_domain: null,
        problem_category: null,
        task_type: null,
      },
      {
        skills: [],
        workHistory: [],
        trustScore: 0,
      }
    )

    assert.equal(result.skill_match, 0)
    assert.equal(result.evidence_confidence, 'low')
    assert.exists(
      result.evidence_warnings.find((warning) =>
        warning.includes('Task chưa khai báo kỹ năng bắt buộc')
      )
    )
  })
})
