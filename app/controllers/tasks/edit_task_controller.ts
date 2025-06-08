import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import { ErrorMessages, HttpStatus } from '#constants/error_constants'
import UpdateTaskDTO from '#actions/tasks/dtos/request/update_task_dto'
import UpdateTaskCommand from '#actions/tasks/commands/update_task_command'
import GetTaskEditPageQuery from '#actions/tasks/queries/get_task_edit_page_query'
import CreateNotification from '#actions/common/create_notification'

/**
 * GET /tasks/:id/edit — show form
 * PUT /tasks/:id — update task
 */
export default class EditTaskController {
  async showForm(ctx: HttpContext) {
    const { session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined
    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const { task, taskData, metadata } = await new GetTaskEditPageQuery(
      ExecutionContext.fromHttp(ctx)
    ).execute(ctx.params.id as string, organizationId)

    if (!taskData.permissions.canEdit) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa nhiệm vụ này')
    }

    return await ctx.inertia.render('tasks/edit', {
      task,
      metadata,
      permissions: taskData.permissions,
    })
  }

  async handle(ctx: HttpContext) {
    const { params, request, response, session, auth } = ctx

    if (!auth.user) {
      throw new UnauthorizedException()
    }

    const dto = new UpdateTaskDTO({
      title: request.input('title') as string | undefined,
      description: request.input('description') as string | undefined,
      label: request.input('label') as string | undefined,
      priority: request.input('priority') as string | undefined,
      assigned_to: request.input('assigned_to') as string | undefined,
      due_date: request.input('due_date') as string | undefined,
      parent_task_id: request.input('parent_task_id') as string | undefined,
      estimated_time: request.input('estimated_time') as number | undefined,
      actual_time: request.input('actual_time') as number | undefined,
      project_id: request.input('project_id') as string | undefined,
      updated_by: auth.user.id,
    })

    const command = new UpdateTaskCommand(ExecutionContext.fromHttp(ctx), new CreateNotification())
    const task = await command.execute(params.id as string, dto)

    session.flash('success', 'Nhiệm vụ đã được cập nhật thành công')

    if (request.header('X-Inertia')) {
      response.status(HttpStatus.OK).json({
        success: true,
        task,
      })
      return
    }

    response.redirect().toRoute('tasks.show', { id: task.id })
    return
  }
}
