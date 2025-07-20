import { test } from '@japa/runner'

import DeleteProjectCommand from '#actions/projects/commands/delete_project_command'
import { DeleteProjectDTO } from '#actions/projects/dtos/request/delete_project_dto'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import Project from '#models/project'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  TaskFactory,
  UserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import { ExecutionContext } from '#types/execution_context'

test.group('Integration | Delete Project', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('owner soft-deletes project when there are no incomplete tasks', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    const command = new DeleteProjectCommand(ExecutionContext.system(owner.id))

    await command.handle(
      new DeleteProjectDTO({
        project_id: project.id,
        current_organization_id: org.id,
        reason: 'Project archive test',
      })
    )

    const persisted = await Project.query().where('id', project.id).firstOrFail()

    assert.isNotNull(persisted.deleted_at)
  })

  test('owner cannot delete a project that still has incomplete tasks', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
      status: 'todo',
    })

    const command = new DeleteProjectCommand(ExecutionContext.system(owner.id))

    await assert.rejects(
      () =>
        command.handle(
          new DeleteProjectDTO({
            project_id: project.id,
            current_organization_id: org.id,
          })
        ),
      BusinessLogicException
    )

    const persisted = await Project.query().where('id', project.id).firstOrFail()
    assert.isNull(persisted.deleted_at)
  })

  test('non-owner member is forbidden from deleting the project and state remains unchanged', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    const command = new DeleteProjectCommand(ExecutionContext.system(member.id))

    await assert.rejects(
      () =>
        command.handle(
          new DeleteProjectDTO({
            project_id: project.id,
            current_organization_id: org.id,
          })
        ),
      ForbiddenException
    )

    const persisted = await Project.query().where('id', project.id).firstOrFail()
    assert.isNull(persisted.deleted_at)
  })
})
