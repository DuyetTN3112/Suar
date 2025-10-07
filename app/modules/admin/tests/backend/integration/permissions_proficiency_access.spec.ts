import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { makeSystemAdminActionContext } from '#modules/admin/actions/admin_action_context'
import GetPermissionMatrixQuery from '#modules/admin/actions/permissions/queries/get_permission_matrix_query'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'

async function countRows(table: string): Promise<number> {
  const row = (await db.from(table).count('* as total').first()) as
    | { total?: number | string }
    | undefined

  return Number(row?.total ?? 0)
}

test.group('Integration | Admin permissions and proficiency access', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('permission matrix query returns system, organization, and project catalogs', async ({
    assert,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()

    const result = await new GetPermissionMatrixQuery(
      makeSystemAdminActionContext(superadmin.id)
    ).handle()

    assert.equal(result.summary.totalRoleGroups, 3)
    assert.isAtLeast(result.summary.totalRoles, 10)
    assert.isAtLeast(result.summary.totalUniquePermissions, 20)
    assert.isTrue(
      result.systemRoles.some(
        (role) =>
          role.code === 'system_admin' &&
          role.permissions.some((permission) => permission.key === 'can_manage_users')
      )
    )
    assert.isTrue(
      result.organizationRoles.some(
        (role) =>
          role.code === 'org_owner' &&
          role.permissions.some((permission) => permission.key === 'can_delete_organization')
      )
    )
    assert.isTrue(
      result.projectRoles.some(
        (role) =>
          role.code === 'project_manager' &&
          role.permissions.some((permission) => permission.key === 'can_assign_task')
      )
    )
    assert.isTrue(
      result.catalogs.system.some((permission) => permission.key === 'can_manage_users')
    )
    assert.isTrue(
      result.catalogs.organization.some((permission) => permission.key === 'can_manage_members')
    )
    assert.isTrue(
      result.catalogs.project.some((permission) => permission.key === 'can_create_task')
    )
  })

  test('permission admin route allows system admin and denies non-admins without catalog leakage', async ({
    assert,
    client,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const regularUser = await UserFactory.create({ system_role: 'registered_user' })

    const adminResponse = await client.get('/admin/permissions').loginAs(superadmin)
    const regularResponse = await client.get('/admin/permissions').loginAs(regularUser)
    const guestResponse = await client.get('/admin/permissions').redirects(0)

    adminResponse.assertStatus(200)
    assert.include(adminResponse.text(), 'can_manage_users')

    regularResponse.assertStatus(403)
    guestResponse.assertStatus(401)

    for (const response of [regularResponse, guestResponse]) {
      assert.notInclude(response.text(), 'can_manage_users')
      assert.notInclude(response.text(), 'can_delete_organization')
      assert.notInclude(response.text(), 'can_assign_task')
      assert.notInclude(response.text(), 'E_INTERNAL_ERROR')
    }
  })

  test('admin proficiency and rubric surfaces stay read-only; mutation verbs do not alter rubric data', async ({
    assert,
    client,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const regularUser = await UserFactory.create({ system_role: 'registered_user' })
    const beforeVersions = await countRows('skill_rubric_versions')
    const beforeLevels = await countRows('skill_rubric_levels')

    const adminMutationResponses = [
      await client.post('/admin/proficiency').loginAs(superadmin).form({ name: 'Not allowed' }),
      await client
        .put('/admin/proficiency/rubrics/not-a-skill')
        .loginAs(superadmin)
        .json({ levels: [] }),
      await client
        .patch('/admin/proficiency/rubrics/not-a-skill')
        .loginAs(superadmin)
        .json({ levels: [] }),
      await client.delete('/admin/proficiency/rubrics/not-a-skill').loginAs(superadmin),
    ]

    for (const response of adminMutationResponses) {
      assert.include([404, 405], response.status())
      assert.notInclude(response.text(), 'E_INTERNAL_ERROR')
    }

    const nonAdminMutationResponse = await client
      .put('/admin/proficiency/rubrics/not-a-skill')
      .loginAs(regularUser)
      .json({ levels: [] })

    assert.include([403, 404, 405], nonAdminMutationResponse.status())
    assert.notInclude(nonAdminMutationResponse.text(), 'E_INTERNAL_ERROR')
    assert.equal(await countRows('skill_rubric_versions'), beforeVersions)
    assert.equal(await countRows('skill_rubric_levels'), beforeLevels)
  })
})
