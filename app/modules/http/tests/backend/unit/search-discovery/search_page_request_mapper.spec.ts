import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildSearchPageRequest } from '#modules/http/controllers/mappers/request/search-discovery/search_page_request_mapper'

test.group('Unit | HTTP search page request mapper', () => {
  test('maps the supported search page query fields', ({ assert }) => {
    assert.deepEqual(
      buildSearchPageRequest({
        q: ' duyet ',
        type: 'comment',
        field: ' Task description ',
        cursor: ' opaque-page-2 ',
        previousCursor: ' opaque-page-1 ',
      }),
      {
        query: 'duyet',
        activeType: 'comment',
        requestedField: 'Task description',
        cursor: 'opaque-page-2',
        previousCursor: 'opaque-page-1',
      }
    )
  })

  test('preserves blank and missing optional query compatibility', ({ assert }) => {
    assert.deepEqual(buildSearchPageRequest({}), {
      query: '',
      activeType: 'all',
      requestedField: null,
      cursor: null,
      previousCursor: null,
    })
    assert.deepEqual(buildSearchPageRequest({ q: '   ', type: '', field: '   ' }), {
      query: '',
      activeType: 'all',
      requestedField: null,
      cursor: null,
      previousCursor: null,
    })
  })

  test('rejects malformed search query fields instead of changing the query', ({ assert }) => {
    for (const input of [
      { q: 42 },
      { q: [] },
      { type: 'unsupported' },
      { type: {} },
      { field: 42 },
      { field: [] },
      { cursor: 42 },
      { cursor: [] },
      { cursor: 'x'.repeat(8_193) },
      { previousCursor: 42 },
      { previousCursor: [] },
      { previousCursor: 'x'.repeat(8_193) },
    ]) {
      assert.throws(() => buildSearchPageRequest(input), ValidationException)
    }
  })
})
