import { test } from '@japa/runner'

import { TasksMarketplaceTaskApplicationAdapter } from '#composition/marketplace/marketplace-application/tasks_marketplace_task_application_adapter'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
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
      return Promise.resolve(Result.ok({
        data: [reviewApplication],
        meta: {
          total: 1,
          perPage: 10,
          currentPage: 1,
          lastPage: 1,
        },
      }))
    },
    listForCurrentApplicant() {
      return Promise.resolve(Result.ok({
        data: [
          {
            id: 'application-1',
            taskId: 'task-1',
            applicationStatus: 'pending' as const,
            message: 'I can help',
            portfolioLinks: ['https://portfolio.example.com'],
            rejectionReason: null,
            appliedAt: '2026-04-09T09:00:00.000Z',
            reviewedAt: null,
            task: {
              id: 'task-1',
              title: 'Marketplace task',
              status: 'todo',
              organizationName: null,
              projectName: null,
            },
          },
        ],
        meta: {
          total: 1,
          perPage: 10,
          currentPage: 1,
          lastPage: 1,
        },
      }))
    },
    listForOrganization() {
      return Promise.resolve(Result.ok({
        data: [reviewApplication],
        meta: {
          total: 1,
          perPage: 10,
          currentPage: 1,
          lastPage: 1,
        },
      }))
    },
    score() {
      return Promise.resolve(
        Result.ok({
          matchScore: 90,
          skillMatch: 92,
          domainMatch: 88,
          deliveryReliability: 91,
          trustScore: 89,
          evidenceConfidence: 'high' as const,
          evidenceWarnings: [],
          explanations: ['Strong evidence'],
          risks: [],
        })
      )
    },
    rank() {
      return Promise.resolve(Result.ok([]))
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

    assert.isTrue(page.isSuccess())
    assert.deepInclude(page.getValue().data[0] ?? {}, {
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

    assert.isTrue(page.isSuccess())
    assert.deepInclude(page.getValue().data[0] ?? {}, {
      id: 'application-1',
      taskId: 'task-1',
      task: {
        id: 'task-1',
        title: 'Marketplace task',
        status: 'todo',
      },
    })
  })

  test('maps a successful Result score across the marketplace boundary', async ({ assert }) => {
    const adapter = new TasksMarketplaceTaskApplicationAdapter(createCapability())

    const score = await adapter.score(context, {
      taskId: 'task-1',
      applicationId: 'application-1',
    })

    assert.isTrue(score.isSuccess())
    assert.deepEqual(score.getValue(), {
      matchScore: 90,
      skillMatch: 92,
      domainMatch: 88,
      deliveryReliability: 91,
      trustScore: 89,
      evidenceConfidence: 'high',
      evidenceWarnings: [],
      explanations: ['Strong evidence'],
      risks: [],
    })
  })

  test('propagates task list failures as Result across the marketplace boundary', async ({
    assert,
  }) => {
    const failure = new NotFoundException('task list unavailable')
    const capability = createCapability()
    capability.listForTask = () => Promise.resolve(Result.fail(failure))
    const adapter = new TasksMarketplaceTaskApplicationAdapter(capability)

    const result = await adapter.listForTask(context, {
      taskId: 'task-1',
      status: 'pending',
      page: 1,
      perPage: 10,
    })

    assert.isTrue(result.isFailure())
    assert.strictEqual(result.getError(), failure)
  })
})
