import type { TaskSearchDocument } from '#modules/search/domain/task_search_document'
import type { TaskSearchDocumentReader } from '#modules/tasks/application/ports/task_search_document_reader'
import { taskSearchDocumentReader as defaultTaskSearchDocumentReader } from '#modules/tasks/public_contracts/task_search_indexing'

export class TaskSearchDocumentBuilder {
  constructor(
    private readonly taskSearchDocumentReader: TaskSearchDocumentReader = defaultTaskSearchDocumentReader
  ) {}

  async build(taskId: string): Promise<TaskSearchDocument> {
    const task = await this.taskSearchDocumentReader.findTaskSearchDocumentRecord(taskId)

    return {
      task_id: task.taskId,
      organization_id: task.organizationId ?? '',
      title: task.title,
      description: task.description ?? '',
      acceptance_criteria: task.acceptanceCriteria ?? '',
      context_background: task.contextBackground,
      required_skill_ids: task.requiredSkills.map((skill) => skill.skillId),
      required_skills_text: task.requiredSkills.map((skill) => skill.skillName).join(' '),
      business_domain: task.businessDomain,
      problem_category: task.problemCategory,
      task_type: task.taskType,
      difficulty: task.difficulty,
      task_visibility: task.taskVisibility,
      is_public: ['external', 'all'].includes(task.taskVisibility),
      assigned_to: task.assignedTo,
      deleted_at: task.deletedAt,
      updated_at: task.updatedAt,
    }
  }
}
