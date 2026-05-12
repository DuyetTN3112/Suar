import { readFile } from 'node:fs/promises'

import { test } from '@japa/runner'

import {
  ADMIN_AUDIT_FILTER_CONTEXT,
  ADMIN_AUDIT_FILTER_EXECUTION_PROFILE,
  AdminAuditFilterContextProvider,
} from '#modules/admin/audit_logs/filtering/audit_logs/admin_audit_filter_context_provider'
import {
  AdminAuditPermissionProvider,
  type AdminAuditAuthorizationReader,
  type AdminAuditAuthorizationSnapshot,
} from '#modules/admin/audit_logs/filtering/audit_logs/admin_audit_permission_provider'
import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'

class FakeAuthorizationReader implements AdminAuditAuthorizationReader {
  constructor(
    private readonly resolveSnapshot: (
      principal: FilterPrincipal
    ) => AdminAuditAuthorizationSnapshot | Promise<AdminAuditAuthorizationSnapshot>
  ) {}

  resolve(principal: FilterPrincipal): Promise<AdminAuditAuthorizationSnapshot> {
    return Promise.resolve(this.resolveSnapshot(principal))
  }
}

const adminPrincipal: FilterPrincipal = {
  kind: 'user',
  id: 'system-admin-1',
  authorizationVersion: 'session-v7',
}

function allowedReader(): FakeAuthorizationReader {
  return new FakeAuthorizationReader(() => ({
    allowed: true,
    sessionActive: true,
    authorizationVersion: 'admin-policy-v3',
  }))
}

test.group('Admin audit filter context', () => {
  test('publishes only domain-approved audit semantics with exact offset execution', async ({
    assert,
  }) => {
    const provider = new AdminAuditFilterContextProvider(allowedReader())
    const first = await provider.getEffectiveDefinition({
      context: ADMIN_AUDIT_FILTER_CONTEXT,
      principal: adminPrincipal,
    })
    const second = await provider.getEffectiveDefinition({
      context: ADMIN_AUDIT_FILTER_CONTEXT,
      principal: adminPrincipal,
    })

    assert.deepEqual(first, second)
    assert.notStrictEqual(first, second)
    assert.equal(first.resource, 'audit_event')
    assert.equal(first.ownerModule, 'admin')
    assert.equal(first.executionProfile, ADMIN_AUDIT_FILTER_EXECUTION_PROFILE)
    assert.equal(first.capabilities.pagination, 'offset')
    assert.isTrue(first.capabilities.emptyRequest)
    assert.isTrue(first.capabilities.text)
    assert.isTrue(first.capabilities.facets)
    assert.isFalse(first.capabilities.preferences)
    assert.deepEqual(first.defaultSort, [{ field: 'audit.createdAt', direction: 'desc' }])
    assert.deepEqual(
      first.fields.map(({ key }) => key),
      [
        'audit.action',
        'audit.resourceType',
        'audit.resourceId',
        'audit.actorId',
        'audit.outcome',
        'audit.severity',
        'audit.requestId',
        'audit.traceId',
        'audit.createdAt',
        'audit.integrityState',
      ]
    )
    assert.include(
      first.fields.find(({ key }) => key === 'audit.actorId')?.operators ?? [],
      'missing'
    )
    assert.notInclude(JSON.stringify(first), 'old_values')
    assert.notInclude(JSON.stringify(first), 'new_values')
    assert.notInclude(JSON.stringify(first), 'ip_address')
  })

  test('mints an opaque authorization version without exposing a permission pseudo-field', async ({
    assert,
  }) => {
    const provider = new AdminAuditPermissionProvider(allowedReader())
    const constraint = await provider.buildMandatoryExpression({
      context: ADMIN_AUDIT_FILTER_CONTEXT,
      principal: adminPrincipal,
    })

    assert.notProperty(constraint, 'expression')
    assert.deepEqual(constraint.fieldBindings, [])
    assert.equal(constraint.authorizationVersion, 'admin-policy-v3')
    assert.notInclude(JSON.stringify(constraint), 'system_admin')
  })

  test('fails closed for non-admin, expired, malformed, unknown-context, and reader failure', async ({
    assert,
  }) => {
    const cases: Array<{
      name: string
      principal: FilterPrincipal
      reader: AdminAuditAuthorizationReader
      context?: string
    }> = [
      {
        name: 'non-admin',
        principal: adminPrincipal,
        reader: new FakeAuthorizationReader(() => ({
          allowed: false,
          sessionActive: true,
          authorizationVersion: 'denied-v1',
        })),
      },
      {
        name: 'expired',
        principal: adminPrincipal,
        reader: new FakeAuthorizationReader(() => ({
          allowed: true,
          sessionActive: false,
          authorizationVersion: 'expired-v1',
        })),
      },
      {
        name: 'anonymous',
        principal: { kind: 'anonymous' },
        reader: allowedReader(),
      },
      {
        name: 'unknown context',
        principal: adminPrincipal,
        reader: allowedReader(),
        context: 'audit.admin.secret-context',
      },
      {
        name: 'reader failure',
        principal: adminPrincipal,
        reader: new FakeAuthorizationReader(() => Promise.reject(new Error('database detail'))),
      },
    ]

    for (const scenario of cases) {
      const input = {
        context: scenario.context ?? ADMIN_AUDIT_FILTER_CONTEXT,
        principal: scenario.principal,
      }
      const contextError = await new AdminAuditFilterContextProvider(scenario.reader)
        .getEffectiveDefinition(input)
        .catch((error: unknown) => error)
      const permissionError = await new AdminAuditPermissionProvider(scenario.reader)
        .buildMandatoryExpression(input)
        .catch((error: unknown) => error)

      assert.equal(
        (contextError as { code?: string }).code,
        'FILTER_CONTEXT_UNAVAILABLE',
        scenario.name
      )
      assert.equal(
        (permissionError as { code?: string }).code,
        'FILTER_CONTEXT_UNAVAILABLE',
        scenario.name
      )
      assert.notInclude((contextError as Error).message, 'database detail')
      assert.notInclude((permissionError as Error).message, 'database detail')
    }
  })

  test('keeps the domain context independent from Search and persistence mappings', async ({
    assert,
  }) => {
    const sources = await Promise.all([
      readFile(
        new URL(
          '../../../../audit_logs/filtering/audit_logs/admin_audit_filter_context_provider.ts',
          import.meta.url
        ),
        'utf8'
      ),
      readFile(
        new URL(
          '../../../../audit_logs/filtering/audit_logs/admin_audit_permission_provider.ts',
          import.meta.url
        ),
        'utf8'
      ),
    ])
    const source = sources.join('\n')

    assert.notInclude(source, '#modules/search')
    assert.notInclude(source, '#modules/audit/infra')
    assert.notInclude(source, 'old_values')
    assert.notInclude(source, 'new_values')
  })
})
