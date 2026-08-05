import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { resolveCurrentOrganizationId } from '#modules/http/boundary/http_execution_context'
import CheckTaskCreatePermissionQuery from '#modules/tasks/actions/queries/task-authoring/check_task_create_permission_query'
import { buildTaskCreatePermissionRequest } from '#modules/tasks/controllers/mappers/request/task-authoring/task_create_permission_request_mapper'


/**
 * GET /api/tasks/check-create-permission
 * Check if the current user can create tasks in their organization
 */

@inject()
export default class CheckCreatePermissionController {
  constructor(private readonly checkCreatePermission: CheckTaskCreatePermissionQuery) {}

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

    const projectId = buildTaskCreatePermissionRequest(request)
    const decision = await this.checkCreatePermission
      .executeAndWrap({ userId: user.id, organizationId, projectId })
      .then((outcome) => outcome.getValue())

    return wrapApiV1Data({
      canCreate: decision.allowed,
      reason: decision.allowed ? null : decision.reason,
      code: decision.allowed ? null : decision.code,
    })
  }

}
