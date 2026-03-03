export type AuditEventSurface = 'system' | 'user' | 'organization'

export interface AuditEventScope {
  readonly surface: AuditEventSurface
  readonly userId: string | null
  readonly organizationId: string | null
}

export interface AuditEventScopeInput {
  readonly actorUserId?: string | null
  /**
   * Actor organization is forensic context only. It must never decide which
   * organization owns an event.
   */
  readonly actorOrganizationId?: string | null
  readonly targetType?: string | null
  readonly targetId?: string | null
  readonly targetOrganizationId?: string | null
  readonly affectedUserIds?: readonly string[]
}

function addScope(scopes: AuditEventScope[], scope: AuditEventScope): void {
  const exists = scopes.some(
    (entry) =>
      entry.surface === scope.surface &&
      entry.userId === scope.userId &&
      entry.organizationId === scope.organizationId
  )

  if (!exists) {
    scopes.push(scope)
  }
}

export function deriveAuditEventScopes(input: AuditEventScopeInput): AuditEventScope[] {
  const scopes: AuditEventScope[] = []

  addScope(scopes, { surface: 'system', userId: null, organizationId: null })

  if (input.actorUserId) {
    addScope(scopes, { surface: 'user', userId: input.actorUserId, organizationId: null })
  }

  if (input.targetType === 'user' && input.targetId) {
    addScope(scopes, { surface: 'user', userId: input.targetId, organizationId: null })
  }

  for (const userId of input.affectedUserIds ?? []) {
    addScope(scopes, { surface: 'user', userId, organizationId: null })
  }

  const organizationId = input.targetOrganizationId ?? null
  if (organizationId) {
    addScope(scopes, { surface: 'organization', userId: null, organizationId })
  }

  return scopes
}
