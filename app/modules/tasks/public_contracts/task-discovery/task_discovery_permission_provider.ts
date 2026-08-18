import {
  FilterContextResolutionError,
  type FilterPrincipal,
} from '#modules/filtering/public_contracts/filter_context_provider'
import { OrganizationRole } from '#modules/organizations/public_contracts/access/organization_constants'
import { TASK_DISCOVERY_CONTEXTS } from '#modules/tasks/public_contracts/task-discovery/task_discovery_filter_context'
import { TASK_DISCOVERY_PERMISSION_FIELDS } from '#modules/tasks/public_contracts/task-discovery/task_discovery_semantic_fields'

export { TASK_DISCOVERY_PERMISSION_FIELDS }

type TaskDiscoveryPermissionFieldType = 'boolean' | 'date_time' | 'scalar'

interface TaskDiscoveryPermissionFieldBinding {
  readonly field: string
  readonly type: TaskDiscoveryPermissionFieldType
  readonly operators: readonly string[]
  readonly effects: readonly ('require' | 'exclude')[]
}

interface TaskDiscoveryPermissionCondition {
  readonly kind: 'condition'
  readonly field: string
  readonly operator: string
  readonly effect: 'require' | 'exclude'
  readonly value?: { readonly kind: 'scalar'; readonly value: string }
  readonly unknown: 'include' | 'exclude'
}

type TaskDiscoveryPermissionExpression =
  | TaskDiscoveryPermissionCondition
  | {
      readonly kind: 'group'
      readonly combinator: 'and' | 'or'
      readonly children: TaskDiscoveryPermissionExpression[]
    }

interface TaskDiscoveryPermissionConstraint {
  readonly expression: TaskDiscoveryPermissionExpression
  readonly fieldBindings: readonly TaskDiscoveryPermissionFieldBinding[]
  readonly authorizationVersion: string
}

function booleanBinding(
  field: string,
  operator: 'is_true' | 'is_false'
): TaskDiscoveryPermissionFieldBinding {
  return { field, type: 'boolean', operators: [operator], effects: ['require'] }
}

const ORGANIZATION_BINDING: TaskDiscoveryPermissionFieldBinding = {
  field: TASK_DISCOVERY_PERMISSION_FIELDS.organizationId,
  type: 'scalar',
  operators: ['eq'],
  effects: ['require'],
}

const CREATOR_BINDING: TaskDiscoveryPermissionFieldBinding = {
  field: TASK_DISCOVERY_PERMISSION_FIELDS.creatorId,
  type: 'scalar',
  operators: ['eq'],
  effects: ['require'],
}

const ASSIGNED_TO_BINDING: TaskDiscoveryPermissionFieldBinding = {
  field: TASK_DISCOVERY_PERMISSION_FIELDS.assignedTo,
  type: 'scalar',
  operators: ['eq'],
  effects: ['require'],
}

const APPLICATION_DEADLINE_BINDING: TaskDiscoveryPermissionFieldBinding = {
  field: TASK_DISCOVERY_PERMISSION_FIELDS.applicationDeadline,
  type: 'date_time',
  operators: ['overdue'],
  effects: ['exclude'],
}

function isBoundedIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 256
}

function booleanCondition(
  field: string,
  operator: 'is_true' | 'is_false'
): TaskDiscoveryPermissionCondition {
  return { kind: 'condition', field, operator, effect: 'require', unknown: 'exclude' }
}

function and(children: TaskDiscoveryPermissionExpression[]): TaskDiscoveryPermissionExpression {
  return { kind: 'group', combinator: 'and', children }
}

function or(children: TaskDiscoveryPermissionExpression[]): TaskDiscoveryPermissionExpression {
  return { kind: 'group', combinator: 'or', children }
}

function scalarCondition(field: string, value: string): TaskDiscoveryPermissionCondition {
  return {
    kind: 'condition',
    field,
    operator: 'eq',
    effect: 'require',
    value: { kind: 'scalar', value },
    unknown: 'exclude',
  }
}

function openApplicationWindowCondition(): TaskDiscoveryPermissionCondition {
  return {
    kind: 'condition',
    field: TASK_DISCOVERY_PERMISSION_FIELDS.applicationDeadline,
    operator: 'overdue',
    effect: 'exclude',
    unknown: 'include',
  }
}

