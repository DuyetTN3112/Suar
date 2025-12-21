import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import ProfileStats from '@/apps/user/modules/profile/components/profile_stats.svelte'

describe('ProfileStats', () => {
  it('averages only reviewed skills and ignores imported-only percentages', () => {
    render(ProfileStats, {
      props: {
        user: {
          id: 'user-1',
          username: 'duyet',
          email: 'duyet@example.com',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-07-04T00:00:00.000Z',
          trust_score: 82,
          trust_tier_code: 'organization',
        },
        skills: [
          {
            id: 'reviewed-skill',
            skill_id: 'skill-1',
            skill_name: 'PostgreSQL',
            skill_code: 'postgresql',
            category_name: 'Technology',
            category_code: 'technology',
            verified_public_proficiency_code: 'l10',
            source: 'reviewed',
            total_reviews: 3,
            avg_score: 84,
            avg_percentage: 84,
            confidence_signal: 'high',
            freshness_state: 'fresh',
            governance_state: 'verified',
            last_reviewed_at: '2026-07-01T00:00:00.000Z',
            evidence_count: 2,
            evidence_history: [],
          },
          {
            id: 'imported-skill',
            skill_id: 'skill-2',
            skill_name: 'Svelte',
            skill_code: 'svelte',
            category_name: 'Technology',
            category_code: 'technology',
            verified_public_proficiency_code: 'l7',
            source: 'imported',
            total_reviews: 0,
            avg_score: null,
            avg_percentage: 72,
            confidence_signal: null,
            freshness_state: 'unreviewed',
            governance_state: 'unreviewed',
            last_reviewed_at: null,
            evidence_count: 0,
            evidence_history: [],
          },
        ],
      },
    })

    expect(screen.getByText('84.0%')).toBeInTheDocument()
    expect(screen.getByText('1 đã được đánh giá')).toBeInTheDocument()
  })
})
