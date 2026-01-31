import type { HttpContext } from '@adonisjs/core/http'

// DTOs
import CreateTaskDTO from '#actions/tasks/dtos/create_task_dto'
import UpdateTaskDTO from '#actions/tasks/dtos/update_task_dto'
import DeleteTaskDTO from '#actions/tasks/dtos/delete_task_dto'
import UpdateTaskStatusDTO from '#actions/tasks/dtos/update_task_status_dto'
import UpdateTaskTimeDTO from '#actions/tasks/dtos/update_task_time_dto'
import GetTasksListDTO from '#actions/tasks/dtos/get_tasks_list_dto'
import GetTaskDetailDTO from '#actions/tasks/dtos/get_task_detail_dto'

// Commands
import CreateTaskCommand from '#actions/tasks/commands/create_task_command'
import UpdateTaskCommand from '#actions/tasks/commands/update_task_command'
import DeleteTaskCommand from '#actions/tasks/commands/delete_task_command'
import UpdateTaskStatusCommand from '#actions/tasks/commands/update_task_status_command'
import UpdateTaskTimeCommand from '#actions/tasks/commands/update_task_time_command'

// Queries
import GetTasksListQuery from '#actions/tasks/queries/get_tasks_list_query'
import GetTaskDetailQuery from '#actions/tasks/queries/get_task_detail_query'
import GetTaskMetadataQuery from '#actions/tasks/queries/get_task_metadata_query'
import GetTaskAuditLogsQuery from '#actions/tasks/queries/get_task_audit_logs_query'
import CreateNotification from '#actions/common/create_notification'

/**
 * Controller for Tasks Module - CQRS Pattern
 *
 * Consolidated from TasksController + TaskController
 * All methods use Commands (writes) and Queries (reads)
 * Clean, maintainable, testable code
 */
export default class TasksController {
  /**
   * GET /tasks
   * Display tasks list with filters and permissions
   */
  async index(ctx: HttpContext) {
    try {
      const { request, inertia, session } = ctx
      const organizationId = session.get('current_organization_id') as number | undefined
      if (!organizationId) {
        throw new Error('Vui lòng chọn organization')
      }

      // Manually instantiate queries with current HttpContext to avoid DI decorator conflicts
      const getTasksListQuery = new GetTasksListQuery(ctx)
      const getTaskMetadataQuery = new GetTaskMetadataQuery(ctx)

      // Build DTO from request
      const dto = new GetTasksListDTO({
        page: request.input('page', 1) as number,
        limit: request.input('limit', 10) as number,
        status: request.input('status') as number | undefined,
        priority: request.input('priority') as number | undefined,
        label: request.input('label') as number | undefined,
        assigned_to: request.input('assigned_to') as number | undefined,
        parent_task_id: request.input('parent_task_id') as number | null | undefined,
        project_id: request.input('project_id') as number | null | undefined,
        search: request.input('search') as string | undefined,
        organization_id: organizationId,
        sort_by: request.input('sort_by', 'due_date') as
          | 'due_date'
          | 'created_at'
          | 'updated_at'
          | 'title'
          | 'priority',
        sort_order: request.input('sort_order', 'asc') as 'asc' | 'desc',
      })

      // Execute queries in parallel
      const [tasksResult, metadata] = await Promise.all([
        getTasksListQuery.execute(dto),
        getTaskMetadataQuery.execute(organizationId),
      ])

      // ✅ Ensure tasks object has correct structure for frontend
      return await inertia.render('tasks/index', {
        tasks: {
          data: tasksResult.data,
          meta: tasksResult.meta,
        },
        stats: tasksResult.stats || {},
        metadata: metadata,
        filters: {
          page: dto.page,
          limit: dto.limit,
          status: dto.status,
          priority: dto.priority,
          label: dto.label,
          assigned_to: dto.assigned_to,
          parent_task_id: dto.parent_task_id,
          project_id: dto.project_id,
          search: dto.search,
          sort_by: dto.sort_by,
          sort_order: dto.sort_order,
        },
      })
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi tải danh sách nhiệm vụ'
      ctx.session.flash('error', errorMessage)
      return ctx.inertia.render('tasks/index', {
        tasks: {
          data: [],
          meta: {
            total: 0,
            per_page: 10,
            current_page: 1,
            last_page: 0,
            first_page: 1,
            next_page_url: null,
            previous_page_url: null,
          },
        },
        stats: {},
        metadata: {
          statuses: [],
          priorities: [],
          labels: [],
          users: [],
        },
        filters: {},
      })
    }
  }

