import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Task from '#models/task'
import TaskStatus from '#models/task_status'
import TaskLabel from '#models/task_label'
import TaskPriority from '#models/task_priority'
import User from '#models/user'
import CreateTask from '#actions/tasks/create_task'
import UpdateTask from '#actions/tasks/update_task'
import DeleteTask from '#actions/tasks/delete_task'
import GetUserTasks from '#actions/tasks/get_user_tasks'
import db from '@adonisjs/lucid/services/db'

@inject()
export default class TaskController {
  /**
   * Hiển thị danh sách task
   */
  @inject()
  async index({ inertia, request, auth, session }: HttpContext, getUserTasks: GetUserTasks) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const search = request.input('search', '')
    const statusFilter = request.input('status')
    const onlyMine = request.input('only_mine', false)

    try {
      let tasks = []
      if (onlyMine) {
        // Sử dụng stored procedure để lấy danh sách task của người dùng hiện tại
        tasks = await getUserTasks.handle({
          status: statusFilter,
        })
      } else {
        // Xử lý truy vấn thông thường nếu không lọc theo người dùng
        const tasksQuery = Task.query()
          .preload('status')
          .preload('label')
          .preload('priority')
          .preload('assignee')
          .preload('creator')
          .whereNull('deleted_at')
        if (search) {
          tasksQuery.where((query) => {
            query.whereILike('title', `%${search}%`).orWhereILike('description', `%${search}%`)
          })
        }
        if (statusFilter) {
          tasksQuery.whereHas('status', (query) => {
            query.where('name', statusFilter)
          })
        }

        // Lấy tổ chức hiện tại từ session
        const currentOrganizationId = session.get('current_organization_id')
        if (currentOrganizationId) {
          tasksQuery.where('organization_id', currentOrganizationId)
        }
        tasks = await tasksQuery.orderBy('due_date', 'asc').paginate(page, limit)
      }
      const statuses = await TaskStatus.all()
      const labels = await TaskLabel.all()
      const priorities = await TaskPriority.all()
      const users = await User.query().select(['id', 'full_name']).whereNull('deleted_at').exec()
      return inertia.render('tasks/index', {
        tasks,
        statuses,
        labels,
        priorities,
        users,
        filters: {
          search,
          status: statusFilter,
          onlyMine,
        },
      })
    } catch (error) {
      return inertia.render('tasks/index', {
        error: error.message || 'Có lỗi xảy ra khi tải danh sách task',
      })
    }
  }

  /**
   * Hiển thị thông tin chi tiết task
   */
  async show({ inertia, params }: HttpContext) {
    const task = await Task.query()
      .where('id', params.id)
      .preload('status')
      .preload('label')
      .preload('priority')
      .preload('assignee')
      .preload('creator')
      .preload('parentTask')
      .preload('childTasks', (query) => {
        query.whereNull('deleted_at')
        query.preload('status')
      })
      .preload('versions', (query) => {
        query
          .preload('status')
          .preload('label')
          .preload('priority')
          .preload('assignee')
          .preload('changer')
          .orderBy('changed_at', 'desc')
      })
      .firstOrFail()
    return inertia.render('tasks/show', { task })
  }

  /**
   * Hiển thị form tạo task mới
   */
  async create({ inertia }: HttpContext) {
    const statuses = await TaskStatus.all()
    const labels = await TaskLabel.all()
    const priorities = await TaskPriority.all()
    const users = await User.query().select(['id', 'full_name']).whereNull('deleted_at').exec()
    const tasks = await Task.query()
      .select(['id', 'title'])
      .whereNull('deleted_at')
      .orderBy('title', 'asc')
      .exec()
    return inertia.render('tasks/create', {
      statuses,
      labels,
      priorities,
      users,
      tasks,
    })
  }

  /**
   * Lưu task mới vào database
   */
  @inject()
  async store({ request, response, session }: HttpContext, createTask: CreateTask) {
    try {
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
      session.flash('success', 'Task đã được tạo thành công')
      return response.redirect().toRoute('tasks.index')
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi tạo task')
      return response.redirect().back()
    }
  }

  /**
   * Hiển thị form chỉnh sửa task
   */
  async edit({ inertia, params }: HttpContext) {
    const task = await Task.findOrFail(params.id)
    const statuses = await TaskStatus.all()
    const labels = await TaskLabel.all()
    const priorities = await TaskPriority.all()
    const users = await User.query().select(['id', 'full_name']).whereNull('deleted_at').exec()
    const tasks = await Task.query()
      .select(['id', 'title'])
      .whereNull('deleted_at')
      .where('id', '!=', params.id)
      .orderBy('title', 'asc')
      .exec()
    return inertia.render('tasks/edit', {
      task,
      statuses,
      labels,
      priorities,
      users,
      tasks,
    })
  }

  /**
   * Cập nhật thông tin task
   */
  @inject()
  async update({ request, response, params, session }: HttpContext, updateTask: UpdateTask) {
    try {
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
      await updateTask.handle({
        id: params.id,
        data,
      })
      session.flash('success', 'Task đã được cập nhật')
      return response.redirect().toRoute('tasks.show', { id: params.id })
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi cập nhật task')
      return response.redirect().back()
    }
  }

  /**
   * Xóa task (soft delete)
   */
  @inject()
  async destroy({ params, response, session }: HttpContext, deleteTask: DeleteTask) {
    try {
      const result = await deleteTask.handle({ id: params.id })
      if (result.success) {
        session.flash('success', result.message)
      } else {
        session.flash('error', result.message)
        return response.redirect().back()
      }
      return response.redirect().toRoute('tasks.index')
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi xóa task')
      return response.redirect().back()
    }
  }
}
