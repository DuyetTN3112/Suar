import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'
import CreateTaskDTO from '#actions/tasks/dtos/create_task_dto'
import CreateTaskCommand from '#actions/tasks/commands/create_task_command'
import GetTaskMetadataQuery from '#actions/tasks/queries/get_task_metadata_query'
import CreateNotification from '#actions/common/create_notification'

/**
 * GET /tasks/create — show form
 * POST /tasks — store new task
 */
export default class CreateTaskController {
  async showForm(ctx: HttpContext) {
    try {
      const { inertia } = ctx
      const organizationId = ctx.session.get('current_organization_id') as string | undefined
      if (!organizationId) {
        throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
      }

      const getTaskMetadataQuery = new GetTaskMetadataQuery(ExecutionContext.fromHttp(ctx))
      const metadata = await getTaskMetadataQuery.execute(organizationId)

      return await inertia.render('tasks/create', { metadata })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra'
      ctx.session.flash('error', errorMessage)
      ctx.response.redirect().toRoute('tasks.index')
      return
    }
  }

  async handle(ctx: HttpContext) {
    try {
      const { request, response, session } = ctx
      const organizationId = session.get('current_organization_id') as string | undefined
      if (!organizationId) {
        throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
      }

      const dto = new CreateTaskDTO({
        title: request.input('title') as string,
        description: request.input('description') as string | undefined,
        status: request.input('status') as string,
        label: request.input('label') as string | undefined,
        priority: request.input('priority') as string | undefined,
        assigned_to: request.input('assigned_to') as string | undefined,
        due_date: request.input('due_date') as string | undefined,
        parent_task_id: request.input('parent_task_id') as string | undefined,
        estimated_time: request.input('estimated_time') as number | undefined,
        actual_time: request.input('actual_time') as number | undefined,
        project_id: request.input('project_id') as string | undefined,
        organization_id: organizationId,
      })

      const command = new CreateTaskCommand(
        ExecutionContext.fromHttp(ctx),
        new CreateNotification()
      )
      const task = await command.execute(dto)

      session.flash('success', 'Nhiệm vụ đã được tạo thành công')
      response.redirect().toRoute('tasks.show', { id: task.id })
      return
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra khi tạo nhiệm vụ'
      ctx.session.flash('error', errorMessage)
      ctx.response.redirect().back()
      return
    }
  }
}
