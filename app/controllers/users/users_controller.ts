import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ListUsers from '#actions/users/list_users'
import GetUser from '#actions/users/get_user'
import CreateUser from '#actions/users/create_user'
import UpdateUser from '#actions/users/update_user'
import DeleteUser from '#actions/users/delete_user'
import GetUserMetadata from '#actions/users/get_user_metadata'

export default class UsersController {
  @inject()
  async index(
    { request, inertia }: HttpContext,
    listUsers: ListUsers,
    getUserMetadata: GetUserMetadata
  ) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const roleId = request.input('role_id')
    const statusId = request.input('status_id')
    const search = request.input('search')
    const options = { page, limit, roleId, statusId, search }
    const users = await listUsers.handle({ options })
    const metadata = await getUserMetadata.handle()
    return inertia.render('users/index', {
      users,
      metadata,
      filters: options,
    })
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
}
