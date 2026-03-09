import { test } from '@japa/runner'

import { TasksMarketplaceTaskApplicationAdapter } from '#composition/adapters/tasks_marketplace_task_application_adapter'
import type { TaskApplicationCapability } from '#modules/tasks/public_contracts/task_application_capability'

const context = {
  userId: 'reviewer-1',
  ip: '127.0.0.1',
  userAgent: 'test',
  organizationId: 'org-1',
}

const reviewApplication = {
  id: 'application-1',
  taskId: 'task-1',
  applicationStatus: 'pending' as const,
  message: 'I can help',
  portfolioLinks: ['https://portfolio.example.com'],
  appliedAt: '2026-04-09T09:00:00.000Z',
  applicant: {
    id: 'user-1',
    username: 'candidate',
    email: 'candidate@example.com',
  },
  task: {
    id: 'task-1',
    title: 'Marketplace task',
    status: 'todo',
  },
  candidateSource: 'external' as const,
}

function createCapability(): TaskApplicationCapability {
  return {
    submit() {
      return Promise.reject(new Error('not used'))
    },
    decide() {
      return Promise.reject(new Error('not used'))
    },
    withdraw() {
      return Promise.reject(new Error('not used'))
    },
    listForTask() {
      return Promise.resolve({
        data: [reviewApplication],
        meta: {
          total: 1,
          perPage: 10,
          currentPage: 1,
          lastPage: 1,
        },
      })
    },
    listForCurrentApplicant() {
      return Promise.reject(new Error('not used'))
    },
    listForOrganization() {
      return Promise.resolve({
        data: [reviewApplication],
        meta: {
          total: 1,
          perPage: 10,
          currentPage: 1,
          lastPage: 1,
        },
      })
    },
    score() {
      return Promise.reject(new Error('not used'))
    },
    rank() {
      return Promise.reject(new Error('not used'))
    },
  }
}

test.group('Unit | Tasks marketplace task application adapter', () => {
  test('preserves task context for task-specific review applications', async ({ assert }) => {
    const adapter = new TasksMarketplaceTaskApplicationAdapter(createCapability())

    const page = await adapter.listForTask(context, {
      taskId: 'task-1',
      status: 'pending',
      page: 1,
      perPage: 10,
    })

    assert.deepInclude(page.data[0] ?? {}, {
      id: 'application-1',
      taskId: 'task-1',
      task: {
        id: 'task-1',
        title: 'Marketplace task',
        status: 'todo',
      },
    })
  })

  test('preserves task context for organization inbox applications', async ({ assert }) => {
    const adapter = new TasksMarketplaceTaskApplicationAdapter(createCapability())

    const page = await adapter.listForOrganization(context, {
      organizationId: 'org-1',
      status: 'pending',
      page: 1,
      perPage: 10,
    })

    assert.deepInclude(page.data[0] ?? {}, {
      id: 'application-1',
      taskId: 'task-1',
      task: {
        id: 'task-1',
        title: 'Marketplace task',
        status: 'todo',
      },
    })
  })
})
