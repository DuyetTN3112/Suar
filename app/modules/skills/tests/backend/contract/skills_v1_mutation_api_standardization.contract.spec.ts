import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import ProfessionalRoleTemplate from '#modules/skills/infra/models/professional_role_template'
import ProfessionalRoleTemplateSkill from '#modules/skills/infra/models/professional_role_template_skill'
import ProjectProfessionalRole from '#modules/skills/infra/models/project_professional_role'
import ProjectProfessionalRoleSkill from '#modules/skills/infra/models/project_professional_role_skill'
import ProjectSkill from '#modules/skills/infra/models/project_skill'
import {
  cleanupTestData,
  OrganizationFactory,
  ProjectFactory,
  SkillFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

async function getOrCreateLevelId(code: string, ordinal: number): Promise<string> {
  const existing = (await db
    .from('proficiency_levels')
    .where('code', code)
    .select('id')
    .first()) as { id: string } | null

  if (existing?.id) {
    return existing.id
  }

  const scaleId = testId()
  await db.table('proficiency_scales').insert({
    id: scaleId,
    code: `skills-mutation-${code}`,
    name: `Skills Mutation ${code}`,
    version: 1,
    is_active: true,
  })

  const levelId = testId()
  await db.table('proficiency_levels').insert({
    id: levelId,
    scale_id: scaleId,
    ordinal,
    code,
    display_name: code,
    short_name: code.slice(0, 3),
    normalized_value: ordinal / 10,
    sort_order: ordinal,
  })

  return levelId
}

async function createLevelsForSameScale(
  entries: Array<{ code: string; ordinal: number }>
): Promise<Record<string, string>> {
  const scaleId = testId()
  await db.table('proficiency_scales').insert({
    id: scaleId,
    code: `skills-mutation-scale-${scaleId.slice(0, 8)}`,
    name: `Skills Mutation Scale ${scaleId.slice(0, 8)}`,
    version: 1,
    is_active: true,
  })

  const ids: Record<string, string> = {}
  for (const entry of entries) {
    const levelId = testId()
    ids[entry.code] = levelId
    await db.table('proficiency_levels').insert({
      id: levelId,
      scale_id: scaleId,
      ordinal: entry.ordinal,
      code: `${entry.code}_${scaleId.slice(0, 4)}`,
      display_name: entry.code,
      short_name: entry.code.slice(0, 3),
      normalized_value: entry.ordinal / 10,
      sort_order: entry.ordinal,
    })
  }

  return ids
}

test.group('Contract | Skills v1 mutation API standardization', (group) => {
  group.each.teardown(() => cleanupTestData())

  test('v1 add/update/delete project skill endpoints use canonical contract', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const skill = await SkillFactory.create({
      skill_name: 'Node.js',
      category_code: 'technology',
    })

    const createResponse = await client
      .post(`/api/v1/projects/${project.id}/skills`)
      .loginAs(owner)
      .json({
        skillId: skill.id,
      })

    createResponse.assertStatus(201)

    const createBody = createResponse.body() as {
      data: {
        id: string
        projectId: string
        skillId: string
        isActive: boolean
        isSelectableForTasks: boolean
      }
    }

    assert.notProperty(createBody, 'success')
    assert.equal(createBody.data.projectId, project.id)
    assert.equal(createBody.data.skillId, skill.id)
    assert.isTrue(createBody.data.isActive)
    assert.notProperty(createBody.data, 'project_id')

    const updateResponse = await client
      .put(`/api/v1/projects/${project.id}/skills/${createBody.data.id}`)
      .loginAs(owner)
      .json({
        displayNameOverride: 'Node Platform',
        descriptionOverride: 'Project runtime baseline',
      })

    updateResponse.assertStatus(200)

    const updateBody = updateResponse.body() as {
      data: {
        id: string
        displayNameOverride: string | null
        descriptionOverride: string | null
      }
    }

    assert.equal(updateBody.data.displayNameOverride, 'Node Platform')
    assert.equal(updateBody.data.descriptionOverride, 'Project runtime baseline')
    assert.notProperty(updateBody.data, 'display_name_override')

    const deleteResponse = await client
      .delete(`/api/v1/projects/${project.id}/skills/${createBody.data.id}`)
      .loginAs(owner)

    deleteResponse.assertStatus(204)

    const persisted = await ProjectSkill.query().where('id', createBody.data.id).firstOrFail()
    assert.isFalse(persisted.is_active)
  })

  test('v1 create project role endpoint returns wrapped camelCase payload', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    const response = await client
      .post(`/api/v1/projects/${project.id}/professional-roles`)
      .loginAs(owner)
      .json({
        code: 'platform_lead',
        name: 'Platform Lead',
        description: 'Owns platform delivery',
      })

    response.assertStatus(201)

    const body = response.body() as {
      data: {
        id: string
        projectId: string
        sourceTemplateId: string | null
        isActive: boolean
        createdBy: string | null
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.projectId, project.id)
    assert.isNull(body.data.sourceTemplateId)
    assert.isTrue(body.data.isActive)
    assert.equal(body.data.createdBy, owner.id)
  })

  test('v1 create/update/delete role skill endpoints use canonical contract', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const skill = await SkillFactory.create({
      skill_name: 'System Design',
      category_code: 'engineering',
    })
    const levelIds = await createLevelsForSameScale([
      { code: 'junior', ordinal: 2 },
      { code: 'senior', ordinal: 5 },
    ])
    const juniorId = levelIds['junior']
    const seniorId = levelIds['senior']

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
      code: 'architect',
      name: 'Architect',
      description: null,
      is_active: true,
      version: 1,
      created_by: owner.id,
    })

    const createResponse = await client
      .post(`/api/v1/projects/${project.id}/professional-roles/${role.id}/skills`)
      .loginAs(owner)
      .json({
        projectSkillId: projectSkill.id,
        minimumLevelId: juniorId,
        targetLevelId: seniorId,
        assessmentCeilingLevelId: seniorId,
        isMandatory: true,
        importance: 'critical',
        weight: 2,
        sortOrder: 3,
      })

    createResponse.assertStatus(201)

    const createBody = createResponse.body() as {
      data: {
        id: string
        projectProfessionalRoleId: string
        projectSkillId: string
        minimumLevelId: string | null
        targetLevelId: string | null
        assessmentCeilingLevelId: string | null
        isMandatory: boolean
        sortOrder: number
      }
    }

    assert.equal(createBody.data.projectProfessionalRoleId, role.id)
    assert.equal(createBody.data.projectSkillId, projectSkill.id)
    assert.equal(createBody.data.minimumLevelId, juniorId)
    assert.equal(createBody.data.targetLevelId, seniorId)
    assert.isTrue(createBody.data.isMandatory)
    assert.equal(createBody.data.sortOrder, 3)
    assert.notProperty(createBody.data, 'project_skill_id')

    const updateResponse = await client
      .put(
        `/api/v1/projects/${project.id}/professional-roles/${role.id}/skills/${createBody.data.id}`
      )
      .loginAs(owner)
      .json({
        minimumLevelId: seniorId,
        targetLevelId: seniorId,
        assessmentCeilingLevelId: seniorId,
        isMandatory: false,
        importance: 'high',
        weight: 1.5,
        sortOrder: 5,
      })

    updateResponse.assertStatus(200)

    const updateBody = updateResponse.body() as {
      data: {
        minimumLevelId: string | null
        isMandatory: boolean
        sortOrder: number
      }
    }

    assert.equal(updateBody.data.minimumLevelId, seniorId)
    assert.isFalse(updateBody.data.isMandatory)
    assert.equal(updateBody.data.sortOrder, 5)

    const deleteResponse = await client
      .delete(
        `/api/v1/projects/${project.id}/professional-roles/${role.id}/skills/${createBody.data.id}`
      )
      .loginAs(owner)

    deleteResponse.assertStatus(204)

    const deleted = await ProjectProfessionalRoleSkill.query()
      .where('id', createBody.data.id)
      .first()
    assert.isNull(deleted)
  })

  test('v1 deactivate role endpoint returns 204 and deactivates role', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const templateCode = `role_template_${testId().slice(0, 8)}`
    const template = await ProfessionalRoleTemplate.create({
      id: testId(),
      code: templateCode,
      name: 'Role Template',
      description: null,
      is_active: true,
    })

    const levelId = await getOrCreateLevelId('mid', 3)
    const templateSkill = await SkillFactory.create({
      skill_name: 'Delivery',
      category_code: 'delivery',
    })
    await ProfessionalRoleTemplateSkill.create({
      id: testId(),
      role_template_id: template.id,
      skill_id: templateSkill.id,
      minimum_level_id: levelId,
      target_level_id: levelId,
      assessment_ceiling_level_id: levelId,
      is_mandatory: true,
      importance: 'medium',
      weight: 1,
      sort_order: 1,
    })

    const createResponse = await client
      .post(`/api/v1/projects/${project.id}/professional-roles`)
      .loginAs(owner)
      .json({
        templateId: template.id,
      })

    createResponse.assertStatus(201)
    const roleId = (createResponse.body() as { data: { id: string } }).data.id

    const deleteResponse = await client
      .delete(`/api/v1/projects/${project.id}/professional-roles/${roleId}`)
      .loginAs(owner)

    deleteResponse.assertStatus(204)

    const persisted = await ProjectProfessionalRole.query().where('id', roleId).firstOrFail()
    assert.isFalse(persisted.is_active)
  })
})
