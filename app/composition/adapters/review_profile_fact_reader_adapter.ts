import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import ListProfileReviewFactsV1Query from '#modules/reviews/actions/queries/list_profile_review_facts_v1_query'
import { LucidProfileReviewFactSourceReader } from '#modules/reviews/infra/adapters/lucid_review_fact_source_readers'
import SkillRepository from '#modules/skills/infra/repositories/skill_repository'
import type {
  UserProfileReviewFact,
  UserProfileReviewFactReader,
} from '#modules/users/actions/ports/outbound/user_profile_review_fact_reader'

export class ReviewProfileFactReaderAdapter implements UserProfileReviewFactReader {
  async listProfileReviewFacts(
    revieweeUserId: string,
    taskAssignmentIds: string[],
    trx: TransactionClientContract
  ): Promise<UserProfileReviewFact[]> {
    const facts = await new ListProfileReviewFactsV1Query(
      new LucidProfileReviewFactSourceReader()
    ).execute(
      revieweeUserId,
      taskAssignmentIds,
      trx
    )
    const skillIds = [
      ...new Set(
        facts.flatMap((fact) =>
          fact.disposition === 'replacement'
            ? fact.skillRatings.map((rating) => rating.skillId)
            : []
        )
      ),
    ]
    const skills = skillIds.length > 0 ? await SkillRepository.findByIds(skillIds, trx) : []
    const skillNameById = new Map(skills.map((skill) => [skill.id, skill.skill_name]))

    return facts.map((fact) => {
      if (fact.disposition === 'tombstone') {
        return {
          disposition: 'tombstone',
          taskAssignmentId: fact.taskAssignmentId,
          sourceUpdatedAt: fact.sourceUpdatedAt,
        }
      }

      return {
        disposition: 'replacement',
        taskAssignmentId: fact.taskAssignmentId,
        sourceUpdatedAt: fact.sourceUpdatedAt,
        overallQualityScore: fact.overallQualityScore,
        skillRatings: fact.skillRatings.map((rating) => {
          const skillName = skillNameById.get(rating.skillId)
          if (!skillName) {
            throw new InvariantViolationException(
              `Profile review fact references unknown skill ${rating.skillId}`
            )
          }

          return {
            skillId: rating.skillId,
            skillName,
            assignedPublicProficiencyCode: rating.assignedPublicProficiencyCode,
            reviewerType: rating.reviewerType,
          }
        }),
        evidences: fact.evidences,
      }
    })
  }
}

export const profileReviewFactReader = new ReviewProfileFactReaderAdapter()
