import { cleanup, render, screen } from '@testing-library/svelte'
import { afterEach, describe, expect, it } from 'vitest'

import ProfileSpiderChartCard from '@/apps/user/modules/profile/components/profile_spider_chart_card.svelte'

describe('ProfileSpiderChartCard', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders a no-data state without leaking numeric placeholders', () => {
    const { container } = render(ProfileSpiderChartCard, {
      props: {
        categoryCode: 'technology',
        points: [],
        totalSkills: 0,
        verifiedSkills: 0,
        importedSkills: 0,
        disputedSkills: 0,
      },
    })

    expect(screen.getByText('Insufficient data')).toBeInTheDocument()
    expect(screen.getByText('Công nghệ')).toBeInTheDocument()
    expect(screen.getByText('Chưa có dữ liệu reviewed cho nhóm này.')).toBeInTheDocument()
    expect(screen.getByText('Verified avg')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/NaN|Infinity|undefined/)
    expect(container.innerHTML).not.toMatch(/NaN|Infinity|undefined/)
    expect(screen.queryByText('Highest verified')).not.toBeInTheDocument()
  })

  it('uses only reviewed evidence for verified metrics and blocks radar when coverage is too thin', () => {
    render(ProfileSpiderChartCard, {
      props: {
        categoryCode: 'technology',
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
        summary: {
          chart_mode: 'list_fallback',
          verified_average_score: 80,
          confidence_summary: 'Confidence: Medium-low because coverage is limited',
          warnings: [
            'Imported claim vẫn có giá trị cho discovery nhưng chưa được tính như verified capability.',
            'Có skill đang dispute nên verified summary này cần đọc cùng governance state trước khi staffing hoặc thăng level.',
            'Summary prop warning from parent',
          ],
          strongest_verified_skill_name: 'PostgreSQL',
          most_evidenced_skill_name: 'PostgreSQL',
          most_evidenced_review_count: 3,
          needs_verification_names: ['Svelte'],
        },
      },
    })

    expect(screen.getByText('Verified avg')).toBeInTheDocument()
    expect(screen.getByText('80.0%')).toBeInTheDocument()
    expect(screen.getByText('List fallback')).toBeInTheDocument()
    expect(screen.getByText('2/3 verified')).toBeInTheDocument()
    expect(screen.getAllByText('1 imported claim').length).toBeGreaterThan(0)
    expect(screen.getByText('1 dispute signal')).toBeInTheDocument()
    expect(screen.getByText(/Cần ít nhất 3 skill reviewed để vẽ radar/i)).toBeInTheDocument()
    expect(screen.getByText('Highest verified')).toBeInTheDocument()
    expect(screen.getByText('Most evidenced')).toBeInTheDocument()
    expect(screen.getAllByText('PostgreSQL').length).toBeGreaterThan(0)
    expect(screen.getByText('3 reviews · 1 tranh chấp')).toBeInTheDocument()
  })

  it('reuses shared helper semantics when summary prop is omitted', () => {
    render(ProfileSpiderChartCard, {
      props: {
        categoryCode: 'engineering',
        points: [
          {
            skill_id: 'skill-reviewed-1',
            skill_name: 'PostgreSQL',
            skill_code: 'postgresql',
            category_code: 'engineering',
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
            category_code: 'engineering',
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
            category_code: 'engineering',
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
      },
    })

    expect(screen.getByText('List fallback')).toBeInTheDocument()
    expect(screen.getByText('1 dispute signal')).toBeInTheDocument()
    expect(screen.getAllByText('1 imported claim').length).toBeGreaterThan(0)
  })
})
