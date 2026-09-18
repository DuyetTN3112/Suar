import { test } from '@japa/runner'

import { calculateApplicantMatch } from '#modules/tasks/public_contracts/applicant_match'

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

  test('normalizes requirement weights and keeps every returned score inside 0 to 100', ({
    assert,
  }) => {
    const result = calculateApplicantMatch(
      {
        requiredSkills: [
          {
            skill_id: 'skill-critical',
            required_public_proficiency_code: 'l10',
            is_mandatory: true,
            skill_name: 'Architecture',
            importance: 'critical',
            weight: 2,
          },
          {
            skill_id: 'skill-low',
            required_public_proficiency_code: 'l5',
            is_mandatory: false,
            skill_name: 'Documentation',
            importance: 'low',
            weight: 0.5,
          },
        ],
        business_domain: 'software',
        problem_category: 'delivery',
        task_type: 'implementation',
      },
      {
        skills: [
          {
            skill_id: 'skill-critical',
            verified_public_proficiency_code: 'l10',
            source: 'reviewed',
          },
          {
            skill_id: 'skill-low',
            verified_public_proficiency_code: 'l5',
            source: 'reviewed',
          },
        ],
        workHistory: [
          {
            business_domain: 'software',
            problem_category: 'delivery',
            task_type: 'implementation',
            was_on_time: true,
          },
        ],
        trustScore: 150,
      }
    )

    assert.equal(result.scoring_version, 'applicant_match_v1')
    assert.equal(result.skill_match, 100)
    assert.isAtLeast(result.match_score, 0)
    assert.isAtMost(result.match_score, 100)
    assert.isAtMost(result.domain_match, 100)
    assert.isAtMost(result.delivery_reliability, 100)
    assert.isAtMost(result.trust_score, 100)
  })
})
