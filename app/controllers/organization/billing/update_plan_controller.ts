import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpdateOrganizationCommand from '#actions/organizations/commands/update_organization_command'
import { UpdateOrganizationDTO } from '#actions/organizations/dtos/request/update_organization_dto'

/**
 * UpdatePlanController
 *
 * Update subscription plan
 *
 * PUT /org/billing/plan
 */
export default class UpdatePlanController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const execCtx = ExecutionContext.fromHttp(ctx)
    const organizationId = execCtx.organizationId

    if (!organizationId) {
      throw new Error('Organization context required')
    }

    const plan = request.input('plan') as string
    const dto = new UpdateOrganizationDTO(
      organizationId,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      plan
    )
    await new UpdateOrganizationCommand(execCtx).execute(dto)

    if (request.accepts(['html', 'json']) === 'json') {
      response.json({ success: true, message: 'Cập nhật gói dịch vụ thành công' })
      return
    }

    session.flash('success', 'Cập nhật gói dịch vụ thành công')
    response.redirect().toRoute('org.billing.show')
  }
}
