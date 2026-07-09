import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadTaskDetail } from '../../../modules/tasks/api/task_detail_api.js'

vi.mock('axios')

const mockedAxios = vi.mocked(axios)

describe('task_detail_api', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('loads full task detail for modal hydration', async () => {
     
    mockedAxios.get.mockResolvedValue({
      data: {
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
     
    expect(mockedAxios.get.mock.calls[0]).toEqual(['/api/v1/tasks/task-1'])
  })

  it('returns null when detail request fails', async () => {
     
    mockedAxios.get.mockRejectedValue(new Error('network'))

     
    await expect(loadTaskDetail('task-1')).resolves.toBeNull()
  })
})
