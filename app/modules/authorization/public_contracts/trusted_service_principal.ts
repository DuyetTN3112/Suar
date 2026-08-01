import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'

export const DOMAIN_EVENT_DLQ_SERVICE_PRINCIPAL_ENV_KEY =
  'DOMAIN_EVENT_DLQ_SERVICE_PRINCIPAL_ID' as const

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const DOMAIN_EVENT_DLQ_PERMISSION = 'can_manage_system_settings'
const issuedIdentities = new WeakSet<object>()

interface ServicePrincipalRecord {
  id: string
  systemRole: string
  status: string
}

export interface TrustedServicePrincipalDependencies {
  findPrincipal(actorId: string): Promise<ServicePrincipalRecord | null>
  hasPermission(systemRole: string, permission: string): Promise<boolean>
}

export interface TrustedServicePrincipalIdentity {
  readonly actorId: string
  readonly actorRoleSurface: string
  readonly actorType: 'service'
  readonly authenticationProvenance: 'runtime_environment'
  readonly configurationKey: typeof DOMAIN_EVENT_DLQ_SERVICE_PRINCIPAL_ENV_KEY
}

/**
 * Resolve a deployment-managed service principal for domain-event DLQ operations.
 *
 * The value must come from the validated runtime environment. CLI flags and other
 * request-controlled values must never be passed to this resolver.
 */
export async function resolveDomainEventDlqServicePrincipal(
  configuredActorId: string | undefined,
  dependencies: TrustedServicePrincipalDependencies
): Promise<TrustedServicePrincipalIdentity> {
  const actorId = configuredActorId?.trim()
  if (!actorId || !UUID_PATTERN.test(actorId)) {
    throw new UnauthorizedException(
      `${DOMAIN_EVENT_DLQ_SERVICE_PRINCIPAL_ENV_KEY} must contain a service-principal UUID`
    )
  }

  const actor = await dependencies.findPrincipal(actorId)
  if (
    !actor ||
    actor.id !== actorId ||
    actor.status !== 'active' ||
    !(await dependencies.hasPermission(actor.systemRole, DOMAIN_EVENT_DLQ_PERMISSION))
  ) {
    throw new UnauthorizedException(
      'Configured domain-event DLQ service principal is inactive or unauthorized'
    )
  }

  const identity: TrustedServicePrincipalIdentity = Object.freeze({
    actorId: actor.id,
    actorRoleSurface: actor.systemRole,
    actorType: 'service',
    authenticationProvenance: 'runtime_environment',
    configurationKey: DOMAIN_EVENT_DLQ_SERVICE_PRINCIPAL_ENV_KEY,
  })
  issuedIdentities.add(identity)
  return identity
}

export function requireTrustedServicePrincipalIdentity(
  identity: unknown,
  expectedActorId: string | null
): TrustedServicePrincipalIdentity {
  if (
    typeof identity !== 'object' ||
    identity === null ||
    !issuedIdentities.has(identity) ||
    expectedActorId === null ||
    (identity as TrustedServicePrincipalIdentity).actorId !== expectedActorId
  ) {
    throw new UnauthorizedException('A trusted service-principal binding is required')
  }

  return identity as TrustedServicePrincipalIdentity
}
