import { test } from '@japa/runner'

import {
  AUDIT_LOG_FILTER_BINDINGS,
  compileAuditLogFilterExpression,
  compileAuditLogTextSearch,
  reduceAuditLogFilterForSelfExcludingFacet,
} from '#modules/audit/infra/adapters/filtering/audit_log_filter_semantic_bindings'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'

type Expression = NonNullable<QueryCriteriaRequest['filter']>

function condition(
  field: string,
  operator: string,
  value?: Extract<Expression, { kind: 'condition' }>['value']
): Extract<Expression, { kind: 'condition' }> {
  return {
    kind: 'condition',
    field,
    operator,
    effect: 'require',
    unknown: 'exclude',
    ...(value === undefined ? {} : { value }),
  }
}

test.group('Audit log semantic SQL compiler', () => {
  test('binds exact scalar, missing actor, nested Boolean, and one captured relative-time anchor', ({
    assert,
  }) => {
    const now = new Date('2026-08-01T12:34:56.000Z')
    const expression: Expression = {
      kind: 'group',
      combinator: 'and',
      children: [
        condition('audit.action', 'eq', { kind: 'scalar', value: 'admin.user.updated' }),
        {
          kind: 'group',
          combinator: 'or',
          children: [
            condition('audit.actorId', 'missing'),
            condition('audit.outcome', 'eq', { kind: 'scalar', value: 'failure' }),
          ],
        },
        condition('audit.createdAt', 'within_last', {
          kind: 'relative_time',
          amount: 2,
          unit: 'day',
          anchor: 'now',
        }),
      ],
    }

    const compiled = compileAuditLogFilterExpression(expression, now)

    assert.include(compiled.sql, 'coalesce(actor_user_id, user_id) IS NULL')
    assert.include(compiled.sql, 'occurred_at')
    assert.include(compiled.bindings, 'admin.user.updated')
    assert.include(compiled.bindings, 'failure')
    assert.include(compiled.bindings, '2026-07-30T12:34:56.000Z')
    assert.include(compiled.bindings, '2026-08-01T12:34:56.000Z')
  })

  test('keeps malicious values in bindings and rejects unbound semantic identifiers', ({
    assert,
  }) => {
    const attack = "failure' OR TRUE --"
    const compiled = compileAuditLogFilterExpression(
      condition('audit.outcome', 'eq', { kind: 'scalar', value: attack }),
      new Date('2026-08-01T00:00:00.000Z')
    )

    assert.notInclude(compiled.sql, attack)
    assert.deepEqual(compiled.bindings, [attack.toLocaleLowerCase('en-US')])

    const error = (() => {
      try {
        compileAuditLogFilterExpression(
          condition('audit.outcome) = true --', 'eq', { kind: 'scalar', value: 'failure' }),
          new Date('2026-08-01T00:00:00.000Z')
        )
      } catch (caught) {
        return caught
      }
      return undefined
    })()
    assert.instanceOf(error, FilterExecutionError)
    assert.equal((error as FilterExecutionError).code, 'FILTER_EXECUTOR_CAPABILITY_MISMATCH')
  })

  test('searches only approved metadata and never JSON payload, network, or user-agent columns', ({
    assert,
  }) => {
    const secret = 'hidden-canary-4d845'
    const compiled = compileAuditLogTextSearch(secret)
    const publicValue = compileAuditLogTextSearch('admin.user.updated')

    assert.notInclude(compiled.sql, 'old_values')
    assert.notInclude(compiled.sql, 'new_values')
    assert.notInclude(compiled.sql, 'ip_address')
    assert.notInclude(compiled.sql, 'user_agent')
    assert.notInclude(compiled.sql, secret)
    assert.isTrue(compiled.bindings.every((binding) => String(binding).includes(secret)))
    assert.equal(compiled.sql, publicValue.sql)
    assert.equal(compiled.bindings.length, publicValue.bindings.length)
  })

  test('extracts only a root AND facet clause and retains every other constraint', ({ assert }) => {
    const rootAnd: Expression = {
      kind: 'group',
      combinator: 'and',
      children: [
        condition('audit.action', 'eq', { kind: 'scalar', value: 'updated' }),
        condition('audit.outcome', 'eq', { kind: 'scalar', value: 'failure' }),
      ],
    }
    const reduced = reduceAuditLogFilterForSelfExcludingFacet(rootAnd, 'audit.outcome')

    assert.isTrue(reduced.supported)
    assert.deepEqual(reduced.expression, rootAnd.children[0])

    const rootOr: Expression = { ...rootAnd, combinator: 'or' }
    assert.isFalse(reduceAuditLogFilterForSelfExcludingFacet(rootOr, 'audit.outcome').supported)
  })

  test('declares a closed binding allowlist without structured payload mappings', ({ assert }) => {
    assert.deepEqual(Object.keys(AUDIT_LOG_FILTER_BINDINGS), [
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
    ])
    const serialized = JSON.stringify(AUDIT_LOG_FILTER_BINDINGS)
    assert.notInclude(serialized, 'old_values')
    assert.notInclude(serialized, 'new_values')
    assert.notInclude(serialized, 'ip_address')
    assert.notInclude(serialized, 'user_agent')
  })
})
