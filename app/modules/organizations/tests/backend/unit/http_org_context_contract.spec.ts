import type { HttpContext } from '@adonisjs/core/http'
import { test } from '@japa/runner'

import { readHttpOrgContextContract } from '#modules/organizations/access/boundary/http_org_context_contract'

function toHttpContext(value: unknown): HttpContext {
  return value as HttpContext
}

test.group('Unit | HTTP org context contract', () => {
  test('treats routes with requireOrg middleware as org-required', ({ assert }) => {
    const ctx = {
      route: {
        middleware: {
          all: () =>
            new Set([
              { type: 'named', name: 'auth' },
              { type: 'named', name: 'requireOrg' },
            ]),
        },
      },
    }

    assert.equal(readHttpOrgContextContract(toHttpContext(ctx)), 'required')
  })

  test('treats routes without requireOrg middleware as org-optional', ({ assert }) => {
    const ctx = {
      route: {
        middleware: {
          all: () =>
            new Set([
              { type: 'named', name: 'auth' },
              { type: 'named', name: 'bindHttpTransport' },
            ]),
        },
      },
    }

    assert.equal(readHttpOrgContextContract(toHttpContext(ctx)), 'optional')
  })

  test('treats missing route metadata as org-optional fallback', ({ assert }) => {
    assert.equal(readHttpOrgContextContract(toHttpContext({})), 'optional')
  })
})
