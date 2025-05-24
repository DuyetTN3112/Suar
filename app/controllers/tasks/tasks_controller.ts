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
      const organizationId = session.get('current_organization_id')
      if (!organizationId) {
        throw new Error('Vui lòng chọn organization')
      }

      // Manually instantiate queries with current HttpContext to avoid DI decorator conflicts
      const getTasksListQuery = new GetTasksListQuery(ctx)
      const getTaskMetadataQuery = new (GetTaskMetadataQuery as unknown)(ctx)

      // Build DTO from request
      const dto = new GetTasksListDTO({
        page: request.input('page', 1),
        limit: request.input('limit', 10),
        status: request.input('status'),
        priority: request.input('priority'),
        label: request.input('label'),
        assigned_to: request.input('assigned_to'),
        parent_task_id: request.input('parent_task_id'),
        project_id: request.input('project_id'),
        search: request.input('search'),
        organization_id: organizationId,
        sort_by: request.input('sort_by', 'due_date'),
        sort_order: request.input('sort_order', 'asc'),
      })

      // Execute queries in parallel
      const [tasksResult, metadata] = await Promise.all([
        (getTasksListQuery as GetTasksListQuery).execute(dto),
        (getTaskMetadataQuery as GetTaskMetadataQuery).execute(organizationId),
      ])

      // ✅ Ensure tasks object has correct structure for frontend
      return inertia.render('tasks/index', {
        tasks: {
          data: tasksResult?.data || [],
          meta: tasksResult?.meta || {
            total: 0,
            per_page: dto.limit,
            current_page: dto.page,
            last_page: 0,
            first_page: 1,
            next_page_url: null,
            previous_page_url: null,
          },
        },
        stats: tasksResult?.stats || {},
        metadata: metadata || {
          statuses: [],
          priorities: [],
          labels: [],
          users: [],
        },
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
      ctx.session.flash('error', error.message || 'Có lỗi xảy ra khi tải danh sách nhiệm vụ')
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
      const organizationId = ctx.session.get('current_organization_id')
      if (!organizationId) {
        throw new Error('Vui lòng chọn organization')
      }

      const getTaskMetadataQuery = new GetTaskMetadataQuery(ctx)
      const metadata = await getTaskMetadataQuery.execute(organizationId)

      return inertia.render('tasks/create', { metadata })
    } catch (error: unknown) {
      ctx.session.flash('error', error.message || 'Có lỗi xảy ra')
      return ctx.response.redirect().toRoute('tasks.index')
    }
  }

  /**
   * POST /tasks
   * Store new task
   */
  async store(ctx: HttpContext) {
    try {
      const { request, response, session } = ctx
      const organizationId = session.get('current_organization_id')
      if (!organizationId) {
        throw new Error('Vui lòng chọn organization')
      }

      // Build DTO from request
      const dto = new CreateTaskDTO({
        title: request.input('title'),
        description: request.input('description'),
        status_id: request.input('status_id'),
        label_id: request.input('label_id'),
        priority_id: request.input('priority_id'),
        assigned_to: request.input('assigned_to'),
        due_date: request.input('due_date'),
        parent_task_id: request.input('parent_task_id'),
        estimated_time: request.input('estimated_time'),
        actual_time: request.input('actual_time'),
        project_id: request.input('project_id'),
        organization_id: organizationId,
      })

      // Execute command
      const command = new CreateTaskCommand(ctx, new CreateNotification(ctx))
      const task = await command.execute(dto)

      session.flash('success', 'Nhiệm vụ đã được tạo thành công')
      return response.redirect().toRoute('tasks.show', { id: task.id })
    } catch (error: unknown) {
      ctx.session.flash('error', error.message || 'Có lỗi xảy ra khi tạo nhiệm vụ')
      return ctx.response.redirect().back()
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

      return ctx.inertia.render('tasks/show', {
        task: result.task,
        permissions: result.permissions,
        auditLogs: result.auditLogs,
      })
    } catch (error: unknown) {
      ctx.session.flash('error', error.message || 'Không tìm thấy nhiệm vụ')
      return ctx.response.redirect().toRoute('tasks.index')
    }
  }

  /**
   * GET /tasks/:id/edit
   * Show edit task form
   */
  async edit(ctx: HttpContext) {
    try {
      const { session } = ctx
      const organizationId = session.get('current_organization_id')
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

      return ctx.inertia.render('tasks/edit', {
        task: taskResult.task,
        metadata,
        permissions: taskResult.permissions,
      })
    } catch (error: unknown) {
      ctx.session.flash('error', error.message || 'Không tìm thấy nhiệm vụ')
      return ctx.response.redirect().toRoute('tasks.index')
    }
  }

  /**
   * PUT/PATCH /tasks/:id
   * Update task
   */
  async update(ctx: HttpContext) {
    try {
      const { params, request, response, session, auth } = ctx
      // Build DTO from request
      const dto = new UpdateTaskDTO({
        title: request.input('title'),
        description: request.input('description'),
        status_id: request.input('status_id'),
        label_id: request.input('label_id'),
        priority_id: request.input('priority_id'),
        assigned_to: request.input('assigned_to'),
        due_date: request.input('due_date'),
        parent_task_id: request.input('parent_task_id'),
        estimated_time: request.input('estimated_time'),
        actual_time: request.input('actual_time'),
        project_id: request.input('project_id'),
        updated_by: auth.user!.id,
      })

      // Execute command (pass task_id separately)
      const command = new UpdateTaskCommand(ctx, new CreateNotification(ctx))
      const task = await command.execute(Number(params.id), dto)

      session.flash('success', 'Nhiệm vụ đã được cập nhật thành công')

      // Check if request from Inertia
      if (request.header('X-Inertia')) {
        return response.status(200).json({
          success: true,
          task,
        })
      }

      return response.redirect().toRoute('tasks.show', { id: task.id })
    } catch (error: unknown) {
      ctx.session.flash('error', error.message || 'Có lỗi xảy ra khi cập nhật nhiệm vụ')
      return ctx.response.redirect().back()
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
        reason: request.input('reason'),
        permanent: request.input('permanent', false),
      })

      // Execute command
      const command = new DeleteTaskCommand(ctx, new CreateNotification(ctx))
      const result = await command.execute(dto)

      if (!result.success) {
        session.flash('error', result.message)
        if (request.header('X-Inertia')) {
          return response.status(400).json({
            success: false,
            message: result.message,
          })
        }
        return response.redirect().back()
      }

      session.flash('success', 'Nhiệm vụ đã được xóa thành công')

      if (request.header('X-Inertia')) {
        return response.status(200).json({
          success: true,
          message: result.message,
        })
      }

      return response.redirect().toRoute('tasks.index')
    } catch (error: unknown) {
      ctx.session.flash('error', error.message || 'Có lỗi xảy ra khi xóa nhiệm vụ')
      if (ctx.request.header('X-Inertia')) {
        return ctx.response.status(500).json({
          success: false,
          message: error.message,
        })
      }
      return ctx.response.redirect().back()
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
        status_id: request.input('status_id'),
        reason: request.input('reason'),
      })

      const command = new UpdateTaskStatusCommand(ctx, new CreateNotification(ctx))
      const task = await command.execute(dto)

      return response.status(200).json({
        success: true,
        message: 'Trạng thái nhiệm vụ đã được cập nhật',
        task,
      })
    } catch (error: unknown) {
      return ctx.response.status(500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi cập nhật trạng thái nhiệm vụ',
      })
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
        estimated_time: request.input('estimated_time'),
        actual_time: request.input('actual_time'),
      })

      const command = new UpdateTaskTimeCommand(ctx)
      await command.execute(dto)

      session.flash('success', 'Thời gian đã được cập nhật')
      return response.redirect().back()
    } catch (error: unknown) {
      ctx.session.flash('error', error.message || 'Có lỗi xảy ra khi cập nhật thời gian')
      return ctx.response.redirect().back()
    }
  }

  /**
   * GET /tasks/:id/audit-logs
   * Get task audit logs
   */
  async getAuditLogs(ctx: HttpContext) {
    try {
      const taskId = Number(ctx.params.id)
      const limit = ctx.request.input('limit', 20)

      const getTaskAuditLogsQuery = new GetTaskAuditLogsQuery(ctx)
      const auditLogs = await getTaskAuditLogsQuery.execute(taskId, limit)

      return ctx.response.json({
        success: true,
        data: auditLogs,
      })
    } catch (error: unknown) {
      return ctx.response.status(500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi tải lịch sử thay đổi',
      })
    }
  }
}
