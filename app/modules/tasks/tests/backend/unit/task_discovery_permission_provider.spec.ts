import { test } from '@japa/runner'

import type { FilterPermissionConstraintProvider } from '#modules/filtering/actions/ports/outbound/filter_permission_constraint_provider'
import { FilterContextResolutionError } from '#modules/filtering/public_contracts/filter_context_provider'
import { OrganizationRole } from '#modules/organizations/public_contracts/access/organization_constants'
import {
  TASK_DISCOVERY_CONTEXTS,
  TaskDiscoveryFilterContextProvider,
} from '#modules/tasks/public_contracts/task-discovery/task_discovery_filter_context'
import {
  TASK_DISCOVERY_PERMISSION_FIELDS,
  TaskDiscoveryPermissionProvider,
} from '#modules/tasks/public_contracts/task-discovery/task_discovery_permission_provider'

async function captureError(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise
  } catch (error) {
    return error as Error
  }
  throw new Error('Expected promise to reject')
}

test.group('Task discovery permission provider', () => {
  test('structurally satisfies the provider contract without production imports of Filtering internals', ({
    assert,
  }) => {
    const provider: FilterPermissionConstraintProvider = new TaskDiscoveryPermissionProvider()
    assert.instanceOf(provider, TaskDiscoveryPermissionProvider)
  })

  test('composes public visibility, application eligibility, and deletion constraints with AND', async ({
    assert,
  }) => {
    const provider = new TaskDiscoveryPermissionProvider()
    const anonymous = await provider.buildMandatoryExpression({
      context: TASK_DISCOVERY_CONTEXTS.public,
      principal: { kind: 'anonymous' },
    })
    const authenticated = await provider.buildMandatoryExpression({
      context: TASK_DISCOVERY_CONTEXTS.public,
      principal: { kind: 'user', id: 'user-1', authorizationVersion: 'auth-9' },
    })

    assert.deepEqual(anonymous.expression, authenticated.expression)
    assert.deepEqual(anonymous.expression, {
      kind: 'group',
      combinator: 'and',
      children: [
        {
          kind: 'condition',
          field: TASK_DISCOVERY_PERMISSION_FIELDS.notDeleted,
          operator: 'is_false',
          effect: 'require',
          unknown: 'exclude',
        },
        {
          kind: 'condition',
          field: TASK_DISCOVERY_PERMISSION_FIELDS.marketplaceVisible,
          operator: 'is_true',
          effect: 'require',
          unknown: 'exclude',
        },
        {
          kind: 'condition',
          field: TASK_DISCOVERY_PERMISSION_FIELDS.applicationEligible,
          operator: 'is_true',
          effect: 'require',
          unknown: 'exclude',
        },
        {
          kind: 'condition',
          field: TASK_DISCOVERY_PERMISSION_FIELDS.applicationDeadline,
          operator: 'overdue',
          effect: 'exclude',
          unknown: 'include',
        },
      ],
    })
    assert.deepInclude(anonymous.fieldBindings, {
      field: TASK_DISCOVERY_PERMISSION_FIELDS.applicationDeadline,
      type: 'date_time',
      operators: ['overdue'],
      effects: ['exclude'],
    })
    assert.equal(anonymous.authorizationVersion, 'tasks-public-anonymous:v2')
    assert.equal(authenticated.authorizationVersion, 'auth-9')
  })

  test('binds organization-member discovery to tenant and effective visibility without public-only constraints', async ({
    assert,
  }) => {
    const result = await new TaskDiscoveryPermissionProvider().buildMandatoryExpression({
      context: TASK_DISCOVERY_CONTEXTS.member,
      principal: {
        kind: 'user',
        id: 'member-1',
        organizationId: 'org-private',
        organizationRole: OrganizationRole.MEMBER,
        authorizationVersion: 'membership-22',
      },
    })

    assert.equal(result.authorizationVersion, 'membership-22')
    assert.deepInclude(result.expression, {
      kind: 'group',
      combinator: 'and',
      children: [
        {
          kind: 'condition',
          field: TASK_DISCOVERY_PERMISSION_FIELDS.notDeleted,
          operator: 'is_false',
          effect: 'require',
          unknown: 'exclude',
        },
        {
          kind: 'condition',
          field: TASK_DISCOVERY_PERMISSION_FIELDS.organizationId,
          operator: 'eq',
          effect: 'require',
          value: { kind: 'scalar', value: 'org-private' },
          unknown: 'exclude',
        },
        {
          kind: 'condition',
          field: TASK_DISCOVERY_PERMISSION_FIELDS.memberVisible,
          operator: 'is_true',
          effect: 'require',
          unknown: 'exclude',
        },
        {
          kind: 'group',
          combinator: 'or',
          children: [
            {
              kind: 'condition',
              field: TASK_DISCOVERY_PERMISSION_FIELDS.creatorId,
              operator: 'eq',
              effect: 'require',
              value: { kind: 'scalar', value: 'member-1' },
              unknown: 'exclude',
            },
            {
              kind: 'condition',
              field: TASK_DISCOVERY_PERMISSION_FIELDS.assignedTo,
              operator: 'eq',
              effect: 'require',
              value: { kind: 'scalar', value: 'member-1' },
              unknown: 'exclude',
            },
          ],
        },
      ],
    })
    assert.notInclude(
      JSON.stringify(result.expression),
      TASK_DISCOVERY_PERMISSION_FIELDS.applicationEligible
    )
    assert.notInclude(
      JSON.stringify(result.expression),
      TASK_DISCOVERY_PERMISSION_FIELDS.marketplaceVisible
    )

    const owner = await new TaskDiscoveryPermissionProvider().buildMandatoryExpression({
      context: TASK_DISCOVERY_CONTEXTS.member,
      principal: {
        kind: 'user',
        id: 'owner-1',
        organizationId: 'org-private',
        organizationRole: OrganizationRole.OWNER,
      },
    })
    assert.notInclude(JSON.stringify(owner.expression), TASK_DISCOVERY_PERMISSION_FIELDS.creatorId)
    assert.notInclude(JSON.stringify(owner.expression), TASK_DISCOVERY_PERMISSION_FIELDS.assignedTo)
  })

  test('keeps mandatory fields server-only and uses explicit fail-closed bindings', async ({
    assert,
  }) => {
    const permission = await new TaskDiscoveryPermissionProvider().buildMandatoryExpression({
      context: TASK_DISCOVERY_CONTEXTS.member,
      principal: { kind: 'service', id: 'worker-1', organizationId: 'org-1' },
    })
    const context = await new TaskDiscoveryFilterContextProvider().getEffectiveDefinition({
      context: TASK_DISCOVERY_CONTEXTS.member,
      principal: { kind: 'service', id: 'worker-1', organizationId: 'org-1' },
    })
    const visibleFields = new Set(context.fields.map(({ key }) => key))

    for (const binding of permission.fieldBindings) {
      assert.isFalse(visibleFields.has(binding.field))
      assert.deepEqual(binding.effects, ['require'])
      assert.isAbove(binding.operators.length, 0)
    }
    assert.deepEqual(
      permission.fieldBindings.map(({ field }) => field),
      [
        TASK_DISCOVERY_PERMISSION_FIELDS.notDeleted,
        TASK_DISCOVERY_PERMISSION_FIELDS.organizationId,
        TASK_DISCOVERY_PERMISSION_FIELDS.memberVisible,
      ]
    )
  })

  test('makes unknown context, anonymous member access, and malformed principals indistinguishable', async ({
    assert,
  }) => {
    const provider = new TaskDiscoveryPermissionProvider()
    const errors = await Promise.all([
      captureError(
        provider.buildMandatoryExpression({
          context: 'tasks.discovery.secret',
          principal: { kind: 'anonymous' },
        })
      ),
      captureError(
        provider.buildMandatoryExpression({
          context: TASK_DISCOVERY_CONTEXTS.member,
          principal: { kind: 'anonymous' },
        })
      ),
      captureError(
        provider.buildMandatoryExpression({
          context: TASK_DISCOVERY_CONTEXTS.member,
          principal: { kind: 'user', id: 'member-1' },
        })
      ),
      captureError(
        provider.buildMandatoryExpression({
          context: TASK_DISCOVERY_CONTEXTS.member,
          principal: { kind: 'user', id: 'member-1', organizationId: 'org-1' },
        })
      ),
    ])

    for (const error of errors) {
      assert.instanceOf(error, FilterContextResolutionError)
      assert.equal(error.message, errors[0].message)
      assert.notInclude(JSON.stringify(error), 'secret')
      assert.notInclude(JSON.stringify(error), 'member-1')
    }
  })

  test('returns fresh deterministic constraints so request code cannot mutate later requests', async ({
    assert,
  }) => {
    const provider = new TaskDiscoveryPermissionProvider()
    const input = {
      context: TASK_DISCOVERY_CONTEXTS.public,
      principal: { kind: 'anonymous' as const },
    }
    const first = await provider.buildMandatoryExpression(input)
    const second = await provider.buildMandatoryExpression(input)

    assert.deepEqual(first, second)
    assert.notStrictEqual(first, second)
    assert.notStrictEqual(first.expression, second.expression)
    assert.notStrictEqual(first.fieldBindings, second.fieldBindings)
  })
})
