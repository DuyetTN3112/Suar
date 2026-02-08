import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildCreateTaskDTO } from './mappers/request/task_request_mapper.js'
import { mapTaskCreateApiBody } from './mappers/response/task_response_mapper.js'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { TaskLifecycleCommandFactory } from '#modules/tasks/actions/ports/inbound/task_lifecycle_command_factory'

/**
 * GET /tasks/create — compatibility redirect to the Project task board modal
 * POST /tasks — store new task
 */
@inject()
export default class CreateTaskController {
  constructor(private readonly lifecycleCommands: TaskLifecycleCommandFactory) {}

  showForm(ctx: HttpContext) {
    const { session } = ctx
    const selectedProjectId =
      (ctx.request.input('projectId') as string | undefined) ??
      (ctx.request.input('project_id') as string | undefined) ??
      (session.get('current_project_id') as string | undefined)

    if (!selectedProjectId) {
      return ctx.response.redirect('/projects')
    }

    const query = new URLSearchParams({ create: '1' })
    for (const [target, candidates] of [
      ['roleId', ['roleId', 'role_id']],
      ['taskType', ['taskType', 'task_type']],
      ['workArea', ['workArea', 'work_area']],
      ['status', ['status']],
    ] as const) {
      let value: string | null = null
      for (const candidate of candidates) {
        const rawValue: unknown = ctx.request.input(candidate)
        if (typeof rawValue === 'string' && rawValue.length > 0) {
          value = rawValue
          break
        }
      }
      if (value) query.set(target, value)
    }

    return ctx.response.redirect(
      `/projects/${encodeURIComponent(selectedProjectId)}/tasks?${query.toString()}`
    )
  }

  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)

    let task
    try {
      const dto = await buildCreateTaskDTO(request, organizationId)
      task = await this.lifecycleCommands.makeCreate(actionContextFromHttp(ctx)).execute(dto)
    } catch (error) {
      if (error instanceof BusinessLogicException && !request.accepts(['application/json'])) {
        const message = error.message
        session.flash('inputErrorsBag', {
          [message.includes('Due date') ? 'due_date' : 'form']: message,
        })
        response.redirect().back()
        return
      }

      throw error
    }

    // SPA/API callers expect JSON to update UI immediately without full-page redirect.
    if (request.accepts(['application/json'])) {
      response.status(201).json(mapTaskCreateApiBody(task))
      return
    }

    session.flash('success', 'Nhiệm vụ đã được tạo thành công')
    if (!task.project_id) {
      response.redirect('/projects')
      return
    }

    response.redirect(
      `/projects/${encodeURIComponent(task.project_id)}/tasks?task_id=${encodeURIComponent(task.id)}`
    )
  }
}
