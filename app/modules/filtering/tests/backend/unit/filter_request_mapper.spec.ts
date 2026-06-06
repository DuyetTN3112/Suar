import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildFilterCriteriaRequest } from '#modules/filtering/controllers/mappers/request/filtering/filter_request_mapper'

test.group('', () => {
  test('maps an allowlisted criteria envelope and applies the empty sort default', ({ assert }) => {
    assert.deepEqual(buildFilterCriteriaRequest({
      criteria: {
        context: 'tasks.discovery.public',
        schemaVersion: 1,
        page: { size: 25 },
      },
    }), {
      context: 'tasks.discovery.public',
      schemaVersion: 1,
      page: { size: 25 },
      sort: [],
    })
  })

  test('rejects authority fields and cursor/offset ambiguity at the transport boundary', ({ assert }) => {
    for (const body of [
      { principal: { kind: 'user', id: 'forged' }, criteria: {} },
      { criteria: { context: 'tasks.discovery.public', schemaVersion: 1, page: { size: 25, cursor: 'cursor', offset: 1 } } },
    ]) {
      assert.throws(() => buildFilterCriteriaRequest(body), ValidationException)
    }
  })

})
