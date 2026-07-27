import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import ProfessionalRoleTemplate from '#modules/skills/infra/models/project-roles/professional_role_template'
import ProfessionalRoleTemplateSkill from '#modules/skills/infra/models/project-roles/professional_role_template_skill'
import ProjectProfessionalRole from '#modules/skills/infra/models/project-roles/project_professional_role'
import ProjectProfessionalRoleSkill from '#modules/skills/infra/models/project-roles/project_professional_role_skill'
import ProjectSkill from '#modules/skills/infra/models/project-skills/project_skill'
import SkillRubricLevel from '#modules/skills/infra/models/rubric-and-proficiency/skill_rubric_level'
import SkillRubricVersion from '#modules/skills/infra/models/rubric-and-proficiency/skill_rubric_version'
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
    code: `api-standard-${code}`,
    name: `API Standard ${code}`,
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

async function createDetailedLevel(code: string, ordinal: number): Promise<string> {
  const scaleId = testId()
  await db.table('proficiency_scales').insert({
    id: scaleId,
    code: `api-detailed-${code}-${scaleId.slice(0, 6)}`,
    name: `API Detailed ${code}`,
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
    expected_knowledge: `Expected knowledge for ${code}`,
    expected_execution: `Expected execution for ${code}`,
    autonomy_descriptor: `Autonomy descriptor for ${code}`,
    complexity_descriptor: `Complexity descriptor for ${code}`,
    quality_descriptor: `Quality descriptor for ${code}`,
    collaboration_descriptor: `Collaboration descriptor for ${code}`,
    observable_behaviors: JSON.stringify([`Observable behavior for ${code}`]),
    positive_examples: JSON.stringify([`Positive example for ${code}`]),
    negative_examples: JSON.stringify([`Negative example for ${code}`]),
    evidence_guidance: `Evidence guidance for ${code}`,
    ceiling_guidance: `Ceiling guidance for ${code}`,
  })

  return levelId
}

