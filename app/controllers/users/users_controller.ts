import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ListUsers from '#actions/users/list_users'
import GetUser from '#actions/users/get_user'
import CreateUser from '#actions/users/create_user'
import UpdateUser from '#actions/users/update_user'
import DeleteUser from '#actions/users/delete_user'
import GetUserMetadata from '#actions/users/get_user_metadata'
import User from '#models/user'
import UserRole from '#models/user_role'
import UserStatus from '#models/user_status'
import db from '@adonisjs/lucid/services/db'

export default class UsersController {
  @inject()
  async index(
    { request, inertia, auth }: HttpContext,
    listUsers: ListUsers,
    getUserMetadata: GetUserMetadata
  ) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const roleId = request.input('role_id')
    const statusId = request.input('status_id')
    const search = request.input('search')
    // Lấy organization_id của người dùng hiện tại
    const organizationId = auth.user?.current_organization_id
    const options = {
      page,
      limit,
      role_id: roleId,
      status_id: statusId,
      search,
      organization_id: organizationId ?? undefined,
      exclude_status_id: 2, // Loại bỏ người dùng có status_id = 2 (inactive/chờ duyệt)
      organization_user_status: 'approved' as const, // Chỉ hiển thị người dùng đã được phê duyệt trong tổ chức
    }

