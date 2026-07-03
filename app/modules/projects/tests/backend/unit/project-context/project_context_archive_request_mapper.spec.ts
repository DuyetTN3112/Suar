import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildWorkPackageArchiveRequest } from '#modules/projects/controllers/mappers/request/project-context/project_context_request_mapper'

test.group('', () => {
  test('maps an optional expected active version', ({ assert }) => {
    assert.deepEqual(buildWorkPackageArchiveRequest({ expectedActiveVersionId: 'version-1' }), {
      expectedActiveVersionId: 'version-1',
    })
    assert.deepEqual(buildWorkPackageArchiveRequest({}), { expectedActiveVersionId: null })
  })

  test('rejects a malformed request body', ({ assert }) => {
    assert.throws(() => buildWorkPackageArchiveRequest({ expectedActiveVersionId: 42 }), ValidationException)
  })

})
