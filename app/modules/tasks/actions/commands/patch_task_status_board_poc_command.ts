import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskCollectionAccessContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canManageTaskStatusBoard } from '#modules/tasks/domain/task_permission_policy'

export interface PatchTaskStatusBoardPocInput {
  organizationId: string
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
  constructor(
    protected execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies
  ) {}

  async execute(input: PatchTaskStatusBoardPocInput): Promise<PatchTaskStatusBoardPocResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const accessContext = await buildTaskCollectionAccessContext(
      userId,
      input.organizationId,
      'none',
      undefined,
      this.taskExternalDependencies.permission
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
