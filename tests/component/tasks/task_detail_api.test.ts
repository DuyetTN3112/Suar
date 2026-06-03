import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadTaskDetail } from '../../../inertia/pages/tasks/components/task_detail_api.js'

vi.mock('axios')

describe('task_detail_api', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('loads full task detail for modal hydration', async () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 'task-1',
          title: 'Detailed task',
          expected_deliverables: ['Spec'],
          measurable_outcomes: [{ metric: 'coverage', target: '95%' }],
        },
      },
    })

     
    await expect(loadTaskDetail('task-1')).resolves.toEqual({
      id: 'task-1',
      title: 'Detailed task',
      expected_deliverables: ['Spec'],
      measurable_outcomes: [{ metric: 'coverage', target: '95%' }],
    })
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(vi.mocked(axios.get).mock.calls[0]).toEqual(['/api/tasks/task-1'])
  })

  it('returns null when detail request fails', async () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(axios.get).mockRejectedValue(new Error('network'))

     
    await expect(loadTaskDetail('task-1')).resolves.toBeNull()
  })
})
