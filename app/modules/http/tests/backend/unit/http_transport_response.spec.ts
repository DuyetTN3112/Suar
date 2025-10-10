import type { HttpContext } from '@adonisjs/core/http'
import { test } from '@japa/runner'

import { respondByTransport } from '#modules/http/boundary/http_transport_response'

function toRequestContext(
  value: unknown
): Pick<HttpContext, 'request'> {
  return value as Pick<HttpContext, 'request'>
}

test.group('HTTP transport response', () => {
  test('uses api branch for API transports', ({ assert }) => {
    const calls = {
      api: 0,
      page: 0,
    }

    const result = respondByTransport(
      toRequestContext({
        request: {
          url: () => '/api/organizations/switch',
          header: () => null,
          accepts: () => 'json',
        },
      }),
      {
        api: () => {
          calls.api += 1
          return 'api'
        },
        page: () => {
          calls.page += 1
          return 'page'
        },
      }
    )

    assert.equal(result, 'api')
    assert.deepEqual(calls, {
      api: 1,
      page: 0,
    })
  })

  test('uses page branch for page transports', ({ assert }) => {
    const calls = {
      api: 0,
      page: 0,
    }

    const result = respondByTransport(
      toRequestContext({
        request: {
          url: () => '/organizations/switch/org_1',
          header: () => 'true',
          accepts: () => 'html',
        },
      }),
      {
        api: () => {
          calls.api += 1
          return 'api'
        },
        page: () => {
          calls.page += 1
          return 'page'
        },
      }
    )

    assert.equal(result, 'page')
    assert.deepEqual(calls, {
      api: 0,
      page: 1,
    })
  })
})