test.group('Contract | Skills v1 read API standardization', (group) => {
  group.each.teardown(() => cleanupTestData())

  test('v1 project skills endpoint returns wrapped camelCase payload', async ({
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
      skill_name: 'TypeScript',
      category_code: 'technology',
    })

    await ProjectSkill.create({
      id: testId(),
      project_id: project.id,
      skill_id: skill.id,
      display_name_override: 'TS',
      description_override: 'Project TypeScript baseline',
      rubric_version_id: null,
      is_active: true,
      is_selectable_for_tasks: true,
      is_visible_in_project: true,
      added_by: owner.id,
    })

    const response = await client.get(`/api/v1/projects/${project.id}/skills`).loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        id: string
        projectId: string
        displayNameOverride: string | null
        descriptionOverride: string | null
        isActive: boolean
        isSelectableForTasks: boolean
        skill: {
          id: string
          skillCode: string
          skillName: string
          categoryCode: string | null
          displayType: string | null
        }
      }>
    }

    const first = body.data[0]
    assert.exists(first)
    assert.notProperty(first ?? {}, 'project_id')
    assert.equal(first?.projectId, project.id)
    assert.equal(first?.displayNameOverride, 'TS')
    assert.equal(first?.descriptionOverride, 'Project TypeScript baseline')
    assert.isTrue(first?.isActive ?? false)
    assert.equal(first?.skill.skillName, 'TypeScript')
    assert.equal(first?.skill.categoryCode, 'technology')
  })

  test('v1 project professional roles endpoint returns wrapped camelCase payload', async ({
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
      skill_name: 'Architecture',
      category_code: 'engineering',
    })
    const juniorId = await getOrCreateLevelId('junior', 2)
    const seniorId = await getOrCreateLevelId('senior', 5)

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
      description: 'System design owner',
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
      weight: 2,
      sort_order: 1,
      notes: 'Important skill',
    })

    const response = await client
      .get(`/api/v1/projects/${project.id}/professional-roles`)
      .loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        id: string
        projectId: string
        isActive: boolean
        sourceTemplate: { id: string; code: string; name: string } | null
        skills: Array<{
          id: string
          projectSkillId: string
          minimumLevel: { id: string; displayName: string } | null
          targetLevel: { id: string; displayName: string } | null
          assessmentCeilingLevel: { id: string; displayName: string } | null
          isMandatory: boolean
          sortOrder: number
          skill: {
            skillName: string
            categoryCode: string | null
          } | null
        }>
      }>
    }

    const first = body.data[0]
    assert.exists(first)
    assert.notProperty(first ?? {}, 'project_id')
    assert.isTrue(first?.isActive ?? false)
    assert.equal(first?.projectId, project.id)
    assert.isNull(first?.sourceTemplate ?? null)
    assert.equal(first?.skills[0]?.projectSkillId, projectSkill.id)
    assert.equal(first?.skills[0]?.minimumLevel?.id, juniorId)
    assert.equal(first?.skills[0]?.targetLevel?.id, seniorId)
    assert.equal(first?.skills[0]?.assessmentCeilingLevel?.id, seniorId)
    assert.isTrue(first?.skills[0]?.isMandatory ?? false)
    assert.equal(first?.skills[0]?.sortOrder, 1)
    assert.equal(first?.skills[0]?.skill?.skillName, 'Architecture')
  })

  test('v1 catalog endpoints return camelCase skill, template, and proficiency scale payloads', async ({
    assert,
    client,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()
    const skill = await SkillFactory.create({
      skill_name: 'Communication',
      category_code: 'soft_skill',
    })
    const levelId = await getOrCreateLevelId('mid', 3)
    const templateCode = `product_manager_${testId().slice(0, 8)}`
    const template = await ProfessionalRoleTemplate.create({
      id: testId(),
      code: templateCode,
      name: 'Product Manager',
      description: 'Owns product delivery',
      is_active: true,
    })

    await ProfessionalRoleTemplateSkill.create({
      id: testId(),
      role_template_id: template.id,
      skill_id: skill.id,
      minimum_level_id: levelId,
      target_level_id: levelId,
      assessment_ceiling_level_id: levelId,
      is_mandatory: true,
      importance: 'medium',
      weight: 1,
      sort_order: 1,
    })

    const skillsResponse = await client.get('/api/v1/skills').loginAs(owner)
    skillsResponse.assertStatus(200)
    const skillsBody = skillsResponse.body() as {
      data: Array<{
        id: string
        skillCode: string
        skillName: string
        categoryCode: string | null
        displayType: string | null
        publishedRubricVersionId: string | null
      }>
    }
    assert.equal(skillsBody.data[0]?.skillName, 'Communication')
    assert.notProperty(skillsBody.data[0] ?? {}, 'skill_name')

    const templatesResponse = await client.get('/api/v1/professional-role-templates').loginAs(owner)
    templatesResponse.assertStatus(200)
    const templatesBody = templatesResponse.body() as {
      data: Array<{
        id: string
        code: string
        isActive: boolean
        skills: Array<{
          skillId: string
          minimumLevel: { displayName: string } | null
          targetLevel: { displayName: string } | null
          assessmentCeilingLevel: { displayName: string } | null
          isMandatory: boolean
          sortOrder: number
        }>
      }>
    }
    const matchingTemplate = templatesBody.data.find((item) => item.code === templateCode)
    assert.exists(matchingTemplate)
    assert.isTrue(matchingTemplate?.isActive ?? false)
    assert.equal(matchingTemplate?.skills[0]?.skillId, skill.id)
    assert.equal(matchingTemplate?.skills[0]?.minimumLevel?.displayName, 'mid')
    assert.notProperty(matchingTemplate?.skills[0] ?? {}, 'skill_id')

    const scalesResponse = await client.get('/api/v1/proficiency-scales').loginAs(owner)
    scalesResponse.assertStatus(200)
    const scalesBody = scalesResponse.body() as {
      data: {
        id: string
        isActive: boolean
        effectiveFrom: string | null
        levels: Array<{
          displayName: string
          shortName: string | null
          normalizedValue: number | null
          sortOrder: number
          expectedKnowledge: string | null
          expectedExecution: string | null
          autonomyDescriptor: string | null
          qualityDescriptor: string | null
          frameworkDescriptor: {
            source: string
            matchType: string
          }
        }>
      }
    }
    assert.isTrue(scalesBody.data.isActive)
    assert.isAtLeast(scalesBody.data.levels.length, 1)
    assert.isString(scalesBody.data.levels[0]?.displayName)
    assert.notProperty(scalesBody.data.levels[0] ?? {}, 'display_name')
    assert.property(scalesBody.data.levels[0] ?? {}, 'expectedKnowledge')
    assert.property(scalesBody.data.levels[0] ?? {}, 'expectedExecution')
    assert.property(scalesBody.data.levels[0] ?? {}, 'autonomyDescriptor')
    assert.equal(scalesBody.data.levels[0]?.frameworkDescriptor.source, 'suar-kb-v5')

    const scaleId = scalesBody.data.id
    const scaleDetailResponse = await client
      .get(`/api/v1/proficiency-scales/${scaleId}`)
      .loginAs(owner)
    scaleDetailResponse.assertStatus(200)

    const scaleDetailBody = scaleDetailResponse.body() as {
      data: {
        id: string
        isActive: boolean
        effectiveFrom: string | null
        levels: Array<{
          displayName: string
          expectedKnowledge: string | null
          expectedExecution: string | null
          complexityDescriptor: string | null
          qualityDescriptor: string | null
          positiveExamples: string[] | null
          ceilingGuidance: string | null
          frameworkDescriptor: {
            source: string
            canonicalLevelCode: string | null
          }
        }>
      }
    }

    assert.equal(scaleDetailBody.data.id, scaleId)
    assert.equal(scaleDetailBody.data.isActive, scalesBody.data.isActive)
    assert.equal(
      scaleDetailBody.data.levels[0]?.displayName,
      scalesBody.data.levels[0]?.displayName
    )
    assert.notProperty(scaleDetailBody.data.levels[0] ?? {}, 'display_name')
    assert.property(scaleDetailBody.data.levels[0] ?? {}, 'expectedKnowledge')
    assert.property(scaleDetailBody.data.levels[0] ?? {}, 'expectedExecution')
    assert.property(scaleDetailBody.data.levels[0] ?? {}, 'complexityDescriptor')
    assert.property(scaleDetailBody.data.levels[0] ?? {}, 'qualityDescriptor')
    assert.property(scaleDetailBody.data.levels[0] ?? {}, 'positiveExamples')
    assert.property(scaleDetailBody.data.levels[0] ?? {}, 'ceilingGuidance')
    assert.equal(scaleDetailBody.data.levels[0]?.frameworkDescriptor.source, 'suar-kb-v5')
  })

  test('v1 skills endpoint supports keyword search and keeps camelCase payload', async ({
    assert,
    client,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()
    const matchingSkill = await SkillFactory.create({
      skill_name: 'Elastic Observability',
      skill_code: 'elastic_observability',
      category_code: 'technology',
    })
    await SkillFactory.create({
      skill_name: 'Team Communication',
      skill_code: 'team_communication',
      category_code: 'soft_skill',
    })

    const response = await client.get('/api/v1/skills').qs({ q: 'elastic' }).loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        id: string
        skillCode: string
        skillName: string
        categoryCode: string | null
      }>
    }

    assert.deepEqual(
      body.data.map((item) => item.id),
      [matchingSkill.id]
    )
    assert.equal(body.data[0]?.skillName, 'Elastic Observability')
    assert.notProperty(body.data[0] ?? {}, 'skill_name')
  })

  test('v1 published skill rubric endpoint returns camelCase payload with level descriptor detail', async ({
    assert,
    client,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()
    const skill = await SkillFactory.create({
      skill_name: 'API Design',
      category_code: 'engineering',
    })
    const levelId = await createDetailedLevel('middle', 7)

    const version = await SkillRubricVersion.create({
      id: testId(),
      skill_id: skill.id,
      version: 1,
      status: 'published',
      effective_from: DateTime.now(),
      effective_to: null,
      created_by: owner.id,
      change_summary: 'Initial published rubric',
    })

    await SkillRubricLevel.create({
      id: testId(),
      rubric_version_id: version.id,
      proficiency_level_id: levelId,
      summary: 'Can design maintainable service contracts',
      knowledge_expectations: ['Understands HTTP contracts'],
      observable_behaviors: ['Explains trade-offs clearly'],
      independence_expectations: 'Works independently on medium scope',
      complexity_expectations: 'Handles medium complexity APIs',
      impact_scope_expectations: 'Affects service boundaries',
      positive_examples: ['Defines stable request/response semantics'],
      negative_examples: ['Ships ambiguous contracts'],
      evidence_guidance: 'Use merged PRs and review notes',
    })

    const response = await client.get(`/api/v1/skills/${skill.id}/rubric`).loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: {
        skillId: string
        frameworkVersion: string
        levels: Array<{
          proficiencyLevel: {
            code: string
            displayName: string
            expectedKnowledge: string | null
            expectedExecution: string | null
            autonomyDescriptor: string | null
            qualityDescriptor: string | null
            collaborationDescriptor: string | null
            observableBehaviors: string[] | null
            evidenceGuidance: string | null
            frameworkDescriptor: {
              source: string
            }
          }
          observableBehaviors: string[] | null
          evidenceGuidance: string | null
          assessmentDimensions: {
            knowledge: string[] | null
            autonomy: string | null
            complexity: string | null
            impact: string | null
          }
        }>
      }
    }

    assert.equal(body.data.skillId, skill.id)
    assert.equal(body.data.frameworkVersion, 'suar-kb-v5')
    assert.equal(body.data.levels[0]?.proficiencyLevel.code, 'l7')
    assert.equal(
      body.data.levels[0]?.proficiencyLevel.expectedKnowledge,
      'Expected knowledge for middle'
    )
    assert.equal(
      body.data.levels[0]?.proficiencyLevel.expectedExecution,
      'Expected execution for middle'
    )
    assert.equal(
      body.data.levels[0]?.proficiencyLevel.autonomyDescriptor,
      'Autonomy descriptor for middle'
    )
    assert.equal(
      body.data.levels[0]?.proficiencyLevel.qualityDescriptor,
      'Quality descriptor for middle'
    )
    assert.equal(
      body.data.levels[0]?.proficiencyLevel.collaborationDescriptor,
      'Collaboration descriptor for middle'
    )
    assert.deepEqual(body.data.levels[0]?.proficiencyLevel.observableBehaviors, [
      'Observable behavior for middle',
    ])
    assert.equal(
      body.data.levels[0]?.proficiencyLevel.evidenceGuidance,
      'Evidence guidance for middle'
    )
    assert.equal(body.data.levels[0]?.proficiencyLevel.frameworkDescriptor.source, 'suar-kb-v5')
    assert.deepEqual(body.data.levels[0]?.observableBehaviors, ['Explains trade-offs clearly'])
    assert.deepEqual(body.data.levels[0]?.assessmentDimensions, {
      knowledge: ['Understands HTTP contracts'],
      autonomy: 'Works independently on medium scope',
      complexity: 'Handles medium complexity APIs',
      impact: 'Affects service boundaries',
    })
    assert.notProperty(body.data, 'skill_id')
  })
})
