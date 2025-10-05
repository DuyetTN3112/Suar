import type { HttpContext } from '@adonisjs/core/http'

import { wrapApiV1Data } from '#modules/http/api_v1/response_mappers'
import { resolveCurrentOrganizationId } from '#modules/http/public_contracts/http_execution_context'
import CheckTaskCreatePermissionQuery from '#modules/tasks/actions/queries/check_task_create_permission_query'
import { getTaskPermissionReader } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * GET /api/tasks/check-create-permission
 * Check if the current user can create tasks in their organization
 */
export default class CheckCreatePermissionController {
  async handle(ctx: HttpContext) {
    const { request, auth } = ctx
    const user = auth.user

    if (!user) {
      return wrapApiV1Data({
        canCreate: false,
        reason: 'Bạn cần đăng nhập để tạo nhiệm vụ',
        code: null,
      })
    }

    const organizationId = resolveCurrentOrganizationId(ctx)

    if (!organizationId) {
      return wrapApiV1Data({
        canCreate: false,
        reason: 'Bạn cần chọn tổ chức hiện tại trước khi tạo nhiệm vụ',
        code: null,
      })
    }

    const projectId =
      (request.input('projectId') as string | undefined) ??
      (request.input('project_id') as string | undefined)
    const decision = await CheckTaskCreatePermissionQuery.execute(
      user.id,
      organizationId,
      projectId,
      getTaskPermissionReader()
    )

    return wrapApiV1Data({
      canCreate: decision.allowed,
      reason: decision.allowed ? null : decision.reason,
      code: decision.allowed ? null : decision.code,
    })
  }
}
