import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { parsePersistedStringArray } from '#modules/errors/public_contracts/persisted_json_array'
import { projectTaskCanonicalMetadata } from '#modules/search/public_contracts/task_canonical_metadata_projection'
import type { TaskSkillReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import { TASK_METADATA_CANONICAL_NAMESPACES } from '#modules/tasks/actions/ports/outbound/task_metadata_assignment_source_reader'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import type { MetadataAssignmentProvider } from '#modules/taxonomy/public_contracts/taxonomy-governance/metadata_assignment_provider'

interface PersistedDateValue {
  toISO(): string | null
}

function legacyClassification(value: string | null | undefined): {
  values: string[]
  coverage: 'legacy_single_value' | 'missing'
} {
  const normalized = value?.trim()
  return normalized
    ? { values: [normalized], coverage: 'legacy_single_value' }
    : { values: [], coverage: 'missing' }
}

function projectBusinessDomainClassification(
  value: unknown,
  taskId: string,
  legacyValue: string | null | undefined
): { values: string[]; coverage: 'complete' | 'legacy_single_value' | 'missing' } {
  const snapshot = persistedStringArray(value, {
    table: Task.table,
    field: 'project_business_domains',
    recordId: taskId,
  })

  // A present array is an immutable, controlled Project snapshot. An empty
  // array is meaningful too: the Project had no configured business domain.
  if (snapshot.known) return { values: snapshot.values, coverage: 'complete' }

  return legacyClassification(legacyValue)
}

function invalidPersistedDate(taskId: string, field: string): InvariantViolationException {
  return new InvariantViolationException(
    `Task search document has an invalid persisted date in ${field} for task ${taskId}`,
    {
      details: {
        taskId,
        field,
      },
    }
  )
}

function requiredIsoDate(
  value: PersistedDateValue | null | undefined,
  taskId: string,
  field: string
): string {
  const iso = value?.toISO()
  if (!iso) {
    throw invalidPersistedDate(taskId, field)
  }
  return iso
}

function optionalIsoDate(
  value: PersistedDateValue | null | undefined,
  taskId: string,
  field: string
): string | null {
  if (value === null || value === undefined) {
    return null
  }
  const iso = value.toISO()
  if (!iso) {
    throw invalidPersistedDate(taskId, field)
  }
  return iso
}

function persistedStringArray(
  value: unknown,
  input: { table: string; field: string; recordId: string }
): { values: string[]; known: boolean } {
  return value === null || value === undefined
    ? { values: [], known: false }
    : { values: parsePersistedStringArray(value, input), known: true }
}

export class LucidTaskSearchDocumentReader {
  constructor(
    private readonly skillReader: TaskSkillReader,
    private readonly metadataAssignmentProvider?: MetadataAssignmentProvider
  ) {}

  async findTaskSearchDocumentRecord(taskId: string) {
    const task = await Task.query()
      .where('id', taskId)
      .preload('required_skills_rel', (query) => {
        void query.orderBy('created_at', 'asc').orderBy('id', 'asc')
      })
      .firstOrFail()

    const requiredSkillIds = task.required_skills_rel.map((requiredSkill) => requiredSkill.skill_id)
    const distinctRequiredSkillIds = [...new Set(requiredSkillIds)]
    const requirementReferenceFacts = await this.skillReader.findTaskRequirementReferenceFacts({
      skillIds: distinctRequiredSkillIds,
      proficiencyLevelIds: [],
    })
    const requiredSkills = requirementReferenceFacts.skills.map((skill) => ({
      skillId: skill.id,
      skillName: skill.name,
      categoryCode: skill.categoryCode,
    }))
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
    const businessDomains = projectBusinessDomainClassification(
      task.project_business_domains,
      task.id,
      task.business_domain
    )
    const problemCategories = legacyClassification(task.problem_category)
    const taskTypes = legacyClassification(task.task_type)
    const techStack = persistedStringArray(task.tech_stack, {
      table: Task.table,
      field: 'tech_stack',
      recordId: task.id,
    })
    const domainTags = persistedStringArray(task.domain_tags, {
      table: Task.table,
      field: 'domain_tags',
      recordId: task.id,
    })
    const learningObjectives = persistedStringArray(task.learning_objectives, {
      table: Task.table,
      field: 'learning_objectives',
      recordId: task.id,
    })
    const canonicalMetadata = this.metadataAssignmentProvider
      ? projectTaskCanonicalMetadata(
          await this.metadataAssignmentProvider.getAssignments(
            {
              resource: 'task',
              entityIds: [task.id],
              namespaces: TASK_METADATA_CANONICAL_NAMESPACES,
            },
            { attributes: { authorizedTaskIds: [task.id] } }
          )
        )
      : undefined

    return {
      taskId: task.id,
      organizationId: task.organization_id,
      creatorId: task.creator_id,
      projectId: task.project_id,
      title: task.title,
      description: task.description,
      acceptanceCriteria: task.acceptance_criteria,
      contextBackground: task.context_background,
      requiredSkills: requiredSkillsInRequirementOrder,
      businessDomains: businessDomains.values,
      businessDomainsCoverage: businessDomains.coverage,
      problemCategories: problemCategories.values,
      problemCategoriesCoverage: problemCategories.coverage,
      taskTypes: taskTypes.values,
      taskTypesCoverage: taskTypes.coverage,
      difficulty: task.difficulty,
      status: task.status,
      label: task.label,
      priority: task.priority,
      taskVisibility: task.task_visibility,
      assignedTo: task.assigned_to,
      verificationMethod: task.verification_method,
      techStack: techStack.values,
      techStackKnown: techStack.known,
      domainTags: domainTags.values,
      domainTagsKnown: domainTags.known,
      learningObjectives: learningObjectives.values,
      learningObjectivesKnown: learningObjectives.known,
      ...(canonicalMetadata === undefined ? {} : { canonicalMetadata }),
      roleInTask: task.role_in_task,
      autonomyLevel: task.autonomy_level,
      collaborationType: task.collaboration_type,
      impactScope: task.impact_scope,
      environment: task.environment,
      applicationDeadline: optionalIsoDate(
        task.application_deadline,
        task.id,
        'application_deadline'
      ),
      dueDate: optionalIsoDate(task.due_date, task.id, 'due_date'),
      createdAt: requiredIsoDate(task.created_at, task.id, 'created_at'),
      estimatedUsersAffected: task.estimated_users_affected,
      externalApplicationsCount: task.external_applications_count,
      deletedAt: optionalIsoDate(task.deleted_at, task.id, 'deleted_at'),
      updatedAt: requiredIsoDate(task.updated_at, task.id, 'updated_at'),
    }
  }
}
