import { cleanup, fireEvent, render, screen } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.unmock('@/apps/user/shared/stores/translation.svelte')

import AddSkillModal from '@/apps/user/modules/profile/components/add_skill_modal.svelte'
import SkillCard from '@/apps/user/modules/profile/components/skill_card.svelte'
import SkillsSection from '@/apps/user/modules/profile/components/skills_section.svelte'

const inertiaMocks = vi.hoisted(() => ({
  post: vi.fn(),
  put: vi.fn(),
}))

vi.mock('@inertiajs/svelte', () => ({
  page: {
    props: {},
  },
  router: {
    post: inertiaMocks.post,
    put: inertiaMocks.put,
  },
}))

const proficiencyLevels = [
  {
    value: 'l10' as const,
    label: 'Senior Solid',
    labelVi: 'L10 · Senior Solid',
    description: 'Owns senior delivery.',
    minPercentage: 80,
    maxPercentage: 89,
    colorHex: '#111111',
    order: 10,
  },
]

describe('profile skill category labels', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders edit skill cards with four canonical localized category labels', () => {
    for (const [categoryCode, label] of [
      ['technology', 'Technology'],
      ['engineering', 'Software engineering'],
      ['soft_skill', 'Soft skills'],
      ['delivery', 'Delivery'],
    ] as const) {
      const { unmount } = render(SkillCard, {
        props: {
          skill: {
            id: `user-skill-${categoryCode}`,
            skill_id: `skill-${categoryCode}`,
            skill_name: `${label} skill`,
            skill_code: categoryCode,
            category_name: categoryCode,
            category_code: categoryCode,
            verified_public_proficiency_code: 'l10',
            source: 'reviewed',
            total_reviews: 1,
            avg_score: null,
            avg_percentage: 86,
            confidence_signal: 'high',
            freshness_state: 'fresh',
            governance_state: 'verified',
            last_reviewed_at: null,
            evidence_count: 0,
            evidence_history: [],
          },
          proficiencyLevels,
          editable: true,
        },
      })

      expect(screen.getByText(label)).toBeInTheDocument()
      unmount()
    }
  })

  it('renders add skill dialog options with canonical localized category labels', () => {
    const { container } = render(AddSkillModal, {
      props: {
        open: true,
        onOpenChange: vi.fn(),
        availableSkills: [
          {
            id: 'skill-technology',
            category_code: 'technology',
            display_type: 'spider_chart',
            skill_code: 'typescript',
            skill_name: 'TypeScript',
            is_active: true,
            sort_order: 1,
          },
          {
            id: 'skill-engineering',
            category_code: 'engineering',
            display_type: 'spider_chart',
            skill_code: 'api_design',
            skill_name: 'API Design',
            is_active: true,
            sort_order: 2,
          },
          {
            id: 'skill-soft',
            category_code: 'soft_skill',
            display_type: 'spider_chart',
            skill_code: 'communication',
            skill_name: 'Communication',
            is_active: true,
            sort_order: 3,
          },
          {
            id: 'skill-delivery',
            category_code: 'delivery',
            display_type: 'spider_chart',
            skill_code: 'release_management',
            skill_name: 'Release Management',
            is_active: true,
            sort_order: 4,
          },
        ],
        proficiencyLevels,
        existingSkillIds: [],
      },
    })

    expect(container).toHaveTextContent('Technology')
    expect(container).toHaveTextContent('Software engineering')
    expect(container).toHaveTextContent('Soft skills')
    expect(container).toHaveTextContent('Delivery')
    expect(container).not.toHaveTextContent('soft_skill')
  })

  it('sorts edit skill groups in the four-category taxonomy order', () => {
    const baseSkill = {
      verified_public_proficiency_code: 'l10' as const,
      source: 'reviewed' as const,
      total_reviews: 1,
      avg_score: null,
      avg_percentage: 86,
      confidence_signal: 'high' as const,
      freshness_state: 'fresh' as const,
      governance_state: 'verified' as const,
      last_reviewed_at: null,
      evidence_count: 0,
      evidence_history: [],
    }

    render(SkillsSection, {
      props: {
        skills: [
          {
            ...baseSkill,
            id: 'user-skill-delivery',
            skill_id: 'skill-delivery',
            skill_name: 'Release Management',
            skill_code: 'release_management',
            category_name: 'delivery',
            category_code: 'delivery',
          },
          {
            ...baseSkill,
            id: 'user-skill-soft',
            skill_id: 'skill-soft',
            skill_name: 'Communication',
            skill_code: 'communication',
            category_name: 'soft_skill',
            category_code: 'soft_skill',
          },
          {
            ...baseSkill,
            id: 'user-skill-technology',
            skill_id: 'skill-technology',
            skill_name: 'TypeScript',
            skill_code: 'typescript',
            category_name: 'technology',
            category_code: 'technology',
          },
          {
            ...baseSkill,
            id: 'user-skill-engineering',
            skill_id: 'skill-engineering',
            skill_name: 'API Design',
            skill_code: 'api_design',
            category_name: 'engineering',
            category_code: 'engineering',
          },
        ],
        proficiencyLevels,
        editable: true,
      },
    })

    const headings = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
    expect(headings).toEqual(['Technology', 'Software engineering', 'Soft skills', 'Delivery'])
  })

  it('keeps all four edit category groups visible when some groups are empty', () => {
    render(SkillsSection, {
      props: {
        skills: [
          {
            id: 'user-skill-soft',
            skill_id: 'skill-soft',
            skill_name: 'Communication',
            skill_code: 'communication',
            category_name: 'soft_skill',
            category_code: 'soft_skill',
            verified_public_proficiency_code: 'l10',
            source: 'reviewed',
            total_reviews: 1,
            avg_score: null,
            avg_percentage: 86,
            confidence_signal: 'high',
            freshness_state: 'fresh',
            governance_state: 'verified',
            last_reviewed_at: null,
            evidence_count: 0,
            evidence_history: [],
          },
        ],
        proficiencyLevels,
        editable: true,
      },
    })

    const headings = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
    expect(headings).toEqual(['Technology', 'Software engineering', 'Soft skills', 'Delivery'])
    expect(screen.getAllByText('No skills in this group yet.')).toHaveLength(3)
  })

  it('submits a typed custom skill with category and level', async () => {
    render(AddSkillModal, {
      props: {
        open: true,
        onOpenChange: vi.fn(),
        availableSkills: [],
        proficiencyLevels,
        existingSkillIds: [],
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'New skill' }))
    await fireEvent.input(screen.getByLabelText('Skill name'), {
      target: { value: 'Domain-Driven Design' },
    })
    await fireEvent.change(screen.getByLabelText('Skill group'), {
      target: { value: 'engineering' },
    })
    await fireEvent.click(screen.getByText('Senior Solid'))
    await fireEvent.click(screen.getByRole('button', { name: 'Add skill' }))

    expect(inertiaMocks.post).toHaveBeenCalledWith(
      '/profile/skills',
      {
        customSkillName: 'Domain-Driven Design',
        categoryCode: 'engineering',
        verifiedPublicProficiencyCode: 'l10',
      },
      expect.any(Object)
    )
  })
})
