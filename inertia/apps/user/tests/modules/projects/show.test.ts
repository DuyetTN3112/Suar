import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import ProjectShowPage from '@/apps/user/modules/projects/show.svelte'

const { inertiaPage, router } = vi.hoisted(() => ({
  inertiaPage: {
    props: {
      auth: {
        user: {
          current_organization_role: 'org_member',
        },
      },
    },
    url: '/projects/project-1',
  },
  router: {
    put: vi.fn(),
    delete: vi.fn(),
    visit: vi.fn(),
  },
}))

vi.mock('@inertiajs/svelte', () => ({
  page: inertiaPage,
  router,
}))

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}))

vi.mock('@/apps/user/shared/layouts/app_layout.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/shared/stores/notification_store.svelte', () => ({
  notificationStore: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@/apps/user/shared/components/confirm_dialog.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/modules/projects/components/project_details_tab.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/modules/projects/components/project_members_tab.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/modules/projects/components/project_staffing_panel.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/modules/projects/components/project_roles_tab.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/modules/projects/components/project_operating_model_tab.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/modules/projects/components/project_skills_tab.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock(
  '@/apps/user/modules/projects/components/project_sprint_panel.svelte',
  () => import('../../shared/test_stubs/project_sprint_panel_stub.svelte')
)

const baseProps = {
  auth: {
    user: null,
  },
  project: {
    id: 'project-1',
    name: 'Governance rollout',
    organization_id: 'org-1',
    organization_name: 'Suar',
    creator_id: 'creator-1',
    creator_name: 'Owner',
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-06T00:00:00.000Z',
    status: 'active',
  },
  members: [],
  tasks: [],
  permissions: {
    isCreator: true,
    isManager: false,
    isMember: true,
    canEdit: true,
    canDelete: false,
  },
}

describe('User ProjectShowPage', () => {
  it('does not render review governance on project management tabs', () => {
    inertiaPage.url = '/projects/project-1?focus=members'

    render(ProjectShowPage, {
      props: {
        ...baseProps,
        review_governance: {
          total_sessions: 12,
          pending_sessions: 4,
          overdue_sessions: 2,
          disputed_sessions: 1,
          completed_sessions: 6,
          required_pending_assignments: 3,
          fallback_pending_assignments: 1,
          completion_rate: 50,
        },
      },
    })

    expect(screen.queryByText(/review governance|quản trị đánh giá/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/review sessions|phiên đánh giá/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('keeps project identity in the sidebar instead of repeating the large detail card', () => {
    inertiaPage.url = '/projects/project-1'

    render(ProjectShowPage, { props: baseProps })

    expect(screen.queryByText('User project detail')).not.toBeInTheDocument()
    expect(screen.queryByText('Org project detail')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit|sửa/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete|xóa/i })).not.toBeInTheDocument()
  })

  it('keeps project management navigation out of the page body', () => {
    inertiaPage.url = '/projects/project-1'

    render(ProjectShowPage, { props: baseProps })

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
  })

  it('opens the sprint panel from the user-shell focus URL', () => {
    inertiaPage.url = '/projects/project-1?focus=sprints'

    render(ProjectShowPage, { props: baseProps })

    expect(screen.getByTestId('project-sprint-controls')).toBeInTheDocument()
    expect(screen.queryAllByRole('heading', { level: 1 })).toHaveLength(0)
  })
})
