import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import ProfileOverviewSection from '@/apps/user/modules/profile/components/profile_overview_section.svelte'

describe('ProfileOverviewSection', () => {
  it('separates capability, trust, delivery, and evidence coverage signals', () => {
    render(ProfileOverviewSection, {
      props: {
        user: {
          id: 'user-1',
          username: 'duyet',
          email: 'duyet@example.com',
          status_name: 'active',
          timezone: 'Asia/Ho_Chi_Minh',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-07-03T00:00:00.000Z',
          trust_score: 82,
          trust_data: {
            calculated_score: 82,
            current_tier_code: 'organization',
            total_verified_reviews: 5,
            performance_score: 61,
          },
          credibility_data: {
            credibility_score: 74,
            total_reviews_given: 8,
            accurate_reviews: 6,
            disputed_reviews: 1,
          },
          profile_settings: {
            is_searchable: true,
            preferred_job_types: ['Full-time'],
            preferred_locations: ['Ho Chi Minh'],
          },
          current_organization: {
            id: 'org-1',
            name: 'Suar',
          },
        },
        userSkills: [
          {
            id: 'skill-reviewed',
            skill_id: 'skill-reviewed',
            skill_name: 'PostgreSQL',
            skill_code: 'postgresql',
            category_name: 'Technology',
            category_code: 'technology',
            verified_public_proficiency_code: 'l10',
            source: 'reviewed',
            total_reviews: 3,
            avg_score: 90,
            avg_percentage: 90,
            confidence_signal: 'high',
            freshness_state: 'fresh',
            governance_state: 'verified',
            last_reviewed_at: '2026-07-01T10:00:00.000Z',
            evidence_count: 3,
            evidence_history: [],
          },
          {
            id: 'skill-imported',
            skill_id: 'skill-imported',
            skill_name: 'Svelte',
            skill_code: 'svelte',
            category_name: 'Technology',
            category_code: 'technology',
            verified_public_proficiency_code: 'l7',
            source: 'imported',
            total_reviews: 0,
            avg_score: null,
            avg_percentage: null,
            confidence_signal: null,
            freshness_state: 'unreviewed',
            governance_state: 'unreviewed',
            last_reviewed_at: null,
            evidence_count: 0,
            evidence_history: [],
          },
          {
            id: 'skill-disputed',
            skill_id: 'skill-disputed',
            skill_name: 'Communication',
            skill_code: 'communication',
            category_name: 'Soft skill',
            category_code: 'soft_skill',
            verified_public_proficiency_code: 'l8',
            source: 'reviewed',
            total_reviews: 1,
            avg_score: 78,
            avg_percentage: 78,
            confidence_signal: 'medium',
            freshness_state: 'fresh',
            governance_state: 'under_dispute',
            last_reviewed_at: '2026-07-02T10:00:00.000Z',
            evidence_count: 1,
            evidence_history: [],
          },
        ],
        deliveryMetrics: {
          delivery: {
            total_tasks_completed: 10,
            tasks_on_time: 8,
            tasks_late: 2,
            late_percentage: 20,
            estimate_accuracy_percentage: 88,
            avg_hours_over_estimate: 3,
          },
          skill_aggregation: {
            total_skills: 3,
            reviewed_skills: 2,
            avg_percentage: 84,
          },
          years_of_experience: 4,
          joined_at_formatted: '01/01/2024',
        },
      },
    })

    expect(screen.getByText('Capability verified')).toBeInTheDocument()
    expect(screen.getByText('84.0%')).toBeInTheDocument()
    expect(screen.getByText('L9-L14').parentElement).toHaveTextContent('L9-L14: 1')
    expect(screen.getByText('L4-L8').parentElement).toHaveTextContent('L4-L8: 2')
    expect(screen.getByText('Profile trust')).toBeInTheDocument()
    expect(screen.getByText('Delivery reliability')).toBeInTheDocument()
    expect(screen.getByText('Evidence coverage')).toBeInTheDocument()
    expect(screen.getByText('2/3 verified')).toBeInTheDocument()
    expect(screen.getByText(/1 imported claim/)).toBeInTheDocument()
    expect(screen.getAllByText(/1 disputed skills/).length).toBeGreaterThan(0)
    expect(screen.getByText(/1 disputed skills/)).toBeInTheDocument()
  })

  it('keeps overview capability coverage grounded in live userSkills instead of snapshot totals', () => {
    render(ProfileOverviewSection, {
      props: {
        user: {
          id: 'user-2',
          username: 'snapshot-mismatch',
          email: 'snapshot@example.com',
          status_name: 'active',
          timezone: 'Asia/Ho_Chi_Minh',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-07-03T00:00:00.000Z',
          trust_score: 82,
          trust_data: {
            calculated_score: 82,
            current_tier_code: 'organization',
            total_verified_reviews: 5,
          },
          credibility_data: {
            credibility_score: 74,
            total_reviews_given: 8,
            accurate_reviews: 6,
            disputed_reviews: 1,
          },
          profile_settings: {
            is_searchable: true,
            preferred_job_types: ['Full-time'],
            preferred_locations: ['Ho Chi Minh'],
          },
          current_organization: {
            id: 'org-1',
            name: 'Suar',
          },
        },
        userSkills: [
          {
            id: 'skill-reviewed',
            skill_id: 'skill-reviewed',
            skill_name: 'PostgreSQL',
            skill_code: 'postgresql',
            category_name: 'Technology',
            category_code: 'technology',
            verified_public_proficiency_code: 'l10',
            source: 'reviewed',
            total_reviews: 3,
            avg_score: 90,
            avg_percentage: 90,
            confidence_signal: 'high',
            freshness_state: 'fresh',
            governance_state: 'verified',
            last_reviewed_at: '2026-07-01T10:00:00.000Z',
            evidence_count: 3,
            evidence_history: [],
          },
          {
            id: 'skill-imported',
            skill_id: 'skill-imported',
            skill_name: 'Svelte',
            skill_code: 'svelte',
            category_name: 'Technology',
            category_code: 'technology',
            verified_public_proficiency_code: 'l7',
            source: 'imported',
            total_reviews: 0,
            avg_score: null,
            avg_percentage: null,
            confidence_signal: null,
            freshness_state: 'unreviewed',
            governance_state: 'unreviewed',
            last_reviewed_at: null,
            evidence_count: 0,
            evidence_history: [],
          },
          {
            id: 'skill-disputed',
            skill_id: 'skill-disputed',
            skill_name: 'Communication',
            skill_code: 'communication',
            category_name: 'Soft skill',
            category_code: 'soft_skill',
            verified_public_proficiency_code: 'l8',
            source: 'reviewed',
            total_reviews: 1,
            avg_score: 78,
            avg_percentage: 78,
            confidence_signal: 'medium',
            freshness_state: 'fresh',
            governance_state: 'under_dispute',
            last_reviewed_at: '2026-07-02T10:00:00.000Z',
            evidence_count: 1,
            evidence_history: [],
          },
        ],
        deliveryMetrics: {
          delivery: {
            total_tasks_completed: 10,
            tasks_on_time: 8,
            tasks_late: 2,
            late_percentage: 20,
            estimate_accuracy_percentage: 88,
            avg_hours_over_estimate: 3,
          },
          skill_aggregation: {
            total_skills: 3,
            reviewed_skills: 2,
            avg_percentage: 84,
          },
          years_of_experience: 4,
          joined_at_formatted: '01/01/2024',
        },
        currentSnapshot: {
          id: 'snapshot-1',
          user_id: 'user-2',
          version: 3,
          snapshot_name: 'Current',
          is_current: true,
          is_public: false,
          shareable_slug: null,
          shareable_token: null,
          summary: {
            total_verified_skills: 5,
          },
          skills_verified: [],
          work_highlights: [],
          performance_metrics: {
            performance_score: 61,
          },
          trust_metrics: null,
          scoring_version: 'v1',
          created_at: '2026-07-03T00:00:00.000Z',
          updated_at: '2026-07-03T00:00:00.000Z',
        },
      },
    })

    expect(screen.getByText('2/3 verified')).toBeInTheDocument()
    expect(screen.getByText(/66.7% coverage/i)).toBeInTheDocument()
    expect(screen.getByText('84.0%')).toBeInTheDocument()
  })

  it('keeps reviewed count at zero when live skills exist but none are reviewed', () => {
    render(ProfileOverviewSection, {
      props: {
        user: {
          id: 'user-3',
          username: 'all-imported',
          email: 'imported@example.com',
          status_name: 'active',
          timezone: 'Asia/Ho_Chi_Minh',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-07-03T00:00:00.000Z',
          trust_score: 82,
          trust_data: {
            calculated_score: 82,
            current_tier_code: 'organization',
            total_verified_reviews: 5,
          },
          credibility_data: {
            credibility_score: 74,
            total_reviews_given: 8,
            accurate_reviews: 6,
            disputed_reviews: 0,
          },
          profile_settings: {
            is_searchable: true,
            preferred_job_types: ['Full-time'],
            preferred_locations: ['Ho Chi Minh'],
          },
          current_organization: {
            id: 'org-1',
            name: 'Suar',
          },
        },
        userSkills: [
          {
            id: 'skill-imported-1',
            skill_id: 'skill-imported-1',
            skill_name: 'Svelte',
            skill_code: 'svelte',
            category_name: 'Technology',
            category_code: 'technology',
            verified_public_proficiency_code: 'l7',
            source: 'imported',
            total_reviews: 0,
            avg_score: null,
            avg_percentage: null,
            confidence_signal: null,
            freshness_state: 'unreviewed',
            governance_state: 'unreviewed',
            last_reviewed_at: null,
            evidence_count: 0,
            evidence_history: [],
          },
          {
            id: 'skill-imported-2',
            skill_id: 'skill-imported-2',
            skill_name: 'Figma',
            skill_code: 'figma',
            category_name: 'Technology',
            category_code: 'technology',
            verified_public_proficiency_code: 'l6',
            source: 'imported',
            total_reviews: 0,
            avg_score: null,
            avg_percentage: null,
            confidence_signal: null,
            freshness_state: 'unreviewed',
            governance_state: 'unreviewed',
            last_reviewed_at: null,
            evidence_count: 0,
            evidence_history: [],
          },
        ],
        deliveryMetrics: {
          delivery: {
            total_tasks_completed: 10,
            tasks_on_time: 8,
            tasks_late: 2,
            late_percentage: 20,
            estimate_accuracy_percentage: 88,
            avg_hours_over_estimate: 3,
          },
          skill_aggregation: {
            total_skills: 2,
            reviewed_skills: 0,
            avg_percentage: null,
          },
          years_of_experience: 4,
          joined_at_formatted: '01/01/2024',
        },
        currentSnapshot: {
          id: 'snapshot-2',
          user_id: 'user-3',
          version: 3,
          snapshot_name: 'Current',
          is_current: true,
          is_public: false,
          shareable_slug: null,
          shareable_token: null,
          summary: {
            total_verified_skills: 5,
          },
          skills_verified: [],
          work_highlights: [],
          performance_metrics: {
            performance_score: 61,
          },
          trust_metrics: null,
          scoring_version: 'v1',
          created_at: '2026-07-03T00:00:00.000Z',
          updated_at: '2026-07-03T00:00:00.000Z',
        },
      },
    })

    expect(screen.getByText('0/2 verified')).toBeInTheDocument()
    expect(screen.getByText(/0.0% coverage/i)).toBeInTheDocument()
    expect(screen.getByText('--')).toBeInTheDocument()
  })

  it('renders explicit default trust and empty states for a new user with no review data', () => {
    render(ProfileOverviewSection, {
      props: {
        user: {
          id: 'new-user-id',
          username: 'new-user',
          email: 'new@example.com',
          status_name: 'active',
          timezone: 'Asia/Ho_Chi_Minh',
          created_at: '2026-07-01T00:00:00.000Z',
          updated_at: '2026-07-03T00:00:00.000Z',
          trust_score: null,
          trust_data: null,
          credibility_data: null,
          profile_settings: {
            is_searchable: false,
            preferred_job_types: [],
            preferred_locations: [],
          },
          current_organization: null,
        },
        userSkills: [],
        deliveryMetrics: {
          delivery: {
            total_tasks_completed: 0,
            tasks_on_time: 0,
            tasks_late: 0,
            late_percentage: 0,
            estimate_accuracy_percentage: 0,
            avg_hours_over_estimate: 0,
          },
          skill_aggregation: {
            total_skills: 0,
            reviewed_skills: 0,
            avg_percentage: null,
          },
          years_of_experience: 0,
          joined_at_formatted: '01/07/2026',
        },
      },
    })

    expect(screen.getByText('Profile trust')).toBeInTheDocument()
    expect(screen.getAllByText('--').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('community · -- verified reviews')).toBeInTheDocument()
    expect(screen.getByText('0/0 verified')).toBeInTheDocument()
    expect(screen.getByText('-- coverage · 0 imported claims')).toBeInTheDocument()
    expect(screen.getByText('0 tasks shipped')).toBeInTheDocument()
    expect(screen.getByText('L9-L14').parentElement).toHaveTextContent('L9-L14: 0')
    expect(screen.getByText('L4-L8').parentElement).toHaveTextContent('L4-L8: 0')
    expect(screen.getByText('L0-L3').parentElement).toHaveTextContent('L0-L3: 0')
  })

  it('keeps internal UUIDs out of the visible trust summary', () => {
    const uuidPattern =
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i

    const { container } = render(ProfileOverviewSection, {
      props: {
        user: {
          id: '018f6fb2-7e24-7b62-91e1-38d36e973034',
          username: 'privacy-user',
          email: 'privacy@example.com',
          status_name: 'active',
          timezone: 'Asia/Ho_Chi_Minh',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-07-03T00:00:00.000Z',
          trust_score: 91,
          trust_data: {
            calculated_score: 91,
            current_tier_code: 'organization',
            total_verified_reviews: 7,
            raw_score: 88,
            performance_score: 79,
          },
          credibility_data: {
            credibility_score: 83,
            total_reviews_given: 6,
            accurate_reviews: 5,
            disputed_reviews: 0,
          },
          profile_settings: {
            is_searchable: true,
            preferred_job_types: ['Contract'],
            preferred_locations: ['Remote'],
          },
          current_organization: {
            id: '018f6fb2-7e24-7b62-91e1-38d36e973035',
            name: 'Suar',
          },
        },
        userSkills: [
          {
            id: '018f6fb2-7e24-7b62-91e1-38d36e973036',
            skill_id: '018f6fb2-7e24-7b62-91e1-38d36e973037',
            skill_name: 'PostgreSQL',
            skill_code: 'postgresql',
            category_name: 'Technology',
            category_code: 'technology',
            verified_public_proficiency_code: 'l10',
            source: 'reviewed',
            total_reviews: 7,
            avg_score: 91,
            avg_percentage: 91,
            confidence_signal: 'high',
            freshness_state: 'fresh',
            governance_state: 'verified',
            last_reviewed_at: '2026-07-01T10:00:00.000Z',
            evidence_count: 2,
            evidence_history: [
              {
                task_id: '018f6fb2-7e24-7b62-91e1-38d36e973038',
                task_title: 'Index tuning proof',
                completed_at: '2026-07-01T10:00:00.000Z',
                assigned_public_proficiency_code: 'l10',
                reviewer_type: 'manager',
                comment: 'Human readable review summary',
                evidence_links: [
                  {
                    evidence_id: '018f6fb2-7e24-7b62-91e1-38d36e973039',
                    evidence_type: 'pull_request',
                    url: 'https://example.com/pr/privacy',
                    title: 'Performance PR',
                  },
                ],
              },
            ],
          },
        ],
        deliveryMetrics: {
          delivery: {
            total_tasks_completed: 3,
            tasks_on_time: 3,
            tasks_late: 0,
            late_percentage: 0,
            estimate_accuracy_percentage: 92,
            avg_hours_over_estimate: 1,
          },
          skill_aggregation: {
            total_skills: 1,
            reviewed_skills: 1,
            avg_percentage: 91,
          },
          years_of_experience: 2,
          joined_at_formatted: '01/01/2024',
        },
        currentSnapshot: {
          id: '018f6fb2-7e24-7b62-91e1-38d36e973040',
          user_id: '018f6fb2-7e24-7b62-91e1-38d36e973034',
          version: 4,
          snapshot_name: 'Current',
          is_current: true,
          is_public: true,
          shareable_slug: null,
          shareable_token: null,
          summary: {
            trust_score: 91,
            trust_tier: 'organization',
            total_tasks_completed: 3,
            total_verified_skills: 1,
          },
          skills_verified: [],
          work_highlights: [],
          performance_metrics: {
            performance_score: 79,
            avg_quality_score: 88,
            on_time_delivery_rate: 100,
          },
          trust_metrics: {
            source_review_id: '018f6fb2-7e24-7b62-91e1-38d36e973041',
          },
          scoring_version: 'trust_v2',
          created_at: '2026-07-03T00:00:00.000Z',
          updated_at: '2026-07-03T00:00:00.000Z',
        },
      },
    })

    expect(screen.getByText('privacy-user')).toBeInTheDocument()
    expect(screen.getByText('Profile trust')).toBeInTheDocument()
    expect(screen.getByText('91')).toBeInTheDocument()
    expect(screen.getByText('organization · 7 verified reviews')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(uuidPattern)
  })
})
