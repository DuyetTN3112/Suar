import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

// Commands
import {
  CreateProjectCommand,
  DeleteProjectCommand,
  AddProjectMemberCommand,
} from '#actions/projects/commands/index'

// Queries
import {
  GetProjectsListQuery,
  GetProjectDetailQuery,
  type GetProjectsListDTO,
} from '#actions/projects/queries/index'

// DTOs
import {
  CreateProjectDTO,
  DeleteProjectDTO,
  AddProjectMemberDTO,
} from '#actions/projects/dtos/index'

/**
 * Controller xử lý các chức năng liên quan đến dự án
 * Refactored to follow CQRS pattern with thin controller approach
 */
export default class ProjectsController {
  /**
   * Liệt kê danh sách dự án
   */
  async index(ctx: HttpContext) {
    const { inertia, session, request } = ctx
    try {
      // Build query DTO from request
      const dto = this.buildListDTO(request)

      // Execute query
      const query = new GetProjectsListQuery(ctx)
      const result = await query.handle(dto)

      // Check for organization modal flag
      const showOrganizationRequiredModal = session.has('show_organization_required_modal')

      return inertia.render('projects/index', {
        projects: result.data,
        pagination: result.pagination,
        filters: result.filters,
        stats: result.stats,
        showOrganizationRequiredModal,
      })
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi tải danh sách dự án')
      return inertia.render('projects/index', {
        projects: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        stats: { total_projects: 0, active_projects: 0, completed_projects: 0 },
      })
    }
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
  async store(ctx: HttpContext) {
    const { request, response, session } = ctx
    try {
      // Build DTO from request
      const dto = this.buildCreateDTO(request)

      // Execute command
      const command = new CreateProjectCommand(ctx)
      const project = await command.handle(dto)

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
  async show(ctx: HttpContext) {
    const { params, inertia, response, session } = ctx
    try {
      // Execute query
      const query = new GetProjectDetailQuery(ctx)
      const result = await query.handle(params.id)

      return inertia.render('projects/show', result)
    } catch (error) {
      session.flash('error', error.message || 'Không thể tìm thấy dự án')
      return response.redirect().toRoute('projects.index')
    }
  }

  /**
   * Xóa dự án
   */
  async destroy(ctx: HttpContext) {
    const { params, response, session } = ctx
    try {
      // Build DTO
      const dto = new DeleteProjectDTO({
        project_id: params.id,
      })

      // Execute command
      const command = new DeleteProjectCommand(ctx)
      await command.handle(dto)

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
  async addMember(ctx: HttpContext) {
    const { request, response, session } = ctx
    try {
      // Build DTO
      const dto = new AddProjectMemberDTO({
        project_id: request.input('project_id'),
        user_id: request.input('user_id'),
        role: request.input('role'),
      })

      // Execute command
      const command = new AddProjectMemberCommand(ctx)
      await command.handle(dto)

      session.flash('success', 'Đã thêm thành viên vào dự án thành công')
      return response.redirect().back()
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi thêm thành viên')
      return response.redirect().back()
    }
  }

  /**
   * Helper: Build GetProjectsListDTO from request
   */
  private buildListDTO(request: any): GetProjectsListDTO {
    return {
      page: request.input('page', 1),
      limit: request.input('limit', 20),
      organization_id: request.input('organization_id'),
      status_id: request.input('status_id'),
      creator_id: request.input('creator_id'),
      manager_id: request.input('manager_id'),
      visibility: request.input('visibility'),
      search: request.input('search'),
      sort_by: request.input('sort_by', 'created_at'),
      sort_order: request.input('sort_order', 'desc'),
    }
  }

  /**
   * Helper: Build CreateProjectDTO from request
   */
  private buildCreateDTO(request: any): CreateProjectDTO {
    return new CreateProjectDTO({
      name: request.input('name'),
      description: request.input('description'),
      organization_id: request.input('organization_id'),
      status_id: request.input('status_id'),
      start_date: request.input('start_date')
        ? DateTime.fromISO(request.input('start_date'))
        : null,
      end_date: request.input('end_date') ? DateTime.fromISO(request.input('end_date')) : null,
      manager_id: request.input('manager_id'),
      visibility: request.input('visibility'),
      budget: request.input('budget'),
    })
  }
}
