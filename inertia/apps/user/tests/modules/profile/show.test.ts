import { page } from '@inertiajs/svelte'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import axios from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/apps/user/shared/layouts/app_layout.svelte', async () => {
  const mod = await import('../../shared/fixtures/layout_mock.svelte')
  return { default: mod.default }
})

vi.mock('@/apps/user/shared/layouts/organization_layout.svelte', async () => {
  const mod = await import('../../shared/fixtures/layout_mock.svelte')
  return { default: mod.default }
})

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}))

import ProfileShowPage from '@/apps/user/modules/profile/show.svelte'
import ProfileViewPage from '@/apps/user/modules/profile/view.svelte'

const mockedAxios = vi.mocked(axios)

function buildProps() {
  return {
    user: {
      id: 'user-1',
      username: 'duyet',
      email: 'duyet@example.com',
      status_name: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-07-03T00:00:00.000Z',
      current_organization: {
        id: 'org-1',
        name: 'Suar',
      },
    },
    userSkills: [],
    completeness: 100,
    spiderChartData: {
      technology: [],
      engineering: [],
      soft_skills: [],
      delivery: [],
    },
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
      joined_at_formatted: '01/01/2026',
    },
    featuredReviews: [],
    workHistory: {
      organizations: [],
      projects: [],
    },
    currentSnapshot: null,
    auth: {
      user: {
        current_organization_role: 'org_member',
      },
    },
  }
}

function buildPublicProfileProps() {
  return {
    user: {
      id: 'talent-1',
      username: 'safe-talent',
      email: 'private-email@example.com',
      status_name: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-07-03T00:00:00.000Z',
      current_organization: {
        id: 'org-1',
        name: 'Suar',
      },
      private_marker: 'do-not-render-private-marker',
    },
    userSkills: [],
    completeness: 70,
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
        estimate_accuracy_percentage: 90,
        avg_hours_over_estimate: 0,
      },
      skill_aggregation: {
        total_skills: 0,
        reviewed_skills: 0,
        avg_percentage: null,
      },
      years_of_experience: 1,
      joined_at_formatted: '01/01/2026',
    },
    featuredReviews: [],
    workHistory: {
      organizations: [],
      projects: [],
    },
    auth: {
      user: {
        current_organization_role: 'org_member',
      },
    },
  }
}

describe('ProfileShowPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders the capability dossier as one page with snapshot in an action popover', async () => {
    mockedAxios.get.mockResolvedValue({ data: { data: [] } })
    page.props = {
      auth: {
        user: {
          current_organization_id: 'org-1',
        },
      },
      flash: {},
      errors: {},
    }
    page.url = '/profile'

    render(ProfileShowPage, { props: buildProps() })

    expect(screen.queryByRole('tab', { name: 'Kinh nghiệm' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tổng quan' })).toHaveAttribute('href', '#profile-overview')
    expect(screen.getByRole('link', { name: 'Năng lực' })).toHaveAttribute('href', '#profile-skills')
    expect(screen.getByRole('link', { name: 'Evidence' })).toHaveAttribute('href', '#profile-evidence')
    expect(screen.getByRole('link', { name: 'Kinh nghiệm' })).toHaveAttribute('href', '#profile-work-history')

    expect(screen.getByText('Chưa có tổ chức nào.')).toBeInTheDocument()
    expect(screen.getByText('Chưa có dự án nào.')).toBeInTheDocument()
    expect(screen.queryByTestId('profile-snapshot-popover')).not.toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'Tạo snapshot' }))

    expect(screen.getByTestId('profile-snapshot-popover')).toBeInTheDocument()
  })

  it('renders public profile safe fields without exposing private profile data', async () => {
    mockedAxios.get.mockResolvedValue({ data: { data: [] } })
    page.props = {
      auth: {
        user: {
          id: 'viewer-1',
          current_organization_role: 'org_member',
        },
      },
      flash: {},
      errors: {},
    }
    page.url = '/profiles/talent-1'

    const { container } = render(ProfileViewPage, { props: buildPublicProfileProps() })

    expect(screen.getByRole('heading', { name: 'safe-talent' })).toBeInTheDocument()
    expect(screen.getByText(/active · Capability profile synthesized/i)).toBeInTheDocument()
    expect(screen.getByText('2/2 tasks on time')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Lưu talent' })).toBeInTheDocument()

    await waitFor(() => {
      expect(mockedAxios.get.mock.calls).toContainEqual(['/api/v1/recruiter-bookmarks'])
    })

    expect(container.textContent).not.toMatch(
      /private-email@example\.com|do-not-render-private-marker|shareable_token|token=/i
    )
    expect(screen.queryByRole('button', { name: 'Chỉnh sửa' })).not.toBeInTheDocument()
  })
})
