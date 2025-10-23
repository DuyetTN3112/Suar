import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

import { listSystemPermissionCatalog } from '#modules/authorization/public_contracts/access_surface'
import { CustomSystemRoleService } from '#modules/authorization/services/custom_system_role_service'

const roleValidator = vine.create(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100),
    code: vine.string().trim().minLength(2).maxLength(50).regex(/^[a-z0-9_]+$/),
    description: vine.string().trim().maxLength(500).optional(),
    permissions: vine.array(vine.string()),
  })
)

function requireStringParam(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing route param: ${name}`)
  }
  return value
}

export default class CustomSystemRoleController {
  async create({ inertia }: HttpContext) {
    const catalog = listSystemPermissionCatalog()
    return inertia.render('admin/permissions/custom_roles/create', { catalog })
  }

  async edit({ params, inertia, response }: HttpContext) {
    const roleId = requireStringParam(params['id'], 'id')
    const role = await CustomSystemRoleService.findCustomRole(roleId)
    if (!role) {
      return response.notFound()
    }
    const catalog = listSystemPermissionCatalog()
    return inertia.render('admin/permissions/custom_roles/edit', { role, catalog })
  }

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(roleValidator)
    
    // Check if code exists
    if (await CustomSystemRoleService.isRoleCodeTaken(payload.code)) {
      return response.badRequest({ errors: [{ message: 'Mã vai trò đã tồn tại', field: 'code' }] })
    }

    const role = await CustomSystemRoleService.createCustomRole(
      payload.name,
      payload.code,
      payload.permissions,
      payload.description
    )

    return response.created(role)
  }

  async update({ params, request, response }: HttpContext) {
    const roleId = requireStringParam(params['id'], 'id')
    const payload = await request.validateUsing(roleValidator)
    
    // Check if code exists for other roles
    if (await CustomSystemRoleService.isRoleCodeTaken(payload.code, roleId)) {
      return response.badRequest({ errors: [{ message: 'Mã vai trò đã tồn tại', field: 'code' }] })
    }

    const role = await CustomSystemRoleService.updateCustomRole(
      roleId,
      payload.name,
      payload.code,
      payload.permissions,
      payload.description
    )

    if (!role) {
      return response.notFound({ message: 'Không tìm thấy vai trò' })
    }

    return response.ok(role)
  }

  async destroy({ params, response }: HttpContext) {
    const roleId = requireStringParam(params['id'], 'id')
    const success = await CustomSystemRoleService.deleteCustomRole(roleId)
    if (!success) {
      return response.notFound({ message: 'Không tìm thấy vai trò' })
    }

    return response.ok({ message: 'Đã xóa vai trò' })
  }
}
