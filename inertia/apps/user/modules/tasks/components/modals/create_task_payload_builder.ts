import {
  taskBriefAcceptanceText,
  taskBriefCurrentStateText,
  taskBriefDeliverableText,
  taskBriefPlainText,
  taskBriefQualityText,
  taskBriefRuleText,
  taskBriefText,
  taskBriefWorkItemText,
} from '@/apps/shared/tasks/task_brief_contract'
import { toIsoDueAt } from '@/apps/shared/tasks/task_schedule'
import type { TaskCreateFormData } from '@/apps/user/modules/tasks/types/create_form_types'

export function buildTaskFreshPayload(
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
  // IDs in the task brief are UI-only keys (the initial rows use values such
  // as `initial-work-item`).  The versioned Task Contract has a stricter
  // boundary: every contract entity must use a UUID.  Keep the draft keys in
  // the editor, but issue contract IDs while projecting the draft payload.
  const contractId = () => crypto.randomUUID()
  const hasText = (value: string) => value.trim().length > 0
  const brief = {
    ...formData.brief,
    workItems: formData.brief.workItems.filter((item) =>
      [item.affectedArea, item.requiredChange, item.resultingBehaviour].every(hasText)
    ),
    scope: formData.brief.scope.filter((item) => hasText(item.text)),
    outOfScope: formData.brief.outOfScope.filter((item) => hasText(item.text)),
    businessRules: formData.brief.businessRules.filter((item) =>
      [item.actor, item.condition, item.permission, item.systemResult].every(hasText)
    ),
    constraints: formData.brief.constraints.filter((item) => hasText(item.text)),
    dependencies: formData.brief.dependencies.filter((item) =>
      [item.dependency, item.owner].every(hasText)
    ),
    deliverables: formData.brief.deliverables.filter((item) =>
      [item.outputType, item.locationOrRecipient, item.minimumState].every(hasText)
    ),
    qualityRequirements: formData.brief.qualityRequirements.filter((item) =>
      [item.property, item.appliesTo, item.observableCheck].every(hasText)
    ),
    acceptanceCriteria: formData.brief.acceptanceCriteria.filter((item) =>
      [item.condition, item.action, item.observableResult].every(hasText)
    ),
    desiredValue:
      formData.brief.desiredValue &&
      [formData.brief.desiredValue.beneficiary, formData.brief.desiredValue.usefulState].every(hasText)
        ? formData.brief.desiredValue
        : null,
  }
  const description = isDocumentationItem
    ? formData.description.trim()
    : taskBriefPlainText(brief)
  const contextBackground = taskBriefCurrentStateText(brief)
  const deliverables = brief.deliverables.map((item) => ({
    id: contractId(),
    title: taskBriefText(item.outputType, item.locationOrRecipient),
    description: item.minimumState.trim(),
    expectedFormat: item.outputType.trim() || null,
    expectedLocation: item.locationOrRecipient.trim() || null,
  }))
  const acceptanceCriteria = brief.acceptanceCriteria.map((item) => ({
    id: contractId(),
    statement: taskBriefAcceptanceText(item),
    verificationMethod: formData.verification_method,
    critical: true,
  }))
  const dependencies = brief.dependencies.map((item) => ({
    id: contractId(),
    title: item.dependency.trim(),
    description: item.owner.trim(),
    ownerId: null,
    state: item.state,
  }))
  const levelNumber = (value: string) => {
    const match = value.match(/\d+/)
    return match ? Number(match[0]) : null
  }
  // Evidence is optional governance metadata. It must never be synthesized as
  // a required hand-off from the assignee during ordinary task completion.
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
  const specificationSections = ([
    ['work_items', 'Phần việc', brief.workItems.map(taskBriefWorkItemText)],
    ['current_state', 'Hiện trạng và ảnh hưởng', [contextBackground]],
    ['scope', 'Phạm vi', brief.scope.map((item) => item.text.trim())],
    ['out_of_scope', 'Ngoài phạm vi', brief.outOfScope.map((item) => item.text.trim())],
    ['business_rules', 'Quy tắc nghiệp vụ', brief.businessRules.map(taskBriefRuleText)],
    ['constraints', 'Giới hạn', brief.constraints.map((item) => item.text.trim())],
    ['dependencies', 'Phụ thuộc', brief.dependencies.map((item) => taskBriefText(item.dependency, item.owner, item.state))],
    ['deliverables', 'Đầu ra bàn giao', brief.deliverables.map(taskBriefDeliverableText)],
    ['quality', 'Yêu cầu chất lượng', brief.qualityRequirements.map(taskBriefQualityText)],
    ['acceptance', 'Tiêu chí nghiệm thu', brief.acceptanceCriteria.map(taskBriefAcceptanceText)],
    ['desired_value', 'Giá trị mong muốn', brief.desiredValue ? [taskBriefText(brief.desiredValue.beneficiary, brief.desiredValue.usefulState)] : []],
  ] as Array<[string, string, string[]]>).map(([key, title, lines]) => ({
    id: crypto.randomUUID(),
    key,
    title,
    plainText: lines.filter(Boolean).join('\n'),
    critical: ['work_items', 'current_state', 'scope', 'deliverables', 'acceptance'].includes(key),
    hasTextEquivalent: true,
  })).filter((section) => section.plainText.length > 0)

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
    acceptanceCriteria: acceptanceCriteria.map((item) => item.statement).join('\n'),
    contextBackground: contextBackground || undefined,
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
          contextBackground,
          acceptanceCriteria.map((item) => item.statement).join('\n'),
        ]
          .filter((value) => value.trim())
          .join('\n\n'),
        richContent: brief,
        sections: specificationSections,
      },
      workContract: {
        action: brief.workItems[0]?.requiredChange.trim() || formData.task_type,
        object: formData.title,
        problemStatement: contextBackground,
        desiredOutcome: brief.desiredValue
          ? taskBriefText(brief.desiredValue.beneficiary, brief.desiredValue.usefulState)
          : acceptanceCriteria.map((item) => item.statement).join('\n'),
        roleInTask: 'Không áp dụng',
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
        scope: [
          ...brief.workItems.map((item) => ({
            id: contractId(),
            title: item.affectedArea.trim(),
            description: taskBriefText(item.requiredChange, item.resultingBehaviour),
          })),
          ...brief.scope.map((item) => ({ id: contractId(), title: item.text.trim(), description: item.text.trim() })),
        ],
        outOfScope: brief.outOfScope.map((item) => ({ id: contractId(), title: item.text.trim(), description: item.text.trim() })),
        deliverables,
        acceptanceCriteria,
        qualityRequirements: brief.qualityRequirements.map((item) => ({
          id: contractId(),
          title: taskBriefText(item.property, item.appliesTo),
          description: item.observableCheck.trim(),
        })),
        constraints: brief.constraints.map((item) => ({ id: contractId(), title: item.text.trim(), description: item.text.trim() })),
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

export function cleanFrozenCreatePayload(
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
