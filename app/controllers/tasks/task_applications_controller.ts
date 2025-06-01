import type { HttpContext } from '@adonisjs/core/http'
import ApplyForTaskCommand from '#actions/tasks/commands/apply_for_task_command'
import ProcessApplicationCommand from '#actions/tasks/commands/process_application_command'
import WithdrawApplicationCommand from '#actions/tasks/commands/withdraw_application_command'
import GetTaskApplicationsQuery from '#actions/tasks/queries/get_task_applications_query'
import GetPublicTasksQuery from '#actions/tasks/queries/get_public_tasks_query'
import GetMyApplicationsQuery from '#actions/tasks/queries/get_my_applications_query'
import {
  ApplyForTaskDTO,
  ProcessApplicationDTO,
  WithdrawApplicationDTO,
  GetTaskApplicationsDTO,
  GetPublicTasksDTO,
} from '#actions/tasks/dtos/task_application_dtos'

// Validation helpers
function validateApplicationSource(value: string): 'public_listing' | 'invitation' | 'referral' {
  if (['public_listing', 'invitation', 'referral'].includes(value)) {
    return value as 'public_listing' | 'invitation' | 'referral'
  }
  return 'public_listing' // default fallback
}

function validateStatus(value: string): 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'all' {
  if (['pending', 'approved', 'rejected', 'withdrawn', 'all'].includes(value)) {
    return value as 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'all'
  }
  return 'all' // default fallback
}

function validateAssignmentType(value: string): 'member' | 'freelancer' | 'volunteer' {
  if (['member', 'freelancer', 'volunteer'].includes(value)) {
    return value as 'member' | 'freelancer' | 'volunteer'
  }
  return 'freelancer' // default fallback
}

/**
 * TaskApplicationsController
 *
 * Handles task application workflow:
 * - Freelancers browsing and applying to public tasks
 * - Project owners reviewing and processing applications
 */
export default class TaskApplicationsController {
  /**
   * List public tasks (marketplace)
   * GET /marketplace/tasks
   */
  async publicTasks(ctx: HttpContext) {
    const { request, inertia } = ctx

    const dto = new GetPublicTasksDTO({
      page: request.input('page', 1) as number,
      per_page: request.input('per_page', 20) as number,
      skill_ids: request.input('skill_ids') as number[] | null | undefined,
      difficulty_level_id: request.input('difficulty_level_id') as number | null | undefined,
      min_budget: request.input('min_budget') as number | null | undefined,
      max_budget: request.input('max_budget') as number | null | undefined,
      sort_by: request.input('sort_by', 'created_at') as 'created_at' | 'budget' | 'due_date',
      sort_order: request.input('sort_order', 'desc') as 'asc' | 'desc',
    })

    const query = new GetPublicTasksQuery(ctx)
    const result = await query.handle(dto)

    return inertia.render('marketplace/tasks', {
      tasks: result.data.map((t) => t.serialize()),
      meta: result.meta,
      filters: {
        skill_ids: dto.skill_ids,
        difficulty_level_id: dto.difficulty_level_id,
        min_budget: dto.min_budget,
        max_budget: dto.max_budget,
        sort_by: dto.sort_by,
        sort_order: dto.sort_order,
      },
    })
  }

  /**
   * API: List public tasks
   * GET /api/marketplace/tasks
   */
  async publicTasksApi(ctx: HttpContext) {
    const { request, response } = ctx

    const dto = new GetPublicTasksDTO({
      page: request.input('page', 1) as number,
      per_page: request.input('per_page', 20) as number,
      skill_ids: request.input('skill_ids') as number[] | null | undefined,
      difficulty_level_id: request.input('difficulty_level_id') as number | null | undefined,
      min_budget: request.input('min_budget') as number | null | undefined,
      max_budget: request.input('max_budget') as number | null | undefined,
      sort_by: request.input('sort_by', 'created_at') as 'created_at' | 'budget' | 'due_date',
      sort_order: request.input('sort_order', 'desc') as 'asc' | 'desc',
    })

    const query = new GetPublicTasksQuery(ctx)
    const result = await query.handle(dto)

    response.json({
      data: result.data.map((t) => t.serialize()),
      meta: result.meta,
    })
  }

