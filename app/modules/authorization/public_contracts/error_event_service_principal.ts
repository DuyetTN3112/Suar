import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'

export const ERROR_EVENT_RETENTION_SERVICE_PRINCIPAL_ENV_KEY =
  'ERROR_EVENT_RETENTION_SERVICE_PRINCIPAL_ID' as const

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const ERROR_EVENT_RETENTION_PERMISSION = 'can_manage_system_settings'
const issuedIdentities = new WeakSet<object>()

interface ServicePrincipalRecord {
  id: string
  systemRole: string
  status: string
}

export interface ErrorEventServicePrincipalDependencies {
  findPrincipal(actorId: string): Promise<ServicePrincipalRecord | null>
  hasPermission(systemRole: string, permission: string): Promise<boolean>
}

export interface ErrorEventServicePrincipalIdentity {
  readonly actorId: string
  readonly actorRoleSurface: string
  readonly actorType: 'service'
  readonly authenticationProvenance: 'runtime_environment'
  readonly configurationKey: typeof ERROR_EVENT_RETENTION_SERVICE_PRINCIPAL_ENV_KEY
}

export async function resolveErrorEventServicePrincipal(
  configuredActorId: string | undefined,
  dependencies: ErrorEventServicePrincipalDependencies
): Promise<ErrorEventServicePrincipalIdentity> {
  const actorId = configuredActorId?.trim()
  if (!actorId || !UUID_PATTERN.test(actorId)) {
    throw new UnauthorizedException(
      `${ERROR_EVENT_RETENTION_SERVICE_PRINCIPAL_ENV_KEY} must contain a service-principal UUID`
    )
  }

  const actor = await dependencies.findPrincipal(actorId)
  if (
    !actor ||
    actor.id !== actorId ||
    actor.status !== 'active' ||
    !(await dependencies.hasPermission(actor.systemRole, ERROR_EVENT_RETENTION_PERMISSION))
  ) {
    throw new UnauthorizedException(
      'Configured error-event retention service principal is inactive or unauthorized'
    )
  }

  const identity: ErrorEventServicePrincipalIdentity = Object.freeze({
    actorId: actor.id,
    actorRoleSurface: actor.systemRole,
    actorType: 'service',
    authenticationProvenance: 'runtime_environment',
    configurationKey: ERROR_EVENT_RETENTION_SERVICE_PRINCIPAL_ENV_KEY,
  })
  issuedIdentities.add(identity)
  return identity
}

export function requireErrorEventServicePrincipalIdentity(
  identity: unknown,
  expectedActorId: string | null
): ErrorEventServicePrincipalIdentity {
  if (
    typeof identity !== 'object' ||
    identity === null ||
    !issuedIdentities.has(identity) ||
    expectedActorId === null ||
    (identity as ErrorEventServicePrincipalIdentity).actorId !== expectedActorId
  ) {
    throw new UnauthorizedException('A trusted error-event service-principal binding is required')
  }

  return identity as ErrorEventServicePrincipalIdentity
}
