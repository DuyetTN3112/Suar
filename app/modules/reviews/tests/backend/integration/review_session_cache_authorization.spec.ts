import { test } from '@japa/runner'

import { SkillReviewIdentityReaderAdapter } from '#composition/adapters/skills/skill_review_identity_reader_adapter'
import { TaskReviewAssignmentProjectionReaderAdapter } from '#composition/adapters/tasks/task_review_assignment_projection_reader_adapter'
import { UserReviewModeratorIdentityProjectionReaderAdapter } from '#composition/adapters/users/user_review_moderator_identity_projection_reader_adapter'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { GetReviewSessionDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import GetReviewSessionQuery from '#modules/reviews/actions/queries/review-session/get_review_session_query'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { LucidReviewSessionReadStore } from '#modules/reviews/infra/adapters/review-session/lucid_review_session_readers'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectMemberFactory,
  ProjectFactory,
  ReviewSessionFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

async function buildScenario() {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const reviewee = await UserFactory.create({ current_organization_id: org.id })
  const unrelatedMember = await UserFactory.create({ current_organization_id: org.id })
  const designatedPeer = await UserFactory.create({ current_organization_id: org.id })

  await Promise.all([
    OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: reviewee.id,
      org_role: 'org_member',
      status: 'approved',
    }),
    OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: unrelatedMember.id,
      org_role: 'org_member',
      status: 'approved',
    }),
    OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: designatedPeer.id,
      org_role: 'org_member',
      status: 'approved',
    }),
  ])

  const project = await ProjectFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    owner_id: owner.id,
  })
  await ProjectMemberFactory.create({
    project_id: project.id,
    user_id: designatedPeer.id,
    project_role: 'project_member',
  })
  const task = await TaskFactory.create({
    organization_id: org.id,
    project_id: project.id,
    creator_id: owner.id,
    assigned_to: reviewee.id,
  })
  const assignment = await TaskAssignmentFactory.create({
    task_id: task.id,
    assignee_id: reviewee.id,
    assigned_by: owner.id,
    assignment_status: 'completed',
  })
  const session = await ReviewSessionFactory.create({
    task_assignment_id: assignment.id,
    reviewee_id: reviewee.id,
    status: 'completed',
  })

  return { owner, reviewee, unrelatedMember, session }
}

test.group('Integration | Review session cache authorization', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(() => teardownApp())

  group.each.teardown(async () => {
    await cacheStore.deleteByPattern('review:session:*')
    await cleanupTestData()
  })

  test('authorizes before cache population and after a privileged actor warms the entry', async ({
    assert,
  }) => {
    const { owner, unrelatedMember, session } = await buildScenario()
    const cacheKey = `review:session:v4:sessionId:${session.id}`
    const makeQuery = (userId: string) =>
      new GetReviewSessionQuery(
        makeSystemReviewActionContext(userId),
        new TaskReviewAssignmentProjectionReaderAdapter(),
        new UserReviewModeratorIdentityProjectionReaderAdapter(),
        new SkillReviewIdentityReaderAdapter(),
        new LucidReviewSessionReadStore()
      )
    const dto = new GetReviewSessionDTO(session.id)

    await assert.rejects(
      () => makeQuery(unrelatedMember.id).handle(dto),
      ForbiddenException
    )
    assert.isNull(await cacheStore.get(cacheKey))

    const authorized = await makeQuery(owner.id).handle(dto)
    assert.equal(authorized.id, session.id)
    assert.isNotNull(await cacheStore.get(cacheKey))

    await assert.rejects(
      () => makeQuery(unrelatedMember.id).handle(dto),
      ForbiddenException
    )
  })
})
