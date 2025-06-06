import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import CreateProjectCommand from '#actions/projects/commands/create_project_command'
import { CreateProjectDTO } from '#actions/projects/dtos/request/create_project_dto'
import { ProjectVisibility } from '#constants/project_constants'

/**
 * POST /projects → Store new project
 */
export default class StoreProjectController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    try {
      const dto = this.buildCreateDTO(request)
      const command = new CreateProjectCommand(ctx)
      const project = await command.handle(dto)

      session.flash('success', 'Dự án đã được tạo thành công')
      response.redirect().toRoute('projects.show', { id: project.id })
      return
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra khi tạo dự án'
      session.flash('error', errorMessage)
      response.redirect().back()
      return
    }
  }

  private buildCreateDTO(request: HttpContext['request']): CreateProjectDTO {
    const visibilityInput = request.input('visibility') as string | undefined

    const validVisibilities = Object.values(ProjectVisibility) as string[]
    const visibility: ProjectVisibility | undefined = validVisibilities.includes(
      visibilityInput as string
    )
      ? (visibilityInput as ProjectVisibility)
      : undefined

    return new CreateProjectDTO({
      name: request.input('name') as string,
      description: request.input('description') as string | undefined,
      organization_id: request.input('organization_id') as string,
      status: request.input('status') as string | undefined,
      start_date: request.input('start_date')
        ? DateTime.fromISO(String(request.input('start_date')))
        : null,
      end_date: request.input('end_date')
        ? DateTime.fromISO(String(request.input('end_date')))
        : null,
      manager_id: request.input('manager_id') as string | undefined,
      visibility,
      budget: request.input('budget') as number | undefined,
    })
  }
}
