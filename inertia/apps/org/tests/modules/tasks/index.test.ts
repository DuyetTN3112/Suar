import { render, screen } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import TasksIndexPage from '@/apps/org/modules/tasks/index.svelte'

vi.mock('@/apps/org/shared/layouts/organization_layout.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

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

vi.mock('@/apps/org/modules/tasks/components/header/task_header.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/org/modules/tasks/components/header/task_scope_bar.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/org/modules/tasks/components/modals/task_index_modals.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/org/modules/tasks/components/views/kanban/kanban_board.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

describe('TasksIndexPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('hosts the real member saved-view lifecycle surface', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ views: [] }),
    }))

    render(TasksIndexPage, {
      props: {
        workspaceView: 'board',
        baseRoute: '/tasks',
        tasks: { data: [], meta: { total: 0, per_page: 10, current_page: 1, last_page: 1 } },
        filters: {},
        metadata: { statuses: [], labels: [], priorities: [], users: [] },
        permissions: { canCreateTask: true, createTaskReason: null, canManageWorkflow: false },
        projectOptions: [],
        projectContext: { selectedProject: null },
      },
    })

    expect(screen.getByRole('button', { name: 'Saved views menu' })).toBeInTheDocument()
  })

  it('does not render sprint controls when board workspace has no project scope', () => {
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
    expect(screen.queryByTestId('project-sprint-controls')).not.toBeInTheDocument()
  })
})
