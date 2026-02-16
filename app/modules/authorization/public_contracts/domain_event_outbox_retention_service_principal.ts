import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'

export const DOMAIN_EVENT_OUTBOX_RETENTION_SERVICE_PRINCIPAL_ENV_KEY =
  'DOMAIN_EVENT_OUTBOX_RETENTION_SERVICE_PRINCIPAL_ID' as const

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const DOMAIN_EVENT_OUTBOX_RETENTION_PERMISSION = 'can_manage_system_settings'
const issuedIdentities = new WeakSet<object>()

interface ServicePrincipalRecord {
  id: string
  systemRole: string
  status: string
}

export interface DomainEventOutboxRetentionPrincipalDependencies {
  findPrincipal(actorId: string): Promise<ServicePrincipalRecord | null>
  hasPermission(systemRole: string, permission: string): Promise<boolean>
}

export interface DomainEventOutboxRetentionPrincipalIdentity {
  readonly actorId: string
  readonly actorRoleSurface: string
  readonly actorType: 'service'
  readonly authenticationProvenance: 'runtime_environment'
  readonly configurationKey: typeof DOMAIN_EVENT_OUTBOX_RETENTION_SERVICE_PRINCIPAL_ENV_KEY
}

export async function resolveDomainEventOutboxRetentionServicePrincipal(
  configuredActorId: string | undefined,
  dependencies: DomainEventOutboxRetentionPrincipalDependencies
): Promise<DomainEventOutboxRetentionPrincipalIdentity> {
  const actorId = configuredActorId?.trim()
  if (!actorId || !UUID_PATTERN.test(actorId)) {
    throw new UnauthorizedException(
      `${DOMAIN_EVENT_OUTBOX_RETENTION_SERVICE_PRINCIPAL_ENV_KEY} must contain a service-principal UUID`
    )
  }

  const actor = await dependencies.findPrincipal(actorId)
  if (
    !actor ||
    actor.id !== actorId ||
    actor.status !== 'active' ||
    !(await dependencies.hasPermission(
      actor.systemRole,
      DOMAIN_EVENT_OUTBOX_RETENTION_PERMISSION
    ))
  ) {
    throw new UnauthorizedException(
      'Configured domain-event outbox retention service principal is inactive or unauthorized'
    )
  }

  const identity: DomainEventOutboxRetentionPrincipalIdentity = Object.freeze({
    actorId: actor.id,
    actorRoleSurface: actor.systemRole,
    actorType: 'service',
    authenticationProvenance: 'runtime_environment',
    configurationKey: DOMAIN_EVENT_OUTBOX_RETENTION_SERVICE_PRINCIPAL_ENV_KEY,
  })
  issuedIdentities.add(identity)
  return identity
}

export function requireDomainEventOutboxRetentionServicePrincipal(
  identity: unknown,
  expectedActorId: string | null
): DomainEventOutboxRetentionPrincipalIdentity {
  if (
    typeof identity !== 'object' ||
    identity === null ||
    !issuedIdentities.has(identity) ||
    expectedActorId === null ||
    (identity as DomainEventOutboxRetentionPrincipalIdentity).actorId !== expectedActorId
  ) {
    throw new UnauthorizedException(
      'A trusted domain-event outbox retention service-principal binding is required'
    )
  }
  return identity as DomainEventOutboxRetentionPrincipalIdentity
}
