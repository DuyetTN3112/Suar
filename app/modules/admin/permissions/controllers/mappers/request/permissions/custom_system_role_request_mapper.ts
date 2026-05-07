import ValidationException from '#modules/errors/public_contracts/validation_exception'

export interface CustomSystemRoleRouteRequest {
  roleId: string
}

export function buildCustomSystemRoleRouteRequest(
  params: unknown
): CustomSystemRoleRouteRequest {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw ValidationException.field('params', 'params must be an object')
  }

  const roleId = (params as Record<string, unknown>)['id']
  if (typeof roleId !== 'string' || roleId.trim().length === 0) {
    throw ValidationException.field('id', 'Missing route param: id')
  }

  return { roleId: roleId.trim() }
}
