import type { HttpContext } from '@adonisjs/core/http'
import CheckTaskCreatePermissionQuery from '#actions/tasks/queries/check_task_create_permission_query'
import type { DatabaseId } from '#types/database'

/**
 * GET /api/tasks/check-create-permission
 * Check if the current user can create tasks in their organization
 */
export default class CheckCreatePermissionController {
  async handle(ctx: HttpContext) {
    const { response, auth, session } = ctx
    const user = auth.user

    if (!user) {
      response.json({ success: false, canCreate: false })
      return
    }

    const organizationId = session.get('current_organization_id') as DatabaseId | undefined

    if (!organizationId) {
      response.json({ success: false, canCreate: false })
      return
    }

    const canCreate = await CheckTaskCreatePermissionQuery.execute(user.id, organizationId)

    response.json({ success: true, canCreate })
  }
}
