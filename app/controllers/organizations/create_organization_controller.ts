import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import CreateOrganizationCommand from '#actions/organizations/commands/create_organization_command'
import { CreateOrganizationDTO } from '#actions/organizations/dtos/request/create_organization_dto'
import CreateNotification from '#actions/common/create_notification'

/**
 * GET /organizations/create — show form
 * POST /organizations — store new organization
 */
export default class CreateOrganizationController {
  async showForm({ inertia }: HttpContext) {
    return await inertia.render('organizations/create', {})
  }

  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const createOrganization = new CreateOrganizationCommand(
      ExecutionContext.fromHttp(ctx),
      new CreateNotification()
    )
    try {
      const dto = new CreateOrganizationDTO(
        request.input('name') as string,
        request.input('slug') as string,
        request.input('description') as string | undefined,
        request.input('logo') as string | undefined,
        request.input('website') as string | undefined,
        request.input('plan') as string | undefined
      )

      const organization = await createOrganization.execute(dto)

      session.flash('success', 'Tổ chức đã được tạo thành công')
      response.redirect().toRoute('organizations.show', { id: organization.id })
      return
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra khi tạo tổ chức'
      session.flash('error', errorMessage)
      response.redirect().back()
      return
    }
  }
}
