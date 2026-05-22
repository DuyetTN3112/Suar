import ValidationException from '#modules/errors/public_contracts/validation_exception'

export interface WildcardPermissionConfirmation {
  permissions: string[]
  confirmWildcard?: boolean
}

export function assertWildcardPermissionConfirmed(
  payload: WildcardPermissionConfirmation,
  actorSystemRole: string | null | undefined
): void {
  if (!payload.permissions.includes('*')) {
    return
  }

  if (actorSystemRole === 'superadmin' && payload.confirmWildcard === true) {
    return
  }

  throw ValidationException.field(
    'permissions',
    'Wildcard permission requires explicit superadmin confirmation'
  )
}
