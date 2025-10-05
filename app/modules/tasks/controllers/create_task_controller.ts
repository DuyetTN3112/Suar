import type { HttpContext } from '@adonisjs/core/http'

import { buildCreateTaskDTO } from './mappers/request/task_request_mapper.js'
import { mapTaskCreateApiBody } from './mappers/response/task_response_mapper.js'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import {
  makeCreateTaskCommand,
  makeGetTaskCreatePageQuery,
} from '#modules/tasks/bootstrap/task_action_factory'

/**
 * GET /tasks/create — show form
 * POST /tasks — store new task
 */
export default class CreateTaskController {
  async showForm(ctx: HttpContext) {
    const { session } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)

    const selectedProjectId =
      (ctx.request.input('projectId') as string | undefined) ??
      (ctx.request.input('project_id') as string | undefined) ??
      (session.get('current_project_id') as string | undefined)
    const { metadata } = await makeGetTaskCreatePageQuery(actionContextFromHttp(ctx)).execute(omitUndefined({
      organizationId,
      selectedProjectId,
    }))
    return await ctx.inertia.render('tasks/create', { metadata })
  }

  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)

    let task
    try {
      const dto = await buildCreateTaskDTO(request, organizationId)
      task = await makeCreateTaskCommand(actionContextFromHttp(ctx)).execute(dto)
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
    response.redirect(`/tasks/${task.id}`)
  }
}