function cloneBindings(bindings: readonly TaskDiscoveryPermissionFieldBinding[]) {
  return structuredClone(bindings)
}

function publicConstraint(principal: FilterPrincipal): TaskDiscoveryPermissionConstraint | null {
  const valid =
    (principal.kind === 'anonymous' && principal.id === undefined) ||
    (principal.kind === 'user' && isBoundedIdentifier(principal.id))
  if (!valid) return null

  return {
    expression: and([
      booleanCondition(TASK_DISCOVERY_PERMISSION_FIELDS.notDeleted, 'is_false'),
      booleanCondition(TASK_DISCOVERY_PERMISSION_FIELDS.marketplaceVisible, 'is_true'),
      booleanCondition(TASK_DISCOVERY_PERMISSION_FIELDS.applicationEligible, 'is_true'),
      openApplicationWindowCondition(),
    ]),
    fieldBindings: cloneBindings([
      booleanBinding(TASK_DISCOVERY_PERMISSION_FIELDS.notDeleted, 'is_false'),
      booleanBinding(TASK_DISCOVERY_PERMISSION_FIELDS.marketplaceVisible, 'is_true'),
      booleanBinding(TASK_DISCOVERY_PERMISSION_FIELDS.applicationEligible, 'is_true'),
      APPLICATION_DEADLINE_BINDING,
    ]),
    authorizationVersion:
      principal.authorizationVersion ??
      (principal.kind === 'anonymous' ? 'tasks-public-anonymous:v2' : 'tasks-public-user:v2'),
  }
}

function memberConstraint(principal: FilterPrincipal): TaskDiscoveryPermissionConstraint | null {
  if (
    (principal.kind !== 'user' && principal.kind !== 'service') ||
    !isBoundedIdentifier(principal.id) ||
    !isBoundedIdentifier(principal.organizationId)
  ) {
    return null
  }

  const isOrganizationWide =
    principal.kind === 'service' ||
    principal.organizationRole === OrganizationRole.OWNER ||
    principal.organizationRole === OrganizationRole.ADMIN
  const isMember =
    principal.kind === 'user' && principal.organizationRole === OrganizationRole.MEMBER
  if (!isOrganizationWide && !isMember) return null

  const actorConstraint = isMember
    ? or([
        scalarCondition(TASK_DISCOVERY_PERMISSION_FIELDS.creatorId, principal.id),
        scalarCondition(TASK_DISCOVERY_PERMISSION_FIELDS.assignedTo, principal.id),
      ])
    : undefined
  const authorizationScope = principal.kind === 'service' ? 'service' : principal.organizationRole
  if (!isBoundedIdentifier(authorizationScope)) return null

  return {
    expression: and([
      booleanCondition(TASK_DISCOVERY_PERMISSION_FIELDS.notDeleted, 'is_false'),
      scalarCondition(TASK_DISCOVERY_PERMISSION_FIELDS.organizationId, principal.organizationId),
      booleanCondition(TASK_DISCOVERY_PERMISSION_FIELDS.memberVisible, 'is_true'),
      ...(actorConstraint === undefined ? [] : [actorConstraint]),
    ]),
    fieldBindings: cloneBindings([
      booleanBinding(TASK_DISCOVERY_PERMISSION_FIELDS.notDeleted, 'is_false'),
      ORGANIZATION_BINDING,
      booleanBinding(TASK_DISCOVERY_PERMISSION_FIELDS.memberVisible, 'is_true'),
      ...(actorConstraint === undefined ? [] : [CREATOR_BINDING, ASSIGNED_TO_BINDING]),
    ]),
    authorizationVersion: principal.authorizationVersion ?? `tasks-member:${authorizationScope}:v2`,
  }
}

export class TaskDiscoveryPermissionProvider {
  buildMandatoryExpression(input: {
    context: string
    principal: FilterPrincipal
  }): Promise<TaskDiscoveryPermissionConstraint> {
    const constraint =
      input.context === TASK_DISCOVERY_CONTEXTS.public
        ? publicConstraint(input.principal)
        : input.context === TASK_DISCOVERY_CONTEXTS.member
          ? memberConstraint(input.principal)
          : null
    return constraint === null
      ? Promise.reject(new FilterContextResolutionError())
      : Promise.resolve(constraint)
  }
}
