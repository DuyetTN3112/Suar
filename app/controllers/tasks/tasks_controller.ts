import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ListTasks from '#actions/tasks/list_tasks'
import ListTasksWithPermissions from '#actions/tasks/list_tasks_with_permissions'
import GetTask from '#actions/tasks/get_task'
import GetTaskWithPermissions from '#actions/tasks/get_task_with_permissions'
import CreateTask from '#actions/tasks/create_task'
import UpdateTask from '#actions/tasks/update_task'
import DeleteTask from '#actions/tasks/delete_task'
import GetTaskMetadata from '#actions/tasks/get_task_metadata'
import UpdateTaskTime from '#actions/tasks/update_task_time'
import AuditLog from '#models/audit_log'

export default class TasksController {
  @inject()
  async index(
    { request, inertia }: HttpContext,
    listTasksWithPermissions: ListTasksWithPermissions,
    getTaskMetadata: GetTaskMetadata
  ) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const status = request.input('status')
    const priority = request.input('priority')
    const label = request.input('label')
    const search = request.input('search')
    const assignedTo = request.input('assigned_to')
    const parentTaskId = request.input('parent_task_id')
    const filters = {
      page,
      limit,
      status,
      priority,
      label,
      search,
      assigned_to: assignedTo,
      parent_task_id: parentTaskId,
    }
    const tasks = await listTasksWithPermissions.handle(filters)
    const metadata = await getTaskMetadata.handle()
    return inertia.render('tasks/index', {
      tasks,
      metadata,
      filters,
    })
  }

  @inject()
  async create({ inertia }: HttpContext, getTaskMetadata: GetTaskMetadata) {
    const metadata = await getTaskMetadata.handle()
    return inertia.render('tasks/create', { metadata })
  }

  @inject()
  async store({ request, response, session }: HttpContext, createTask: CreateTask) {
    const data = request.only([
      'title',
      'description',
      'status_id',
      'label_id',
      'priority_id',
      'assigned_to',
      'due_date',
      'parent_task_id',
      'estimated_time',
      'actual_time',
    ])
    await createTask.handle({ data })
    session.flash('success', 'Nhiệm vụ đã được tạo thành công')
    return response.redirect().toRoute('tasks.index')
  }

  @inject()
  async show(
    { params, inertia, response, session }: HttpContext,
    getTaskWithPermissions: GetTaskWithPermissions
  ) {
    try {
      const task = await getTaskWithPermissions.handle({ id: Number(params.id) })
      return inertia.render('tasks/show', { task })
    } catch (error) {
      session.flash('error', error.message || 'Bạn không có quyền xem nhiệm vụ này')
      return response.redirect().toRoute('tasks.index')
    }
  }

  @inject()
  async edit(
    { params, inertia, response, session }: HttpContext,
    getTaskWithPermissions: GetTaskWithPermissions,
    getTaskMetadata: GetTaskMetadata
  ) {
    try {
      const task = await getTaskWithPermissions.handle({ id: Number(params.id) })
      const metadata = await getTaskMetadata.handle()
      return inertia.render('tasks/edit', { task, metadata })
    } catch (error) {
      session.flash('error', error.message || 'Bạn không có quyền chỉnh sửa nhiệm vụ này')
      return response.redirect().toRoute('tasks.index')
    }
  }

  @inject()
  async update(
    { params, request, response, session, auth, inertia }: HttpContext,
    updateTask: UpdateTask
  ) {
    try {
      const data: any = request.only([
        'title',
        'description',
        'status_id',
        'label_id',
        'priority_id',
        'assigned_to',
        'due_date',
        'parent_task_id',
        'estimated_time',
        'actual_time',
      ])
      // Thêm ID người dùng hiện tại làm người cập nhật
      const user = auth.user
      if (user) {
        data.updated_by = user.id
      }
      const updatedTask = await updateTask.handle({ id: Number(params.id), data })
      // Kiểm tra xem request có phải từ Inertia không
      if (request.header('X-Inertia')) {
        session.flash('success', 'Nhiệm vụ đã được cập nhật thành công')
        return response.status(200).json({
          success: true,
          task: updatedTask,
        })
      }
      // Điều hướng trang như trước đối với yêu cầu thông thường
      session.flash('success', 'Nhiệm vụ đã được cập nhật thành công')
      return response.redirect().toRoute('tasks.show', { id: Number(params.id) })
    } catch (error) {
      console.error('Error updating task:', error)
      session.flash('error', error.message || 'Có lỗi xảy ra khi cập nhật nhiệm vụ')
      return response.redirect().back()
    }
  }

  @inject()
  async updateTime(
    { params, request, response, session }: HttpContext,
    updateTaskTime: UpdateTaskTime
  ) {
    try {
      const { actual_time: actualTime } = request.only(['actual_time'])
      await updateTaskTime.handle({ id: Number(params.id), actualTime })
      session.flash('success', 'Thời gian thực tế đã được cập nhật')
      return response.redirect().back()
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi cập nhật thời gian')
      return response.redirect().back()
    }
  }

  @inject()
  async destroy(
    { params, response, session, request, inertia }: HttpContext,
    deleteTask: DeleteTask,
    listTasksWithPermissions: ListTasksWithPermissions,
    getTaskMetadata: GetTaskMetadata
  ) {
    try {
      console.log(`Bắt đầu xóa task với ID: ${params.id}`)
      const result = await deleteTask.handle({ id: Number(params.id) })
      if (!result.success) {
        console.log('Lỗi khi xóa task:', result.message)
        session.flash('error', result.message)
        if (request.header('X-Inertia')) {
          // Đối với request từ Inertia, trả về lỗi nhưng không reload trang
          return response.status(400).json({
            success: false,
            message: result.message,
          })
        }
        return response.redirect().back()
      }

      console.log(`Task ${params.id} đã được xóa thành công`)
      session.flash('success', 'Nhiệm vụ đã được xóa thành công')
      if (request.header('X-Inertia')) {
        // Đối với request từ Inertia, cần reload dữ liệu
        console.log('Đang reload dữ liệu sau khi xóa task thành công')
        const page = request.input('page', 1)
        const limit = request.input('limit', 10)
        const filters = {
          page,
          limit,
          status: request.input('status'),
          priority: request.input('priority'),
          label: request.input('label'),
          search: request.input('search'),
          assigned_to: request.input('assigned_to'),
          parent_task_id: request.input('parent_task_id'),
        }
        const tasks = await listTasksWithPermissions.handle(filters)
        const metadata = await getTaskMetadata.handle()
        console.log(`Đã tải lại ${tasks.data.length} tasks sau khi xóa`)
        // Trả về dữ liệu mới cho Inertia
        return inertia.render('tasks/index', {
          tasks,
          metadata,
          filters,
        })
      }
      return response.redirect().toRoute('tasks.index')
    } catch (error: any) {
      console.error('Error deleting task:', error)
      session.flash('error', error.message || 'Có lỗi xảy ra khi xóa nhiệm vụ')
      if (request.header('X-Inertia')) {
        return inertia.location(request.header('Referer') || '/tasks')
      }
      return response.redirect().back()
    }
  }

  @inject()
  async getAuditLogs({ params, response }: HttpContext) {
    try {
      const taskId = Number(params.id)
      const auditLogs = await AuditLog.query()
        .where('entity_type', 'task')
        .where('entity_id', taskId)
        .orderBy('created_at', 'desc')
        .preload('user')
      const formattedLogs = auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        user: log.user
          ? {
              id: log.user.id,
              name:
                log.user.full_name ||
                `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim(),
              email: log.user.email,
            }
          : null,
        timestamp: log.created_at,
        changes: log.new_values
          ? this.formatChanges(log.old_values || {}, log.new_values || {})
          : [],
      }))
      return response.json({
        success: true,
        data: formattedLogs,
      })
    } catch (error) {
      console.error('Error loading audit logs:', error)
      return response.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tải lịch sử thay đổi',
      })
    }
  }

  /**
   * Format changes for audit logs
   */
  private formatChanges(oldValues: Record<string, any>, newValues: Record<string, any>) {
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = []
    // Compare old and new values
    for (const key in newValues) {
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
        changes.push({
          field: key,
          oldValue: oldValues[key],
          newValue: newValues[key],
        })
      }
    }
    return changes
  }

  /**
   * Cập nhật trạng thái task
   */
  @inject()
  async updateStatus({ params, request, response, auth }: HttpContext, updateTask: UpdateTask) {
    try {
      const { status_id: statusId } = request.only(['status_id'])
      const data: any = { status_id: Number(statusId) }
      // Thêm ID người dùng hiện tại làm người cập nhật
      const user = auth.user
      if (user) {
        data.updated_by = user.id
      }
      const updatedTask = await updateTask.handle({ id: Number(params.id), data })
      return response.status(200).json({
        success: true,
        message: 'Trạng thái nhiệm vụ đã được cập nhật',
        data: updatedTask,
      })
    } catch (error) {
      console.error('Error updating task status:', error)
      return response.status(500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi cập nhật trạng thái nhiệm vụ',
      })
    }
  }

  /**
   * Kiểm tra người dùng có quyền tạo task hay không
   */
  async checkCreatePermission({ auth, response }: HttpContext) {
    try {
      // Lấy thông tin người dùng đã đăng nhập
      const user = auth.user
      if (!user) {
        return response.status(403).json({
          success: false,
          message: 'Bạn cần đăng nhập để thực hiện hành động này',
          canCreate: false,
        })
      }
      // Kiểm tra quyền
      const userRole = user.role?.name?.toLowerCase() || ''
      const isAdmin = user.isAdmin === true
      const roleId = user.role?.id || user.role_id
      // Log để debug
      console.log('CHECK PERMISSION - User:', {
        id: user.id,
        username: user.username,
        role: userRole,
        isAdmin,
        roleId,
      })
      // Chỉ superadmin hoặc admin mới có quyền tạo task
      const canCreate =
        isAdmin ||
        roleId === 1 ||
        roleId === 2 ||
        userRole === 'superadmin' ||
        userRole === 'admin' ||
        user.username === 'superadmin' ||
        user.username === 'admin'
      return response.json({
        success: true,
        canCreate,
        userData: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          roleId,
          isAdmin,
        },
      })
    } catch (error) {
      console.error('Error in checkCreatePermission:', error)
      return response.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi khi kiểm tra quyền',
        canCreate: false,
      })
    }
  }
}
