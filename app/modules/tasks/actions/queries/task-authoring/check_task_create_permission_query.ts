import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import type AppException from '#modules/errors/public_contracts/application_exception'
import type { Result } from '#modules/errors/public_contracts/result'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import type { TaskPermissionReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import { buildTaskCreatePermissionContext } from '#modules/tasks/actions/task_permission_context'
import { canCreateTask } from '#modules/tasks/domain/task-assignment/task_permission_policy'

/**
 * Query: Check Task Create Permission
 *
 * Checks if user can create tasks in an organization.
 * User must have Organization or Project permission to create tasks.
 */
export interface CheckTaskCreatePermissionInput {
  userId: string
  organizationId: string
  projectId: string | null | undefined
}

export default class CheckTaskCreatePermissionQuery extends BaseQuery<
  CheckTaskCreatePermissionInput,
  PolicyResult
> {
  constructor(private readonly permissionReader: TaskPermissionReader) {
    super()
  }

  override executeAndWrap(input: CheckTaskCreatePermissionInput): Promise<Result<PolicyResult, AppException>>
  override executeAndWrap(
    userId: string,
    organizationId: string,
    projectId: string | null | undefined
  ): Promise<Result<PolicyResult, AppException>>
  override executeAndWrap(
    userIdOrInput: CheckTaskCreatePermissionInput | string,
    organizationId?: string,
    projectId?: string | null
  ): Promise<Result<PolicyResult, AppException>> {
    const input =
      typeof userIdOrInput === 'object'
        ? userIdOrInput
        : { userId: userIdOrInput, organizationId: organizationId as string, projectId }
    return super.executeAndWrap(input)
  }

  async execute(
    userId: string,
    organizationId: string,
    projectId: string | null | undefined
  ): Promise<PolicyResult> {
    return this.handle({ userId, organizationId, projectId })
  }

  async handle(input: CheckTaskCreatePermissionInput): Promise<PolicyResult> {
    const permissionContext = await buildTaskCreatePermissionContext(
      input.userId,
      input.organizationId,
      input.projectId ?? null,
      undefined,
      this.permissionReader
    )

    return canCreateTask(permissionContext)
  }
}
