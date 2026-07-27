import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  readAddProjectRoleSkillInput,
  readUpdateProjectRoleSkillInput,
} from '#modules/skills/controllers/mappers/request/project-roles/project_role_skill_request'

function requestOf(values: Record<string, unknown>) {
  const request: { input(key: string): unknown } = { input: (key: string) => values[key] }
  return request
}


test.group('', () => {
  test('maps add input and preserves numeric form values as numbers', ({ assert }) => {
    assert.deepEqual(
      readAddProjectRoleSkillInput(
        requestOf({
          projectSkillId: 'ps-1',
          minimumLevelId: ' min-1 ',
          isMandatory: true,
          importance: 'high',
          weight: '1.5',
          sort_order: '2',
          notes: ' useful ',
        }),
        'role-1'
      ),
      {
        projectProfessionalRoleId: 'role-1',
        projectSkillId: 'ps-1',
        minimumLevelId: 'min-1',
        targetLevelId: null,
        assessmentCeilingLevelId: null,
        isMandatory: true,
        importance: 'high',
        weight: 1.5,
        sortOrder: 2,
        notes: 'useful',
      }
    )
  })

  test('rejects malformed role skill bodies as canonical validation errors', ({ assert }) => {
    try {
      readAddProjectRoleSkillInput(
        requestOf({ projectSkillId: 42, isMandatory: 'true', importance: 'urgent', weight: 'NaN' }),
        'role-1'
      )
      assert.fail('expected validation exception')
    } catch (error) {
      assert.instanceOf(error, ValidationException)
      assert.deepEqual(
        (error as ValidationException).issues.map((issue) => issue.path),
        ['projectSkillId', 'isMandatory', 'importance', 'weight']
      )
    }
  })

  test('allows explicit null level and notes overrides on update', ({ assert }) => {
    assert.deepEqual(
      readUpdateProjectRoleSkillInput(
        requestOf({ minimum_level_id: null, notes: null, sortOrder: 3 }),
        'role-skill-1'
      ),
      { projectRoleSkillId: 'role-skill-1', minimumLevelId: null, notes: null, sortOrder: 3 }
    )
  })

})
