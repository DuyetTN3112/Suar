import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ProjectSprintPanel from '@/apps/org/modules/projects/components/project_sprint_panel.svelte'

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}))

vi.mock('@/apps/org/shared/stores/notification_store.svelte', () => ({
  notificationStore: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

const mockedAxios = vi.mocked(axios)

function mockSprintListAndBoard() {
  mockedAxios.get.mockImplementation((url: string) => {
    if (url === '/api/v1/projects/project-1/sprint-board') {
      return Promise.resolve({
        data: {
          data: {
            projectId: 'project-1',
            sprint: {
              id: 'sprint-1',
              name: 'Sprint One',
              goal: 'Ship sprint planning without hiding review debt',
              status: 'active',
              startsAt: '2026-07-01T00:00:00.000Z',
              endsAt: '2026-07-14T00:00:00.000Z',
            },
            backlogTasks: [
              {
                id: 'task-backlog',
                title: 'Backlog task',
                taskStatusId: 'todo',
                status: 'todo',
                priority: 'medium',
                assignedTo: null,
                projectSprintId: null,
                sortOrder: 1,
                updatedAt: '2026-07-10T00:00:00.000Z',
              },
            ],
            sprintTasks: [
              {
                id: 'task-sprint',
                title: 'Sprint task',
                taskStatusId: 'doing',
                status: 'in_progress',
                priority: 'high',
                assignedTo: 'user-1',
                projectSprintId: 'sprint-1',
                sortOrder: 2,
                updatedAt: '2026-07-11T00:00:00.000Z',
              },
            ],
            counts: { backlogTasks: 1, sprintTasks: 1 },
          },
        },
      })
    }

    return Promise.resolve({
      data: {
        data: [
          {
            id: 'sprint-1',
            name: 'Sprint One',
            goal: 'Ship sprint planning without hiding review debt',
            status: 'active',
            startsAt: '2026-07-01T00:00:00.000Z',
            endsAt: '2026-07-14T00:00:00.000Z',
            reviewOpenedAt: null,
            reviewClosedAt: null,
          },
        ],
      },
    })
  })
}

describe('ProjectSprintPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads sprint list and closes active sprint into the review window', async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url === '/api/v1/projects/project-1/sprint-board') {
        return Promise.resolve({
          data: {
            data: {
              projectId: 'project-1',
              sprint: null,
              backlogTasks: [],
              sprintTasks: [],
              counts: { backlogTasks: 0, sprintTasks: 0 },
            },
          },
        })
      }

      return Promise.resolve({
        data: {
          data: [
            {
              id: 'sprint-1',
              name: 'Sprint One',
              goal: null,
              status: 'active',
              startsAt: '2026-07-01T00:00:00.000Z',
              endsAt: '2026-07-14T00:00:00.000Z',
              reviewOpenedAt: null,
              reviewClosedAt: null,
            },
          ],
          pagination: {
            mode: 'offset',
            page: 2,
            perPage: 10,
            total: 24,
            lastPage: 3,
            hasNextPage: true,
            hasPreviousPage: true,
          },
        },
      })
    })
    mockedAxios.post.mockResolvedValue({ data: { data: { sprintId: 'sprint-1' } } })
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        data: [
          {
              id: 'sprint-1',
              name: 'Sprint One',
              goal: null,
              status: 'active',
            startsAt: '2026-07-01T00:00:00.000Z',
            endsAt: '2026-07-14T00:00:00.000Z',
            reviewOpenedAt: null,
            reviewClosedAt: null,
          },
        ],
        pagination: {
          mode: 'offset',
          page: 2,
          perPage: 10,
          total: 24,
          lastPage: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      },
    })
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        data: {
          projectId: 'project-1',
          sprint: null,
          backlogTasks: [],
          sprintTasks: [],
          counts: { backlogTasks: 0, sprintTasks: 0 },
        },
      },
    })
    mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'sprint-1',
              name: 'Sprint One',
              goal: null,
              status: 'review_open',
              startsAt: '2026-07-01T00:00:00.000Z',
              endsAt: '2026-07-14T00:00:00.000Z',
              reviewOpenedAt: '2026-07-14T01:00:00.000Z',
              reviewClosedAt: null,
            },
          ],
        },
      })
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        data: {
          projectId: 'project-1',
          sprint: null,
          backlogTasks: [],
          sprintTasks: [],
          counts: { backlogTasks: 0, sprintTasks: 0 },
        },
      },
    })

    render(ProjectSprintPanel, {
      props: {
        projectId: 'project-1',
        canManage: true,
      },
    })

    await waitFor(() => expect(screen.getByText('Sprint One')).toBeInTheDocument())
    expect(screen.getByText('11-20 / 24')).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'End sprint' }))

    expect(mockedAxios.post.mock.calls[0]).toEqual([
      '/api/v1/projects/project-1/sprints/sprint-1/open-review',
      {},
    ])
    await waitFor(() => expect(screen.getByText('In review')).toBeInTheDocument())
  })

  it('loads sprint board and moves tasks between backlog and selected sprint', async () => {
    mockSprintListAndBoard()
    mockedAxios.patch.mockResolvedValue({ data: { data: { id: 'task-backlog' } } })

    render(ProjectSprintPanel, {
      props: {
        projectId: 'project-1',
        canManage: true,
      },
    })

    await waitFor(() => expect(screen.getByText('Backlog task')).toBeInTheDocument())
    expect(screen.getByText('Sprint task')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Backlog' })).toBeInTheDocument()
    expect(screen.getAllByText('Ship sprint planning without hiding review debt').length).toBeGreaterThan(0)

    await fireEvent.click(screen.getByRole('button', { name: 'Move to sprint' }))

    expect(mockedAxios.patch.mock.calls[0]).toEqual([
      '/api/v1/projects/project-1/tasks/task-backlog/sprint',
      { projectSprintId: 'sprint-1' },
    ])
  })

  it('lets regular project members inspect sprint board without management actions', async () => {
    mockSprintListAndBoard()

    render(ProjectSprintPanel, {
      props: {
        projectId: 'project-1',
        canManage: false,
      },
    })

    await waitFor(() => expect(screen.getByText('Backlog task')).toBeInTheDocument())
    expect(screen.getByText('Sprint task')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create sprint' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mở review' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Move to sprint' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Move to backlog' })).not.toBeInTheDocument()
  })

  it('keeps sprint planning copy concise in the main workbench', async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url === '/api/v1/projects/project-1/sprint-board') {
        return Promise.resolve({
          data: {
            data: {
              projectId: 'project-1',
              sprint: null,
              backlogTasks: [],
              sprintTasks: [],
              counts: { backlogTasks: 0, sprintTasks: 0 },
            },
          },
        })
      }

      return Promise.resolve({
        data: {
          data: [],
          pagination: null,
        },
      })
    })

    render(ProjectSprintPanel, {
      props: {
        projectId: 'project-1',
        canManage: true,
      },
    })

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Plan' })).toBeInTheDocument())
    expect(screen.queryByText('Agile Scrum')).not.toBeInTheDocument()
    expect(screen.queryByText(/Tạo sprint active/)).not.toBeInTheDocument()
    expect(screen.queryByText('Sprint Backlog')).not.toBeInTheDocument()
  })

  it('submits Sprint Goal when creating a sprint', async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url === '/api/v1/projects/project-1/sprint-board') {
        return Promise.resolve({
          data: {
            data: {
              projectId: 'project-1',
              sprint: null,
              backlogTasks: [],
              sprintTasks: [],
              counts: { backlogTasks: 0, sprintTasks: 0 },
            },
          },
        })
      }

      return Promise.resolve({
        data: {
          data: [],
          pagination: null,
        },
      })
    })
    mockedAxios.post.mockResolvedValue({ data: { data: { id: 'sprint-created' } } })

    render(ProjectSprintPanel, {
      props: {
        projectId: 'project-1',
        canManage: true,
      },
    })

    await waitFor(() => expect(screen.getByPlaceholderText('Sprint name')).toBeInTheDocument())
    await fireEvent.input(screen.getByPlaceholderText('Sprint name'), {
      target: { value: 'Sprint Two' },
    })
    await fireEvent.input(screen.getByPlaceholderText('Sprint goal'), {
      target: { value: 'Make sprint planning usable before review opens' },
    })
    await fireEvent.input(screen.getByLabelText('Sprint start'), {
      target: { value: '2026-07-16T09:00' },
    })
    await fireEvent.input(screen.getByLabelText('Sprint end'), {
      target: { value: '2026-07-30T18:00' },
    })
    await fireEvent.click(screen.getByRole('button', { name: 'Create sprint' }))

    const anyString: unknown = expect.any(String)
    expect(mockedAxios.post.mock.calls[0]).toEqual([
      '/api/v1/projects/project-1/sprints',
      expect.objectContaining({
        name: 'Sprint Two',
        goal: 'Make sprint planning usable before review opens',
        startsAt: anyString,
        endsAt: anyString,
        status: 'active',
      })
    ])
  })
})
