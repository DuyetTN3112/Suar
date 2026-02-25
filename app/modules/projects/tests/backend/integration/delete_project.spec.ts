import { test } from '@japa/runner'

import { projectLifecycleCommandFactory } from '#composition/project_lifecycle_composition'
import {
  BusinessPolicyViolationException,
  ForbiddenPolicyViolationException,
} from '#modules/authorization/public_contracts/policy_violation'
import { AdonisDomainEventDispatcher } from '#modules/events/infra/adapters/adonis_domain_event_dispatcher'
import { DomainEventOutboxWorker } from '#modules/events/infra/workers/domain_event_outbox_worker'
import { DeleteProjectDTO } from '#modules/projects/actions/dtos/request/delete_project_dto'
import { makeSystemProjectActionContext } from '#modules/projects/actions/project_action_context'
import { LucidProjectSearchDocumentReader } from '#modules/projects/infra/adapters/lucid_project_search_document_reader'
import Project from '#modules/projects/infra/models/project'
import { ProjectSearchDocumentBuilder } from '#modules/search/infra/projects/project_search_document_builder'
import { ProjectSearchIndexRepository } from '#modules/search/infra/projects/project_search_index_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  TaskFactory,
  UserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

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

    const command = projectLifecycleCommandFactory.makeDelete(
      makeSystemProjectActionContext(owner.id)
    )

    await command.handle(
      new DeleteProjectDTO({
        project_id: project.id,
        currentOrganizationId: org.id,
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

    const command = projectLifecycleCommandFactory.makeDelete(
      makeSystemProjectActionContext(owner.id)
    )

    await assert.rejects(
      () =>
        command.handle(
          new DeleteProjectDTO({
            project_id: project.id,
            currentOrganizationId: org.id,
          })
        ),
      BusinessPolicyViolationException
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

    const command = projectLifecycleCommandFactory.makeDelete(
      makeSystemProjectActionContext(member.id)
    )

    await assert.rejects(
      () =>
        command.handle(
          new DeleteProjectDTO({
            project_id: project.id,
            currentOrganizationId: org.id,
          })
        ),
      ForbiddenPolicyViolationException
    )

    const persisted = await Project.query().where('id', project.id).firstOrFail()
    assert.isNull(persisted.deleted_at)
  })

  test('deleted project is removed from project search index', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      name: 'Search Removal',
    })
    const repository = new ProjectSearchIndexRepository()
    const builder = new ProjectSearchDocumentBuilder(new LucidProjectSearchDocumentReader())
    await repository.resetIndex()
    const searchDocument = await builder.build(project.id)
    if (!searchDocument) {
      throw new Error('Expected the persisted project to produce a search document')
    }
    await repository.upsertDocument(searchDocument)

    const command = projectLifecycleCommandFactory.makeDelete(
      makeSystemProjectActionContext(owner.id)
    )

    await command.handle(
      new DeleteProjectDTO({
        project_id: project.id,
        currentOrganizationId: org.id,
      })
    )
    const delivery = await new DomainEventOutboxWorker({
      workerId: 'delete-project-search-integration',
      dispatcher: new AdonisDomainEventDispatcher(),
      batchSize: 10,
      concurrency: 1,
    }).runOnce()

    const hits = await repository.search({
      q: 'Removal',
      limit: 10,
    })

    assert.equal(delivery.processed, 1)
    assert.notInclude(
      hits.map((hit) => hit.projectId),
      project.id
    )
  }).timeout(10000)
})
