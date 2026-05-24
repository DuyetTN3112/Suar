import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { AuthorizationAdminCustomSystemRoleAdapter } from '#composition/adapters/authorization/authorization_admin_custom_system_role_adapter'
import { makeSystemAdminActionContext } from '#modules/admin/permissions/actions/action_context'
import GetPermissionMatrixQuery from '#modules/admin/permissions/actions/queries/permissions/get_permission_matrix_query'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, SkillFactory, UserFactory } from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

async function countRows(table: string): Promise<number> {
  const row = (await db.from(table).count('* as total').first()) as
    | { total?: number | string }
    | undefined

  return Number(row?.total ?? 0)
}

async function getActiveScaleLevelIds(): Promise<string[]> {
  const scale = (await db
    .from('proficiency_scales')
    .where('is_active', true)
    .orderByRaw("case when code = 'system_default' then 0 else 1 end")
    .orderBy('version', 'desc')
    .orderBy('updated_at', 'desc')
    .select('id')
    .first()) as { id: string } | null

  if (scale?.id) {
    const existingLevels = (await db
      .from('proficiency_levels')
      .where('scale_id', scale.id)
      .orderBy('ordinal', 'asc')
      .select('id')) as Array<{ id: string }>

    if (existingLevels.length > 0) {
      return existingLevels.map((level) => level.id)
    }
  }

  const scaleId = testId()
  await db.table('proficiency_scales').insert({
    id: scaleId,
    code: `admin-rubric-scale-${scaleId.slice(0, 8)}`,
    name: 'Admin Rubric Test Scale',
    version: 1,
    is_active: true,
  })

  const levels = [1, 2, 3].map((ordinal) => ({
    id: testId(),
    scale_id: scaleId,
    ordinal,
    code: `l${ordinal}`,
    display_name: `L${ordinal}`,
    short_name: `L${ordinal}`,
    normalized_value: ordinal / 10,
    sort_order: ordinal,
  }))

  await db.table('proficiency_levels').insert(levels)
  return levels.map((level) => level.id)
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
      makeSystemAdminActionContext(superadmin.id),
      new AuthorizationAdminCustomSystemRoleAdapter()
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

    const adminResponse = await client
      .get('/admin/permissions')
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')
      .loginAs(superadmin)
    const regularResponse = await client.get('/admin/permissions').loginAs(regularUser)
    const guestResponse = await client.get('/admin/permissions').redirects(0)

    adminResponse.assertStatus(200)
    assert.include(adminResponse.text(), 'can_manage_users')

    assert.include([401, 403], regularResponse.status())
    guestResponse.assertStatus(401)

    for (const response of [regularResponse, guestResponse]) {
      assert.notInclude(response.text(), 'can_manage_users')
      assert.notInclude(response.text(), 'can_delete_organization')
      assert.notInclude(response.text(), 'can_assign_task')
      assert.notInclude(response.text(), 'E_INTERNAL_ERROR')
    }
  })

  test('system admin reads the global proficiency catalog without an organization context', async ({
    assert,
    client,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()

    const response = await client
      .get('/admin/proficiency')
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')
      .loginAs(superadmin)

    response.assertStatus(200)
    assert.notInclude(response.text(), 'Vui lòng chọn organization')
  })

  test('admin proficiency rubric mutations require system admin access', async ({
    assert,
    client,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const regularUser = await UserFactory.create({ system_role: 'registered_user' })
    const skill = await SkillFactory.create({ skill_code: `admin-rubric-${Date.now()}` })

    const denied = await client
      .post(`/admin/proficiency/rubrics/${skill.id}/drafts`)
      .loginAs(regularUser)
      .header('accept', 'application/json')
      .json({ changeSummary: 'Should not be created' })

    assert.include([401, 403], denied.status())
    assert.equal(
      await db.from('skill_rubric_versions').where('skill_id', skill.id).count('* as total').first()
        .then((row) => Number((row as { total?: string | number } | null)?.total ?? 0)),
      0
    )

    const created = await client
      .post(`/admin/proficiency/rubrics/${skill.id}/drafts`)
      .loginAs(superadmin)
      .header('accept', 'application/json')
      .json({ changeSummary: 'Initial admin draft' })

    created.assertStatus(201)
    assert.equal(await db.from('skill_rubric_versions').where('skill_id', skill.id).count('* as total').first()
      .then((row) => Number((row as { total?: string | number } | null)?.total ?? 0)), 1)
  })

  test('system admin can create, edit, and publish skill rubric drafts', async ({
    assert,
    client,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const skill = await SkillFactory.create({ skill_code: `publish-rubric-${Date.now()}` })
    const levelIds = await getActiveScaleLevelIds()
    const beforeVersions = await countRows('skill_rubric_versions')
    const beforeLevels = await countRows('skill_rubric_levels')

    const draftResponse = await client
      .post(`/admin/proficiency/rubrics/${skill.id}/drafts`)
      .loginAs(superadmin)
      .header('accept', 'application/json')
      .json({ changeSummary: 'Admin editable draft' })

    draftResponse.assertStatus(201)
    const draft = draftResponse.body() as { data: { id: string; status: string } }
    assert.equal(draft.data.status, 'draft')

    const incompletePublish = await client
      .post(`/admin/proficiency/rubrics/versions/${draft.data.id}/publish`)
      .loginAs(superadmin)
      .header('accept', 'application/json')
      .json({})

    incompletePublish.assertStatus(422)

    for (const [index, levelId] of levelIds.entries()) {
      const levelResponse = await client
        .put(`/admin/proficiency/rubrics/versions/${draft.data.id}/levels/${levelId}`)
        .loginAs(superadmin)
        .header('accept', 'application/json')
        .json({
          summary: `Level ${index + 1} calibrated by admin`,
          knowledgeExpectations: [`Knowledge ${index + 1}`],
          observableBehaviors: [`Behavior ${index + 1}`],
          evidenceGuidance: `Evidence ${index + 1}`,
      })

      levelResponse.assertStatus(200)
    }

    const publishResponse = await client
      .post(`/admin/proficiency/rubrics/versions/${draft.data.id}/publish`)
      .loginAs(superadmin)
      .header('accept', 'application/json')
      .json({})

    publishResponse.assertStatus(200)
    const published = publishResponse.body() as { data: { id: string; status: string } }
    assert.equal(published.data.id, draft.data.id)
    assert.equal(published.data.status, 'published')
    assert.equal(await countRows('skill_rubric_versions'), beforeVersions + 1)
    assert.equal(await countRows('skill_rubric_levels'), beforeLevels + levelIds.length)
  })
})
