import {
  FilterContextResolutionError,
  type FilterPrincipal,
} from '#modules/filtering/public_contracts/filter_context_provider'

export interface AdminAuditAuthorizationSnapshot {
  readonly allowed: boolean
  readonly sessionActive: boolean
  readonly authorizationVersion: string
}

export interface AdminAuditAuthorizationReader {
  resolve(principal: FilterPrincipal): Promise<AdminAuditAuthorizationSnapshot>
}

interface AdminAuditPermissionConstraint {
  readonly fieldBindings: readonly []
  readonly authorizationVersion: string
}

function isBoundedIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 256
}

function isAuthorizationSnapshot(value: unknown): value is AdminAuditAuthorizationSnapshot {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const snapshot = value as Partial<AdminAuditAuthorizationSnapshot>
  return (
    typeof snapshot.allowed === 'boolean' &&
    typeof snapshot.sessionActive === 'boolean' &&
    isBoundedIdentifier(snapshot.authorizationVersion)
  )
}

export async function resolveAdminAuditAuthorization(
  reader: AdminAuditAuthorizationReader,
  context: string,
  principal: FilterPrincipal,
  expectedContext: string
): Promise<AdminAuditAuthorizationSnapshot> {
  if (
    context !== expectedContext ||
    principal.kind !== 'user' ||
    !isBoundedIdentifier(principal.id)
  ) {
    throw new FilterContextResolutionError()
  }

  try {
    const snapshot: unknown = await reader.resolve(structuredClone(principal))
    if (!isAuthorizationSnapshot(snapshot) || !snapshot.allowed || !snapshot.sessionActive) {
      throw new FilterContextResolutionError()
    }
    return structuredClone(snapshot)
  } catch {
    throw new FilterContextResolutionError()
  }
}

export class AdminAuditPermissionProvider {
  constructor(private readonly authorizationReader: AdminAuditAuthorizationReader) {}

  async buildMandatoryExpression(input: {
    context: string
    principal: FilterPrincipal
  }): Promise<AdminAuditPermissionConstraint> {
    const authorization = await resolveAdminAuditAuthorization(
      this.authorizationReader,
      input.context,
      input.principal,
      'audit.admin.investigation'
    )

    return {
      fieldBindings: [],
      authorizationVersion: authorization.authorizationVersion,
    }
  }
}
