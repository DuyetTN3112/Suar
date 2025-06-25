import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { ExecutionContext } from '#types/execution_context'
import CreateProjectCommand from '#actions/projects/commands/create_project_command'
import { CreateProjectDTO } from '#actions/projects/dtos/request/create_project_dto'

/**
 * CreateProjectController
 *
 * Create new project
 *
 * POST /org/projects
 */
export default class CreateProjectController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const execCtx = ExecutionContext.fromHttp(ctx)
    const organizationId = execCtx.organizationId

    if (!organizationId) {
      throw new Error('Organization context required')
    }

    const toOptionalString = (value: unknown): string | undefined => {
      return typeof value === 'string' && value.trim().length > 0 ? value : undefined
    }

    const toOptionalNumber = (value: unknown): number | undefined => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value
      }
      if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : undefined
      }
      return undefined
    }

    const toOptionalDateTime = (value: unknown): DateTime | undefined => {
      if (typeof value !== 'string' || value.trim().length === 0) {
        return undefined
      }

      const parsed = DateTime.fromISO(value)
      return parsed.isValid ? parsed : undefined
    }

    const dto = new CreateProjectDTO({
      name: request.input('name') as string,
      description: toOptionalString(request.input('description') as unknown),
      organization_id: organizationId,
      status: toOptionalString(request.input('status') as unknown),
      start_date: toOptionalDateTime(request.input('start_date') as unknown) ?? null,
      end_date: toOptionalDateTime(request.input('end_date') as unknown) ?? null,
      manager_id: toOptionalString(request.input('manager_id') as unknown) ?? null,
      visibility: request.input('visibility') as
        | import('#constants/project_constants').ProjectVisibility
        | undefined,
      budget: toOptionalNumber(request.input('budget') as unknown),
    })

    const project = await new CreateProjectCommand(execCtx).handle(dto)

    if (request.accepts(['html', 'json']) === 'json') {
      response.status(201).json({ success: true, data: project })
      return
    }

    session.flash('success', 'Tạo dự án thành công')
    response.redirect().toRoute('org.projects.index')
  }
}
