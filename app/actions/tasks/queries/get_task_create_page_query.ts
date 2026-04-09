import type { ExecutionContext } from '#types/execution_context'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import CheckTaskCreatePermissionQuery from './check_task_create_permission_query.js'
import GetTaskMetadataQuery from './get_task_metadata_query.js'

export interface GetTaskCreatePageInput {
  organizationId: DatabaseId
  selectedProjectId?: DatabaseId
}

export interface GetTaskCreatePageResult {
  metadata: Awaited<ReturnType<GetTaskMetadataQuery['execute']>>
}

export default class GetTaskCreatePageQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(input: GetTaskCreatePageInput): Promise<GetTaskCreatePageResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const createTaskDecision = await CheckTaskCreatePermissionQuery.execute(
      userId,
      input.organizationId,
      input.selectedProjectId ?? null
    )
    enforcePolicy(createTaskDecision)

    const metadata = await new GetTaskMetadataQuery(this.execCtx).execute(input.organizationId)
    return { metadata }
  }
}
