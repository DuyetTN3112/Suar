import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { TaskSkillReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import Task from '#modules/tasks/infra/models/task'

export class LucidTaskSearchDocumentReader {
  constructor(private readonly skillReader: TaskSkillReader) {}

  async findTaskSearchDocumentRecord(taskId: string) {
    const task = await Task.query()
      .where('id', taskId)
      .preload('required_skills_rel', (query) => {
        void query.orderBy('created_at', 'asc').orderBy('id', 'asc')
      })
      .firstOrFail()

    const requiredSkillIds = task.required_skills_rel.map((requiredSkill) => requiredSkill.skill_id)
    const distinctRequiredSkillIds = [...new Set(requiredSkillIds)]
    const requiredSkills =
      await this.skillReader.findSkillSummariesByIds(distinctRequiredSkillIds)
    const requiredSkillsById = new Map(
      requiredSkills.map((requiredSkill) => [requiredSkill.skillId, requiredSkill])
    )
    const missingSkillIds = distinctRequiredSkillIds.filter(
      (skillId) => !requiredSkillsById.has(skillId)
    )

    if (missingSkillIds.length > 0) {
      throw new InvariantViolationException(
        `Task search document is missing required skill facts for task ${task.id}: ${missingSkillIds.join(', ')}`,
        {
          details: {
            taskId: task.id,
            missingSkillIds,
          },
        }
      )
    }

    const requiredSkillsInRequirementOrder = requiredSkillIds.map((skillId) => {
      const skill = requiredSkillsById.get(skillId)
      if (!skill) {
        throw new InvariantViolationException(
          `Task search document lost required skill fact ${skillId} while assembling task ${task.id}`,
          {
            details: {
              taskId: task.id,
              missingSkillIds: [skillId],
            },
          }
        )
      }
      return skill
    })

    return {
      taskId: task.id,
      organizationId: task.organization_id,
      title: task.title,
      description: task.description,
      acceptanceCriteria: task.acceptance_criteria,
      contextBackground: task.context_background,
      requiredSkills: requiredSkillsInRequirementOrder,
      businessDomain: task.business_domain,
      problemCategory: task.problem_category,
      taskType: task.task_type,
      difficulty: task.difficulty,
      taskVisibility: task.task_visibility,
      assignedTo: task.assigned_to,
      deletedAt: task.deleted_at?.toISO() ?? null,
      updatedAt: task.updated_at.toISO() ?? new Date().toISOString(),
    }
  }
}
