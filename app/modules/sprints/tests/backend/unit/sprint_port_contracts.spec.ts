import { test } from '@japa/runner'

import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/outbound/sprint_external_dependencies'
import type { SprintRepository } from '#modules/sprints/actions/ports/outbound/sprint_repository'
import GetProjectSprintQuery from '#modules/sprints/actions/queries/get_project_sprint_query'
import type { ProjectSprintAccess } from '#modules/sprints/domain/project_sprint_access_policy'

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
    const repository: SprintRepository = {
      create: () => Promise.resolve(null),
      find: () => Promise.resolve(null),
      list: () => Promise.resolve({ data: [], total: 0 }),
      findForUpdate: () => Promise.resolve(null),
      update: () => Promise.resolve(null),
      findTaskForUpdate: () => Promise.resolve(null),
      findCore: () => Promise.resolve(null),
      assignTask: () => Promise.resolve(null),
    }

    const query = new GetProjectSprintQuery(
      { userId: 'user-1', organizationId: 'org-1', ip: '127.0.0.1', userAgent: 'unit' },
      deps,
      repository
    )

    await assert.rejects(() => query.handle('project-1', 'missing-sprint'))
    assert.equal(requestedProjectId, 'project-1')
  })
})
