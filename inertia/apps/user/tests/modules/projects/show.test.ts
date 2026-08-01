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
  it('exposes operating model and sprint tabs for project owners outside org admin', () => {
    inertiaPage.url = '/projects/project-1'

    render(ProjectShowPage, { props: baseProps })

    expect(screen.getAllByRole('tab')).toHaveLength(6)
    expect(screen.getByRole('tab', { name: /operating model|mô hình/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /sprints|sprint/i })).toBeInTheDocument()
  })

  it('opens the sprint panel from the user-shell focus URL', () => {
    inertiaPage.url = '/projects/project-1?focus=sprints'

    render(ProjectShowPage, { props: baseProps })

    expect(screen.getByTestId('project-sprint-controls')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})
