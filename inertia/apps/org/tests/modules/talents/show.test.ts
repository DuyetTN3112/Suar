/* eslint-disable import-x/order */
import { page } from '@inertiajs/svelte'
import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import LayoutStub from '../../shared/test_stubs/layout_stub.svelte'

vi.mock('@/apps/org/shared/layouts/organization_layout.svelte', () => ({
  default: LayoutStub,
}))

vi.mock('axios', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { data: [] } })),
    patch: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}))

vi.mock('@/apps/org/modules/talents/components/invite_talent_modal.svelte', async () => {
  const mod = await import('../../shared/fixtures/layout_mock.svelte')
  return { default: mod.default }
})

import OrgTalentShowPage from '@/apps/org/modules/talents/show.svelte'

function buildProps() {
  return {
    user: {
      id: 'talent-1',
      username: 'duyet',
      email: 'duyet@example.com',
      status_name: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-07-03T00:00:00.000Z',
    },
    userSkills: [],
    completeness: 100,
    spiderChartData: {
      technology: [],
      engineering: [],
      soft_skills: [],
      delivery: [],
    },
    isOwnProfile: false,
    deliveryMetrics: {
      delivery: {
        total_tasks_completed: 2,
        tasks_on_time: 2,
        tasks_late: 0,
        late_percentage: 0,
        estimate_accuracy_percentage: 100,
        avg_hours_over_estimate: 0,
      },
      skill_aggregation: {
        total_skills: 0,
        reviewed_skills: 0,
        avg_percentage: 0,
      },
      years_of_experience: 1,
      joined_at_formatted: '01/01/2026',
    },
    featuredReviews: [],
    workHistory: {
      organizations: [
        {
          org_name: 'Suar',
          org_role: 'org_member',
          joined_at: '2026-01-01',
          status: 'approved',
        },
      ],
      projects: [
        {
          project_name: 'Marketplace Matching',
          org_name: 'Suar',
          project_role: 'project_contributor',
          start_date: '2026-02-01',
          end_date: null,
          visibility: 'public',
        },
      ],
    },
  }
}

describe('OrgTalentShowPage', () => {
  it('shows verified work history for recruiter review', () => {
    page.props = {
      auth: {
        user: {
          id: 'recruiter-1',
          current_organization_id: 'org-1',
        },
      },
      flash: {},
      errors: {},
    }
    page.url = '/org/talents/talent-1'

    render(OrgTalentShowPage, { props: buildProps() })

    expect(screen.getByRole('heading', { name: 'Tổ chức (1)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Dự án (1)' })).toBeInTheDocument()
    expect(screen.getAllByText('Suar').length).toBeGreaterThan(0)
    expect(screen.getByText('Marketplace Matching')).toBeInTheDocument()
  })
})
