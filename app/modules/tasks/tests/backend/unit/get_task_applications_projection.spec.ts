import { test } from '@japa/runner'

import { taskExternalDeps } from '#composition/task_external_dependencies_composition'
import { GetTaskApplicationsDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import GetTaskApplicationsQuery from '#modules/tasks/actions/queries/get_task_applications_query'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import type {
  PaginatedTaskApplicationRecords,
  TaskRecord,
} from '#modules/tasks/types/task_records'

function reviewableTask(): TaskRecord {
  return {
    id: 'task-1',
    title: 'Reviewable task',
    description: '',
    status: 'todo',
    task_status_id: null,
    priority: 'medium',
    project_id: null,
    organization_id: 'organization-1',
    creator_id: 'reviewer-1',
    assigned_to: null,
  }
}

const applications: PaginatedTaskApplicationRecords = {
  data: [
    {
      id: 'application-1',
      task_id: 'task-1',
      applicant_id: 'applicant-1',
      application_status: 'pending',
      application_source: 'public_listing',
      message: null,
      portfolio_links: null,
      reviewed_by: null,
      rejection_reason: null,
      reviewer: null,
    },
    {
      id: 'application-2',
      task_id: 'task-1',
      applicant_id: 'missing-applicant',
      application_status: 'pending',
      application_source: 'public_listing',
      message: null,
      portfolio_links: null,
      reviewed_by: null,
      rejection_reason: null,
      reviewer: null,
    },
  ],
  meta: {
    total: 2,
    per_page: 20,
    current_page: 1,
    last_page: 1,
  },
}

function makeQuery(
  context: ReturnType<typeof makeSystemTaskActionContext>,
  deps: NonNullable<ConstructorParameters<typeof GetTaskApplicationsQuery>[3]>,
  users: NonNullable<ConstructorParameters<typeof GetTaskApplicationsQuery>[4]>
): GetTaskApplicationsQuery {
  return new GetTaskApplicationsQuery(
    context,
    taskExternalDeps.permission,
    taskExternalDeps.lifecycle,
    deps,
    users
  )
}

test.group('Unit | Task application applicant projection', () => {
  test('bulk hydrates allowlisted identities and tolerates a missing account', async ({
    assert,
  }) => {
    const identityCalls: string[][] = []
    const query = makeQuery(
      makeSystemTaskActionContext('reviewer-1'),
      {
        findTask: () => Promise.resolve(reviewableTask()),
        hasProjectReviewRole: () => Promise.resolve(false),
        hasOrganizationReviewRole: () => Promise.resolve(false),
        paginateByTask: () => Promise.resolve(applications),
        resolveCacheKey: () => Promise.resolve(null),
      },
      {
        findUserIdentities: (userIds) => {
          identityCalls.push(userIds)
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
      new GetTaskApplicationsDTO({
        task_id: 'task-1',
        page: 1,
        per_page: 20,
      })
    )

    assert.deepEqual(identityCalls, [['applicant-1', 'missing-applicant']])
    assert.deepEqual(result.data[0]?.applicant, {
      id: 'applicant-1',
      username: 'candidate',
      email: 'candidate@example.test',
    })
    assert.notProperty(result.data[1] ?? {}, 'applicant')
  })
})
