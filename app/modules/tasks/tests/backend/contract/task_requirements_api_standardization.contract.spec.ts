import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import ProjectProfessionalRole from '#modules/skills/infra/models/project_professional_role'
import ProjectProfessionalRoleSkill from '#modules/skills/infra/models/project_professional_role_skill'
import ProjectSkill from '#modules/skills/infra/models/project_skill'
import { getCanonicalProficiencyLevelValue } from '#modules/skills/support/proficiency_level_catalog'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ProjectFactory,
  SkillFactory,
  TaskFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

async function getLevelId(code: string, ordinal: number): Promise<string> {
  const canonicalCode = getCanonicalProficiencyLevelValue(code, code)
  const existing = (await db
    .from('proficiency_levels')
    .where('code', canonicalCode)
    .select('id')
    .first()) as { id: string } | null

  if (existing?.id) {
    return existing.id
  }

  const scaleId = testId()
  await db.table('proficiency_scales').insert({
    id: scaleId,
    code: `task-req-scale-${canonicalCode}`,
    name: `Task Requirement Scale ${canonicalCode}`,
    version: 1,
    is_active: true,
  })

  const levelId = testId()
  await db.table('proficiency_levels').insert({
    id: levelId,
    scale_id: scaleId,
    ordinal,
    code: canonicalCode,
    display_name: canonicalCode,
    short_name: canonicalCode.slice(0, 3),
    normalized_value: (ordinal - 1) / 14,
    sort_order: ordinal,
  })

  return levelId
}

test.group('Contract | Task requirements API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('v1 task requirements index returns wrapped camelCase list without success envelope', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
    })

    const response = await client.get(`/api/v1/tasks/${task.id}/requirements`).loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as { data: unknown[]; success?: boolean }

    assert.isArray(body.data)
    assert.notProperty(body, 'success')
  })

  test('v1 task requirement versions returns wrapped camelCase list without success envelope', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
    })

    const response = await client
      .get(`/api/v1/tasks/${task.id}/requirements/versions`)
      .loginAs(owner)

    response.assertStatus(200)

    const body = response.body() as { data: unknown[]; success?: boolean }

    assert.isArray(body.data)
    assert.notProperty(body, 'success')
  })

  test('v1 task requirement role-prefill canonical path returns wrapped response and legacy alias remains deprecated', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
    })
    const aliasTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
    })

    const skill = await SkillFactory.create({
      skill_name: 'Node.js',
    })
    const juniorId = await getLevelId('junior', 2)
    const seniorId = await getLevelId('senior', 5)

    const projectSkill = await ProjectSkill.create({
      id: testId(),
      project_id: project.id,
      skill_id: skill.id,
      display_name_override: null,
      description_override: null,
      rubric_version_id: null,
      is_active: true,
      is_selectable_for_tasks: true,
      is_visible_in_project: true,
      added_by: owner.id,
    })

    const role = await ProjectProfessionalRole.create({
      id: testId(),
      project_id: project.id,
      source_template_id: null,
      code: 'backend_engineer',
      name: 'Backend Engineer',
      description: 'Role used to prefill task requirements',
      is_active: true,
      version: 1,
      created_by: owner.id,
    })

    await ProjectProfessionalRoleSkill.create({
      id: testId(),
      project_professional_role_id: role.id,
      project_skill_id: projectSkill.id,
      minimum_level_id: juniorId,
      target_level_id: seniorId,
      assessment_ceiling_level_id: seniorId,
      is_mandatory: true,
      importance: 'high',
      weight: 1.5,
      sort_order: 1,
      notes: 'Seeded by contract test',
    })

    const canonicalResponse = await client
      .post(`/api/v1/tasks/${task.id}/requirements/role-prefill`)
      .json({ projectProfessionalRoleId: role.id })
      .loginAs(owner)
    canonicalResponse.assertStatus(200)
    assert.isUndefined(canonicalResponse.header('deprecation'))

    const aliasResponse = await client
      .post(`/api/v1/tasks/${aliasTask.id}/requirements/prefill-from-role`)
      .json({ projectProfessionalRoleId: role.id })
      .loginAs(owner)
    aliasResponse.assertStatus(200)
    assert.equal(aliasResponse.header('deprecation'), 'true')
    assert.equal(
      aliasResponse.header('link'),
      '</api/v1/tasks/:taskId/requirements/role-prefill>; rel="successor-version"'
    )

    const canonicalBody = canonicalResponse.body() as { data: unknown; success?: boolean }
    const aliasBody = aliasResponse.body() as typeof canonicalBody

    assert.notProperty(canonicalBody, 'success')
    assert.deepEqual(canonicalBody, {
      data: {
        addedCount: 1,
        skippedCount: 0,
      },
    })
    assert.deepEqual(aliasBody, canonicalBody)
  })
})
