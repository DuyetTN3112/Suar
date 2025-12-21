/* eslint-disable import-x/order */
import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import EmptyStub from '../../shared/test_stubs/empty_stub.svelte'
import LayoutStub from '../../shared/test_stubs/layout_stub.svelte'
import ProjectSprintPanelStub from '../../shared/test_stubs/project_sprint_panel_stub.svelte'

vi.mock('@/apps/user/shared/layouts/app_layout.svelte', () => ({
  default: LayoutStub,
}))

vi.mock('@/apps/user/shared/layouts/organization_layout.svelte', () => ({
  default: LayoutStub,
}))

vi.mock('@inertiajs/svelte', () => ({
  page: {
    url: '/tasks?search=api',
    props: {
      auth: {
        user: {
          current_organization_role: null,
        },
      },
    },
  },
  router: {
    get: vi.fn(),
    visit: vi.fn(),
    reload: vi.fn(),
  },
}))

vi.mock('@/apps/user/modules/tasks/components/header/task_header.svelte', () => ({
  default: EmptyStub,
}))

vi.mock('@/apps/user/modules/tasks/components/header/task_scope_bar.svelte', () => ({
  default: EmptyStub,
}))

vi.mock('@/apps/user/modules/tasks/components/modals/task_index_modals.svelte', () => ({
  default: EmptyStub,
}))

vi.mock('@/apps/user/modules/tasks/components/views/kanban/kanban_board.svelte', () => ({
  default: EmptyStub,
}))

vi.mock('@/apps/user/modules/projects/components/project_sprint_panel.svelte', () => ({
  default: ProjectSprintPanelStub,
}))

import TasksIndexPage from '@/apps/user/modules/tasks/index.svelte'

describe('TasksIndexPage', () => {
  it('exposes a stable page heading for the task workspace', () => {
    render(TasksIndexPage, {
      props: {
        workspaceView: 'board',
        baseRoute: '/tasks',
        tasks: {
          data: [],
          meta: {
            total: 0,
            per_page: 10,
            current_page: 1,
            last_page: 1,
          },
        },
        filters: {},
        metadata: {
          statuses: [],
          labels: [],
          priorities: [],
          users: [],
        },
        permissions: {
          canCreateTask: false,
          createTaskReason: null,
          canManageWorkflow: false,
        },
        projectOptions: [],
        projectContext: {
          selectedProject: null,
        },
      },
    })

    expect(screen.getByRole('heading', { level: 1, name: 'Quản lý nhiệm vụ' })).toBeInTheDocument()
  })

  it('does not render sprint link when board workspace has no project scope', () => {
    render(TasksIndexPage, {
      props: {
        workspaceView: 'board',
        baseRoute: '/tasks',
        tasks: {
          data: [],
          meta: {
            total: 45,
            per_page: 10,
            current_page: 2,
            last_page: 5,
          },
        },
        filters: {
          search: 'api',
          priority: 'high',
        },
        metadata: {
          statuses: [],
          labels: [],
          priorities: [],
          users: [],
        },
        permissions: {
          canCreateTask: true,
          createTaskReason: null,
          canManageWorkflow: false,
        },
        projectOptions: [],
        projectContext: {
          selectedProject: null,
        },
      },
    })

    expect(screen.queryByTestId('project-sprint-link')).not.toBeInTheDocument()
  })

  it('does not render sprint link when board workspace is scoped to a project', () => {
    render(TasksIndexPage, {
      props: {
        workspaceView: 'board',
        baseRoute: '/tasks',
        tasks: {
          data: [],
          meta: {
            total: 0,
            per_page: 10,
            current_page: 1,
            last_page: 1,
          },
        },
        filters: {
          project_id: 'project-1',
        },
        metadata: {
          statuses: [],
          labels: [],
          priorities: [],
          users: [],
        },
        permissions: {
          canCreateTask: true,
          createTaskReason: null,
          canManageWorkflow: false,
          canAccessProjectSprints: true,
          canManageProjectSprints: true,
        },
        projectOptions: [{ id: 'project-1', name: 'Project One' }],
        projectContext: {
          selectedProject: { id: 'project-1', name: 'Project One' },
        },
      },
    })

    expect(screen.queryByTestId('project-sprint-link')).not.toBeInTheDocument()
  })
})
