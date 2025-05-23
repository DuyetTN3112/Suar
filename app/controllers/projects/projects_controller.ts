import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import CreateProject from '#actions/projects/create_project'
import DeleteProject from '#actions/projects/delete_project'
import AddProjectMember from '#actions/projects/add_project_member'
import Project from '#models/project'
import db from '@adonisjs/lucid/services/db'

/**
 * Controller xử lý các chức năng liên quan đến dự án
 */
export default class ProjectsController {
  /**
   * Liệt kê danh sách dự án
   */
  async index({ inertia, auth, session, request }: HttpContext) {
    console.log('\n=== [ProjectsController.index] Bắt đầu xử lý request ===')
    console.log('[ProjectsController.index] Thời gian bắt đầu:', new Date().toISOString())
    console.log('[ProjectsController.index] Request URL:', request.url())
    console.log('[ProjectsController.index] Request method:', request.method())
    console.log('[ProjectsController.index] Request headers:', JSON.stringify(request.headers()))
    const user = auth.user!
    console.log('[ProjectsController.index] User:', user.id, user.email)
    console.log('[ProjectsController.index] Current organization ID:', user.current_organization_id)
    // Kiểm tra xem có flag show_organization_required_modal trong session không
    const showOrganizationRequiredModal = session.has('show_organization_required_modal')
    console.log(
      '[ProjectsController.index] Show organization required modal flag in session:',
      showOrganizationRequiredModal
    )
    console.log('[ProjectsController.index] Bắt đầu truy vấn danh sách dự án')
    const startQueryTime = Date.now()
    // Sử dụng view để lấy danh sách dự án
    const projects = await db
      .query()
      .from('projects as p')
      .select(
        'p.id',
        'p.name',
        'p.description',
        'p.organization_id',
        'p.start_date',
        'p.end_date',
        'ps.name as status',
        'o.name as organization_name',
        'u1.full_name as creator_name',
        'u2.full_name as manager_name'
      )
      .leftJoin('project_status as ps', 'p.status_id', 'ps.id')
      .leftJoin('organizations as o', 'p.organization_id', 'o.id')
      .leftJoin('users as u1', 'p.creator_id', 'u1.id')
      .leftJoin('users as u2', 'p.manager_id', 'u2.id')
      .leftJoin('project_members as pm', 'p.id', 'pm.project_id')
      .where((query) => {
        query
          .where('p.creator_id', user.id)
          .orWhere('p.manager_id', user.id)
          .orWhere('pm.user_id', user.id)
      })
      .whereNull('p.deleted_at')
      .groupBy('p.id')
      .orderBy('p.created_at', 'desc')
    const queryDuration = Date.now() - startQueryTime
    console.log('[ProjectsController.index] Truy vấn hoàn thành trong:', queryDuration, 'ms')
    console.log('[ProjectsController.index] Projects count:', projects.length)
    // Log thông tin chi tiết về các dự án (giới hạn để tránh log quá dài)
    if (projects.length > 0) {
      console.log(
        '[ProjectsController.index] Thông tin dự án đầu tiên:',
        JSON.stringify(projects[0])
      )
      if (projects.length > 1) {
        console.log('[ProjectsController.index] Số lượng dự án còn lại:', projects.length - 1)
      }
    }
    console.log(
      '[ProjectsController.index] Rendering với showOrganizationRequiredModal:',
      showOrganizationRequiredModal
    )
    const renderStartTime = Date.now()
    console.log('[ProjectsController.index] Bắt đầu render trang projects/index')
    const result = inertia.render('projects/index', {
      projects,
      showOrganizationRequiredModal,
    })
    console.log(
      '[ProjectsController.index] Render hoàn thành trong:',
      Date.now() - renderStartTime,
      'ms'
    )
    console.log(
      '[ProjectsController.index] Tổng thời gian xử lý:',
      Date.now() - startQueryTime + queryDuration,
      'ms'
    )
    console.log('=== [ProjectsController.index] Kết thúc xử lý request ===\n')
    return result
  }

