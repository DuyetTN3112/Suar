import { test } from '@japa/runner'

import { taskExternalDeps } from '#composition/task_external_dependencies_composition'
import { GetTaskApplicationsDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import GetMyApplicationsQuery from '#modules/tasks/actions/queries/get_my_applications_query'
import GetTaskApplicationsQuery from '#modules/tasks/actions/queries/get_task_applications_query'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import type {
  PaginatedTaskApplicationRecords,
  TaskRecord,
} from '#modules/tasks/types/task_records'

const emptyApplications: PaginatedTaskApplicationRecords = {
  data: [],
  meta: {
    total: 0,
    per_page: 20,
    current_page: 1,
    last_page: 1,
  },
}

function makeReviewableTask(projectId: string | null): TaskRecord {
  return {
    id: 'task-1',
    title: 'Reviewable task',
    description: '',
    status: 'todo',
    task_status_id: null,
    priority: 'medium',
    project_id: projectId,
    organization_id: 'organization-1',
    creator_id: 'reviewer-1',
    assigned_to: null,
  }
}

function makeTaskApplicationsQuery(
  context: ReturnType<typeof makeSystemTaskActionContext>,
  deps: NonNullable<ConstructorParameters<typeof GetTaskApplicationsQuery>[3]>
): GetTaskApplicationsQuery {
  return new GetTaskApplicationsQuery(
    context,
    taskExternalDeps.permission,
    taskExternalDeps.lifecycle,
    deps
  )
}

function makeMyApplicationsQuery(
  context: ReturnType<typeof makeSystemTaskActionContext>,
  deps: NonNullable<ConstructorParameters<typeof GetMyApplicationsQuery>[2]>
): GetMyApplicationsQuery {
  return new GetMyApplicationsQuery(context, taskExternalDeps.lifecycle, deps)
}

test.group('Unit | Application Query Cache Generations', () => {
  test('task applications use one task-scoped physical key for lookup and fill', async ({
    assert,
  }) => {
    const calls: string[] = []
    const physicalKey = 'task:applications:physical:immutable-generation'
    const query = makeTaskApplicationsQuery(
      makeSystemTaskActionContext('reviewer-1'),
      {
        findTask: () => Promise.resolve(makeReviewableTask('project-1')),
        hasProjectReviewRole: () => Promise.resolve(false),
        hasOrganizationReviewRole: () => Promise.resolve(false),
        resolveCacheKey: (namespaces, logicalKey) => {
          calls.push(`generation:${JSON.stringify(namespaces)}:${logicalKey}`)
          return Promise.resolve(physicalKey)
        },
        remember: async (cacheKey, ttl, callback) => {
          calls.push(`cache:get:${cacheKey}:${ttl}`)
          const result = await callback()
          calls.push(`cache:set:${cacheKey}:${ttl}`)
          return result
        },
        paginateByTask: (taskId, options) => {
          calls.push(`repo:${taskId}:${JSON.stringify(options)}`)
          return Promise.resolve(emptyApplications)
        },
      }
    )

    const result = await query.handle(
      new GetTaskApplicationsDTO({
        task_id: 'task-1',
        status: 'all',
        page: 1,
        per_page: 20,
      })
    )

    assert.deepEqual(result, emptyApplications)
    assert.deepEqual(calls, [
      'generation:["task:applications","task:applications:task:task-1"]:task:applications:page:1:perPage:20:status:all:taskId:task-1:userId:reviewer-1',
      `cache:get:${physicalKey}:60`,
      'repo:task-1:{"page":1,"perPage":20,"status":"all"}',
      `cache:set:${physicalKey}:60`,
    ])
  })

  test('task applications bypass cache when generation resolution is unavailable', async ({
    assert,
  }) => {
    const calls: string[] = []
    const query = makeTaskApplicationsQuery(
      makeSystemTaskActionContext('reviewer-1'),
      {
        findTask: () => Promise.resolve(makeReviewableTask(null)),
        hasProjectReviewRole: () => Promise.resolve(false),
        hasOrganizationReviewRole: () => Promise.resolve(false),
        resolveCacheKey: () => {
          calls.push('generation:unavailable')
          return Promise.resolve(null)
        },
        remember: () => {
          calls.push('cache:unexpected')
          return Promise.resolve(emptyApplications)
        },
        paginateByTask: () => {
          calls.push('repo')
          return Promise.resolve(emptyApplications)
        },
      }
    )

    await query.handle(
      new GetTaskApplicationsDTO({
        task_id: 'task-1',
        page: 1,
        per_page: 20,
      })
    )

    assert.deepEqual(calls, ['generation:unavailable', 'repo'])
  })

  test('my applications use one user-scoped physical key for lookup and fill', async ({
    assert,
  }) => {
    const calls: string[] = []
    const physicalKey = 'user:applications:physical:immutable-generation'
    const query = makeMyApplicationsQuery(makeSystemTaskActionContext('applicant-1'), {
      resolveCacheKey: (namespaces, logicalKey) => {
        calls.push(`generation:${JSON.stringify(namespaces)}:${logicalKey}`)
        return Promise.resolve(physicalKey)
      },
      remember: async (cacheKey, ttl, callback) => {
        calls.push(`cache:get:${cacheKey}:${ttl}`)
        const result = await callback()
        calls.push(`cache:set:${cacheKey}:${ttl}`)
        return result
      },
      paginateByApplicant: (userId, options) => {
        calls.push(`repo:${userId}:${JSON.stringify(options)}`)
        return Promise.resolve(emptyApplications)
      },
    })

    const result = await query.handle({
      status: 'pending',
      page: 1,
      per_page: 20,
    })

    assert.deepEqual(result, emptyApplications)
    assert.deepEqual(calls, [
      'generation:["user:applications","user:applications:user:applicant-1"]:user:applications:page:1:perPage:20:status:pending:userId:applicant-1',
      `cache:get:${physicalKey}:60`,
      'repo:applicant-1:{"page":1,"perPage":20,"status":"pending"}',
      `cache:set:${physicalKey}:60`,
    ])
  })

  test('my applications bypass cache when generation resolution is unavailable', async ({
    assert,
  }) => {
    const calls: string[] = []
    const query = makeMyApplicationsQuery(makeSystemTaskActionContext('applicant-1'), {
      resolveCacheKey: () => {
        calls.push('generation:unavailable')
        return Promise.resolve(null)
      },
      remember: () => {
        calls.push('cache:unexpected')
        return Promise.resolve(emptyApplications)
      },
      paginateByApplicant: () => {
        calls.push('repo')
        return Promise.resolve(emptyApplications)
      },
    })

    await query.handle({
      status: 'all',
      page: 1,
      per_page: 20,
    })

    assert.deepEqual(calls, ['generation:unavailable', 'repo'])
  })
})
