import { test } from '@japa/runner'

import {
  OrganizationRole,
  OrganizationUserStatus,
} from '#modules/organizations/constants/organization_constants'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
import { ProjectRole } from '#modules/projects/constants/project_constants'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  ProjectFactory,
  ProjectMemberFactory,
  TaskFactory,
  TaskApplicationFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

function makeTaskActionContext(userId: string, organizationId: string): TaskActionContext {
  return {
    userId,
    organizationId,
    ip: '127.0.0.1',
    userAgent: 'japa',
  }
}

test.group('Integration | Task Worker Management', (group) => {
  group.setup(async () => { await setupApp() })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('ranking query returns fit_label for each candidate', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({ organization_id: org.id, creator_id: owner.id, owner_id: owner.id })
    const task = await TaskFactory.create({ organization_id: org.id, creator_id: owner.id, project_id: project.id, task_visibility: 'external' })
    const applicant = await UserFactory.create()
    await membershipMutations.addMember({ organization_id: org.id, user_id: applicant.id, org_role: OrganizationRole.MEMBER, status: OrganizationUserStatus.APPROVED })
    await TaskApplicationFactory.create({ task_id: task.id, applicant_id: applicant.id, application_status: 'pending' })

    const { default: GetTaskApplicationsRankingQuery } = await import('#modules/tasks/actions/queries/get_task_applications_ranking_query')
    const query = new GetTaskApplicationsRankingQuery(makeTaskActionContext(owner.id, org.id))
    const rankings = await query.handle({ task_id: task.id })

    assert.isTrue(rankings.length > 0)
    for (const r of rankings) {
      assert.property(r, 'fit_label')
      assert.isTrue(['strong_match', 'good_match', 'partial_match', 'weak_match'].includes(r.fit_label))
    }
  })

  test('ranking classifies project_member source correctly', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({ organization_id: org.id, creator_id: owner.id, owner_id: owner.id })
    const task = await TaskFactory.create({ organization_id: org.id, creator_id: owner.id, project_id: project.id, task_visibility: 'external' })

    const pm = await UserFactory.create()
    await membershipMutations.addMember({ organization_id: org.id, user_id: pm.id, org_role: OrganizationRole.MEMBER, status: OrganizationUserStatus.APPROVED })
    await ProjectMemberFactory.create({ project_id: project.id, user_id: pm.id, project_role: ProjectRole.MEMBER })
    const app1 = await TaskApplicationFactory.create({ task_id: task.id, applicant_id: pm.id, application_status: 'pending' })

    const { default: GetTaskApplicationsRankingQuery } = await import('#modules/tasks/actions/queries/get_task_applications_ranking_query')
    const query = new GetTaskApplicationsRankingQuery(makeTaskActionContext(owner.id, org.id))
    const rankings = await query.handle({ task_id: task.id })

    const pmRanking = rankings.find((r) => r.application_id === app1.id)
    assert.exists(pmRanking)
    assert.equal(pmRanking?.candidate_source, 'project_member')
  })

  test('ranking classifies org_member source correctly', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({ organization_id: org.id, creator_id: owner.id, owner_id: owner.id })
    const task = await TaskFactory.create({ organization_id: org.id, creator_id: owner.id, project_id: project.id, task_visibility: 'external' })

    const orgMember = await UserFactory.create()
    await membershipMutations.addMember({ organization_id: org.id, user_id: orgMember.id, org_role: OrganizationRole.MEMBER, status: OrganizationUserStatus.APPROVED })
    const app1 = await TaskApplicationFactory.create({ task_id: task.id, applicant_id: orgMember.id, application_status: 'pending' })

    const { default: GetTaskApplicationsRankingQuery } = await import('#modules/tasks/actions/queries/get_task_applications_ranking_query')
    const query = new GetTaskApplicationsRankingQuery(makeTaskActionContext(owner.id, org.id))
    const rankings = await query.handle({ task_id: task.id })

    const orgRanking = rankings.find((r) => r.application_id === app1.id)
    assert.exists(orgRanking)
    assert.equal(orgRanking?.candidate_source, 'org_member')
  })

  test('project manager can process application without being task creator', async ({ assert }) => {
    const { canProcessApplication } = await import('#modules/tasks/domain/task_assignment_rules')

    const result = canProcessApplication({
      actorId: 'manager-id',
      taskCreatorId: 'creator-id',
      action: 'approve',
      isTaskAlreadyAssigned: false,
      isProjectOwnerOrManager: true,
    })
    assert.isTrue(result.allowed)

    const denyResult = canProcessApplication({
      actorId: 'random-id',
      taskCreatorId: 'creator-id',
      action: 'approve',
      isTaskAlreadyAssigned: false,
      isProjectOwnerOrManager: false,
    })
    assert.isFalse(denyResult.allowed)
  })

  test('approve rejected when task already assigned', async ({ assert }) => {
    const { canProcessApplication } = await import('#modules/tasks/domain/task_assignment_rules')

    const result = canProcessApplication({
      actorId: 'creator-id',
      taskCreatorId: 'creator-id',
      action: 'approve',
      isTaskAlreadyAssigned: true,
    })
    assert.isFalse(result.allowed)
  })

  test('reject action allowed even when task already assigned', async ({ assert }) => {
    const { canProcessApplication } = await import('#modules/tasks/domain/task_assignment_rules')

    const result = canProcessApplication({
      actorId: 'creator-id',
      taskCreatorId: 'creator-id',
      action: 'reject',
      isTaskAlreadyAssigned: true,
    })
    assert.isTrue(result.allowed)
  })
})