    const users = await listUsers.handle({ options })
    const metadata = await getUserMetadata.handle()
    return inertia.render('users/index', {
      users,
      metadata,
      filters: options,
    })
  }

  @inject()
  async systemUsersApi({ request, response, auth }: HttpContext, listUsers: ListUsers) {
    try {
      // Kiểm tra quyền - chỉ superadmin của tổ chức hiện tại mới có thể truy cập
      const user = auth.user
      if (!user) {
        return response.status(401).json({
          success: false,
          message: 'Unauthorized',
        })
      }
      
      const organizationId = user.current_organization_id
      if (!organizationId) {
        return response.status(400).json({
          success: false,
          message: 'Không tìm thấy tổ chức hiện tại',
        })
      }
      
      // Kiểm tra xem người dùng có phải là superadmin của tổ chức không
      const isSuperAdmin = await db
        .from('organization_users')
        .where('organization_id', organizationId)
        .where('user_id', user.id)
        .where('role_id', 1) // role_id = 1 là superadmin
        .first()
        
      if (!isSuperAdmin) {
        return response.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập tài nguyên này',
        })
      }

      const page = request.input('page', 1)
      const limit = request.input('limit', 10)
      const search = request.input('search', '')

      const options = {
        page,
        limit,
        search,
        organization_id: organizationId,
        exclude_organization_members: true, // Loại trừ những người đã thuộc tổ chức hiện tại
      }

      const users = await listUsers.handle({ options })
      
      return response.json({
        success: true,
        users,
      })
    } catch (error) {
      console.error('Lỗi khi lấy danh sách người dùng:', error)
      return response.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi khi lấy danh sách người dùng',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  @inject()
  async create({ inertia }: HttpContext, getUserMetadata: GetUserMetadata) {
    const metadata = await getUserMetadata.handle()
    return inertia.render('users/create', { metadata })
  }

  @inject()
  async store({ request, response, session }: HttpContext, createUser: CreateUser) {
    const data = request.only([
      'first_name',
      'last_name',
      'username',
      'email',
      'password',
      'role_id',
      'status_id',
      'phone_number',
      'bio',
      'date_of_birth',
      'language',
    ])
    await createUser.handle({ data })
    session.flash('success', 'Người dùng đã được tạo thành công')
    return response.redirect().toRoute('users.index')
  }

  @inject()
  async show({ params, inertia }: HttpContext, getUser: GetUser) {
    const user = await getUser.handle({ id: Number(params.id) })
    return inertia.render('users/show', { user })
  }

  @inject()
  async edit({ params, inertia }: HttpContext, getUser: GetUser, getUserMetadata: GetUserMetadata) {
    const user = await getUser.handle({ id: Number(params.id) })
    const metadata = await getUserMetadata.handle()
    return inertia.render('users/edit', { user, metadata })
  }

  @inject()
  async update({ params, request, response, session }: HttpContext, updateUser: UpdateUser) {
    const data = request.only([
      'first_name',
      'last_name',
      'username',
      'email',
      'password',
      'role_id',
      'status_id',
      'phone_number',
      'bio',
      'date_of_birth',
      'language',
    ])
    await updateUser.handle({ id: Number(params.id), data })
    session.flash('success', 'Người dùng đã được cập nhật thành công')
    return response.redirect().toRoute('users.show', { id: Number(params.id) })
  }

  @inject()
  async destroy({ params, response, session }: HttpContext, deleteUser: DeleteUser) {
    const result = await deleteUser.handle({ id: Number(params.id) })
    session.flash(result.success ? 'success' : 'error', result.message)
    return response.redirect().toRoute('users.index')
  }

  @inject()
  async pendingApproval(
    { request, inertia, auth }: HttpContext,
    listUsers: ListUsers,
    getUserMetadata: GetUserMetadata
  ) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const search = request.input('search')
    // Lấy organization_id của người dùng hiện tại
    const organizationId = auth.user?.current_organization_id

    // Kiểm tra xem người dùng hiện tại có phải là superadmin của tổ chức không
    // Sử dụng $extras để truy cập dữ liệu thêm vào từ database
    const isSuperAdmin = auth.user?.$extras?.organization_role?.id === 1

    if (!isSuperAdmin) {
      // Nếu không phải superadmin, chuyển hướng về trang danh sách người dùng
      return inertia.location('/users')
    }

    const options = {
      page,
      limit,
      search,
      organization_id: organizationId ?? undefined,
      organization_user_status: 'pending' as const, // Lọc người dùng có trạng thái chờ phê duyệt trong tổ chức
    }

    const users = await listUsers.handle({ options })
    const metadata = await getUserMetadata.handle()
    return inertia.render('users/pending_approval', {
      users,
      metadata,
      filters: options,
    })
  }

  @inject()
  async pendingApprovalApi({ request, response, auth }: HttpContext, listUsers: ListUsers) {
    try {
      // Lấy organization_id của người dùng hiện tại
      const organizationId = auth.user?.current_organization_id
      if (!organizationId) {
        return response.status(400).json({
          success: false,
          message: 'Không tìm thấy thông tin tổ chức hiện tại',
        })
      }
      // Kiểm tra xem người dùng hiện tại có phải là superadmin của tổ chức không
      const isSuperAdmin = await db
        .from('organization_users')
        .where('organization_id', organizationId)
        .where('user_id', auth.user!.id)
        .where('role_id', 1) // role_id = 1 là superadmin
        .where('status', 'approved')
        .first()
      if (!isSuperAdmin) {
        return response.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập danh sách này.',
        })
      }
      // Truy vấn trực tiếp người dùng có trạng thái pending trong organization_users
      const pendingUsers = await db
        .from('users as u')
        .join('organization_users as ou', 'u.id', 'ou.user_id')
        .leftJoin('user_details as ud', 'u.id', 'ud.user_id')
        .leftJoin('user_roles as ur', 'u.role_id', 'ur.id')
        .leftJoin('user_status as us', 'u.status_id', 'us.id')
        .where('ou.organization_id', organizationId)
        .where('ou.status', 'pending')
        .whereNull('u.deleted_at')
        .select(
          'u.id',
          'u.first_name',
          'u.last_name',
          'u.full_name',
          'u.email',
          'u.username',
          'ud.avatar_url',
          'ur.id as role_id',
          'ur.name as role_name',
          'us.id as status_id',
          'us.name as status_name',
          'u.created_at'
        )
      console.log(
        `Tìm thấy ${pendingUsers.length} người dùng chờ phê duyệt trong tổ chức ${organizationId}`
      )
      // Định dạng lại dữ liệu để phù hợp với frontend
      const formattedUsers = pendingUsers.map((user) => ({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: user.full_name,
        email: user.email,
        username: user.username,
        role: {
          id: user.role_id,
          name: user.role_name,
        },
        status: {
          id: user.status_id,
          name: user.status_name,
        },
        avatar_url: user.avatar_url,
        created_at: user.created_at,
      }))

      return response.json({
        success: true,
        users: formattedUsers,
        meta: {
          total: pendingUsers.length,
          per_page: pendingUsers.length,
          current_page: 1,
          last_page: 1,
        },
      })
    } catch (error) {
      console.error('Lỗi khi lấy danh sách người dùng chờ phê duyệt:', error)
      return response.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy danh sách người dùng chờ phê duyệt.',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  @inject()
  async pendingApprovalCount({ response, auth }: HttpContext) {
    try {
      // Lấy organization_id của người dùng hiện tại
      const organizationId = auth.user?.current_organization_id
      if (!organizationId) {
        return response.status(400).json({
          success: false,
          message: 'Không tìm thấy thông tin tổ chức hiện tại',
        })
      }
      // Kiểm tra xem người dùng hiện tại có phải là superadmin của tổ chức không
      const isSuperAdmin = await db
        .from('organization_users')
        .where('organization_id', organizationId)
        .where('user_id', auth.user!.id)
        .where('role_id', 1) // role_id = 1 là superadmin
        .where('status', 'approved')
        .first()
      if (!isSuperAdmin) {
        return response.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập thông tin này.',
        })
      }
      // Đếm số lượng người dùng có trạng thái chờ phê duyệt (pending) trong tổ chức hiện tại
      const result = await db
        .from('users as u')
        .join('organization_users as ou', 'u.id', 'ou.user_id')
        .where('ou.organization_id', organizationId)
        .where('ou.status', 'pending')
        .whereNull('u.deleted_at')
        .count('u.id as count')
        .first()
      return response.json({
        success: true,
        count: result?.count || 0,
      })
    } catch (error) {
      console.error('Lỗi khi đếm số lượng người dùng chờ phê duyệt:', error)
      return response.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi đếm số lượng người dùng chờ phê duyệt.',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
