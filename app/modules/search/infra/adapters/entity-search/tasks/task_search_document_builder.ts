import type { TaskSearchDocumentReader } from '#modules/search/actions/ports/outbound/task_search_document_reader'
import type { TaskSearchDocument } from '#modules/search/domain/entity-search/task_search_document'

function distinctCount(values: readonly string[]): number {
  return new Set(values).size
}

export class TaskSearchDocumentBuilder {
  constructor(private readonly taskSearchDocumentReader: TaskSearchDocumentReader) {}

  async build(taskId: string): Promise<TaskSearchDocument> {
    const task = await this.taskSearchDocumentReader.findTaskSearchDocumentRecord(taskId)
    const requiredSkillIds = task.requiredSkills.map((skill) => skill.skillId)
    const requiredSkillCategoryCodes = task.requiredSkills.map((skill) => skill.categoryCode)
    const marketplaceVisible = ['external', 'all'].includes(task.taskVisibility)
    const memberVisible = ['internal', 'external', 'all'].includes(task.taskVisibility)

    return {
      task_id: task.taskId,
      organization_id: task.organizationId,
      creator_id: task.creatorId,
      project_id: task.projectId,
      title: task.title,
      description: task.description ?? '',
      acceptance_criteria: task.acceptanceCriteria ?? '',
      context_background: task.contextBackground,
      required_skill_ids: requiredSkillIds,
      required_skill_ids_known: true,
      required_skill_ids_count: distinctCount(requiredSkillIds),
      required_skill_category_codes: requiredSkillCategoryCodes,
      required_skill_category_codes_known: true,
      required_skill_category_codes_count: distinctCount(requiredSkillCategoryCodes),
      required_skills_text: task.requiredSkills.map((skill) => skill.skillName).join(' '),
      business_domains: task.businessDomains,
      business_domains_coverage: task.businessDomainsCoverage,
      ...(task.businessDomainsCoverage === 'missing'
        ? {}
        : {
            business_domains_known: true as const,
            business_domains_count: distinctCount(task.businessDomains),
          }),
      problem_categories: task.problemCategories,
      problem_categories_coverage: task.problemCategoriesCoverage,
      ...(task.problemCategoriesCoverage === 'missing'
        ? {}
        : {
            problem_categories_known: true as const,
            problem_categories_count: distinctCount(task.problemCategories),
          }),
      task_types: task.taskTypes,
      task_types_coverage: task.taskTypesCoverage,
      ...(task.taskTypesCoverage === 'missing'
        ? {}
        : {
            task_types_known: true as const,
            task_types_count: distinctCount(task.taskTypes),
          }),
      difficulty: task.difficulty,
      status: task.status,
      label: task.label,
      priority: task.priority,
      task_visibility: task.taskVisibility,
      is_public: marketplaceVisible,
      is_deleted: task.deletedAt !== null,
      marketplace_visible: marketplaceVisible,
      // Deletion is a separate permission predicate and deadline validity is a dynamic date filter.
      // This stable marker intentionally means only marketplace-visible plus currently unassigned.
      application_eligible: marketplaceVisible && task.assignedTo === null,
      member_visible: memberVisible,
      assigned_to: task.assignedTo,
      verification_method: task.verificationMethod,
      tech_stack: task.techStack,
      ...(task.techStackKnown
        ? { tech_stack_known: true as const, tech_stack_count: distinctCount(task.techStack) }
        : {}),
      domain_tags: task.domainTags,
      ...(task.domainTagsKnown
        ? { domain_tags_known: true as const, domain_tags_count: distinctCount(task.domainTags) }
        : {}),
      learning_objectives: task.learningObjectives,
      ...(task.learningObjectivesKnown
        ? {
            learning_objectives_known: true as const,
            learning_objectives_count: distinctCount(task.learningObjectives),
          }
        : {}),
      ...(task.canonicalMetadata ?? {}),
      role_in_task: task.roleInTask,
      autonomy_level: task.autonomyLevel,
      collaboration_type: task.collaborationType,
      impact_scope: task.impactScope,
      environment: task.environment,
      application_deadline: task.applicationDeadline,
      due_date: task.dueDate,
      created_at: task.createdAt,
      estimated_users_affected: task.estimatedUsersAffected,
      external_applications_count: task.externalApplicationsCount,
      deleted_at: task.deletedAt,
      updated_at: task.updatedAt,
    }
  }
}
