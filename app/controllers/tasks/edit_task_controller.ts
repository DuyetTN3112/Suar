import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import { ErrorMessages } from '#constants/error_constants'
import UpdateTaskDTO from '#actions/tasks/dtos/update_task_dto'
import GetTaskDetailDTO from '#actions/tasks/dtos/get_task_detail_dto'
import UpdateTaskCommand from '#actions/tasks/commands/update_task_command'
import GetTaskDetailQuery from '#actions/tasks/queries/get_task_detail_query'
import GetTaskMetadataQuery from '#actions/tasks/queries/get_task_metadata_query'
import CreateNotification from '#actions/common/create_notification'

/**
 * GET /tasks/:id/edit — show form
 * PUT /tasks/:id — update task
 */
export default class EditTaskController {
  async showForm(ctx: HttpContext) {
    try {
      const { session } = ctx
      const organizationId = session.get('current_organization_id') as string | undefined
      if (!organizationId) {
        throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
      }

      const dto = GetTaskDetailDTO.createMinimal(ctx.params.id as string)

      const execCtx = ExecutionContext.fromHttp(ctx)
      const getTaskDetailQuery = new GetTaskDetailQuery(execCtx)
      const getTaskMetadataQuery = new GetTaskMetadataQuery(execCtx)
      const [taskResult, metadata] = await Promise.all([
        getTaskDetailQuery.execute(dto),
        getTaskMetadataQuery.execute(organizationId),
      ])

      if (!taskResult.permissions.canEdit) {
        throw new ForbiddenException('Bạn không có quyền chỉnh sửa nhiệm vụ này')
      }

      return await ctx.inertia.render('tasks/edit', {
        task: taskResult.task,
        metadata,
        permissions: taskResult.permissions,
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Không tìm thấy nhiệm vụ'
      ctx.session.flash('error', errorMessage)
      ctx.response.redirect().toRoute('tasks.index')
      return
    }
  }

  async handle(ctx: HttpContext) {
    try {
      const { params, request, response, session, auth } = ctx

      if (!auth.user) {
        throw new UnauthorizedException()
      }

      const dto = new UpdateTaskDTO({
        title: request.input('title') as string | undefined,
        description: request.input('description') as string | undefined,
        status: request.input('status') as string | undefined,
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

      const command = new UpdateTaskCommand(
        ExecutionContext.fromHttp(ctx),
        new CreateNotification()
      )
      const task = await command.execute(params.id as string, dto)

      session.flash('success', 'Nhiệm vụ đã được cập nhật thành công')

      if (request.header('X-Inertia')) {
        response.status(200).json({
          success: true,
          task,
        })
        return
      }

      response.redirect().toRoute('tasks.show', { id: task.id })
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật nhiệm vụ'
      ctx.session.flash('error', errorMessage)
      ctx.response.redirect().back()
      return
    }
  }
}