  /**
   * GET /tasks/create
   * Show create task form
   */
  async create(ctx: HttpContext) {
    try {
      const { inertia } = ctx
      const organizationId = ctx.session.get('current_organization_id') as number | undefined
      if (!organizationId) {
        throw new Error('Vui lòng chọn organization')
      }

      const getTaskMetadataQuery = new GetTaskMetadataQuery(ctx)
      const metadata = await getTaskMetadataQuery.execute(organizationId)

      return await inertia.render('tasks/create', { metadata })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra'
      ctx.session.flash('error', errorMessage)
      ctx.response.redirect().toRoute('tasks.index')
      return
    }
  }

  /**
   * POST /tasks
   * Store new task
   */
  async store(ctx: HttpContext) {
    try {
      const { request, response, session } = ctx
      const organizationId = session.get('current_organization_id') as number | undefined
      if (!organizationId) {
        throw new Error('Vui lòng chọn organization')
      }

      // Build DTO from request
      const dto = new CreateTaskDTO({
        title: request.input('title') as string,
        description: request.input('description') as string | undefined,
        status_id: request.input('status_id') as number,
        label_id: request.input('label_id') as number | undefined,
        priority_id: request.input('priority_id') as number | undefined,
        assigned_to: request.input('assigned_to') as number | undefined,
        due_date: request.input('due_date') as string | undefined,
        parent_task_id: request.input('parent_task_id') as number | undefined,
        estimated_time: request.input('estimated_time') as number | undefined,
        actual_time: request.input('actual_time') as number | undefined,
        project_id: request.input('project_id') as number | undefined,
        organization_id: organizationId,
      })

      // Execute command
      const command = new CreateTaskCommand(ctx, new CreateNotification(ctx))
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

  /**
   * GET /tasks/:id
   * Show task detail
   */
  async show(ctx: HttpContext) {
    try {
      const dto = GetTaskDetailDTO.createFull(Number(ctx.params.id))

      const getTaskDetailQuery = new GetTaskDetailQuery(ctx)
      const result = await getTaskDetailQuery.execute(dto)

      return await ctx.inertia.render('tasks/show', {
        task: result.task,
        permissions: result.permissions,
        auditLogs: result.auditLogs,
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Không tìm thấy nhiệm vụ'
      ctx.session.flash('error', errorMessage)
      ctx.response.redirect().toRoute('tasks.index')
      return
    }
  }

  /**
   * GET /tasks/:id/edit
   * Show edit task form
   */
  async edit(ctx: HttpContext) {
    try {
      const { session } = ctx
      const organizationId = session.get('current_organization_id') as number | undefined
      if (!organizationId) {
        throw new Error('Vui lòng chọn organization')
      }

      const dto = GetTaskDetailDTO.createMinimal(Number(ctx.params.id))

      // Execute queries in parallel
      const getTaskDetailQuery = new GetTaskDetailQuery(ctx)
      const getTaskMetadataQuery = new GetTaskMetadataQuery(ctx)
      const [taskResult, metadata] = await Promise.all([
        getTaskDetailQuery.execute(dto),
        getTaskMetadataQuery.execute(organizationId),
      ])

      // Check edit permission
      if (!taskResult.permissions.canEdit) {
        throw new Error('Bạn không có quyền chỉnh sửa nhiệm vụ này')
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

  /**
   * PUT/PATCH /tasks/:id
   * Update task
   */
  async update(ctx: HttpContext) {
    try {
      const { params, request, response, session, auth } = ctx

      if (!auth.user) {
        throw new Error('Vui lòng đăng nhập')
      }

      // Build DTO from request
      const dto = new UpdateTaskDTO({
        title: request.input('title') as string | undefined,
        description: request.input('description') as string | undefined,
        status_id: request.input('status_id') as number | undefined,
        label_id: request.input('label_id') as number | undefined,
        priority_id: request.input('priority_id') as number | undefined,
        assigned_to: request.input('assigned_to') as number | undefined,
        due_date: request.input('due_date') as string | undefined,
        parent_task_id: request.input('parent_task_id') as number | undefined,
        estimated_time: request.input('estimated_time') as number | undefined,
        actual_time: request.input('actual_time') as number | undefined,
        project_id: request.input('project_id') as number | undefined,
        updated_by: auth.user.id,
      })

      // Execute command (pass task_id separately)
      const command = new UpdateTaskCommand(ctx, new CreateNotification(ctx))
      const task = await command.execute(Number(params.id), dto)

      session.flash('success', 'Nhiệm vụ đã được cập nhật thành công')

      // Check if request from Inertia
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

  /**
   * DELETE /tasks/:id
   * Delete task (soft delete)
   */
  async destroy(ctx: HttpContext) {
    try {
      const { params, response, session, request } = ctx
      const dto = new DeleteTaskDTO({
        task_id: Number(params.id),
        reason: request.input('reason') as string | undefined,
        permanent: request.input('permanent', false) as boolean,
      })

      // Execute command
      const command = new DeleteTaskCommand(ctx, new CreateNotification(ctx))
      const result = await command.execute(dto)

      if (!result.success) {
        session.flash('error', result.message)
        if (request.header('X-Inertia')) {
          response.status(400).json({
            success: false,
            message: result.message,
          })
          return
        }
        response.redirect().back()
        return
      }

      session.flash('success', 'Nhiệm vụ đã được xóa thành công')

      if (request.header('X-Inertia')) {
        response.status(200).json({
          success: true,
          message: result.message,
        })
        return
      }

      response.redirect().toRoute('tasks.index')
      return
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra khi xóa nhiệm vụ'
      ctx.session.flash('error', errorMessage)
      if (ctx.request.header('X-Inertia')) {
        ctx.response.status(500).json({
          success: false,
          message: errorMessage,
        })
        return
      }
      ctx.response.redirect().back()
      return
    }
  }

  /**
   * PATCH /tasks/:id/status
   * Update task status
   */
  async updateStatus(ctx: HttpContext) {
    try {
      const { params, request, response } = ctx
      const dto = new UpdateTaskStatusDTO({
        task_id: Number(params.id),
        status_id: request.input('status_id') as number,
        reason: request.input('reason') as string | undefined,
      })

      const command = new UpdateTaskStatusCommand(ctx, new CreateNotification(ctx))
      const task = await command.execute(dto)

      response.status(200).json({
        success: true,
        message: 'Trạng thái nhiệm vụ đã được cập nhật',
        task,
      })
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật trạng thái nhiệm vụ'
      ctx.response.status(500).json({
        success: false,
        message: errorMessage,
      })
      return
    }
  }

  /**
   * PATCH /tasks/:id/time
   * Update task time tracking
   */
  async updateTime(ctx: HttpContext) {
    try {
      const { params, request, response, session } = ctx
      const dto = new UpdateTaskTimeDTO({
        task_id: Number(params.id),
        estimated_time: request.input('estimated_time') as number | undefined,
        actual_time: request.input('actual_time') as number | undefined,
      })

      const command = new UpdateTaskTimeCommand(ctx)
      await command.execute(dto)

      session.flash('success', 'Thời gian đã được cập nhật')
      response.redirect().back()
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật thời gian'
      ctx.session.flash('error', errorMessage)
      ctx.response.redirect().back()
      return
    }
  }

  /**
   * GET /tasks/:id/audit-logs
   * Get task audit logs
   */
  async getAuditLogs(ctx: HttpContext) {
    try {
      const taskId = Number(ctx.params.id)
      const limit = ctx.request.input('limit', 20) as number

      const getTaskAuditLogsQuery = new GetTaskAuditLogsQuery(ctx)
      const auditLogs = await getTaskAuditLogsQuery.execute(taskId, limit)

      ctx.response.json({
        success: true,
        data: auditLogs,
      })
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi tải lịch sử thay đổi'
      ctx.response.status(500).json({
        success: false,
        message: errorMessage,
      })
      return
    }
  }
}
