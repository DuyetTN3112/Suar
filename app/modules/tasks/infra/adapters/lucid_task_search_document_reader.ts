import type {
  TaskSearchDocumentReader,
  TaskSearchDocumentRecord,
} from '#modules/tasks/application/ports/task_search_document_reader'
import Task from '#modules/tasks/infra/models/task'

export class LucidTaskSearchDocumentReader implements TaskSearchDocumentReader {
  async findTaskSearchDocumentRecord(taskId: string): Promise<TaskSearchDocumentRecord> {
    const task = await Task.query()
      .where('id', taskId)
      .preload('required_skills_rel', (query) => {
        void query.preload('skill')
      })
      .firstOrFail()

    const requiredSkills = task.required_skills_rel.map((requiredSkill) => requiredSkill.skill)

    return {
      taskId: task.id,
      organizationId: task.organization_id,
      title: task.title,
      description: task.description,
      acceptanceCriteria: task.acceptance_criteria,
      contextBackground: task.context_background,
      requiredSkills: requiredSkills.map((skill) => ({
        skillId: skill.id,
        skillName: skill.skill_name,
      })),
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
