import { test } from '@japa/runner'

import { buildCustomSystemRoleRouteRequest } from '#modules/admin/permissions/controllers/mappers/request/permissions/custom_system_role_request_mapper'
import {
  buildCreateSkillRubricDraftRequest,
  buildPublishSkillRubricRequest,
  buildUpsertSkillRubricLevelRequest,
} from '#modules/admin/proficiency/controllers/mappers/request/proficiency/mutate_skill_rubric_request_mapper'
import { buildResolveFlaggedReviewRequest } from '#modules/admin/reviews/controllers/mappers/request/reviews/resolve_flagged_review_request_mapper'
import {
  buildSuspendUserRequest,
  buildUpdateUserRoleRequest,
} from '#modules/admin/users/controllers/mappers/request/users/admin_user_mutation_request_mapper'
import ValidationException from '#modules/errors/public_contracts/validation_exception'

test.group('Admin user mutation request mappers', () => {
  test('maps the suspend route and derives the action from the route URL', ({ assert }) => {
    assert.deepEqual(
      buildSuspendUserRequest({ userId: 'user-1' }, '/admin/users/user-1/activate'),
      { userId: 'user-1', action: 'activate' }
    )
  })

  test('rejects a non-string system role', ({ assert }) => {
    assert.throws(
      () => buildUpdateUserRoleRequest({ userId: 'user-1' }, { system_role: 7 }),
      ValidationException
    )
  })

  test('maps only a supported system role', ({ assert }) => {
    assert.deepEqual(
      buildUpdateUserRoleRequest({ userId: 'user-1' }, { system_role: 'system_admin' }),
      { userId: 'user-1', systemRole: 'system_admin' }
    )
  })
})

test.group('Admin custom system role request mapper', () => {
  test('maps a valid role route parameter', ({ assert }) => {
    assert.deepEqual(buildCustomSystemRoleRouteRequest({ id: 'role-1' }), { roleId: 'role-1' })
  })

  test('rejects a non-string role route parameter', ({ assert }) => {
    assert.throws(() => buildCustomSystemRoleRouteRequest({ id: 42 }), ValidationException)
  })
})

test.group('Admin flagged review request mapper', () => {
  test('trims notes and applies the documented default action', ({ assert }) => {
    assert.deepEqual(
      buildResolveFlaggedReviewRequest(
        { flaggedReviewId: 'review-1' },
        { notes: '  Needs human review  ' }
      ),
      { flaggedReviewId: 'review-1', action: 'confirm', notes: 'Needs human review' }
    )
  })

  test('rejects non-string notes rather than stringifying them', ({ assert }) => {
    assert.throws(
      () =>
        buildResolveFlaggedReviewRequest(
          { flaggedReviewId: 'review-1' },
          { action: 'dismiss', notes: 123 }
        ),
      ValidationException
    )
  })
})

test.group('Admin proficiency mutation request mapper', () => {
  test('maps draft aliases and route params', async ({ assert }) => {
    assert.deepEqual(
      await buildCreateSkillRubricDraftRequest({ skillId: 'skill-1' }, { change_summary: 'New rubric' }),
      { skillId: 'skill-1', changeSummary: 'New rubric' }
    )
  })

  test('rejects an invalid level payload type', async ({ assert }) => {
    await assert.rejects(
      () => buildUpsertSkillRubricLevelRequest({ versionId: 'version-1', levelId: 'level-1' }, { summary: 42 }),
      ValidationException
    )
  })

  test('maps publish route params without String coercion', ({ assert }) => {
    assert.deepEqual(buildPublishSkillRubricRequest({ versionId: 'version-1' }), {
      versionId: 'version-1',
    })
  })
})
