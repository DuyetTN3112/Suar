import { test } from '@japa/runner'

import type {
  ProjectSprintAccess,
  SprintExternalDependencies,
} from '#modules/sprints/actions/ports/sprint_external_dependencies'
import GetProjectSprintQuery from '#modules/sprints/actions/queries/get_project_sprint_query'

const access: ProjectSprintAccess = {
  actorId: 'user-1',
  project: {
    id: 'project-1',
    organization_id: 'org-1',
    owner_id: 'user-1',
    manager_id: null,
    project_role: 'project_owner',
  },
  canManageSprint: true,
  isProjectParticipant: true,
}

test.group('Sprint port contracts', () => {
  test('sprint queries receive project access through injected port', async ({ assert }) => {
    let requestedProjectId: string | null = null
    const deps: SprintExternalDependencies = {
      projectAccess: {
        resolveProjectSprintAccess(_ctx, projectId) {
          requestedProjectId = projectId
          return Promise.resolve(access)
        },
      },
    }

    const query = new GetProjectSprintQuery(
      { userId: 'user-1', organizationId: 'org-1', ip: '127.0.0.1', userAgent: 'unit' },
      deps
    )

    await assert.rejects(() => query.handle('project-1', 'missing-sprint'))
    assert.equal(requestedProjectId, 'project-1')
  })
})
