import { enforcePolicy } from '#actions/authorization/public_api'
import { buildTaskCollectionAccessContext } from '#actions/tasks/support/task_permission_context_builder'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { canManageTaskStatusBoard } from '#modules/tasks/domain/task_permission_policy'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

export interface PatchTaskStatusBoardPocInput {
  organizationId: DatabaseId
  total?: number
  simulateConflict: boolean
}

export interface PatchTaskStatusBoardPocResult {
  status: 200 | 409
  body: {
    success: boolean
    message?: string
    data?: {
      acknowledged_total: number | null
    }
  }
}

export default class PatchTaskStatusBoardPocCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(input: PatchTaskStatusBoardPocInput): Promise<PatchTaskStatusBoardPocResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const accessContext = await buildTaskCollectionAccessContext(
      userId,
      input.organizationId,
      'none'
    )
    enforcePolicy(canManageTaskStatusBoard(accessContext))

    if (input.simulateConflict) {
      return {
        status: 409,
        body: {
          success: false,
          message: 'Conflict simulated for status board POC',
        },
      }
    }

    return {
      status: 200,
      body: {
        success: true,
        data: {
          acknowledged_total: typeof input.total === 'number' ? input.total : null,
        },
      },
    }
  }
}
