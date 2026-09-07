import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { inertiaPage, axiosPost } = vi.hoisted(() => ({
  axiosPost: vi.fn(),
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

import CreateTaskModal from '@/apps/user/modules/tasks/components/modals/create_task_modal.svelte'

vi.mock('axios', () => ({
  default: {
    post: axiosPost,
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

      if (url === '/api/v1/projects/project-1/skills') {
        return Promise.resolve({ json: () => Promise.resolve({ data: [] }) })
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

  it('shows every missing publish field while leaving draft save available', async () => {
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

    const createButton = screen.getByRole('button', { name: /Tạo và giao|Đăng và giao task|Create and assign/i })
    expect(createButton).toBeEnabled()

    await fireEvent.click(createButton)

    expect(screen.getByTestId('task-create-validation-summary')).toBeInTheDocument()
    expect(screen.getByLabelText(/Tiêu đề/i)).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(screen.getByLabelText(/Tiêu đề/i)).toHaveFocus())

    await fireEvent.input(screen.getByLabelText(/Tiêu đề/i), {
      target: { value: 'Draft task' },
    })
    expect(screen.getByRole('button', { name: /Lưu nháp|Save draft/i })).toBeEnabled()
  })

  it('keeps the modal open while structured brief fields receive punctuation and spaces', async () => {
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

    await fireEvent.keyDown(screen.getByLabelText(/Tiêu đề/i), { key: '.' })
    await fireEvent.keyDown(screen.getByLabelText(/Phần bị tác động/i), { key: ' ' })

    expect(document.querySelector('[data-state="open"]')).not.toBeNull()
  })

  it('preserves the form draft after closing and reopening the modal', async () => {
    const { rerender } = render(CreateTaskModal, {
      props: {
        open: true,
        onOpenChange: vi.fn(),
        statuses: [{ value: 'todo', label: 'To do' }],
        projects: [{ id: 'project-1', name: 'Project One' }],
        initialProjectId: 'project-1',
      },
    })

    const title = screen.getByLabelText(/Tiêu đề|Title/i)
    await fireEvent.input(title, { target: { value: 'Keep this task draft' } })
    await fireEvent.click(screen.getByRole('button', { name: /Hủy|Cancel/i }))
    await rerender({ open: false })
    await rerender({ open: true })

    expect(screen.getByLabelText(/Tiêu đề|Title/i)).toHaveValue('Keep this task draft')
  })

  it('saves a structured-brief draft locally without creating a task', async () => {

    render(CreateTaskModal, {
      props: {
        open: true,
        onOpenChange: vi.fn(),
        statuses: [{ value: 'todo', label: 'To do' }],
        projects: [{ id: 'project-1', name: 'Project One' }],
        initialProjectId: 'project-1',
      },
    })

    await fireEvent.input(screen.getByLabelText(/Phần bị tác động/i), { target: { value: 'Trải nghiệm tạo task' } })
    await fireEvent.click(screen.getByRole('button', { name: /Lưu nháp|Save draft/i }))

    expect(axiosPost).not.toHaveBeenCalled()
  })

  it('discards the in-memory modal draft after confirmation', async () => {
    const { rerender } = render(CreateTaskModal, {
      props: {
        open: true,
        onOpenChange: vi.fn(),
        statuses: [{ value: 'todo', label: 'To do' }],
        projects: [{ id: 'project-1', name: 'Project One' }],
        initialProjectId: 'project-1',
      },
    })

    await fireEvent.input(screen.getByLabelText(/Phần bị tác động/i), { target: { value: 'Nội dung nháp chỉ tồn tại trong popup.' } })
    await fireEvent.click(screen.getByRole('button', { name: /Xóa nháp|Delete draft/i }))
    const deleteDraftButtons = screen.getAllByRole('button', { name: /Xóa nháp|Delete draft/i })
    const confirmDeleteDraftButton = deleteDraftButtons.at(-1)
    if (!confirmDeleteDraftButton) throw new Error('Expected the draft deletion confirmation button')
    await fireEvent.click(confirmDeleteDraftButton)

    await rerender({ open: false })
    await rerender({ open: true })
    expect(screen.getByLabelText(/Phần bị tác động/i)).toHaveValue('')
  })

  it('keeps all local draft fields after reopening without a create request', async () => {
    const { rerender } = render(CreateTaskModal, {
      props: {
        open: true,
        onOpenChange: vi.fn(),
        statuses: [{ value: 'todo', label: 'To do' }],
        projects: [{ id: 'project-1', name: 'Project One' }],
        initialProjectId: 'project-1',
      },
    })

    await fireEvent.input(screen.getByLabelText(/Tiêu đề|Title/i), {
      target: { value: 'Draft with all description sections' },
    })

    await fireEvent.input(screen.getByLabelText(/Phần bị tác động/i), { target: { value: 'Chi tiết task' } })
    await fireEvent.input(document.querySelector('#brief-current-state') as HTMLTextAreaElement, { target: { value: 'Người xem chưa thấy lịch sử thay đổi.' } })

    await fireEvent.click(screen.getByRole('button', { name: /Lưu nháp|Save draft/i }))

    expect(axiosPost).not.toHaveBeenCalled()
    await rerender({ open: false })
    await rerender({ open: true })
    expect(screen.getByLabelText(/Phần bị tác động/i)).toHaveValue('Chi tiết task')
    expect(document.querySelector('#brief-current-state')).toHaveValue('Người xem chưa thấy lịch sử thay đổi.')
  })

  it('does not send a task-create request when saving a local draft without assignments', async () => {

    render(CreateTaskModal, {
      props: {
        open: true,
        onOpenChange: vi.fn(),
        statuses: [{ value: 'todo', label: 'To do' }],
        projects: [{ id: 'project-1', name: 'Project One' }],
        users: [{ id: 'user-2', username: 'reviewer-b', email: 'b@example.com' }],
        parentTasks: [],
        initialProjectId: 'project-1',
      },
    })

    await fireEvent.input(screen.getByLabelText(/Tiêu đề/i), { target: { value: 'Task reviewed by B' } })
    await fireEvent.click(screen.getByRole('button', { name: /Lưu nháp|Save draft/i }))

    expect(axiosPost).not.toHaveBeenCalled()
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
      expect(fetchMock).toHaveBeenCalledTimes(4)
    })

    await Promise.resolve()
    await Promise.resolve()

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/projects/project-1/professional-roles')
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/projects/project-1')
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/projects/project-1/member-candidates')
    expect(fetchMock).toHaveBeenNthCalledWith(4, '/api/v1/projects/project-1/skills')
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

  it('uses a selected role only to filter people, without auto-prefilling Task skills', async () => {
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

    await fireEvent.click(screen.getByRole('tab', { name: 'Phân công' }))
    await waitFor(() => {
      expect(screen.getByLabelText('Lọc người thực hiện theo vai trò')).toBeInTheDocument()
    })

    await fireEvent.change(screen.getByLabelText('Lọc người thực hiện theo vai trò'), {
      target: { value: 'role-1' },
    })

    await waitFor(() => {
      expect(screen.getByText(/Gợi ý assignee/i)).toBeInTheDocument()
    })
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/v1/projects/project-1/professional-roles/role-1/requirements'
    )
  })

  it('never issues a task-create request for a local draft', async () => {

    render(CreateTaskModal, {
      props: {
        open: true,
        onOpenChange: vi.fn(),
        statuses: [{ value: 'todo', label: 'To do' }],
        priorities: [],
        labels: [],
        projects: [{ id: 'project-1', name: 'Project One' }],
        users: [],
        parentTasks: [],
        initialProjectId: 'project-1',
      },
    })

    await fireEvent.input(screen.getByLabelText(/Tiêu đề/i), {
      target: { value: 'Retry-safe draft' },
    })
    const saveButton = screen.getByRole('button', { name: /Lưu nháp|Save draft/i })
    await fireEvent.click(saveButton)
    expect(axiosPost).not.toHaveBeenCalled()
  })
})
