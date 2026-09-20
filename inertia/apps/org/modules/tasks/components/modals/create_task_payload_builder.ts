import type { TaskCreateFormData } from '@/apps/org/modules/tasks/types/create_form_types'
import { toIsoDueAt } from '@/apps/shared/tasks/task_schedule'

export const parseListInput = (raw: string): string[] =>
  raw
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

export function buildOrgFreshPayload(
  formData: TaskCreateFormData,
  projectProfessionalRoleId: string,
  isDocumentationItem: boolean
): Record<string, unknown> {
  const authoringMode = isDocumentationItem ? 'operational_only' : 'evidence_enabled'
  const authoringIntent = isDocumentationItem
    ? 'save_draft'
    : formData.authoring_intent ?? 'publish'
  const referenceUri = formData.supporting_reference_uri?.trim() ?? ''
  const referenceTitle = formData.supporting_reference_title?.trim() ?? ''
  const listItems = (raw: string | undefined) =>
    parseListInput(raw ?? '').map((text) => ({
      id: crypto.randomUUID(),
      title: text,
      description: text,
    }))
  const deliverables = listItems(formData.deliverables_text).map((item) => ({
    ...item,
    expectedFormat: null,
    expectedLocation: null,
  }))
  const acceptanceCriteria = parseListInput(formData.acceptance_criteria).map((statement) => ({
    id: crypto.randomUUID(),
    statement,
    verificationMethod: formData.verification_method,
    critical: true,
  }))
  const dependencies = listItems(formData.dependencies_text).map((item) => ({
    ...item,
    ownerId: null,
    state: 'available',
  }))
  const levelNumber = (value: string) => {
    const match = value.match(/\d+/)
    return match ? Number(match[0]) : null
  }
  // This records the reviewer's observation, not an extra evidence submission
  // required from the person doing the task.
  const evidenceRequirements: Array<{
    id: string
    type: string
    title: string
    description: string
    criterionIds: string[]
    deliverableIds: string[]
    required: boolean
    privacyClassification: string
  }> = authoringMode === 'evidence_enabled'
    ? [{
        id: crypto.randomUUID(),
        type: 'review_observation',
        title: `Đánh giá kết quả: ${formData.title.trim()}`,
        description: 'Người nghiệm thu đối chiếu kết quả công việc với tiêu chí nghiệm thu và đầu ra đã chốt.',
        criterionIds: acceptanceCriteria.map((criterion) => criterion.id),
        deliverableIds: deliverables.map((deliverable) => deliverable.id),
        required: true,
        privacyClassification: 'internal',
      }]
    : []
  const evidenceCapabilities =
    authoringMode === 'evidence_enabled'
      ? formData.required_skills.map((skill) => {
          const level = levelNumber(skill.level)
          return {
            id: crypto.randomUUID(),
            capabilityId: skill.id,
            capabilityName: skill.name,
            minimumLevel: level,
            targetLevel: levelNumber(skill.target_level_code ?? skill.level),
            assessmentCeiling: levelNumber(skill.assessment_ceiling_level_code ?? ''),
            rubricVersionId: skill.rubric_version_id ?? null,
            observableBehaviours: [`Demonstrates ${skill.name} through the task deliverables.`],
          }
        })
      : []
  const description = formData.description.trim()

  return {
    title: formData.title,
    description,
    taskStatusId: formData.task_status_id,
    projectId: formData.project_id,
    taskType: formData.task_type,
    verificationMethod: formData.verification_method,
    priority: formData.priority || undefined,
    label: formData.label || undefined,
    taskVisibility: formData.task_visibility,
    assignedTo:
      isDocumentationItem || authoringIntent === 'save_draft'
        ? undefined
        : formData.assigned_to || undefined,
    dueDate: formData.due_date || undefined,
    parentTaskId: formData.parent_task_id || undefined,
    estimatedTime: Number(formData.estimated_time || 0),
    projectProfessionalRoleId: projectProfessionalRoleId || undefined,
    requiredSkills: formData.required_skills.map((skill) => ({
      id: skill.id,
      level: skill.level,
      customName: skill.custom_name || undefined,
      categoryCode: skill.category_code || skill.categoryCode || undefined,
      projectSkillId: skill.project_skill_id || undefined,
      sourceProjectProfessionalRoleId: skill.source_project_professional_role_id || undefined,
      sourceRoleSkillId: skill.source_role_skill_id || undefined,
      minimumLevelId: skill.minimum_level_id || undefined,
      rubricVersionId: skill.rubric_version_id || undefined,
      isMandatory: skill.is_mandatory ?? true,
      importance: skill.importance || undefined,
      weight: skill.weight ?? undefined,
      requirementSource: skill.requirement_source || undefined,
      requirementNotes: skill.requirement_notes || undefined,
    })),
    acceptanceCriteria: formData.acceptance_criteria,
    contextBackground: formData.context_background || undefined,
    roleInTask: formData.role_in_task || undefined,
    problemCategory: formData.problem_category || undefined,
    authoring: {
      mode: authoringMode,
      intent: authoringIntent,
      idempotencyKey: `task-authoring:${crypto.randomUUID()}`,
      expectedHeadRevision: 0,
      creatorConfirmed:
        authoringIntent === 'publish' &&
        (formData.creator_confirmed ?? false),
      constraintsAddressed: formData.constraints_addressed ?? false,
      dependenciesAddressed: formData.dependencies_addressed ?? false,
      specification: {
        plainText: [
          formData.title,
          description,
          formData.context_background,
          formData.acceptance_criteria,
        ]
          .filter((value) => value.trim())
          .join('\n\n'),
      },
      workContract: {
        action: formData.task_type,
        object: formData.title,
        problemStatement: formData.context_background,
        desiredOutcome: formData.acceptance_criteria,
        roleInTask: formData.role_in_task,
        ownershipLevel: 'contributor',
        autonomyLevel: 'supervised',
        collaborationType: 'team',
        environment: 'application',
        complexityContext: {},
        impactScope: {},
        estimatedUsersAffected: 1,
        dueAt: formData.due_date
          ? (toIsoDueAt(formData.due_date) ?? new Date(Date.now() + 86400000).toISOString())
          : new Date(Date.now() + 86400000).toISOString(),
        scope: listItems(formData.scope_text),
        outOfScope: listItems(formData.out_of_scope_text),
        deliverables,
        acceptanceCriteria,
        qualityRequirements: listItems(formData.quality_requirements_text),
        constraints: listItems(formData.constraints_text),
        dependencies,
      },
      evidenceContract: {
        mode: authoringMode,
        requirements: evidenceRequirements,
        verificationMethods: formData.verification_method ? [formData.verification_method] : [],
        verifierPolicy: {
          reviewerIds: formData.reviewer_user_id ? [formData.reviewer_user_id] : [],
          reviewerRoleCodes: [],
          minimumReviewers: authoringMode === 'evidence_enabled' ? 1 : 0,
          disallowSelfReview: true,
        },
        reviewerVisibility: formData.reviewer_visibility ?? 'project',
        capabilities: evidenceCapabilities,
        profileEligibility: authoringMode === 'evidence_enabled',
        privacyClassification: 'internal',
      },
      ...(referenceUri
        ? {
            supportingReferences: [
              {
                type: 'url',
                uri: referenceUri,
                title: referenceTitle || formData.title.trim(),
                relevantSection: 'specification',
                relation: 'requirement_source',
                accessState: 'unknown',
                privacyClassification: 'internal',
              },
            ],
          }
        : {}),
    },
  }
}

export function cleanOrgFrozenCreatePayload(
  frozenPayload: Record<string, unknown>
): Record<string, unknown> {
  const requiredSkills = frozenPayload.requiredSkills
  if (Array.isArray(requiredSkills)) {
    return {
      ...frozenPayload,
      requiredSkills: requiredSkills.map((skill) => {
        if (!skill || typeof skill !== 'object') return skill as unknown
        const {
          targetLevelId: _targetLevelId,
          assessmentCeilingLevelId: _assessmentCeilingLevelId,
          target_level_id: _targetSnakeLevelId,
          assessment_ceiling_level_id: _assessmentCeilingSnakeLevelId,
          ...minimumOnlySkill
        } = skill as Record<string, unknown>
        return minimumOnlySkill
      }),
    }
  }
  return frozenPayload
}
export * from './create_task_page_payload_builder.js'

