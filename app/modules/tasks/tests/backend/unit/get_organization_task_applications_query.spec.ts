import { test } from '@japa/runner'

import { taskExternalDeps } from '#composition/task_external_dependencies_composition'
import { GetOrganizationTaskApplicationsDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import GetOrganizationTaskApplicationsQuery from '#modules/tasks/actions/queries/get_organization_task_applications_query'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { ApplicationStatus } from '#modules/tasks/public_contracts/task_constants'
import type { PaginatedTaskApplicationRecords } from '#modules/tasks/types/task_records'

const applications: PaginatedTaskApplicationRecords = {
  data: [
    {
      id: 'application-1',
      task_id: 'task-1',
      applicant_id: 'applicant-1',
      application_status: 'pending',
      application_source: 'public_listing',
      message: 'Ready to help',
      portfolio_links: ['https://example.com/work'],
      applied_at: '2026-07-26T00:00:00.000Z',
      reviewed_by: null,
      reviewed_at: null,
      rejection_reason: null,
      applicant: {
        id: 'applicant-1',
        username: 'candidate',
        email: 'candidate@example.test',
      },
      task: {
        id: 'task-1',
        title: 'Task one',
        description: 'Task description',
        status: 'todo',
        task_status_id: null,
        priority: 'medium',
        assigned_to: null,
        creator_id: 'owner-1',
        organization_id: 'organization-1',
        project_id: null,
      },
    },
  ],
  meta: {
    total: 1,
    per_page: 20,
    current_page: 1,
    last_page: 1,
  },
}

function makeQuery(
  context: ReturnType<typeof makeSystemTaskActionContext>,
  deps: NonNullable<
    ConstructorParameters<typeof GetOrganizationTaskApplicationsQuery>[3]
  >,
  users: NonNullable<
    ConstructorParameters<typeof GetOrganizationTaskApplicationsQuery>[4]
  >
): GetOrganizationTaskApplicationsQuery {
  return new GetOrganizationTaskApplicationsQuery(
    context,
    taskExternalDeps.permission,
    taskExternalDeps.lifecycle,
    deps,
    users
  )
}

test.group('Unit | Organization task applications query', () => {
  test('hydrates org inbox applications with identities and cache generation', async ({ assert }) => {
    const calls: string[] = []
    const query = makeQuery(
      makeSystemTaskActionContext('reviewer-1'),
      {
        hasOrganizationReviewRole: () => Promise.resolve(true),
        paginateByOrganization: (organizationId, options) => {
          calls.push(`repo:${organizationId}:${JSON.stringify(options)}`)
          return Promise.resolve(applications)
        },
        resolveCacheKey: (namespaces, logicalKey) => {
          calls.push(`generation:${JSON.stringify(namespaces)}:${logicalKey}`)
          return Promise.resolve('org:applications:physical:immutable-generation')
        },
        remember: async (cacheKey, ttl, callback) => {
          calls.push(`cache:get:${cacheKey}:${ttl}`)
          const result = await callback()
          calls.push(`cache:set:${cacheKey}:${ttl}`)
          return result
        },
      },
      {
        findUserIdentities: (userIds) => {
          calls.push(`identities:${JSON.stringify(userIds)}`)
          return Promise.resolve([
            {
              id: 'applicant-1',
              username: 'candidate',
              email: 'candidate@example.test',
            },
          ])
        },
      }
    )

    const result = await query.handle(
      new GetOrganizationTaskApplicationsDTO({
        organization_id: 'organization-1',
        status: ApplicationStatus.PENDING,
        page: 1,
        per_page: 20,
      })
    )

    assert.deepEqual(calls, [
      'generation:["task:applications","task:applications:org:organization-1"]:organization:applications:organizationId:organization-1:page:1:perPage:20:status:pending:userId:reviewer-1',
      'cache:get:org:applications:physical:immutable-generation:60',
      'repo:organization-1:{"page":1,"perPage":20,"status":"pending"}',
      'identities:["applicant-1"]',
      'cache:set:org:applications:physical:immutable-generation:60',
    ])
    const firstApplication = result.data[0]
    if (!firstApplication) {
      throw new Error('Expected one organization application')
    }
    assert.deepInclude(firstApplication, {
      id: 'application-1',
      task_id: 'task-1',
    })
    assert.deepEqual(firstApplication.task, {
      id: 'task-1',
      title: 'Task one',
      description: 'Task description',
      status: 'todo',
      task_status_id: null,
      priority: 'medium',
      assigned_to: null,
      creator_id: 'owner-1',
      organization_id: 'organization-1',
      project_id: null,
    })
  })
})
