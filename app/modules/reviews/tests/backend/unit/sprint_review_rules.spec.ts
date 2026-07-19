import { test } from '@japa/runner'

import {
  canTransitionProjectSprint,
  resolveEligibleManagerTargets,
  validateSprintReviewPackage,
} from '#modules/reviews/domain/sprint-review/sprint_review_rules'

test.group('Sprint review rules', () => {
  test('project sprint can open review only from active state by sprint manager', ({ assert }) => {
    assert.isTrue(
      canTransitionProjectSprint({
        from: 'active',
        to: 'review_open',
        actorCanManageSprint: true,
      }).allowed
    )

    assert.isFalse(
      canTransitionProjectSprint({
        from: 'draft',
        to: 'review_open',
        actorCanManageSprint: true,
      }).allowed
    )

    assert.isFalse(
      canTransitionProjectSprint({
        from: 'active',
        to: 'review_open',
        actorCanManageSprint: false,
      }).allowed
    )
  })

  test('project sprint follows the explicit lifecycle order', ({ assert }) => {
    assert.isTrue(
      canTransitionProjectSprint({
        from: 'draft',
        to: 'active',
        actorCanManageSprint: true,
      }).allowed
    )

    assert.isTrue(
      canTransitionProjectSprint({
        from: 'review_open',
        to: 'review_closed',
        actorCanManageSprint: true,
      }).allowed
    )

    assert.isTrue(
      canTransitionProjectSprint({
        from: 'review_closed',
        to: 'archived',
        actorCanManageSprint: true,
      }).allowed
    )

    assert.isFalse(
      canTransitionProjectSprint({
        from: 'archived',
        to: 'active',
        actorCanManageSprint: true,
      }).allowed
    )
  })

  test('manager target resolver uses real sprint interaction evidence', ({ assert }) => {
    const targets = resolveEligibleManagerTargets({
      reviewerId: 'worker-1',
      candidates: [
        {
          userId: 'manager-1',
          assignedTaskCount: 2,
          createdTaskCount: 0,
          projectManagerDuringSprint: false,
          projectOwnerDuringSprint: false,
          explicitSprintLead: false,
        },
        {
          userId: 'manager-1',
          assignedTaskCount: 0,
          createdTaskCount: 1,
          projectManagerDuringSprint: false,
          projectOwnerDuringSprint: false,
          explicitSprintLead: false,
        },
        {
          userId: 'lead-1',
          assignedTaskCount: 0,
          createdTaskCount: 0,
          projectManagerDuringSprint: true,
          projectOwnerDuringSprint: false,
          explicitSprintLead: false,
        },
        {
          userId: 'worker-1',
          assignedTaskCount: 3,
          createdTaskCount: 0,
          projectManagerDuringSprint: false,
          projectOwnerDuringSprint: false,
          explicitSprintLead: false,
        },
        {
          userId: 'spectator-1',
          assignedTaskCount: 0,
          createdTaskCount: 0,
          projectManagerDuringSprint: false,
          projectOwnerDuringSprint: false,
          explicitSprintLead: false,
        },
      ],
    })

    assert.deepEqual(targets, [
      {
        userId: 'lead-1',
        targetRole: 'manager',
        evidenceCount: 1,
      },
      {
        userId: 'manager-1',
        targetRole: 'assigner',
        evidenceCount: 3,
      },
    ])
  })

  test('manager target resolver prioritizes authority roles before normal assigners', ({
    assert,
  }) => {
    const targets = resolveEligibleManagerTargets({
      reviewerId: 'worker-1',
      candidates: [
        {
          userId: 'assigner-1',
          assignedTaskCount: 3,
          createdTaskCount: 0,
          projectManagerDuringSprint: false,
          projectOwnerDuringSprint: false,
          explicitSprintLead: false,
        },
        {
          userId: 'owner-1',
          assignedTaskCount: 0,
          createdTaskCount: 0,
          projectManagerDuringSprint: false,
          projectOwnerDuringSprint: true,
          explicitSprintLead: false,
        },
        {
          userId: 'manager-1',
          assignedTaskCount: 0,
          createdTaskCount: 1,
          projectManagerDuringSprint: true,
          projectOwnerDuringSprint: false,
          explicitSprintLead: false,
        },
      ],
    })

    assert.deepEqual(
      targets.map((target) => target.targetRole),
      ['owner', 'manager', 'assigner']
    )
  })

  test('submitted package requires separate project and organization environment reviews', ({
    assert,
  }) => {
    const result = validateSprintReviewPackage({
      reviewerId: 'worker-1',
      eligibleManagerTargetIds: [],
      environmentReviews: [
        {
          targetType: 'project',
          targetId: 'project-1',
          rating: 4,
        },
      ],
      managerReviews: [],
    })

    assert.isFalse(result.allowed)
    assert.include(result.reason ?? '', 'organization')
  })

  test('package accepts multiple eligible manager targets and rejects self review', ({ assert }) => {
    const valid = validateSprintReviewPackage({
      reviewerId: 'worker-1',
      eligibleManagerTargetIds: ['manager-1', 'manager-2'],
      environmentReviews: [
        {
          targetType: 'project',
          targetId: 'project-1',
          rating: 4,
        },
        {
          targetType: 'organization',
          targetId: 'org-1',
          rating: 3,
        },
      ],
      managerReviews: [
        {
          targetUserId: 'manager-1',
          rating: 5,
        },
        {
          targetUserId: 'manager-2',
          rating: 4,
        },
      ],
    })

    assert.isTrue(valid.allowed)

    const selfReview = validateSprintReviewPackage({
      reviewerId: 'worker-1',
      eligibleManagerTargetIds: ['worker-1'],
      environmentReviews: [
        {
          targetType: 'project',
          targetId: 'project-1',
          rating: 4,
        },
        {
          targetType: 'organization',
          targetId: 'org-1',
          rating: 3,
        },
      ],
      managerReviews: [
        {
          targetUserId: 'worker-1',
          rating: 5,
        },
      ],
    })

    assert.isFalse(selfReview.allowed)
    assert.include(selfReview.reason ?? '', 'self')
  })

  test('package rejects manager target outside eligible target list', ({ assert }) => {
    const result = validateSprintReviewPackage({
      reviewerId: 'worker-1',
      eligibleManagerTargetIds: ['manager-1'],
      environmentReviews: [
        {
          targetType: 'project',
          targetId: 'project-1',
          rating: 4,
        },
        {
          targetType: 'organization',
          targetId: 'org-1',
          rating: 3,
        },
      ],
      managerReviews: [
        {
          targetUserId: 'manager-2',
          rating: 5,
        },
      ],
    })

    assert.isFalse(result.allowed)
    assert.include(result.reason ?? '', 'eligible')
  })
})
