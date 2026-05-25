import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { SystemRoleName } from '#modules/users/public_contracts/user_constants'

type UserMutationParams = unknown

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw ValidationException.field(field, `${field} must be an object`)
  }
  return value as Record<string, unknown>
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.field(field, `${field} is required`)
  }
  return value.trim()
}

export type SuspendUserAction = 'suspend' | 'activate'

export interface SuspendUserRequest {
  userId: string
  action: SuspendUserAction
}

export function buildSuspendUserRequest(
  params: UserMutationParams,
  requestUrl: unknown
): SuspendUserRequest {
  const routeParams = asRecord(params, 'params')
  const url = requiredString(requestUrl, 'requestUrl')
  return {
    userId: requiredString(routeParams['userId'], 'userId'),
    action: url.includes('/activate') ? 'activate' : 'suspend',
  }
}

type SystemRole = SystemRoleName

export interface UpdateUserRoleRequest {
  userId: string
  systemRole: SystemRole
}

export function buildUpdateUserRoleRequest(
  params: UserMutationParams,
  body: unknown
): UpdateUserRoleRequest {
  const routeParams = asRecord(params, 'params')
  const payload = asRecord(body, 'body')
  const userId = requiredString(routeParams['userId'], 'userId')
  const rawRole = payload['system_role'] ?? payload['systemRole']
  const roles = Object.values(SystemRoleName) as readonly string[]
  if (typeof rawRole !== 'string' || !roles.includes(rawRole)) {
    throw ValidationException.field('system_role', 'system_role is invalid')
  }

  return { userId, systemRole: rawRole as SystemRole }
}
