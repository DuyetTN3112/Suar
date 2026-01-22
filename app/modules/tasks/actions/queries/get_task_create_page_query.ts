import CheckTaskCreatePermissionQuery from './check_task_create_permission_query.js'
import GetTaskMetadataQuery from './get_task_metadata_query.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskReadRepository } from '#modules/tasks/actions/ports/outbound/task_read_repository'
import type { TaskStatusQueryRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_status_query_repository_port'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export interface GetTaskCreatePageInput {
  organizationId: string
  selectedProjectId?: string
}

export interface GetTaskCreatePageResult {
  metadata: Awaited<ReturnType<GetTaskMetadataQuery['execute']>>
}

export default class GetTaskCreatePageQuery {
  constructor(
    protected execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies,
    private readonly taskReadRepository: Pick<TaskReadRepository, 'findRootTaskOptions'>,
    private readonly taskStatusRepository: Pick<TaskStatusQueryRepositoryPort, 'findByOrganization'>
  ) {}

  async execute(input: GetTaskCreatePageInput): Promise<GetTaskCreatePageResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const createTaskDecision = await new CheckTaskCreatePermissionQuery(
      this.taskExternalDependencies.permission
    ).execute(
      userId,
      input.organizationId,
      input.selectedProjectId ?? null
    )
    enforcePolicy(createTaskDecision)

    const metadata = await new GetTaskMetadataQuery(
      this.execCtx,
      this.taskExternalDependencies,
      this.taskReadRepository,
      this.taskStatusRepository
    ).execute(input.organizationId, input.selectedProjectId ?? null)
    return { metadata }
  }
}
