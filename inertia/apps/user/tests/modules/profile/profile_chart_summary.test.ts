import { describe, expect, it } from 'vitest'

import { buildProfileChartCardSummary } from '@/apps/user/modules/profile/profile_chart_summary'

describe('buildProfileChartCardSummary', () => {
  it('builds explainable chart summary signals from reviewed, imported, and disputed points', () => {
    const summary = buildProfileChartCardSummary({
      points: [
        {
          skill_id: 'skill-reviewed-1',
          skill_name: 'PostgreSQL',
          skill_code: 'postgresql',
          category_code: 'technology',
          avg_percentage: 90,
          verified_public_proficiency_code: 'l10',
          total_reviews: 3,
          source: 'reviewed',
          governance_state: 'verified',
        },
        {
          skill_id: 'skill-imported-1',
          skill_name: 'Svelte',
          skill_code: 'svelte',
          category_code: 'technology',
          avg_percentage: 40,
          verified_public_proficiency_code: 'l7',
          total_reviews: 0,
          source: 'imported',
          governance_state: 'unreviewed',
        },
        {
          skill_id: 'skill-reviewed-2',
          skill_name: 'TypeScript',
          skill_code: 'typescript',
          category_code: 'technology',
          avg_percentage: 70,
          verified_public_proficiency_code: 'l8',
          total_reviews: 1,
          source: 'reviewed',
          governance_state: 'under_dispute',
        },
      ],
      totalSkills: 3,
      verifiedSkills: 2,
      importedSkills: 1,
      disputedSkills: 1,
    })

    expect(summary.chart_mode).toBe('list_fallback')
    expect(summary.verified_average_score).toBe(80)
    expect(summary.confidence_summary).toBe(
      'Confidence: Medium-low because coverage is limited'
    )
    expect(summary.strongest_verified_skill_name).toBe('PostgreSQL')
    expect(summary.most_evidenced_skill_name).toBe('PostgreSQL')
    expect(summary.most_evidenced_review_count).toBe(3)
    expect(summary.needs_verification_names).toEqual(['Svelte'])
    expect(summary.warnings).toContain(
      'Imported claims still help discovery but are not counted as verified capability yet.'
    )
    expect(summary.warnings).toContain(
      'Some skills are in dispute, so read this verified summary with governance state before staffing or level changes.'
    )
    expect(summary.warnings).toContain(
      'Coverage is still limited, so read this capability summary with each skill evidence trail.'
    )
  })
})
