import { skillApplication as skillPublicApi } from '#composition/skills_application_composition'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import FindTaskTalentMatchContextV1Query from '#modules/tasks/actions/queries/find_task_talent_match_context_v1_query'
import { LucidTaskFactSourceReader } from '#modules/tasks/infra/adapters/lucid_task_fact_source_reader'
import type {
  TalentTaskMatchContextReader,
  UserTalentTaskMatchContext,
} from '#modules/users/actions/ports/outbound/talent_task_match_context_reader'

export class TaskTalentMatchContextReaderAdapter
  implements TalentTaskMatchContextReader
{
  private readonly query = new FindTaskTalentMatchContextV1Query(
    new LucidTaskFactSourceReader()
  )

  async findTalentTaskMatchContext(
    lookup: string,
    organizationId: string | null
  ): Promise<UserTalentTaskMatchContext | null> {
    const context = await this.query.execute(lookup, organizationId)
    if (!context) return null

    const skillIds = [...new Set(context.requiredSkills.map((skill) => skill.skillId))]
    const skillFacts =
      skillIds.length > 0 ? await skillPublicApi.findSummaryFactsByIds(skillIds) : []
    const skillNamesById = new Map(skillFacts.map((skill) => [skill.id, skill.name]))

    return {
      taskId: context.taskId,
      businessDomain: context.businessDomain,
      problemCategory: context.problemCategory,
      taskType: context.taskType,
      requiredSkills: context.requiredSkills.map((skill) => {
        const skillName = skillNamesById.get(skill.skillId)
        if (!skillName) {
          throw new InvariantViolationException(
            `Talent task context references unknown skill ${skill.skillId}`
          )
        }

        return {
          skillId: skill.skillId,
          skillName,
          requiredPublicProficiencyCode: skill.requiredPublicProficiencyCode,
          isMandatory: skill.isMandatory,
          minimumLevelId: skill.minimumLevelId,
          targetLevelId: skill.targetLevelId,
          assessmentCeilingLevelId: skill.assessmentCeilingLevelId,
          importance: skill.importance,
          weight: skill.weight,
          projectSkillId: skill.projectSkillId,
          rubricVersionId: skill.rubricVersionId,
        }
      }),
    }
  }
}
