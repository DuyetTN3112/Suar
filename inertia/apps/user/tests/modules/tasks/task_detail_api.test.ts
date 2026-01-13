import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  loadAuditLogs,
  loadTaskDetail,
} from '../../../modules/tasks/api/task_detail_api.js'

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

  it('propagates detail request failures instead of presenting false empty state', async () => {
     
    const failure = new Error('network')
    mockedAxios.get.mockRejectedValue(failure)

     
    await expect(loadTaskDetail('task-1')).rejects.toBe(failure)
  })

  it('rejects malformed successful detail responses with a safe contract error', async () => {
    mockedAxios.get.mockResolvedValue({ data: {} })

    await expect(loadTaskDetail('task-1')).rejects.toMatchObject({
      name: 'ApiResponseContractError',
      apiProblem: {
        code: 'E_RESPONSE_SCHEMA',
        retryable: true,
      },
    })
  })

  it('distinguishes an empty audit history from a failed audit request', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockRejectedValueOnce(new Error('network'))

    await expect(loadAuditLogs('task-1')).resolves.toEqual([])
    await expect(loadAuditLogs('task-1')).rejects.toThrow('network')
  })
})
