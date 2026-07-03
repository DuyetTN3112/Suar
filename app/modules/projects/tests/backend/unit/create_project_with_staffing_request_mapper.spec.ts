import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildCreateProjectWithStaffingRequest } from '#modules/projects/controllers/mappers/request/project-context/create_project_with_staffing_request_mapper'

function requestOf(values: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    input: (key: string) => values[key],
  } as never
}


test.group('', () => {
  test('normalizes staffing arrays while preserving duplicate-user de-duplication', ({ assert }) => {
    const input = buildCreateProjectWithStaffingRequest(requestOf({
      organizationId: 'org-1',
      name: 'Project',
      initialStaffingAssignments: [
        { userId: 'user-1', templateCode: 'backend' },
        { userId: 'user-1', templateCode: 'frontend' },
      ],
    }))
    assert.deepEqual(input.initialStaffingAssignments, [{ userId: 'user-1', templateCode: 'backend' }])
  })

  test('rejects malformed staffing entries with indexed validation paths', ({ assert }) => {
    try {
      buildCreateProjectWithStaffingRequest(requestOf({
        organizationId: 'org-1',
        name: 'Project',
        initialStaffingAssignments: [{ userId: '', templateCode: 42 }],
      }))
      assert.fail('Expected malformed staffing assignment to be rejected')
    } catch (error) {
      assert.instanceOf(error, ValidationException)
      assert.deepEqual((error as ValidationException).issues.map((issue) => issue.path), [
        'initialStaffingAssignments.0.userId',
        'initialStaffingAssignments.0.templateCode',
      ])
    }
  })

})
