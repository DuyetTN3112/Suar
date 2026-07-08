 
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import axios from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

const inertiaMocks = vi.hoisted(() => ({
  router: {
    reload: vi.fn(),
  },
}))

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
}))

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}))

vi.mock('svelte-sonner', () => ({
  toast: toastMocks,
}))

vi.mock('@inertiajs/svelte', () => ({
  router: inertiaMocks.router,
}))

import ApplyTaskModal from '@/apps/user/modules/marketplace/components/apply_task_modal.svelte'

const mockedAxios = vi.mocked(axios)

const marketplaceTask = {
  id: 'task-1',
  title: 'Marketplace proof task',
  task_visibility: 'external',
  created_at: '2026-07-05T12:00:00.000Z',
} as const

function renderApplyTaskModal() {
  return render(ApplyTaskModal, {
    props: {
      task: marketplaceTask,
      open: true,
    },
  })
}

describe('ApplyTaskModal', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('blocks an empty proposal before calling the apply API', async () => {
    renderApplyTaskModal()

    await fireEvent.click(screen.getByRole('button', { name: 'Gửi đề xuất tham gia' }))

    expect(
      screen.getByText('Hãy thêm lời nhắn hoặc ít nhất một proof link để người phụ trách đánh giá.')
    ).toBeInTheDocument()
    expect(mockedAxios.post.mock.calls).toHaveLength(0)
    expect(inertiaMocks.router.reload.mock.calls).toHaveLength(0)
  })

  it('treats whitespace-only messages as empty proposals', async () => {
    renderApplyTaskModal()

    await fireEvent.input(screen.getByLabelText('Lời nhắn (tùy chọn)'), {
      target: { value: ' \n\t ' },
    })
    await fireEvent.click(screen.getByRole('button', { name: 'Gửi đề xuất tham gia' }))

    expect(
      screen.getByText('Hãy thêm lời nhắn hoặc ít nhất một proof link để người phụ trách đánh giá.')
    ).toBeInTheDocument()
    expect(mockedAxios.post.mock.calls).toHaveLength(0)
  })

  it('rejects portfolio links without an http or https protocol before calling the API', async () => {
    renderApplyTaskModal()

    await fireEvent.input(screen.getByLabelText('Lời nhắn (tùy chọn)'), {
      target: { value: 'I can help with this task.' },
    })
    await fireEvent.input(screen.getByLabelText('Liên kết portfolio (mỗi dòng 1 link)'), {
      target: { value: 'example.com/work' },
    })
    await fireEvent.click(screen.getByRole('button', { name: 'Gửi đề xuất tham gia' }))

    expect(screen.getByText('Liên kết portfolio phải bắt đầu bằng http:// hoặc https://')).toBeInTheDocument()
    expect(mockedAxios.post.mock.calls).toHaveLength(0)
  })

  it('trims message and portfolio links before submitting a valid proposal', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        data: {
          id: 'application-1',
        },
      },
    })

    renderApplyTaskModal()

    await fireEvent.input(screen.getByLabelText('Lời nhắn (tùy chọn)'), {
      target: { value: '  Ready to contribute  ' },
    })
    await fireEvent.input(screen.getByLabelText('Liên kết portfolio (mỗi dòng 1 link)'), {
      target: { value: '  https://example.com/work  \n\n https://github.com/example ' },
    })
    await fireEvent.click(screen.getByRole('button', { name: 'Gửi đề xuất tham gia' }))

    await waitFor(() => {
      expect(mockedAxios.post.mock.calls).toContainEqual([
        '/api/v1/tasks/task-1/apply',
        {
          message: 'Ready to contribute',
          portfolio_links: ['https://example.com/work', 'https://github.com/example'],
          application_source: 'public_listing',
        },
        {
          headers: {
            Accept: 'application/json',
          },
        },
      ])
    })
    expect(toastMocks.success).toHaveBeenCalledWith('Đã gửi đề xuất tham gia!', {
      description: 'Người phụ trách task sẽ xem xét và phản hồi đề xuất của bạn.',
    })
    expect(inertiaMocks.router.reload.mock.calls.length).toBeGreaterThan(0)
  })

  it('shows the server rejection message without closing or reloading the page', async () => {
    mockedAxios.post.mockRejectedValue({
      response: {
        status: 422,
        data: {
          error: {
            message: 'Task no longer accepts applications',
          },
        },
      },
    })

    renderApplyTaskModal()

    await fireEvent.input(screen.getByLabelText('Lời nhắn (tùy chọn)'), {
      target: { value: 'I can help with this task.' },
    })
    await fireEvent.click(screen.getByRole('button', { name: 'Gửi đề xuất tham gia' }))

    expect(await screen.findByText('Task no longer accepts applications')).toBeInTheDocument()
    expect(toastMocks.success).not.toHaveBeenCalled()
    expect(inertiaMocks.router.reload.mock.calls).toHaveLength(0)
    expect(screen.getByRole('heading', { name: 'Gửi đề xuất tham gia task' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hủy' })).toBeInTheDocument()
  })
})
