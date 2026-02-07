import { createForCompletedAssignmentIfMissing } from './review_session_mutations.js'

import type { ReviewSessionCommandRepositoryPort } from '#modules/reviews/actions/ports/review_session_command_repository_port'


export const reviewSessionCommandRepository: ReviewSessionCommandRepositoryPort = {
  createForCompletedAssignmentIfMissing,
}

