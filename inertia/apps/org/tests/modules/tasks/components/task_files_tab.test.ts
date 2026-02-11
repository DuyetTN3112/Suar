import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('axios')

import TaskFilesTab from '@/apps/org/modules/tasks/components/detail/task_files_tab.svelte'

const mockedAxios = vi.mocked(axios)

describe('TaskFilesTab', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedAxios.get.mockResolvedValue({
      data: {
        data: [
          {
            id: 'attachment-11',
            fileName: 'handoff.md',
            filePath: 'https://example.com/handoff.md',
            fileSize: 2048,
            mimeType: 'text/markdown',
            attachmentType: 'reference',
            uploadedBy: 'user-2',
            uploadedByUsername: 'linh',
            createdAt: '2026-07-09T10:00:00.000Z',
          },
        ],
        pagination: {
          mode: 'offset',
          page: 2,
          perPage: 10,
          total: 23,
          lastPage: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      },
    })
  })

  it('loads attachments with pagination controls', async () => {
    render(TaskFilesTab, {
      props: {
        taskId: 'task-1',
        currentUserId: 'user-1',
      },
    })

    await waitFor(() => {
      expect(mockedAxios.get.mock.calls[0]).toEqual([
        '/api/v1/tasks/task-1/attachments',
        {
          params: {
            page: 1,
            perPage: 10,
          },
        },
      ])
    })

    expect(await screen.findByText('handoff.md')).toBeInTheDocument()
    expect(screen.getByText('11-20 / 23')).toBeInTheDocument()
  })

  it('uploads a real file through multipart form data', async () => {
    mockedAxios.post.mockResolvedValue({ data: { data: {} } })

    render(TaskFilesTab, {
      props: {
        taskId: 'task-1',
        currentUserId: 'user-1',
      },
    })

    const file = new File(['demo evidence'], 'demo-evidence.txt', { type: 'text/plain' })
    await fireEvent.change(screen.getByLabelText('Tải tệp lên'), {
      target: { files: [file] },
    })
    await fireEvent.click(screen.getByRole('button', { name: 'Thêm tệp' }))

    await waitFor(() => {
      expect(mockedAxios.post.mock.calls.length).toBeGreaterThan(0)
    })

    const [url, payload, config] = mockedAxios.post.mock.calls[0] ?? []
    expect(url).toBe('/api/v1/tasks/task-1/attachments')
    expect(payload).toBeInstanceOf(FormData)
    expect((payload as FormData).get('file')).toBe(file)
    expect((payload as FormData).get('attachmentType')).toBe('reference')
    expect(config).toEqual({
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  })
})
