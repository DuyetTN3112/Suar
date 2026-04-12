import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import CreateProjectCommand from '#actions/projects/commands/create_project_command'
import { CreateProjectDTO } from '#actions/projects/dtos/request/create_project_dto'
import ProjectMemberRepository from '#infra/projects/repositories/project_member_repository'
import AuditLog from '#models/mongo/audit_log'
import Project from '#models/project'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  UserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import { ExecutionContext } from '#types/execution_context'

test.group('Integration | Create Project', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('org owner creates a project with owner membership, audit trail, and persisted schedule', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const command = new CreateProjectCommand(ExecutionContext.system(owner.id))
    const startDate = DateTime.now().startOf('day')
    const endDate = startDate.plus({ months: 2 })

    const project = await command.handle(
      new CreateProjectDTO({
        name: 'Platform Revamp',
        organization_id: org.id,
        start_date: startDate,
        end_date: endDate,
      })
    )
    const logs = await AuditLog.query()
      .where('entity_type', 'project')
      .where('entity_id', project.id)

    assert.equal(project.organization_id, org.id)
    assert.equal(project.creator_id, owner.id)
    assert.equal(project.owner_id, owner.id)
    assert.equal(project.manager_id, owner.id)
    assert.isNotNull(project.start_date)
    assert.isNotNull(project.end_date)
    assert.equal(await ProjectMemberRepository.getRoleName(project.id, owner.id), 'project_owner')
    assert.isAbove(logs.length, 0)
  })

  test('approved org members without admin authority cannot create projects', async ({
    assert,
  }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const command = new CreateProjectCommand(ExecutionContext.system(member.id))
    await assert.rejects(() =>
      command.handle(
        new CreateProjectDTO({
          name: 'Member Blocked Project',
          organization_id: org.id,
        })
      )
    )

    const projects = await Project.query().where('organization_id', org.id)
    assert.lengthOf(projects, 0)
  })

  test('superadmin can create a project in an organization without being an org member', async ({
    assert,
  }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const superadmin = await UserFactory.createSuperadmin()
    const command = new CreateProjectCommand(ExecutionContext.system(superadmin.id))

    const project = await command.handle(
      new CreateProjectDTO({
        name: 'Global Ops Rollout',
        organization_id: org.id,
      })
    )

    assert.equal(project.organization_id, org.id)
    assert.equal(project.creator_id, superadmin.id)
    assert.equal(project.owner_id, superadmin.id)
    assert.equal(
      await ProjectMemberRepository.getRoleName(project.id, superadmin.id),
      'project_owner'
    )
  })
})
