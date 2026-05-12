import { test } from '@japa/runner'

import Organization from '#infra/organizations/models/organization'
import Project from '#infra/projects/models/project'
import { resolveModelForSoftDelete } from '#infra/registry/soft_delete_model_registry'
import Task from '#infra/tasks/models/task'
import User from '#infra/users/models/user'

test.group('Soft delete model registry', () => {
  test('resolves registered soft-delete model keys', ({ assert }) => {
    assert.equal(resolveModelForSoftDelete('organization'), Organization)
    assert.equal(resolveModelForSoftDelete('project'), Project)
    assert.equal(resolveModelForSoftDelete('task'), Task)
    assert.equal(resolveModelForSoftDelete('user'), User)
  })

  test('rejects unknown soft-delete model keys', ({ assert }) => {
    assert.throws(
      () => resolveModelForSoftDelete('unknown_model'),
      "SoftDeleteMiddleware: model 'unknown_model' not registered"
    )
  })
})
