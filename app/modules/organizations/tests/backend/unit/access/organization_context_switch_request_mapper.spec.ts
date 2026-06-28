import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildOrganizationContextSwitchRequest,
  buildOrganizationSwitchRouteRequest,
} from '#modules/organizations/controllers/mappers/request/access/organization_context_switch_request_mapper'

function requestOf(values: Record<string, unknown>) {
  return { input: (key: string) => values[key] }
}

test.group('Organization context switch request mapper', () => {
  test('maps canonical and legacy organization switch aliases', ({ assert }) => {
    assert.deepEqual(
      buildOrganizationContextSwitchRequest(
        requestOf({ organization_id: ' org-1 ', current_path: '/tasks' }) as never
      ),
      { organizationId: 'org-1', currentPath: '/tasks' }
    )
    assert.deepEqual(
      buildOrganizationSwitchRouteRequest({ organizationId: ' org-2 ' }),
      { organizationId: 'org-2' }
    )
  })

  test('rejects non-string or missing organization ids instead of coercing them', ({ assert }) => {
    for (const params of [{ organizationId: 42 }, {}, null, undefined]) {
      assert.throws(() => buildOrganizationSwitchRouteRequest(params), ValidationException)
    }
    assert.throws(
      () => buildOrganizationContextSwitchRequest(requestOf({ organizationId: 42 }) as never),
      ValidationException
    )
  })

  test('rejects a malformed current path rather than passing it to redirect logic', ({ assert }) => {
    assert.throws(
      () => buildOrganizationContextSwitchRequest(requestOf({ organizationId: 'org-1', currentPath: 42 }) as never),
      ValidationException
    )
  })
})
