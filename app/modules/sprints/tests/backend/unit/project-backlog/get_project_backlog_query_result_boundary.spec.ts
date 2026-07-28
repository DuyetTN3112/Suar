import { test } from '@japa/runner'

import type { ProjectBacklogReader } from '#modules/sprints/actions/ports/outbound/project-backlog/project_backlog_reader'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/outbound/sprint_external_dependencies'
import GetProjectBacklogQuery from '#modules/sprints/actions/queries/project-backlog/get_project_backlog_query'

const EXECUTION_CONTEXT = {
  userId: 'user-1',
  organizationId: 'org-1',
  ip: '127.0.0.1',
  userAgent: 'unit-test',
}

const EXTERNAL_DEPENDENCIES: SprintExternalDependencies = {
  projectAccess: {
    resolveProjectSprintAccess: (_context, projectId) =>
      Promise.resolve({
        actorId: 'user-1',
        project: {
          id: projectId,
          organization_id: 'org-1',
          owner_id: 'user-1',
          manager_id: 'user-1',
          project_role: 'project_manager',
        },
        canManageSprint: true,
        isProjectParticipant: true,
      }),
  },
}

const BACKLOG_READER: ProjectBacklogReader = {
  list: () => Promise.resolve({ tasks: [], total: 0 }),
}

test.group('Unit | Project backlog Result boundary', () => {
  test('wraps the backlog query result using the local base query', async ({ assert }) => {
    const query = new GetProjectBacklogQuery(
      EXECUTION_CONTEXT,
      EXTERNAL_DEPENDENCIES,
      BACKLOG_READER
    )

    const outcome = await query.executeAndWrap({ project_id: 'project-1' })

    assert.isTrue(outcome.isSuccess())
    assert.equal(outcome.getValue().project_id, 'project-1')
  })
})
