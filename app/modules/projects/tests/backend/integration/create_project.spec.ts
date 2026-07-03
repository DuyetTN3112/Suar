import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { projectLifecycleCommandFactory } from '#composition/projects/project-lifecycle/project_lifecycle_composition'
import AuditLog from '#modules/audit/infra/models/audit-log/audit_log'
import { ForbiddenPolicyViolationException } from '#modules/authorization/public_contracts/policy_violation'
import { AdonisDomainEventDispatcher } from '#modules/events/infra/adapters/domain-event-outbox-administration/adonis_domain_event_dispatcher'
import { DomainEventOutboxWorker } from '#modules/events/infra/adapters/domain-event-outbox-administration/domain_event_outbox_worker'
import { CreateProjectDTO } from '#modules/projects/actions/dtos/request/create_project_dto'
import { makeSystemProjectActionContext } from '#modules/projects/actions/project_action_context'
import Project from '#modules/projects/infra/models/project-context/project'
import ProjectMemberRepository from '#modules/projects/infra/repositories/project-members/project_member_repository'
import { ProjectSearchIndexRepository } from '#modules/search/infra/repositories/entity-search/projects/project_search_index_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  UserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

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
    const command = projectLifecycleCommandFactory.makeCreate(
      makeSystemProjectActionContext(owner.id)
    )
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

    const command = projectLifecycleCommandFactory.makeCreate(
      makeSystemProjectActionContext(member.id)
    )
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

  test('duplicate project names in the same organization create distinct projects', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const command = projectLifecycleCommandFactory.makeCreate(
      makeSystemProjectActionContext(owner.id)
    )

    const first = await command.handle(
      new CreateProjectDTO({
        name: 'Shared Roadmap',
        organization_id: org.id,
      })
    )
    const second = await command.handle(
      new CreateProjectDTO({
        name: 'Shared Roadmap',
        organization_id: org.id,
      })
    )

    assert.notEqual(second.id, first.id)
    assert.equal(first.name, 'Shared Roadmap')
    assert.equal(second.name, 'Shared Roadmap')
    assert.lengthOf(await Project.query().where('organization_id', org.id), 2)
    assert.equal(await ProjectMemberRepository.getRoleName(first.id, owner.id), 'project_owner')
    assert.equal(await ProjectMemberRepository.getRoleName(second.id, owner.id), 'project_owner')
  })

  test('system admin cannot create a project without an organization membership', async ({
    assert,
  }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const superadmin = await UserFactory.createSuperadmin()
    const command = projectLifecycleCommandFactory.makeCreate(
      makeSystemProjectActionContext(superadmin.id)
    )

    await assert.rejects(
      () =>
        command.handle(
          new CreateProjectDTO({
            name: 'Global Ops Rollout',
            organization_id: org.id,
          })
        ),
      ForbiddenPolicyViolationException
    )

    assert.lengthOf(await Project.query().where('organization_id', org.id), 0)
  })

  test('created project is indexed for project search', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const command = projectLifecycleCommandFactory.makeCreate(
      makeSystemProjectActionContext(owner.id)
    )
    const repository = new ProjectSearchIndexRepository()
    await repository.resetIndex()

    const project = await command.handle(
      new CreateProjectDTO({
        name: 'Discovery Platform',
        organization_id: org.id,
      })
    )
    const delivery = await new DomainEventOutboxWorker({
      workerId: 'create-project-search-integration',
      dispatcher: new AdonisDomainEventDispatcher(),
      batchSize: 10,
      concurrency: 1,
    }).runOnce()

    const hits = await repository.search({
      q: 'Discovery',
      limit: 10,
    })

    assert.equal(delivery.processed, 1)
    assert.include(
      hits.map((hit) => hit.projectId),
      project.id
    )
  }).timeout(10000)
})
