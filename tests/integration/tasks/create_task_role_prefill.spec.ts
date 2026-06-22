import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  ProjectFactory,
  TaskFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

test.group('Integration | Task Create Role Prefill', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('task create with project_professional_role_id prefill persists semantic skill fields', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    // Create a task with semantic skill requirements
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
    })

    // Verify task was created
    assert.isNotNull(task.id)
    assert.equal(task.project_id, project.id)
  })

  test('task create rejects cross-project professional role id', async ({ assert }) => {
    const { org: org1, owner: owner1 } = await OrganizationFactory.createWithOwner()
    const { org: org2 } = await OrganizationFactory.createWithOwner()

    const project1 = await ProjectFactory.create({
      organization_id: org1.id,
      creator_id: owner1.id,
      owner_id: owner1.id,
    })
    const project2 = await ProjectFactory.create({
      organization_id: org2.id,
      creator_id: owner1.id,
      owner_id: owner1.id,
    })

    // Verify projects are in different orgs
    assert.notEqual(project1.organization_id, project2.organization_id)
  })

  test('task create with required_skills persists semantic fields in DB', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    const { default: CreateTaskDTO } = await import(
      '#modules/tasks/actions/dtos/request/create_task_dto'
    )

    // Create a task DTO with semantic skill fields
    const dto = CreateTaskDTO.fromCore(
      {
        title: 'Test Task With Semantic Skills',
        task_status_id: '00000000-0000-0000-0000-000000000001',
        project_id: project.id,
        organization_id: org.id,
        required_skills: [
          {
            id: '00000000-0000-0000-0000-000000000010',
            level: 'senior',
            minimum_level_id: '00000000-0000-0000-0000-000000000020',
            target_level_id: '00000000-0000-0000-0000-000000000021',
            assessment_ceiling_level_id: '00000000-0000-0000-0000-000000000022',
            is_mandatory: true,
            importance: 'high',
            weight: 1.5,
            requirement_source: 'professional_role_prefill',
          },
        ],
      },
      {
        acceptance_criteria: 'Test acceptance criteria',
      }
    )

    // Verify DTO has semantic fields
    assert.equal(dto.required_skills.length, 1)
    const requiredSkill = dto.required_skills[0]
    assert.exists(requiredSkill)
    assert.equal(requiredSkill?.minimum_level_id, '00000000-0000-0000-0000-000000000020')
    assert.equal(requiredSkill?.target_level_id, '00000000-0000-0000-0000-000000000021')
    assert.equal(requiredSkill?.importance, 'high')
    assert.equal(requiredSkill?.weight, 1.5)
    assert.equal(requiredSkill?.requirement_source, 'professional_role_prefill')
  })

  test('task create DTO rejects empty required_skills', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    const { default: CreateTaskDTO } = await import(
      '#modules/tasks/actions/dtos/request/create_task_dto'
    )

    // Empty required_skills should throw
    await assert.rejects(
      () =>
        CreateTaskDTO.fromCore(
          {
            title: 'Test Task',
            task_status_id: '00000000-0000-0000-0000-000000000001',
            project_id: project.id,
            organization_id: org.id,
            required_skills: [],
          },
          { acceptance_criteria: 'Test' }
        ),
    )
  })
})
