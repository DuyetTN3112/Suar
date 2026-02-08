import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import ProjectProfessionalRole from '#modules/skills/infra/models/project_professional_role'
import ProjectProfessionalRoleSkill from '#modules/skills/infra/models/project_professional_role_skill'
import ProjectSkill from '#modules/skills/infra/models/project_skill'
import { getCanonicalProficiencyLevelValue } from '#modules/skills/public_contracts/proficiency_level_catalog'
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
    const skill = await SkillFactory.create({
      skill_name: 'Explicit Projection Skill',
      skill_code: `explicit-${Date.now()}`,
      category_code: 'technology',
    })
    await db
      .from('skills')
      .where('id', skill.id)
      .update({ icon_url: '/icons/explicit-projection.svg' })
    const minimumLevelId = await getLevelId('l4', 4)
    const targetLevelId = await getLevelId('l6', 6)
    const requirementId = testId()
    await db.table('task_required_skills').insert({
      id: requirementId,
      task_id: task.id,
      skill_id: skill.id,
      project_skill_id: null,
      source_project_professional_role_id: null,
      source_role_skill_id: null,
      minimum_level_id: minimumLevelId,
      target_level_id: targetLevelId,
      assessment_ceiling_level_id: null,
      rubric_version_id: null,
      required_public_proficiency_code: 'l4',
      proficiency_level_id: null,
      is_mandatory: true,
      importance: 'high',
      weight: 2,
      requirement_source: 'manual',
      requirement_notes: 'Explicit public projection',
    })

    const response = await client.get(`/api/v1/tasks/${task.id}/requirements`).loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as { data: unknown[]; success?: boolean }

    assert.isArray(body.data)
    assert.notProperty(body, 'success')
    assert.lengthOf(body.data, 1)

    const requirement = body.data[0] as Record<string, unknown>
    assert.sameMembers(Object.keys(requirement), [
      'id',
      'taskId',
      'skillId',
      'projectSkillId',
      'sourceProjectProfessionalRoleId',
      'sourceRoleSkillId',
      'minimumLevelId',
      'targetLevelId',
      'assessmentCeilingLevelId',
      'rubricVersionId',
      'requiredPublicProficiencyCode',
      'proficiencyLevelId',
      'isMandatory',
      'importance',
      'weight',
      'requirementSource',
      'requirementNotes',
      'createdAt',
      'skill',
      'minimumLevel',
      'targetLevel',
      'assessmentCeilingLevel',
    ])
    assert.deepInclude(requirement, {
      id: requirementId,
      taskId: task.id,
      skillId: skill.id,
      projectSkillId: null,
      rubricVersionId: null,
      requiredPublicProficiencyCode: 'l4',
      isMandatory: true,
      importance: 'high',
      weight: 2,
      requirementSource: 'manual',
      requirementNotes: 'Explicit public projection',
      skill: {
        id: skill.id,
        skillName: 'Explicit Projection Skill',
        skillCode: skill.skill_code,
        categoryCode: 'technology',
        iconUrl: '/icons/explicit-projection.svg',
      },
    })
    assert.deepInclude(requirement['minimumLevel'], {
      id: minimumLevelId,
      code: 'l4',
    })
    assert.deepInclude(requirement['targetLevel'], {
      id: targetLevelId,
      code: 'l6',
    })
    assert.isNumber((requirement['minimumLevel'] as { ordinal: unknown }).ordinal)
    assert.isNumber((requirement['targetLevel'] as { ordinal: unknown }).ordinal)
    assert.isNull(requirement['assessmentCeilingLevel'])
    assert.notProperty(requirement, 'projectSkill')
    assert.notProperty(requirement, 'rubricVersion')
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
