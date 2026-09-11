import { render, screen, waitFor } from '@testing-library/svelte'
import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ProjectSprintPanel from '@/apps/user/modules/projects/components/project_sprint_panel.svelte'

vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))
vi.mock('@/apps/user/shared/stores/notification_store.svelte', () => ({ notificationStore: { error: vi.fn(), success: vi.fn() } }))

const mockedAxios = vi.mocked(axios)

describe('User ProjectSprintPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAxios.get.mockImplementation((url: string) => {
      if (url === '/api/v1/projects/project-1/sprint-board') {
        return Promise.resolve({ data: { data: { projectId: 'project-1', sprint: { id: 'sprint-1', name: 'Active Sprint', goal: null, status: 'active', startsAt: '2026-07-01T00:00:00.000Z', endsAt: '2026-07-14T00:00:00.000Z' }, backlogTasks: [{ id: 'backlog-1', title: 'Backlog task', status: 'todo', priority: 'medium', assignedTo: null, projectSprintId: null, sortOrder: 1, updatedAt: '2026-07-02T00:00:00.000Z' }], sprintTasks: [], counts: { backlogTasks: 1, sprintTasks: 0 } } } })
      }
      return Promise.resolve({ data: { data: [{ id: 'sprint-1', name: 'Active Sprint', goal: null, status: 'active', startsAt: '2026-07-01T00:00:00.000Z', endsAt: '2026-07-14T00:00:00.000Z', reviewOpenedAt: null, reviewClosedAt: null }] } })
    })
  })

  it('keeps backlog and sprint reads visible while hiding planning mutations for members', async () => {
    render(ProjectSprintPanel, { props: { projectId: 'project-1', canManage: false } })
    await waitFor(() => expect(screen.getByText('Backlog task')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Danh sách chờ sản phẩm' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start sprint' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Move to sprint' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'End sprint' })).not.toBeInTheDocument()
  })
})
