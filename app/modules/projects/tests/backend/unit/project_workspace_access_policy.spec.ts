import { test } from '@japa/runner'

import { canEnterProjectWorkspace } from '#modules/projects/domain/project_permission_policy'
import { ProjectRole } from '#modules/projects/public_contracts/project_constants'

const BASE_CONTEXT = {
  actorId: 'actor-1',
  actorHasOrganizationProjectAccess: false,
  actorProjectRole: null as string | null,
  projectCreatorId: 'creator-1',
  projectManagerId: 'manager-1',
  projectOwnerId: 'owner-1',
}

test.group('Project workspace access policy', () => {
  test('denies a regular project member without organization-wide project access', ({
    assert,
  }) => {
    const decision = canEnterProjectWorkspace({
      ...BASE_CONTEXT,
      actorProjectRole: ProjectRole.MEMBER,
    })

    assert.isFalse(decision.allowed)
    if (decision.allowed) {
      assert.fail('expected workspace access to be denied')
      return
    }
    assert.equal(decision.code, 'FORBIDDEN')
  })

  test('allows roles that can view the shared project task surface', ({ assert }) => {
    for (const actorProjectRole of [
      ProjectRole.OWNER,
      ProjectRole.MANAGER,
      ProjectRole.VIEWER,
    ]) {
      assert.isTrue(
        canEnterProjectWorkspace({
          ...BASE_CONTEXT,
          actorProjectRole,
        }).allowed
      )
    }
  })

  test('allows organization project governance and legacy project stakeholders', ({
    assert,
  }) => {
    assert.isTrue(
      canEnterProjectWorkspace({
        ...BASE_CONTEXT,
        actorHasOrganizationProjectAccess: true,
      }).allowed
    )

    for (const actorId of ['creator-1', 'manager-1', 'owner-1']) {
      assert.isTrue(
        canEnterProjectWorkspace({
          ...BASE_CONTEXT,
          actorId,
        }).allowed
      )
    }
  })
})