  /**
   * Apply for a task
   * POST /tasks/:taskId/apply
   */
  async apply(ctx: HttpContext) {
    const { request, response, params, session } = ctx

    try {
      const dto = new ApplyForTaskDTO({
        task_id: Number(params.taskId),
        message: request.input('message') as string,
        expected_rate: request.input('expected_rate') as number | undefined,
        portfolio_links: request.input('portfolio_links') as string[] | undefined,
        application_source: validateApplicationSource(
          String(request.input('application_source', 'public_listing'))
        ),
      })

      const command = new ApplyForTaskCommand(ctx)
      await command.handle(dto)

      session.flash('success', 'Application submitted successfully')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit application'
      session.flash('error', errorMessage)
    }

    response.redirect().back()
  }

  /**
   * API: Apply for a task
   * POST /api/tasks/:taskId/apply
   */
  async applyApi(ctx: HttpContext) {
    const { request, response, params } = ctx

    try {
      const dto = new ApplyForTaskDTO({
        task_id: Number(params.taskId),
        message: request.input('message') as string,
        expected_rate: request.input('expected_rate') as number | undefined,
        portfolio_links: request.input('portfolio_links') as string[] | undefined,
        application_source: validateApplicationSource(
          String(request.input('application_source', 'public_listing'))
        ),
      })

      const command = new ApplyForTaskCommand(ctx)
      const application = await command.handle(dto)

      response.status(201).json({
        success: true,
        data: application.serialize(),
      })
      return
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit application'
      response.status(400).json({
        success: false,
        message: errorMessage,
      })
      return
    }
  }

  /**
   * Get applications for a task (for project owner)
   * GET /tasks/:taskId/applications
   */
  async taskApplications(ctx: HttpContext) {
    const { request, params, inertia } = ctx

    const dto = new GetTaskApplicationsDTO({
      task_id: Number(params.taskId),
      status: validateStatus(String(request.input('status', 'all'))),
      page: request.input('page', 1) as number,
      per_page: request.input('per_page', 20) as number,
    })

    const query = new GetTaskApplicationsQuery(ctx)
    const result = await query.handle(dto)

    return inertia.render('tasks/applications', {
      taskId: params.taskId as string,
      applications: result.data.map((a) => a.serialize()),
      meta: result.meta,
      statusFilter: dto.status,
    })
  }

  /**
   * Process application (approve/reject)
   * POST /applications/:id/process
   */
  async processApplication(ctx: HttpContext) {
    const { request, response, params, session } = ctx

    try {
      const dto = new ProcessApplicationDTO({
        application_id: Number(params.id),
        action: request.input('action') as 'approve' | 'reject',
        rejection_reason: request.input('rejection_reason') as string | undefined,
        assignment_type: validateAssignmentType(
          String(request.input('assignment_type', 'freelancer'))
        ),
        estimated_hours: request.input('estimated_hours') as number | undefined,
      })

      const command = new ProcessApplicationCommand(ctx)
      await command.handle(dto)

      const message =
        dto.action === 'approve' ? 'Application approved successfully' : 'Application rejected'
      session.flash('success', message)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process application'
      session.flash('error', errorMessage)
    }

    response.redirect().back()
  }

  /**
   * Withdraw my application
   * POST /applications/:id/withdraw
   */
  async withdrawApplication(ctx: HttpContext) {
    const { response, params, session } = ctx

    try {
      const dto = new WithdrawApplicationDTO(Number(params.id))

      const command = new WithdrawApplicationCommand(ctx)
      await command.handle(dto)

      session.flash('success', 'Application withdrawn successfully')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to withdraw application'
      session.flash('error', errorMessage)
    }

    response.redirect().back()
  }

  /**
   * Get my applications (for freelancer)
   * GET /my-applications
   */
  async myApplications(ctx: HttpContext) {
    const { request, inertia } = ctx

    const query = new GetMyApplicationsQuery(ctx)
    const statusFilter = validateStatus(String(request.input('status', 'all')))
    const result = await query.handle({
      status: statusFilter,
      page: request.input('page', 1) as number,
      per_page: request.input('per_page', 20) as number,
    })

    return inertia.render('applications/my-applications', {
      applications: result.data.map((a) => a.serialize()),
      meta: result.meta,
      statusFilter: statusFilter,
    })
  }
}
