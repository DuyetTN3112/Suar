import { test } from '@japa/runner'

import { LucidSprintTransactionRunner } from '#composition/adapters/lucid_sprint_transaction_runner'
import CreateProjectSprintCommand from '#modules/sprints/actions/commands/create_project_sprint_command'
import UpdateProjectSprintCommand from '#modules/sprints/actions/commands/update_project_sprint_command'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/outbound/sprint_external_dependencies'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import { PostgresSprintRepository } from '#modules/sprints/infra/repositories/postgres_sprint_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, OrganizationFactory, ProjectFactory } from '#tests/helpers/factories'

function makeContext(userId: string, organizationId: string): SprintActionContext {
  return {
    userId,
    organizationId,
    ip: '127.0.0.1',
    userAgent: 'integration-test',
  }
}

function makeDependencies(input: {
  actorId: string
  organizationId: string
  projectId: string
}): SprintExternalDependencies {
  return {
    projectAccess: {
      resolveProjectSprintAccess(_context, projectId) {
        return Promise.resolve({
          actorId: input.actorId,
          project: {
            id: projectId,
            organization_id: input.organizationId,
            owner_id: input.actorId,
            manager_id: input.actorId,
            project_role: 'project_owner',
          },
          canManageSprint: true,
          isProjectParticipant: true,
        })
      },
    },
  }
}

test.group('Integration | Project sprint commands', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('creates and updates a normalized sprint through the application commands', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: owner.id,
    })
    const context = makeContext(owner.id, org.id)
    const dependencies = makeDependencies({
      actorId: owner.id,
      organizationId: org.id,
      projectId: project.id,
    })
    const repository = new PostgresSprintRepository()
    const transactions = new LucidSprintTransactionRunner()

    const created = await new CreateProjectSprintCommand(
      context,
      dependencies,
      repository
    ).execute({
      project_id: project.id,
      name: '  Planning Sprint  ',
      goal: '  Establish a stable delivery rhythm  ',
      starts_at: '2026-07-16T00:00:00.000Z',
      ends_at: '2026-07-30T00:00:00.000Z',
      status: 'draft',
    })

    const updated = await new UpdateProjectSprintCommand(
      context,
      dependencies,
      repository,
      transactions
    ).execute({
      project_id: project.id,
      sprint_id: created.id,
      goal: '  Reduce delivery variance  ',
      status: 'active',
    })

    assert.equal(created.name, 'Planning Sprint')
    assert.equal(created.goal, 'Establish a stable delivery rhythm')
    assert.equal(updated.goal, 'Reduce delivery variance')
    assert.equal(updated.status, 'active')
  })
})