  /**
   * Hiển thị form tạo dự án mới
   */
  async create({ inertia, auth }: HttpContext) {
    const user = auth.user!
    // Lấy danh sách tổ chức mà người dùng là superadmin
    // Sử dụng cách tiếp cận khác để tránh lỗi với db.raw()
    const organizations = await db
      .query()
      .from('organizations as o')
      .select('o.id', 'o.name')
      .join('organization_users as ou', (join) => {
        join.on('o.id', 'ou.organization_id')
        join.andOn('ou.user_id', String(user.id))
        join.andOn('ou.role_id', '1') // role_id = 1 là superadmin
        join.andOn('ou.status', 'approved')
      })
      .whereNull('o.deleted_at')
    // Lấy danh sách trạng thái dự án
    const statuses = await db.query().from('project_status').select('id', 'name')
    return inertia.render('projects/create', { organizations, statuses })
  }

  /**
   * Lưu dự án mới vào database
   */
  @inject()
  async store({ request, response, session }: HttpContext, createProject: CreateProject) {
    try {
      const data = {
        name: request.input('name'),
        description: request.input('description'),
        organization_id: request.input('organization_id'),
        status_id: request.input('status_id'),
        start_date: request.input('start_date'),
        end_date: request.input('end_date'),
        manager_id: request.input('manager_id'),
      }
      const project = await createProject.handle({ data })
      session.flash('success', 'Dự án đã được tạo thành công')
      return response.redirect().toRoute('projects.show', { id: project.id })
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi tạo dự án')
      return response.redirect().back()
    }
  }

  /**
   * Hiển thị chi tiết dự án
   */
  async show({ params, inertia, auth, response, session }: HttpContext) {
    const user = auth.user!
    try {
      // Lấy thông tin chi tiết dự án
      const project = await Project.query()
        .where('id', params.id)
        .whereNull('deleted_at')
        .firstOrFail()
      // Kiểm tra quyền truy cập
      const isMember = await db
        .query()
        .from('project_members')
        .where('project_id', project.id)
        .where('user_id', user.id)
        .first()
      const isCreator = project.creator_id === user.id
      const isManager = project.manager_id === user.id
      if (!isMember && !isCreator && !isManager) {
        session.flash('error', 'Bạn không có quyền truy cập dự án này')
        return response.redirect().toRoute('projects.index')
      }
      // Lấy danh sách thành viên dự án
      const members = await db
        .query()
        .from('project_members as pm')
        .select('u.id', 'u.full_name', 'u.email', 'pm.role', 'ud.avatar_url')
        .leftJoin('users as u', 'pm.user_id', 'u.id')
        .leftJoin('user_details as ud', 'u.id', 'ud.user_id')
        .where('pm.project_id', project.id)
      // Lấy danh sách công việc của dự án
      const tasks = await db
        .query()
        .from('tasks as t')
        .select(
          't.id',
          't.title',
          't.description',
          'ts.name as status',
          'tl.name as label',
          'tp.name as priority',
          'u.full_name as assignee_name',
          't.due_date'
        )
        .leftJoin('task_status as ts', 't.status_id', 'ts.id')
        .leftJoin('task_labels as tl', 't.label_id', 'tl.id')
        .leftJoin('task_priorities as tp', 't.priority_id', 'tp.id')
        .leftJoin('users as u', 't.assigned_to', 'u.id')
        .where('t.project_id', project.id)
        .whereNull('t.deleted_at')
        .orderBy('t.due_date', 'asc')
      return inertia.render('projects/show', {
        project: project.toJSON(),
        members,
        tasks,
        permissions: {
          isCreator,
          isManager,
          isMember: !!isMember,
        },
      })
    } catch (error) {
      session.flash('error', 'Không thể tìm thấy dự án')
      return response.redirect().toRoute('projects.index')
    }
  }

  /**
   * Xóa dự án
   */
  @inject()
  async destroy({ params, response, session }: HttpContext, deleteProject: DeleteProject) {
    try {
      await deleteProject.handle(params.id)
      session.flash('success', 'Dự án đã được xóa thành công')
      return response.redirect().toRoute('projects.index')
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi xóa dự án')
      return response.redirect().back()
    }
  }

  /**
   * Thêm thành viên vào dự án
   */
  @inject()
  async addMember({ request, response, session }: HttpContext, addProjectMember: AddProjectMember) {
    try {
      const data = {
        project_id: request.input('project_id'),
        user_id: request.input('user_id'),
      }
      await addProjectMember.handle({ data })
      session.flash('success', 'Đã thêm thành viên vào dự án thành công')
      return response.redirect().back()
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi thêm thành viên')
      return response.redirect().back()
    }
  }
}
