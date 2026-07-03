import { test } from '@japa/runner'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import DeleteProjectCommand from '#modules/projects/actions/commands/project-context/delete_project_command'
import { DeleteProjectDTO } from '#modules/projects/actions/dtos/request/delete_project_dto'
import { ProjectLifecycleRepository } from '#modules/projects/actions/ports/outbound/project_lifecycle_repository'
import type { ProjectTaskCacheInvalidator } from '#modules/projects/actions/ports/outbound/project_task_cache_invalidator'
import type { ProjectTaskStatsReader } from '#modules/projects/actions/ports/outbound/project_task_stats_reader'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
const taskStatsReader: ProjectTaskStatsReader = {
  getTaskStats: (projectId) =>
    Promise.resolve({
      projectId,
      totalTasks: 0,
      incompleteTasks: 0,
      completedTasks: 0,
      pendingReviewSessions: 0,
    }),
  countTasksByProjectIds: () => Promise.resolve(new Map()),
  countTasksByAssignees: () => Promise.resolve(new Map()),
}
const taskCache: ProjectTaskCacheInvalidator = {
  invalidateTaskCollectionMetadata: () => Promise.resolve(undefined),
}
const actorLookup = {
  findProjectActor: () => Promise.resolve(null),
}
const organizationAccess = {
  findOrganizationAccess: () => Promise.resolve(null),
  ensureApprovedMember: () => Promise.resolve(),
}
class UnusedProjectLifecycleRepository extends ProjectLifecycleRepository {
  private unused(): Promise<never> {
    return Promise.reject(new Error('Project repository must not be used before authentication'))
  }

  findDetail() {
    return this.unused()
  }
  findForUpdate() {
    return this.unused()
  }
  create() {
    return this.unused()
  }
  update() {
    return this.unused()
  }
  updateOwner() {
    return this.unused()
  }
  softDelete() {
    return this.unused()
  }
  hardDelete() {
    return this.unused()
  }
}

function makeExecCtx(userId: string | null): ProjectActionContext {
  return {
    userId,
    ip: '127.0.0.1',
    userAgent: 'test',
    organizationId: VALID_UUID_2,
  }
}

test.group('DeleteProjectCommand shell orchestration', () => {
  test('requires an authenticated user before opening delete flow', async ({ assert }) => {
    const command = new DeleteProjectCommand(
      makeExecCtx(null),
      { run: (work) => work({}) },
      new UnusedProjectLifecycleRepository(),
      { generate: () => VALID_UUID },
      { stage: () => Promise.resolve() },
      taskStatsReader,
      taskCache,
      actorLookup,
      organizationAccess,
      { publishProjectAudit: () => Promise.resolve() }
    )

    await assert.rejects(
      () =>
        command.handle(
          new DeleteProjectDTO({
            project_id: VALID_UUID,
            currentOrganizationId: VALID_UUID_2,
          })
        ),
      UnauthorizedException
    )
  })
})
