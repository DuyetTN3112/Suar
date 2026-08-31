import { test } from '@japa/runner'

import CreateReviewSessionCommand from '#modules/reviews/actions/commands/review-session/create_review_session_command'
import { CreateReviewSessionDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import type { ReviewCompletedAssignmentReader } from '#modules/reviews/actions/ports/outbound/review_completed_assignment_reader'
import type { ReviewSessionCreationUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_session_creation_unit_of_work'

test('create review session exposes expected application failures through the canonical Result', async ({
  assert,
}) => {
  const completedAssignments: ReviewCompletedAssignmentReader = {
    findCompletedAssignment: () => Promise.resolve(null),
  }
  const unitOfWork: ReviewSessionCreationUnitOfWork = {
    run: (work) =>
      work({
        transaction: {},
        findByTaskAssignment: () => Promise.resolve(null),
        resolveEffectiveCreatorReviewerId: () => Promise.resolve(null),
        create: () => Promise.reject(new Error('create should not run')),
        createReviewerAssignments: () => Promise.resolve(),
        writeCreatedAudit: () => Promise.resolve(),
      }),
  }
  const command = new CreateReviewSessionCommand(
    {
      userId: 'user-1',
      ip: '127.0.0.1',
      userAgent: 'unit-test',
      organizationId: null,
    },
    completedAssignments,
    unitOfWork
  )

  const result = await command.executeAndWrap(
    new CreateReviewSessionDTO({
      task_assignment_id: 'assignment-1',
      reviewee_id: 'user-1',
      required_peer_reviews: 1,
    })
  )

  assert.isTrue(result.isFailure())
  assert.equal(result.getError().code, 'E_BUSINESS_LOGIC')
})
