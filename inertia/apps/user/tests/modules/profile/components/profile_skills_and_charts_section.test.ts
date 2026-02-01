import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

vi.unmock('@/apps/user/shared/stores/translation.svelte')

import ProfileSkillsAndChartsSection from '@/apps/user/modules/profile/components/profile_skills_and_charts_section.svelte'

describe('ProfileSkillsAndChartsSection', () => {
  it('renders explainability signals from reviewed skill evidence', () => {
    render(ProfileSkillsAndChartsSection, {
      props: {
        groupedSkills: [
          {
            code: 'technology',
            title: 'Công nghệ',
            bgClass: 'bg-white',
            items: [
              {
                id: 'user-skill-1',
                skill_id: 'skill-1',
                skill_name: 'TypeScript',
                category_code: 'technology',
                verified_public_proficiency_code: 'l8',
                total_reviews: 3,
                avg_percentage: 84.6,
                source: 'reviewed',
                confidence_signal: 'high',
                freshness_state: 'fresh',
                governance_state: 'under_dispute',
                evidence_count: 2,
                last_reviewed_at: '2026-07-01T10:00:00.000Z',
                evidence_history: [
                  {
                    task_id: 'task-1',
                    task_title: 'Refactor org dashboard',
                    completed_at: '2026-06-28T10:00:00.000Z',
                    assigned_public_proficiency_code: 'l8',
                    reviewer_type: 'manager',
                    comment: 'Strong maintainability and safe refactor decisions.',
                    evidence_links: [],
                  },
                ],
              },
            ],
          },
        ],
        spiderChartData: {
          technology: [],
          engineering: [],
          soft_skills: [],
          delivery: [],
        },
        neoBrutalCard: 'rounded-lg border bg-white',
        showCharts: false,
      },
    })

    expect(screen.getByText('2 evidence sources')).toBeInTheDocument()
    expect(screen.getByText(/Last reviewed/i)).toBeInTheDocument()
    expect(screen.getByText('Refactor org dashboard')).toBeInTheDocument()
    expect(screen.getByText(/Strong maintainability/i)).toBeInTheDocument()
    expect(screen.getByText('manager')).toBeInTheDocument()
    expect(screen.getByText('Confidence: High')).toBeInTheDocument()
    expect(screen.getByText('Recent review')).toBeInTheDocument()
    expect(screen.getByText('In dispute')).toBeInTheDocument()
    expect(screen.getByText('1 disputed')).toBeInTheDocument()
  })

  it('summarizes reviewed, imported, and dispute coverage for the skill atlas', () => {
    render(ProfileSkillsAndChartsSection, {
      props: {
        groupedSkills: [
          {
            code: 'technology',
            title: 'Công nghệ',
            bgClass: 'bg-white',
            items: [
              {
                id: 'user-skill-reviewed',
                skill_id: 'skill-reviewed',
                skill_name: 'TypeScript',
                category_code: 'technology',
                verified_public_proficiency_code: 'l8',
                total_reviews: 2,
                avg_percentage: 84.6,
                source: 'reviewed',
                governance_state: 'verified',
              },
              {
                id: 'user-skill-imported',
                skill_id: 'skill-imported',
                skill_name: 'Svelte',
                category_code: 'technology',
                verified_public_proficiency_code: 'l7',
                total_reviews: 0,
                avg_percentage: null,
                source: 'imported',
                governance_state: 'unreviewed',
              },
              {
                id: 'user-skill-disputed',
                skill_id: 'skill-disputed',
                skill_name: 'Leadership',
                category_code: 'soft_skill',
                verified_public_proficiency_code: 'l8',
                total_reviews: 1,
                avg_percentage: 79,
                source: 'reviewed',
                governance_state: 'under_dispute',
              },
            ],
          },
        ],
        spiderChartData: {
          technology: [],
          engineering: [],
          soft_skills: [],
          delivery: [],
        },
        neoBrutalCard: 'rounded-lg border bg-white',
        showCharts: false,
      },
    })

    expect(screen.getAllByText('3 skills').length).toBeGreaterThan(0)
    expect(screen.getByText('2 reviewed skills')).toBeInTheDocument()
    expect(screen.getByText('1 imported claim')).toBeInTheDocument()
    expect(screen.getByText('1 disputed')).toBeInTheDocument()
  })

  it('renders four canonical chart groups from spider data', () => {
    render(ProfileSkillsAndChartsSection, {
      props: {
        groupedSkills: [
          {
            code: 'soft_skill',
            title: 'Kỹ năng mềm',
            bgClass: 'bg-white',
            items: [
              {
                id: 'user-skill-soft',
                skill_id: 'skill-soft',
                skill_name: 'Communication',
                category_code: 'soft_skill',
                verified_public_proficiency_code: 'l7',
                total_reviews: 1,
              },
            ],
          },
        ],
        spiderChartData: {
          technology: [],
          engineering: [],
          soft_skills: [],
          delivery: [],
        },
        neoBrutalCard: 'rounded-lg border bg-white',
        showCharts: true,
      },
    })

    expect(screen.getAllByText('Technology').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Software engineering').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Soft skills').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Delivery').length).toBeGreaterThan(0)
  })

  it('renders four canonical detailed inventory groups even when categories have no skills', () => {
    render(ProfileSkillsAndChartsSection, {
      props: {
        groupedSkills: [
          {
            code: 'soft_skill',
            title: 'Kỹ năng mềm',
            bgClass: 'bg-white',
            items: [
              {
                id: 'user-skill-soft',
                skill_id: 'skill-soft',
                skill_name: 'Communication',
                category_code: 'soft_skill',
                verified_public_proficiency_code: 'l7',
                total_reviews: 1,
              },
            ],
          },
        ],
        spiderChartData: {
          technology: [],
          engineering: [],
          soft_skills: [],
          delivery: [],
        },
        neoBrutalCard: 'rounded-lg border bg-white',
        showCharts: false,
      },
    })

    expect(screen.getByText('Technology')).toBeInTheDocument()
    expect(screen.getByText('Software engineering')).toBeInTheDocument()
    expect(screen.getByText('Soft skills')).toBeInTheDocument()
    expect(screen.getByText('Delivery')).toBeInTheDocument()
    expect(screen.getAllByText('No skills in this group yet.')).toHaveLength(3)
  })

  it('keeps the four-category inventory visible for an empty skill profile', () => {
    render(ProfileSkillsAndChartsSection, {
      props: {
        groupedSkills: [],
        spiderChartData: {
          technology: [],
          engineering: [],
          soft_skills: [],
          delivery: [],
        },
        neoBrutalCard: 'rounded-lg border bg-white',
        showCharts: false,
      },
    })

    expect(screen.getByRole('heading', { name: 'No verified skills yet' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'All skills by group' })).toBeInTheDocument()
    expect(screen.getByText('Technology')).toBeInTheDocument()
    expect(screen.getByText('Software engineering')).toBeInTheDocument()
    expect(screen.getByText('Soft skills')).toBeInTheDocument()
    expect(screen.getByText('Delivery')).toBeInTheDocument()
    expect(screen.getAllByText('No skills in this group yet.')).toHaveLength(4)
  })
})
