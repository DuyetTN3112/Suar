import db from '@adonisjs/lucid/services/db'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import type {
  ReviewSessionArtifactPersistenceSession,
  ReviewSessionArtifactUnitOfWork,
} from '#modules/reviews/actions/ports/outbound/review_session_artifact_unit_of_work'
import ReviewEvidenceRepository from '#modules/reviews/infra/repositories/review_evidence_repository'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import SkillReviewRepository from '#modules/reviews/infra/repositories/skill_review_repository'
import TaskSelfAssessmentRepository from '#modules/reviews/infra/repositories/task_self_assessment_repository'

export default class LucidReviewSessionArtifactUnitOfWork
  implements ReviewSessionArtifactUnitOfWork
{
  run<T>(work: (session: ReviewSessionArtifactPersistenceSession) => Promise<T>): Promise<T> {
    return db.transaction(async (transaction) => {
      const session: ReviewSessionArtifactPersistenceSession = {
        loadSession: async (reviewSessionId) => {
          const reviewSession = await ReviewSessionRepository.findById(
            reviewSessionId,
            transaction
          )
          if (!reviewSession) {
            return null
          }

          return {
            id: reviewSession.id,
            taskAssignmentId: reviewSession.task_assignment_id,
            revieweeId: reviewSession.reviewee_id,
            confirmationUserIds: (reviewSession.confirmations ?? []).map(
              (confirmation) => confirmation.user_id
            ),
          }
        },
        hasReviewAuthoredBy: async (reviewSessionId, actorId) => {
          const review = await SkillReviewRepository.findBySessionAndReviewer(
            reviewSessionId,
            actorId,
            transaction
          )
          return review !== null
        },
        findSelfAssessment: (taskAssignmentId, userId) =>
          TaskSelfAssessmentRepository.findByTaskAssignmentAndUser(
            taskAssignmentId,
            userId,
            transaction
          ),
        createSelfAssessment: (taskAssignmentId, userId, input) =>
          TaskSelfAssessmentRepository.create(
            {
              task_assignment_id: taskAssignmentId,
              user_id: userId,
              ...input,
            },
            transaction
          ),
        updateSelfAssessment: async (taskAssignmentId, userId, input) => {
          const assessment = await TaskSelfAssessmentRepository.findByTaskAssignmentAndUser(
            taskAssignmentId,
            userId,
            transaction
          )
          if (!assessment) {
            throw new PersistedDataIntegrityException(
              'Task self-assessment disappeared during transactional update',
              { taskAssignmentId, userId }
            )
          }

          assessment.merge(input)
          return TaskSelfAssessmentRepository.save(assessment, transaction)
        },
        createEvidence: (input) =>
          ReviewEvidenceRepository.create(
            {
              review_session_id: input.reviewSessionId,
              evidence_type: input.evidenceType,
              url: input.url,
              title: input.title,
              description: input.description,
              uploaded_by: input.uploadedBy,
            },
            transaction
          ),
        writeAudit: async (execCtx, input) => {
          await auditPublicApi.write(
            execCtx,
            {
              user_id: input.userId,
              action: input.action,
              critical: true,
              entity_type: 'review_session',
              entity_id: input.entityId,
              old_values: null,
              new_values: input.newValues,
            },
            transaction
          )
        },
      }

      return work(session)
    })
  }
}
