import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { inertiaPage } = vi.hoisted(() => ({
  inertiaPage: {
    props: {
      auth: {
        user: {
          current_project: {
            id: 'project-1',
          },
        },
      },
    },
  },
}))

vi.mock('@inertiajs/svelte', () => ({
  page: inertiaPage,
}))

import CreateTaskModal from '@/apps/org/modules/tasks/components/modals/create_task_modal.svelte'

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}))

describe('CreateTaskModal', () => {
  type JsonResponse = { json: () => Promise<unknown> }
  const fetchMock = vi.fn<(input: string | URL) => Promise<JsonResponse>>()

  function getRequestUrl(input: string | URL): string {
    return typeof input === 'string' ? input : input.toString()
  }

  beforeEach(() => {
    fetchMock.mockImplementation((input) => {
      const url = getRequestUrl(input)

      if (url === '/api/v1/projects/project-1/professional-roles') {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              data: [{ id: 'role-1', name: 'Backend', code: 'backend_engineer' }],
            }),
        })
      }

      if (url === '/api/v1/projects/project-1') {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              data: {
                members: [
                  {
                    userId: 'user-1',
                    username: 'duyet',
                    email: 'duyet@example.com',
                    role: 'project_manager',
                    projectProfessionalRoleId: 'role-1',
                    professionalRoleName: 'Backend',
                  },
                ],
              },
            }),
        })
      }

      if (url === '/projects/project-1/member-candidates') {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              data: [
                {
                  userId: 'user-2',
                  username: 'alex',
                  email: 'alex@example.com',
                  orgRole: 'org_member',
                },
              ],
            }),
        })
      }

      if (url === '/api/v1/projects/project-1/professional-roles/role-1/requirements') {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              data: {
                requirements: [
                  {
                    skillId: 'skill-1',
                    skillName: 'TypeScript',
                    categoryCode: 'technology',
                    requiredLevelCode: 'l7',
                  },
                ],
              },
            }),
        })
      }

      return Promise.reject(new Error(`Unhandled fetch ${url}`))
    })

    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('loads modal project data once when opened', async () => {
    render(CreateTaskModal, {
      props: {
        open: true,
        onOpenChange: vi.fn(),
        statuses: [{ value: 'todo', label: 'To do' }],
        priorities: [{ value: 'high', label: 'High' }],
        labels: [{ value: 'backend', label: 'Backend' }],
        projects: [{ id: 'project-1', name: 'Project One' }],
        users: [{ id: 'user-1', username: 'duyet', email: 'duyet@example.com' }],
        parentTasks: [],
        availableSkills: [{ id: 'skill-1', name: 'TypeScript' }],
        proficiencyLevels: [{ value: 'l7', label: 'L7 · Middle Solid' }],
        initialProjectId: 'project-1',
      },
    })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })

    await Promise.resolve()
    await Promise.resolve()

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/projects/project-1/professional-roles')
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/projects/project-1')
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/projects/project-1/member-candidates')
  })

  it('falls back to current project context when initialProjectId is omitted', async () => {
    render(CreateTaskModal, {
      props: {
        open: true,
        onOpenChange: vi.fn(),
        statuses: [{ value: 'todo', label: 'To do' }],
        priorities: [{ value: 'high', label: 'High' }],
        labels: [{ value: 'backend', label: 'Backend' }],
        projects: [{ id: 'project-1', name: 'Project One' }],
        users: [{ id: 'user-1', username: 'duyet', email: 'duyet@example.com' }],
        parentTasks: [],
        availableSkills: [{ id: 'skill-1', name: 'TypeScript' }],
        proficiencyLevels: [{ value: 'l7', label: 'L7 · Middle Solid' }],
      },
    })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/projects/project-1/professional-roles')
    })
  })

  it('auto-prefills required skills when a role is selected', async () => {
    render(CreateTaskModal, {
      props: {
        open: true,
        onOpenChange: vi.fn(),
        statuses: [{ value: 'todo', label: 'To do' }],
        priorities: [{ value: 'high', label: 'High' }],
        labels: [{ value: 'backend', label: 'Backend' }],
        projects: [{ id: 'project-1', name: 'Project One' }],
        users: [{ id: 'user-1', username: 'duyet', email: 'duyet@example.com' }],
        parentTasks: [],
        availableSkills: [{ id: 'skill-1', name: 'TypeScript' }],
        proficiencyLevels: [{ value: 'l7', label: 'L7 · Middle Solid' }],
        initialProjectId: 'project-1',
      },
    })

    await waitFor(() => {
      expect(screen.getByLabelText('Áp theo role')).toBeInTheDocument()
    })

    await fireEvent.change(screen.getByLabelText('Áp theo role'), {
      target: { value: 'role-1' },
    })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/projects/project-1/professional-roles/role-1/requirements'
      )
      expect(screen.getByText(/Đã nạp 1 skill từ role đang chọn/i)).toBeInTheDocument()
    })
  })
})
