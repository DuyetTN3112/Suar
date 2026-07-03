import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildRoleStaffingCandidatesRequest } from '#modules/projects/controllers/mappers/request/project-members/role_staffing_candidates_request_mapper'

test.group('', () => {
  test('maps route params into the query input contract', ({ assert }) => {
    assert.deepEqual(buildRoleStaffingCandidatesRequest({ projectId: ' project-1 ', roleId: 'role-1' }), {
      project_id: 'project-1',
      role_id: 'role-1',
    })
  })

  test('rejects missing or non-string route params with canonical paths', ({ assert }) => {
    try {
      buildRoleStaffingCandidatesRequest({ projectId: '', roleId: 42 })
      assert.fail('Expected route parameters to be rejected')
    } catch (error) {
      assert.instanceOf(error, ValidationException)
      assert.deepEqual((error as ValidationException).issues.map((issue) => issue.path), ['projectId'])
    }
  })

})
