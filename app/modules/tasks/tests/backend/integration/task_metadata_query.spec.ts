import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  taskReadRepository,
  taskStatusQueryRepository,
} from '#composition/task_application_composition'
import { taskExternalDeps } from '#composition/task_external_dependencies_composition'
import ProjectSkill from '#modules/skills/infra/models/project_skill'
import GetTaskMetadataQuery from '#modules/tasks/actions/queries/get_task_metadata_query'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  SkillFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Task metadata query', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('returns canonical proficiency metadata instead of runtime legacy scale rows', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await SkillFactory.create({
      skill_name: 'TypeScript',
      category_code: 'technology',
    })

    const query = new GetTaskMetadataQuery(makeSystemTaskActionContext(owner.id), taskExternalDeps, taskReadRepository, taskStatusQueryRepository)
    const result = await query.execute(org.id)

    assert.equal(result.proficiencyLevels[0]?.value, 'l0')
    assert.equal(result.proficiencyLevels[1]?.value, 'l1')
    assert.isTrue(result.proficiencyLevels.some((level) => level.value === 'l10'))
    assert.isFalse(result.proficiencyLevels.some((level) => level.value === 'senior'))
    assert.equal(result.availableSkills[0]?.categoryCode, 'technology')
  })

  test('returns selected project skill rubric binding in task create metadata', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const skill = await SkillFactory.create({
      skill_name: 'Rubric Bound TypeScript',
      category_code: 'technology',
    })
    const rubricVersionId = testId()

    await db.table('skill_rubric_versions').insert({
      id: rubricVersionId,
      skill_id: skill.id,
      version: 1,
      status: 'published',
      created_by: owner.id,
      change_summary: 'Task create metadata binding',
    })

    await ProjectSkill.create({
      id: testId(),
      project_id: project.id,
      skill_id: skill.id,
      display_name_override: 'Project TypeScript',
      description_override: null,
      rubric_version_id: rubricVersionId,
      is_active: true,
      is_selectable_for_tasks: true,
      is_visible_in_project: true,
      added_by: owner.id,
    })

    const query = new GetTaskMetadataQuery(makeSystemTaskActionContext(owner.id), taskExternalDeps, taskReadRepository, taskStatusQueryRepository)
    const result = await query.execute(org.id, project.id)

    assert.equal(result.availableSkills[0]?.id, skill.id)
    assert.equal(result.availableSkills[0]?.name, 'Project TypeScript')
    assert.equal(result.availableSkills[0]?.rubricVersionId, rubricVersionId)
  })

  test('rechecks organization access before a warm metadata cache lookup', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const approvedMember = await UserFactory.create()
    const pendingMember = await UserFactory.create()
    const outsider = await UserFactory.create()
    const systemAdmin = await UserFactory.create({ system_role: 'system_admin' })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: approvedMember.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: pendingMember.id,
      org_role: 'org_member',
      status: 'pending',
    })
    await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    const warmResult = await new GetTaskMetadataQuery(
      makeSystemTaskActionContext(owner.id),
      taskExternalDeps,
      taskReadRepository,
      taskStatusQueryRepository
    ).execute(org.id)
    assert.include(
      warmResult.users.map((user) => user.id),
      approvedMember.id
    )

    const approvedResult = await new GetTaskMetadataQuery(
      makeSystemTaskActionContext(approvedMember.id),
      taskExternalDeps,
      taskReadRepository,
      taskStatusQueryRepository
    ).execute(org.id)
    assert.deepEqual(approvedResult, warmResult)

    for (const deniedUser of [pendingMember, outsider, systemAdmin]) {
      await assert.rejects(
        () =>
          new GetTaskMetadataQuery(
            makeSystemTaskActionContext(deniedUser.id),
            taskExternalDeps,
            taskReadRepository,
            taskStatusQueryRepository
          ).execute(org.id),
        /permission|quyền|forbidden/i
      )
    }
  })
})
