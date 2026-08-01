import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

vi.unmock('@/apps/admin/shared/stores/translation.svelte')

import AdminProficiencyIndexPage from '@/apps/admin/modules/proficiency/index.svelte'

describe('Admin proficiency index page', () => {
  it('links active skills to their rubric pages', () => {
    render(AdminProficiencyIndexPage, {
      props: {
        scale: null,
        skills: [
          {
            id: 'skill-1',
            skillName: 'API Design',
            skillCode: 'api-design',
            categoryCode: 'engineering',
          },
        ],
      },
    })

    const href = screen.getByRole('link', { name: /API Design/i }).getAttribute('href')
    expect(href ? new URL(href, 'http://localhost:3000').pathname : null).toBe(
      '/admin/proficiency/rubrics/skill-1'
    )
  })
})
