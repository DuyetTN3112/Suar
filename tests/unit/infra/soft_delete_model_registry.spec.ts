import { test } from '@japa/runner'

import Organization from '#modules/organizations/infra/models/organization'
import Project from '#modules/projects/infra/models/project'
import { resolveModelForSoftDelete } from '#modules/registry/infra/soft_delete_model_registry'
import Task from '#modules/tasks/infra/models/task'
import User from '#modules/users/infra/models/user'

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
