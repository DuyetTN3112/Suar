import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildAllOrganizationsPageRequest,
  buildApiListOrganizationsRequest,
  buildShowOrganizationPageRequest,
} from '#modules/organizations/controllers/mappers/request/directory/organization_directory_read_request_mapper'

interface RequestLike {
  input(key: string, defaultValue?: unknown): unknown
}

function requestWithValues(values: Record<string, unknown>): RequestLike {
  return {
    input: (key: string, defaultValue?: unknown) =>
      Object.prototype.hasOwnProperty.call(values, key) ? values[key] : defaultValue,
  }
}

test.group('Unit | Organization directory read request mapper', () => {
  test('maps API list query, show route, and all-organizations filters', ({ assert }) => {
    assert.deepEqual(
      buildApiListOrganizationsRequest(requestWithValues({ q: ' org search ' })),
      { q: 'org search' }
    )

    assert.deepEqual(
      buildShowOrganizationPageRequest(
        { organizationId: ' org-1 ' },
        requestWithValues({ page: '2', per_page: '30' })
      ),
      { organizationId: 'org-1', page: 2, perPage: 30 }
    )

    assert.deepEqual(
      buildShowOrganizationPageRequest(
        { organizationId: ' org-1 ' },
        requestWithValues({ limit: '40' })
      ),
      { organizationId: 'org-1', perPage: 40 }
    )

    assert.deepEqual(
      buildAllOrganizationsPageRequest(requestWithValues({ page: '3', search: ' alpha ' })),
      { page: 3, perPage: 12, search: 'alpha' }
    )
  })

  test('rejects invalid route ids, query lengths, and pagination', ({ assert }) => {
    const tooLong = 'x'.repeat(201)
    const cases: Array<() => unknown> = [
      () => buildApiListOrganizationsRequest(requestWithValues({ q: tooLong })),
      () => buildApiListOrganizationsRequest(requestWithValues({ q: ['bad'] })),
      () =>
        buildShowOrganizationPageRequest(
          { organizationId: '   ' },
          requestWithValues({})
        ),
      () =>
        buildShowOrganizationPageRequest(
          { organizationId: 'org-1' },
          requestWithValues({ page: '0' })
        ),
      () =>
        buildShowOrganizationPageRequest(
          { organizationId: 'org-1' },
          requestWithValues({ perPage: 'many' })
        ),
      () =>
        buildShowOrganizationPageRequest(
          { organizationId: 'org-1' },
          requestWithValues({ per_page: '101' })
        ),
      () =>
        buildShowOrganizationPageRequest(
          { organizationId: 'org-1' },
          requestWithValues({ limit: [] })
        ),
      () => buildAllOrganizationsPageRequest(requestWithValues({ search: ['bad'] })),
      () => buildAllOrganizationsPageRequest(requestWithValues({ search: tooLong })),
    ]

    for (const run of cases) {
      assert.throws(run, ValidationException)
    }
  })
})
