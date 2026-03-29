import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import CreateTaskStatusCommand from '#actions/tasks/commands/create_task_status_command'
import { CreateTaskStatusDTO } from '#actions/tasks/dtos/request/task_status_dtos'
import { TaskStatusCategory } from '#constants/task_constants'

/**
 * CreateTaskStatusController
 *
 * Create custom task status
 *
 * POST /org/workflow/statuses
 */
export default class CreateTaskStatusController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const execCtx = ExecutionContext.fromHttp(ctx)
    const organizationId = execCtx.organizationId

    if (!organizationId) {
      throw new Error('Organization context required')
    }

    const rawName = request.input('name') as string
    const slugInput = request.input('slug') as string | undefined
    const slug = (slugInput && slugInput.trim().length > 0 ? slugInput : rawName)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')

    const dto = new CreateTaskStatusDTO({
      organization_id: organizationId,
      name: rawName,
      slug,
      category: (request.input('category') as string | undefined) ?? TaskStatusCategory.IN_PROGRESS,
      color: (request.input('color') as string | undefined) ?? '#6B7280',
      icon: request.input('icon') as string | undefined,
      description: request.input('description') as string | undefined,
      sort_order: request.input('sort_order') as number | undefined,
    })

    const status = await new CreateTaskStatusCommand(execCtx).execute(dto)

    if (request.accepts(['html', 'json']) === 'json') {
      response.status(201).json({ success: true, data: status })
      return
    }

    session.flash('success', 'Tạo trạng thái công việc thành công')
    response.redirect().toRoute('org.workflow.statuses')
  }
}
