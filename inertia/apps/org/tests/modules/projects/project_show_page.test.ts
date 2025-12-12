/* eslint-disable import-x/order */
import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import EmptyStub from '../../shared/test_stubs/empty_stub.svelte'
import LayoutStub from '../../shared/test_stubs/layout_stub.svelte'

const { inertiaPage } = vi.hoisted(() => ({
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
}))

vi.mock('@inertiajs/svelte', () => ({
  page: inertiaPage,
  router: {
    put: vi.fn(),
    delete: vi.fn(),
    visit: vi.fn(),
  },
}))

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}))


vi.mock('@/apps/org/shared/layouts/organization_layout.svelte', () => ({
  default: LayoutStub,
}))

vi.mock('@/apps/org/shared/stores/notification_store.svelte', () => ({
  notificationStore: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@/apps/org/shared/components/confirm_dialog.svelte', () => ({
  default: EmptyStub,
}))

vi.mock('@/apps/org/modules/projects/components/project_details_tab.svelte', () => ({
  default: EmptyStub,
}))

vi.mock('@/apps/org/modules/projects/components/project_members_tab.svelte', () => ({
  default: EmptyStub,
}))

vi.mock('@/apps/org/modules/projects/components/project_staffing_panel.svelte', () => ({
  default: EmptyStub,
}))

vi.mock('@/apps/org/modules/projects/components/project_roles_tab.svelte', () => ({
  default: EmptyStub,
}))

vi.mock('@/apps/org/modules/projects/components/project_operating_model_tab.svelte', () => ({
  default: EmptyStub,
}))

vi.mock('@/apps/org/modules/projects/components/project_skills_tab.svelte', () => ({
  default: EmptyStub,
}))

vi.mock('@/apps/org/modules/projects/components/project_sprint_panel.svelte', () =>
  import('../../shared/test_stubs/project_sprint_panel_stub.svelte')
)

import ProjectShowPage from '@/apps/org/modules/projects/show.svelte'

describe('ProjectShowPage', () => {
  it('keeps review content out of the default project overview', () => {
    inertiaPage.url = '/projects/project-1'

    render(ProjectShowPage, {
      props: {
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
          isCreator: false,
          isManager: false,
          isMember: true,
          canEdit: false,
          canDelete: false,
        },
      },
    })

    expect(screen.queryByText('Review Governance')).not.toBeInTheDocument()
    expect(screen.queryByText('Reverse review cho dự án')).not.toBeInTheDocument()
  })

  it('renders sprint management as its own project tab', () => {
    inertiaPage.url = '/projects/project-1?focus=sprints'

    render(ProjectShowPage, {
      props: {
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
      },
    })

    expect(screen.getByTestId('project-sprint-controls')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sprint của project' })).toBeInTheDocument()
  })

})
