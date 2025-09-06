import CheckTaskCreatePermissionQuery from './check_task_create_permission_query.js'
import GetTaskMetadataQuery from './get_task_metadata_query.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
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
    private taskExternalDependencies: TaskExternalDependencies
  ) {}

  async execute(input: GetTaskCreatePageInput): Promise<GetTaskCreatePageResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const createTaskDecision = await CheckTaskCreatePermissionQuery.execute(
      userId,
      input.organizationId,
      input.selectedProjectId ?? null,
      this.taskExternalDependencies.permission
    )
    enforcePolicy(createTaskDecision)

    const metadata = await new GetTaskMetadataQuery(
      this.execCtx,
      this.taskExternalDependencies
    ).execute(input.organizationId)
    return { metadata }
  }
}
