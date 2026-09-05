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

  it('opens end-delivery dialog and requires destinations for incomplete work', async () => {
    mockSprintListAndBoard()
    render(ProjectSprintPanel, { props: { projectId: 'project-1', canManage: true } })

    await waitFor(() => expect(screen.getByText('Sprint One')).toBeInTheDocument())
    await fireEvent.click(screen.getByRole('button', { name: 'Kết thúc sprint' }))

    expect(screen.getByRole('dialog', { name: /End Sprint delivery|Kết thúc delivery sprint/i })).toBeInTheDocument()
    expect(screen.getByText(/Incomplete work must be explicitly planned before delivery ends|Công việc chưa hoàn thành phải được lập kế hoạch rõ ràng/i)).toBeInTheDocument()
    await fireEvent.click(screen.getByRole('button', { name: /End delivery|Kết thúc delivery/i }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(mockedAxios.post).not.toHaveBeenCalled()
    await fireEvent.click(screen.getByRole('button', { name: /Cancel|Hủy/i }))
    expect(screen.queryByRole('dialog', { name: /End Sprint delivery|Kết thúc delivery sprint/i })).not.toBeInTheDocument()
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
    expect(screen.getByRole('heading', { name: 'Danh sách chờ' })).toBeInTheDocument()
    expect(screen.getAllByText('Ship sprint planning without hiding review debt').length).toBeGreaterThan(0)

    await fireEvent.click(screen.getByRole('button', { name: 'Đưa vào sprint' }))

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
    expect(screen.queryByRole('button', { name: 'Tạo sprint' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mở review' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Đưa vào sprint' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Về backlog' })).not.toBeInTheDocument()
  })

  it('starts a draft sprint through the named start action', async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url === '/api/v1/projects/project-1/sprint-board') {
        return Promise.resolve({ data: { data: { projectId: 'project-1', sprint: null, backlogTasks: [], sprintTasks: [], counts: { backlogTasks: 0, sprintTasks: 0 } } } })
      }
      return Promise.resolve({ data: { data: [{ id: 'sprint-draft', name: 'Draft Sprint', goal: null, status: 'draft', startsAt: '2026-07-01T00:00:00.000Z', endsAt: '2026-07-14T00:00:00.000Z', reviewOpenedAt: null, reviewClosedAt: null }] } })
    })
    mockedAxios.post.mockResolvedValue({ data: { data: { id: 'sprint-draft', status: 'active' } } })

    render(ProjectSprintPanel, { props: { projectId: 'project-1', canManage: true } })
    await waitFor(() => expect(screen.getByText('Draft Sprint')).toBeInTheDocument())
    await fireEvent.click(screen.getByRole('button', { name: /Start sprint|Bắt đầu sprint/i }))

    expect(mockedAxios.post).toHaveBeenCalledWith('/api/v1/projects/project-1/sprints/sprint-draft/start', {})
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

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Kế hoạch' })).toBeInTheDocument())
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

    await waitFor(() => expect(screen.getByPlaceholderText('Tên sprint')).toBeInTheDocument())
    await fireEvent.input(screen.getByPlaceholderText('Tên sprint'), {
      target: { value: 'Sprint Two' },
    })
    await fireEvent.input(screen.getByPlaceholderText('Mục tiêu sprint'), {
      target: { value: 'Make sprint planning usable before review opens' },
    })
    await fireEvent.input(screen.getByLabelText('Bắt đầu sprint'), {
      target: { value: '2026-07-16T09:00' },
    })
    await fireEvent.input(screen.getByLabelText('Kết thúc sprint'), {
      target: { value: '2026-07-30T18:00' },
    })
    await fireEvent.click(screen.getByRole('button', { name: 'Tạo sprint' }))

    const anyString: unknown = expect.any(String)
    expect(mockedAxios.post.mock.calls[0]).toEqual([
      '/api/v1/projects/project-1/sprints',
      expect.objectContaining({
        name: 'Sprint Two',
        goal: 'Make sprint planning usable before review opens',
        startsAt: anyString,
        endsAt: anyString,
        status: 'draft',
      })
    ])
  })
})
