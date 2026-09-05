import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { inertiaPage, axiosPost } = vi.hoisted(() => ({
  axiosPost: vi.fn(),
  inertiaPage: { props: { auth: { user: { current_project: { id: 'project-1' } } } } },
}))

vi.mock('@inertiajs/svelte', () => ({ page: inertiaPage }))
vi.mock('axios', () => ({ default: { post: axiosPost } }))

import CreateTaskModal from '@/apps/org/modules/tasks/components/modals/create_task_modal.svelte'

describe('CreateTaskModal on the Project Board', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => ({ data: [] }) }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  function renderModal() {
    return render(CreateTaskModal, {
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
  }

  it('shows the structured task contract instead of the former free-text form', async () => {
    renderModal()

    expect(screen.queryByText('Tạo Task rõ ràng, có thể nghiệm thu')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Nội dung Task' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Tên và phần việc')).toBeInTheDocument()
    expect(screen.getByText('Hiện trạng và ảnh hưởng')).toBeInTheDocument()
    expect(screen.queryByLabelText(/^Mô tả/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Bối cảnh nghiệp vụ/i)).not.toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: /Tạo và giao|Đăng và giao/i }))
    expect(screen.getByTestId('task-create-validation-summary')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText(/Tiêu đề/i)).toHaveFocus())
  })

  it('keeps a structured draft locally without sending a Task request', async () => {
    const { rerender } = renderModal()

    await fireEvent.input(screen.getByLabelText(/Tiêu đề/i), { target: { value: 'Làm rõ luồng tạo Task' } })
    await fireEvent.input(screen.getByLabelText(/Phần bị tác động/i), { target: { value: 'Board dự án' } })
    await fireEvent.click(screen.getByRole('button', { name: /Lưu nháp/i }))

    expect(axiosPost).not.toHaveBeenCalled()
    await rerender({ open: false })
    await rerender({ open: true })
    expect(screen.getByLabelText(/Phần bị tác động/i)).toHaveValue('Board dự án')
  })
})
