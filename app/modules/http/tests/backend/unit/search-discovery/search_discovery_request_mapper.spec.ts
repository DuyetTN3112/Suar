import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildSearchDiscoveryRequest } from '#modules/http/controllers/mappers/request/search-discovery/search_discovery_request_mapper'

test.group('Unit | Search discovery request mapper', () => {
  test('accepts only the transport envelope required by the typed discovery query', ({
    assert,
  }) => {
    const request = buildSearchDiscoveryRequest({
      criteria: {
        context: 'tasks.discovery.public',
        schemaVersion: 1,
        page: { size: 24 },
        filter: { kind: 'condition', field: 'taxonomy.requiredSkills' },
      },
      search: { scope: 'task', retrievalMode: 'lexical' },
    })

    assert.equal(request.criteria.context, 'tasks.discovery.public')
    assert.equal(request.search.scope, 'task')
  })

  test('rejects malformed envelope, unbounded context, and unsupported scope before execution', ({
    assert,
  }) => {
    for (const payload of [
      null,
      { criteria: {}, search: {} },
      {
        criteria: { context: '', schemaVersion: 1, page: { size: 20 } },
        search: { scope: 'task' },
      },
      {
        criteria: { context: 'tasks.discovery.public', schemaVersion: 1, page: { size: 20 } },
        search: { scope: 'unknown' },
      },
      {
        criteria: { context: 'tasks.discovery.public', schemaVersion: 1, page: { size: 20 } },
        search: { scope: 'task', retrievalMode: 'provider_dsl' },
      },
      {
        criteria: { context: 'tasks.discovery.public', schemaVersion: 1, page: { size: 20 } },
        search: { scope: 'task' },
        principal: { kind: 'service', id: 'forged' },
      },
    ]) {
      assert.throws(() => buildSearchDiscoveryRequest(payload), ValidationException)
    }
  })
})
