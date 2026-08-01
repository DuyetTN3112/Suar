import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'

export const NOTIFICATION_RETENTION_SERVICE_PRINCIPAL_ENV_KEY =
  'NOTIFICATION_RETENTION_SERVICE_PRINCIPAL_ID' as const

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const NOTIFICATION_RETENTION_PERMISSION = 'can_manage_notification_operations'
const issuedIdentities = new WeakSet<object>()

interface ServicePrincipalRecord {
  id: string
  systemRole: string
  status: string
}

export interface NotificationRetentionServicePrincipalDependencies {
  findPrincipal(actorId: string): Promise<ServicePrincipalRecord | null>
  hasPermission(systemRole: string, permission: string): Promise<boolean>
}

export interface NotificationRetentionServicePrincipalIdentity {
  readonly actorId: string
  readonly actorRoleSurface: string
  readonly actorType: 'service'
  readonly authenticationProvenance: 'runtime_environment'
  readonly configurationKey: typeof NOTIFICATION_RETENTION_SERVICE_PRINCIPAL_ENV_KEY
}

export async function resolveNotificationRetentionServicePrincipal(
  configuredActorId: string | undefined,
  dependencies: NotificationRetentionServicePrincipalDependencies
): Promise<NotificationRetentionServicePrincipalIdentity> {
  const actorId = configuredActorId?.trim()
  if (!actorId || !UUID_PATTERN.test(actorId)) {
    throw new UnauthorizedException(
      `${NOTIFICATION_RETENTION_SERVICE_PRINCIPAL_ENV_KEY} must contain a service-principal UUID`
    )
  }

  const actor = await dependencies.findPrincipal(actorId)
  if (
    !actor ||
    actor.id !== actorId ||
    actor.status !== 'active' ||
    !(await dependencies.hasPermission(actor.systemRole, NOTIFICATION_RETENTION_PERMISSION))
  ) {
    throw new UnauthorizedException(
      'Configured notification-retention service principal is inactive or unauthorized'
    )
  }

  const identity: NotificationRetentionServicePrincipalIdentity = Object.freeze({
    actorId: actor.id,
    actorRoleSurface: actor.systemRole,
    actorType: 'service',
    authenticationProvenance: 'runtime_environment',
    configurationKey: NOTIFICATION_RETENTION_SERVICE_PRINCIPAL_ENV_KEY,
  })
  issuedIdentities.add(identity)
  return identity
}

export function requireNotificationRetentionServicePrincipalIdentity(
  identity: unknown,
  expectedActorId: string | null
): NotificationRetentionServicePrincipalIdentity {
  if (
    typeof identity !== 'object' ||
    identity === null ||
    !issuedIdentities.has(identity) ||
    expectedActorId === null ||
    (identity as NotificationRetentionServicePrincipalIdentity).actorId !== expectedActorId
  ) {
    throw new UnauthorizedException(
      'A trusted notification-retention service-principal binding is required'
    )
  }

  return identity as NotificationRetentionServicePrincipalIdentity
}
