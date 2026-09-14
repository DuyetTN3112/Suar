import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

import { AdminPermissionActionFactory } from '#modules/admin/permissions/actions/ports/inbound/permissions/admin_permission_action_factory'
export { assertWildcardPermissionConfirmed } from '#modules/admin/permissions/domain/permissions/custom_system_role_policy'
import { buildCustomSystemRoleRouteRequest } from '#modules/admin/permissions/controllers/mappers/request/permissions/custom_system_role_request_mapper'
import { listSystemPermissionCatalog } from '#modules/authorization/public_contracts/access_surface'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'

const roleValidator = vine.create(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100),
    code: vine
      .string()
      .trim()
      .minLength(2)
      .maxLength(50)
      .regex(/^[a-z0-9_]+$/),
    description: vine.string().trim().maxLength(500).optional(),
    permissions: vine.array(vine.string()),
    confirmWildcard: vine.boolean().optional(),
  })
)

@inject()
export default class CustomSystemRoleController {
  constructor(private readonly actions: AdminPermissionActionFactory) {}

  async create({ inertia }: HttpContext) {
    const catalog = listSystemPermissionCatalog()
    return inertia.render('admin/permissions/custom_roles/create', { catalog })
  }

  async edit(ctx: HttpContext) {
    const { params, inertia, response } = ctx
    const { roleId } = buildCustomSystemRoleRouteRequest(params)
    const role = await this.actions
      .makeGetCustomSystemRoleQuery(actionContextFromHttp(ctx))
      .handle({ roleId })
    if (!role) {
      return response.notFound()
    }
    const catalog = listSystemPermissionCatalog()
    return inertia.render('admin/permissions/custom_roles/edit', { role, catalog })
  }

  async store(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const payload = await request.validateUsing(roleValidator)
    const result = await this.actions
      .makeCreateCustomSystemRoleCommand(actionContextFromHttp(ctx))
      .handle({
        name: payload.name,
        code: payload.code,
        ...(payload.description === undefined
          ? {}
          : { description: payload.description }),
        permissions: payload.permissions,
        actorSystemRole: auth.user?.system_role ?? null,
        ...(payload.confirmWildcard === undefined
          ? {}
          : { confirmWildcard: payload.confirmWildcard }),
      })

    if (result.status === 'code_taken') {
      return response.badRequest({ errors: [{ message: 'Mã vai trò đã tồn tại', field: 'code' }] })
    }

    return response.created(result.role)
  }

  async update(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const { roleId } = buildCustomSystemRoleRouteRequest(params)
    const payload = await request.validateUsing(roleValidator)
    const result = await this.actions
      .makeUpdateCustomSystemRoleCommand(actionContextFromHttp(ctx))
      .handle({
        roleId,
        name: payload.name,
        code: payload.code,
        ...(payload.description === undefined
          ? {}
          : { description: payload.description }),
        permissions: payload.permissions,
        actorSystemRole: auth.user?.system_role ?? null,
        ...(payload.confirmWildcard === undefined
          ? {}
          : { confirmWildcard: payload.confirmWildcard }),
      })

    if (result.status === 'code_taken') {
      return response.badRequest({ errors: [{ message: 'Mã vai trò đã tồn tại', field: 'code' }] })
    }

    if (result.status === 'not_found') {
      return response.notFound({ message: 'Không tìm thấy vai trò' })
    }

    return response.ok(result.role)
  }

  async destroy(ctx: HttpContext) {
    const { params, response } = ctx
    const { roleId } = buildCustomSystemRoleRouteRequest(params)
    const success = await this.actions
      .makeDeleteCustomSystemRoleCommand(actionContextFromHttp(ctx))
      .handle({ roleId })
    if (!success) {
      return response.notFound({ message: 'Không tìm thấy vai trò' })
    }

    return response.ok({ message: 'Đã xóa vai trò' })
  }
}
