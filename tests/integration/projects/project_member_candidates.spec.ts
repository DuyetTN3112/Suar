import { test } from '@japa/runner'

import {
  OrganizationRole,
  OrganizationUserStatus,
} from '#modules/organizations/constants/organization_constants'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { ProjectRole } from '#modules/projects/constants/project_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  ProjectFactory,
  ProjectMemberFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

function makeProjectActionContext(userId: string, organizationId: string): ProjectActionContext {
  return {
    userId,
    organizationId,
    ip: '127.0.0.1',
    userAgent: 'japa',
  }
}

test.group('Integration | Project Member Candidates', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('returns approved org members not already in project', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member1 = await UserFactory.create({ username: 'test_member_1' })
    const member2 = await UserFactory.create({ username: 'test_member_2' })
    const member3 = await UserFactory.create({ username: 'test_member_3' })

    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: member1.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.APPROVED,
    })
    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: member2.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.APPROVED,
    })
    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: member3.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.APPROVED,
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    // Add member1 to project
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: member1.id,
      project_role: ProjectRole.MEMBER,
    })

    const { default: GetProjectMemberCandidatesQuery } = await import(
      '#modules/projects/actions/queries/get_project_member_candidates_query'
    )

    const query = new GetProjectMemberCandidatesQuery(makeProjectActionContext(owner.id, org.id))

    const candidates = await query.handle({ project_id: project.id })

    const candidateIds = candidates.map((c) => c.user_id)
    assert.notInclude(candidateIds, member1.id)
    assert.include(candidateIds, member2.id)
    assert.include(candidateIds, member3.id)
  })

  test('excludes non-approved org members from candidates', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const approved = await UserFactory.create({ username: 'approved_user' })
    const pending = await UserFactory.create({ username: 'pending_user' })

    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: approved.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.APPROVED,
    })
    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: pending.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    const { default: GetProjectMemberCandidatesQuery } = await import(
      '#modules/projects/actions/queries/get_project_member_candidates_query'
    )

    const query = new GetProjectMemberCandidatesQuery(makeProjectActionContext(owner.id, org.id))

    const candidates = await query.handle({ project_id: project.id })
    const candidateIds = candidates.map((c) => c.user_id)

    assert.include(candidateIds, approved.id)
    assert.notInclude(candidateIds, pending.id)
  })

  test('search filters candidates by username', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const alice = await UserFactory.create({ username: 'alice_search_test' })
    const bob = await UserFactory.create({ username: 'bob_search_test' })

    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: alice.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.APPROVED,
    })
    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: bob.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.APPROVED,
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    const { default: GetProjectMemberCandidatesQuery } = await import(
      '#modules/projects/actions/queries/get_project_member_candidates_query'
    )

    const query = new GetProjectMemberCandidatesQuery(makeProjectActionContext(owner.id, org.id))

    const candidates = await query.handle({ project_id: project.id, search: 'alice' })
    const candidateIds = candidates.map((c) => c.user_id)

    assert.include(candidateIds, alice.id)
    assert.notInclude(candidateIds, bob.id)
  })

  test('returns empty when all org members are already in project', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create({ username: 'only_member' })

    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: member.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.APPROVED,
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    // Add both owner and member to project
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: ProjectRole.OWNER,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: member.id,
      project_role: ProjectRole.MEMBER,
    })

    const { default: GetProjectMemberCandidatesQuery } = await import(
      '#modules/projects/actions/queries/get_project_member_candidates_query'
    )

    const query = new GetProjectMemberCandidatesQuery(makeProjectActionContext(owner.id, org.id))

    const candidates = await query.handle({ project_id: project.id })
    assert.equal(candidates.length, 0)
  })

  test('throws error for non-existent project', async ({ assert }) => {
    const { owner } = await OrganizationFactory.createWithOwner()

    const { default: GetProjectMemberCandidatesQuery } = await import(
      '#modules/projects/actions/queries/get_project_member_candidates_query'
    )

    const query = new GetProjectMemberCandidatesQuery(makeProjectActionContext(owner.id, owner.id))

    await assert.rejects(
      () => query.handle({ project_id: '00000000-0000-0000-0000-000000000000' }),
      'Project not found'
    )
  })
})
