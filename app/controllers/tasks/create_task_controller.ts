import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'
import CreateTaskDTO from '#actions/tasks/dtos/request/create_task_dto'
import CreateTaskCommand from '#actions/tasks/commands/create_task_command'
import GetTaskMetadataQuery from '#actions/tasks/queries/get_task_metadata_query'
import CheckTaskCreatePermissionQuery from '#actions/tasks/queries/check_task_create_permission_query'
import CreateNotification from '#actions/common/create_notification'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import UnauthorizedException from '#exceptions/unauthorized_exception'

/**
 * GET /tasks/create — show form
 * POST /tasks — store new task
 */
export default class CreateTaskController {
  async showForm(ctx: HttpContext) {
    const organizationId = ctx.session.get('current_organization_id') as string | undefined
    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const execCtx = ExecutionContext.fromHttp(ctx)
    const userId = execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const selectedProjectId = ctx.request.input('project_id') as string | undefined
    const createTaskDecision = await CheckTaskCreatePermissionQuery.execute(
      userId,
      organizationId,
      selectedProjectId ?? null
    )
    enforcePolicy(createTaskDecision)

    const metadata = await new GetTaskMetadataQuery(execCtx).execute(organizationId)
    return await ctx.inertia.render('tasks/create', { metadata })
  }

  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined
    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const dto = new CreateTaskDTO({
      title: request.input('title') as string,
      description: request.input('description') as string | undefined,
      task_status_id: request.input('task_status_id') as string,
      label: request.input('label') as string | undefined,
      priority: request.input('priority') as string | undefined,
      assigned_to: request.input('assigned_to') as string | undefined,
      due_date: request.input('due_date') as string | undefined,
      parent_task_id: request.input('parent_task_id') as string | undefined,
      estimated_time: request.input('estimated_time') as number | undefined,
      actual_time: request.input('actual_time') as number | undefined,
      project_id: request.input('project_id') as string,
      organization_id: organizationId,
      required_skills: request.input('required_skills') as
        | Array<{ id: string; level: string }>
        | undefined,
      task_type: request.input('task_type') as string | undefined,
      acceptance_criteria: request.input('acceptance_criteria') as string | undefined,
      verification_method: request.input('verification_method') as string | undefined,
      expected_deliverables: request.input('expected_deliverables') as
        | Array<Record<string, unknown>>
        | undefined,
      context_background: request.input('context_background') as string | undefined,
      impact_scope: request.input('impact_scope') as string | undefined,
      tech_stack: request.input('tech_stack') as string[] | undefined,
      environment: request.input('environment') as string | undefined,
      collaboration_type: request.input('collaboration_type') as string | undefined,
      complexity_notes: request.input('complexity_notes') as string | undefined,
      measurable_outcomes: request.input('measurable_outcomes') as
        | Array<Record<string, unknown>>
        | undefined,
      learning_objectives: request.input('learning_objectives') as string[] | undefined,
      domain_tags: request.input('domain_tags') as string[] | undefined,
      role_in_task: request.input('role_in_task') as string | undefined,
      autonomy_level: request.input('autonomy_level') as string | undefined,
      problem_category: request.input('problem_category') as string | undefined,
      business_domain: request.input('business_domain') as string | undefined,
      estimated_users_affected: request.input('estimated_users_affected') as number | undefined,
    })

    const task = await new CreateTaskCommand(
      ExecutionContext.fromHttp(ctx),
      new CreateNotification()
    ).execute(dto)

    // SPA/API callers expect JSON to update UI immediately without full-page redirect.
    if (request.accepts(['application/json'])) {
      response.status(201).json({ success: true, data: task })
      return
    }

    session.flash('success', 'Nhiệm vụ đã được tạo thành công')
    response.redirect().toRoute('tasks.show', { id: task.id })
  }
}
