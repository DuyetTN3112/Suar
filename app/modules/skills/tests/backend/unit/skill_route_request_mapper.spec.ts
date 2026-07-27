import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildAddProjectSkillRequest,
  buildCreateProjectRoleRequest,
  buildProjectRoleRouteRequest,
  buildProjectRouteRequest,
  buildProjectSkillRouteRequest,
  buildUpdateProjectSkillRequest,
} from '#modules/skills/controllers/mappers/request/project-skills/skill_route_request_mapper'

function requestOf(values: Record<string, unknown>) {
  return { input: (key: string) => values[key] }
}


test.group('', () => {
  test('maps project, project-skill, and optional role-skill routes', ({ assert }) => {
    assert.deepEqual(buildProjectRouteRequest({ projectId: ' p-1 ' }), { projectId: 'p-1' })
    assert.deepEqual(buildProjectSkillRouteRequest({ projectId: 'p-1', projectSkillId: 'ps-1' }), {
      projectId: 'p-1', projectSkillId: 'ps-1',
    })
    assert.deepEqual(buildProjectRoleRouteRequest({ projectId: 'p-1', roleId: 'r-1' }), {
      projectId: 'p-1', roleId: 'r-1', roleSkillId: undefined,
    })
  })

  test('rejects wrong route types instead of coercing them with String()', ({ assert }) => {
    assert.throws(() => buildProjectRoleRouteRequest({ projectId: 1, roleId: 'r-1' }), ValidationException)
  })

  test('maps and validates skill mutation bodies without transport casts', ({ assert }) => {
    assert.deepEqual(buildAddProjectSkillRequest(requestOf({ skillId: 's-1' }), { projectId: 'p-1' }), {
      projectId: 'p-1', skillId: 's-1',
    })
    assert.deepEqual(buildCreateProjectRoleRequest(requestOf({ code: 'backend', name: 'Backend' }), { projectId: 'p-1' }), {
      projectId: 'p-1', code: 'backend', name: 'Backend',
    })
    assert.deepEqual(buildUpdateProjectSkillRequest(requestOf({ displayNameOverride: ' New ' }), {
      projectId: 'p-1', projectSkillId: 'ps-1',
    }), {
      projectId: 'p-1', projectSkillId: 'ps-1', displayNameOverride: 'New',
    })
    assert.throws(() => buildAddProjectSkillRequest(requestOf({ skillId: 42 }), { projectId: 'p-1' }), ValidationException)
  })

})
