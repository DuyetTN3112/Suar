import type { TaskCreateFormData } from '@/apps/org/modules/tasks/types/create_form_types'
import { toIsoDueAt } from '@/apps/shared/tasks/task_schedule'

import { parseListInput } from './create_task_payload_builder.js'

export const normalizeOptionalString = (value: string | undefined | null): string | undefined =>
  value && value.trim().length > 0 ? value.trim() : undefined

export function buildOrgTaskCreatePayload(
  formData: TaskCreateFormData,
  projectProfessionalRoleId: string,
  isDocumentationItem: boolean,
  intent: TaskCreateFormData['authoring_intent']
): Record<string, unknown> {
  const authoringMode = isDocumentationItem ? 'operational_only' : 'evidence_enabled'
  const resolvedIntent = isDocumentationItem
    ? 'save_draft'
    : (intent ?? 'save_draft')
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
  const evidenceRequirements =
    authoringMode === 'evidence_enabled'
      ? [
          {
            id: crypto.randomUUID(),
            type: 'review_observation',
            title: `Đánh giá kết quả: ${formData.title.trim()}`,
            description:
              'Người nghiệm thu đối chiếu kết quả công việc với tiêu chí nghiệm thu và đầu ra đã chốt.',
            criterionIds: acceptanceCriteria.map((criterion) => criterion.id),
            deliverableIds: deliverables.map((deliverable) => deliverable.id),
            required: true,
            privacyClassification: 'internal',
          },
        ]
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

  return {
    title: formData.title,
    description: formData.description,
    taskStatusId: formData.task_status_id,
    projectId: formData.project_id,
    taskType: formData.task_type,
    verificationMethod: formData.verification_method,
    priority: normalizeOptionalString(formData.priority),
    label: normalizeOptionalString(formData.label),
    taskVisibility: formData.task_visibility,
    assignedTo:
      !isDocumentationItem && resolvedIntent === 'publish'
        ? normalizeOptionalString(formData.assigned_to)
        : undefined,
    dueDate: normalizeOptionalString(formData.due_date),
    parentTaskId: normalizeOptionalString(formData.parent_task_id),
    estimatedTime: Number(normalizeOptionalString(formData.estimated_time) ?? 0),
    projectProfessionalRoleId: normalizeOptionalString(projectProfessionalRoleId),
    requiredSkills: formData.required_skills.map((skill) => ({
      id: skill.id,
      level: skill.level,
      customName: skill.custom_name ?? undefined,
      categoryCode: skill.category_code ?? skill.categoryCode ?? undefined,
      projectSkillId: skill.project_skill_id ?? undefined,
      sourceProjectProfessionalRoleId: skill.source_project_professional_role_id ?? undefined,
      sourceRoleSkillId: skill.source_role_skill_id ?? undefined,
      minimumLevelId: skill.minimum_level_id ?? undefined,
      targetLevelId: skill.target_level_id ?? undefined,
      assessmentCeilingLevelId: skill.assessment_ceiling_level_id ?? undefined,
      rubricVersionId: skill.rubric_version_id ?? undefined,
      isMandatory: skill.is_mandatory ?? true,
      importance: skill.importance ?? undefined,
      weight: skill.weight ?? undefined,
      requirementSource: skill.requirement_source ?? undefined,
      requirementNotes: skill.requirement_notes ?? undefined,
    })),
    acceptanceCriteria: formData.acceptance_criteria,
    contextBackground: normalizeOptionalString(formData.context_background),
    roleInTask: normalizeOptionalString(formData.role_in_task),
    problemCategory: normalizeOptionalString(formData.problem_category),
    authoring: {
      mode: authoringMode,
      intent: resolvedIntent,
      idempotencyKey: `task-authoring:${crypto.randomUUID()}`,
      expectedHeadRevision: 0,
      creatorConfirmed: resolvedIntent === 'publish' && (formData.creator_confirmed ?? false),
      constraintsAddressed: formData.constraints_addressed ?? false,
      dependenciesAddressed: formData.dependencies_addressed ?? false,
      specification: {
        plainText: [
          formData.title,
          formData.description,
          formData.context_background,
          formData.acceptance_criteria,
        ]
          .filter((value) => value.trim().length > 0)
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
          ? (toIsoDueAt(formData.due_date) ?? new Date(Date.now() + 7 * 86_400_000).toISOString())
          : new Date(Date.now() + 7 * 86_400_000).toISOString(),
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
