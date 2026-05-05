import { test } from '@japa/runner'

import { buildAccomplishmentUnpublicationRequest } from '#modules/accomplishments/controllers/mappers/request/publication/accomplishment_unpublication_request_mapper'
import ValidationException from '#modules/errors/public_contracts/validation_exception'

test.group('Unit | Accomplishment unpublication request mapper', () => {
  test('maps the explicit owner confirmation contract without coercing values', ({ assert }) => {
    const result = buildAccomplishmentUnpublicationRequest({
      projectionId: '10000000-0000-4000-8000-000000000001',
      publicationVersion: 3,
      confirmed: true,
    })

    assert.deepEqual(result, {
      projectionId: '10000000-0000-4000-8000-000000000001',
      publicationVersion: 3,
      confirmed: true,
    })
  })

  test('rejects missing or invalid projection identity, version and confirmation fields', ({
    assert,
  }) => {
    const invalidRequests: unknown[] = [
      { publicationVersion: 1, confirmed: true },
      { projectionId: '', publicationVersion: 1, confirmed: true },
      { projectionId: 'projection-1', publicationVersion: 0, confirmed: true },
      { projectionId: 'projection-1', publicationVersion: 1.5, confirmed: true },
      { projectionId: 'projection-1', publicationVersion: 1, confirmed: 'true' },
    ]

    for (const request of invalidRequests) {
      assert.throws(
        () => buildAccomplishmentUnpublicationRequest(request),
        ValidationException
      )
    }
  })
})
