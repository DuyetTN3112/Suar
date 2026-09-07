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
      demonstratedWork: [
        {
          taskAssignmentId: 'assignment-1',
          taskId: 'task-1',
          action: 'architecture_design',
          object: 'Public API design',
          ownership: 'architect',
          context: {
            businessDomain: 'payments',
            problemCategory: 'scalability',
            collaborationType: 'cross_team',
            environment: 'production',
            scaleSummary: 'High-throughput payment API',
          },
          output: { title: 'Public API design', difficulty: 'hard' },
          outcome: { onTime: true, qualityScore: 5 },
          verification: {
            status: 'review_confirmed',
            confidence: 'high',
            method: 'human_review',
            evidenceSufficiency: 'adequate',
          },
          completedAt: '2026-07-03T00:00:00.000Z',
        },
      ],
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
      demonstratedWork: [
        {
          taskAssignmentId: 'assignment-public-1',
          taskId: 'task-public-1',
          action: 'api_design',
          object: 'Public API delivery',
          ownership: 'primary_owner',
          context: {
            businessDomain: 'payments',
            problemCategory: 'authorization',
            collaborationType: 'cross_team',
            environment: 'production',
            scaleSummary: 'Public API',
          },
          output: { title: 'Public API delivery', difficulty: 'hard' },
          outcome: { onTime: true, qualityScore: 5 },
          verification: {
            status: 'review_confirmed',
            confidence: 'high',
            method: 'human_review',
            evidenceSufficiency: 'adequate',
          },
          completedAt: '2026-07-03T00:00:00.000Z',
        },
      ],
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

  it('renders the capability dossier as one page with snapshot management as a real page link', async () => {
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

    expect(screen.getByRole('tab', { name: 'Công việc đã chứng minh' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Tổng quan' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Năng lực' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Bằng chứng' })).toHaveAttribute('aria-selected', 'false')

    expect(screen.getByText('Chưa có tổ chức nào.')).toBeInTheDocument()
    expect(screen.getByText('Chưa có dự án nào.')).toBeInTheDocument()
    expect(screen.getByText('Public API design')).toBeInTheDocument()
    expect(screen.getByText(/Review confirmed|Đã xác nhận/i)).toBeInTheDocument()
    expect(screen.getByText('architect')).toBeInTheDocument()
    expect(screen.queryByTestId('profile-snapshot-popover')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Quản lý snapshot|Manage snapshots/i })).toHaveAttribute(
      'href',
      expect.stringContaining('/profile/snapshots')
    )

    await fireEvent.click(screen.getByRole('tab', { name: 'Năng lực' }))
    expect(screen.getByRole('tab', { name: 'Năng lực' })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows the approved AI work claim and observed capability without treating it as a score', () => {
    const props = buildProps()
    const approvedWork = props.workHistory.demonstratedWork[0]! as (typeof props.workHistory.demonstratedWork)[number] & {
      statement?: string
      capabilities?: Array<{ name: string; observedLevel: string }>
    }
    approvedWork.output.title = 'Thiết kế khu vực quản trị'
    approvedWork.statement = 'Thiết kế luồng phân quyền cho khu vực quản trị.'
    approvedWork.verification = {
      status: 'admin_confirmed',
      confidence: 'limited',
      method: 'Phân tích AI đã được quản trị viên hệ thống phê duyệt',
      evidenceSufficiency: 'governed_exception',
    }
    approvedWork.capabilities = [{ name: 'Svelte', observedLevel: 'l6' }]

    render(ProfileShowPage, { props })

    expect(screen.getByText('Thiết kế luồng phân quyền cho khu vực quản trị.')).toBeInTheDocument()
    expect(screen.getByText('AI phân tích, quản trị viên phê duyệt')).toBeInTheDocument()
    expect(screen.getByText('Năng lực được phê duyệt')).toBeInTheDocument()
    expect(screen.getByText('Svelte · người làm L6')).toBeInTheDocument()
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
    expect(screen.getByText(/active · Hồ sơ năng lực dựa trên bằng chứng review đã hoàn tất/i)).toBeInTheDocument()
    expect(screen.getByText('2/2 nhiệm vụ đúng hạn')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Lưu nhân tài' })).toBeInTheDocument()
    expect(container.textContent.indexOf('Public API delivery')).toBeLessThan(
      container.textContent.indexOf('2/2 nhiệm vụ đúng hạn')
    )

    await waitFor(() => {
      expect(mockedAxios.get.mock.calls).toContainEqual(['/api/v1/recruiter-bookmarks'])
    })

    expect(container.textContent).not.toMatch(
      /private-email@example\.com|do-not-render-private-marker|shareable_token|token=/i
    )
    expect(screen.queryByRole('button', { name: 'Chỉnh sửa' })).not.toBeInTheDocument()
  })
})
