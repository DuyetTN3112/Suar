import { test } from '@japa/runner'

import { SkillReviewIdentityReaderAdapter } from '#composition/adapters/skill_review_identity_reader_adapter'
import { TaskReviewAssignmentProjectionReaderAdapter } from '#composition/adapters/task_review_assignment_projection_reader_adapter'
import { UserReviewModeratorIdentityProjectionReaderAdapter } from '#composition/adapters/user_review_moderator_identity_projection_reader_adapter'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import {
  GetReviewSessionDTO,
  GetUserReviewsDTO,
} from '#modules/reviews/actions/dtos/request/review_dtos'
import GetReviewSessionQuery from '#modules/reviews/actions/queries/get_review_session_query'
import GetUserReviewsQuery from '#modules/reviews/actions/queries/get_user_reviews_query'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { LucidReviewSessionReadStore } from '#modules/reviews/infra/adapters/lucid_review_session_readers'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ProjectFactory,
  ReviewSessionFactory,
  SkillFactory,
  SkillReviewFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

test.group('Integration | Review session projection', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(async () => {
    await cacheStore.deleteByPattern('review:session:v4:*')
    await cleanupTestData()
  })

  test('hydrates detail identities while keeping the public reviewee list anonymous', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewee = await UserFactory.create({ current_organization_id: org.id })
    const reviewer = await UserFactory.create({ current_organization_id: org.id })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
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
    const skill = await SkillFactory.create({
      skill_name: 'Historical Review Skill',
      category_code: 'technology',
      is_active: false,
    })
    await SkillReviewFactory.create({
      review_session_id: session.id,
      reviewer_id: reviewer.id,
      reviewer_type: 'manager',
      skill_id: skill.id,
      assigned_public_proficiency_code: 'l8',
    })

    const detail = await new GetReviewSessionQuery(
      makeSystemReviewActionContext(owner.id),
      new TaskReviewAssignmentProjectionReaderAdapter(),
      new UserReviewModeratorIdentityProjectionReaderAdapter(),
      new SkillReviewIdentityReaderAdapter(),
      new LucidReviewSessionReadStore()
    ).handle(new GetReviewSessionDTO(session.id))
    assert.deepEqual(detail.reviewee, {
      id: reviewee.id,
      username: reviewee.username,
      email: reviewee.email,
    })
    assert.notProperty(detail.reviewee ?? {}, 'phone')
    assert.notProperty(detail.reviewee ?? {}, 'address')
    assert.notProperty(detail.reviewee ?? {}, 'profile_settings')
    assert.notProperty(detail.reviewee ?? {}, 'trust_data')
    assert.equal(detail.task_assignment.id, assignment.id)
    assert.equal(detail.task_assignment.task?.id, task.id)
    assert.equal(detail.task_assignment.task?.title, task.title)
    assert.notProperty(detail.task_assignment.task ?? {}, 'project')
    assert.notProperty(detail.task_assignment.task ?? {}, 'organization')
    assert.notProperty(detail.task_assignment.task ?? {}, 'creator')
    assert.notProperty(detail.task_assignment.task ?? {}, 'projectId')
    assert.notProperty(detail.task_assignment.task ?? {}, 'organizationId')
    assert.lengthOf(detail.skill_reviews, 1)
    assert.deepInclude(detail.skill_reviews[0], {
      reviewer_id: reviewer.id,
      skill_id: skill.id,
      skill: {
        id: skill.id,
        skill_name: 'Historical Review Skill',
        category_code: 'technology',
        is_active: false,
      },
      reviewer: {
        id: reviewer.id,
        username: reviewer.username,
        email: reviewer.email,
      },
    })

    const publicList = await new GetUserReviewsQuery(
      makeSystemReviewActionContext(reviewee.id),
      new TaskReviewAssignmentProjectionReaderAdapter(),
      new UserReviewModeratorIdentityProjectionReaderAdapter(),
      new SkillReviewIdentityReaderAdapter(),
      new LucidReviewSessionReadStore()
    ).handle(new GetUserReviewsDTO({ user_id: reviewee.id, page: 1, per_page: 10 }))
    const listedReview = publicList.data
      .find((item) => item.id === session.id)
      ?.skill_reviews.find((item) => item.id === detail.skill_reviews[0]?.id)
    assert.isDefined(listedReview)
    assert.equal(listedReview?.skill.skill_name, 'Historical Review Skill')
    assert.notProperty(listedReview ?? {}, 'reviewer')
    const listedSession = publicList.data.find((item) => item.id === session.id)
    assert.deepEqual(listedSession?.task_assignment, {
      id: assignment.id,
      task_id: task.id,
      task: {
        id: task.id,
        title: task.title,
      },
    })
    assert.notProperty(listedSession?.task_assignment ?? {}, 'assignee_id')
    assert.notProperty(listedSession?.task_assignment ?? {}, 'completion_notes')
    assert.notProperty(listedSession?.task_assignment.task ?? {}, 'description')
  })
})
