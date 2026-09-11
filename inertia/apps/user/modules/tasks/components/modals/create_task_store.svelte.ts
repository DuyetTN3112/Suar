import { page } from '@inertiajs/svelte'
import axios from 'axios'

import { isDocumentationTaskStatusId } from '@/apps/shared/tasks/documentation_task_status'
import {
  createEmptyTaskBrief,
  taskBriefAcceptanceText,
  taskBriefCurrentStateText,
  taskBriefDeliverableText,
  taskBriefPlainText,
  taskBriefQualityText,
  taskBriefRuleText,
  taskBriefText,
  taskBriefWorkItemText,
  type TaskBriefV2,
} from '@/apps/shared/tasks/task_brief_contract'
import {
  TASK_CREATE_VALIDATION_ORDER,
  validateTaskCreate,
  type TaskCreateIntent,
} from '@/apps/shared/tasks/task_create_validation'
import { toIsoDueAt } from '@/apps/shared/tasks/task_schedule'
import { findRoleMatchedProjectMembers } from '@/apps/user/modules/tasks/lib/create_prefill'
import { normalizeTaskMutationError } from '@/apps/user/modules/tasks/lib/errors/task_mutation_errors'
import {
  countTaskSkillsByCategory,
  formatTaskSkillCategoryViolations,
  getTaskSkillCategoryViolations,
} from '@/apps/user/modules/tasks/lib/rules/task_skill_category_rules'
import type { TaskCreateFormData } from '@/apps/user/modules/tasks/types/create_form_types'
import type {
  ProjectProfessionalRoleOption,
  ProjectProfessionalRolesResponse,
  ProjectDetailApiResponse,
  ProjectMemberCandidateResponse,
} from '@/apps/user/modules/tasks/types/create_task_types'
import type { TaskDetail } from '@/apps/user/modules/tasks/types/index.svelte'
import { FRONTEND_ROUTES } from '@/apps/user/shared/constants'
import { notificationStore } from '@/apps/user/shared/stores/notification_store.svelte'
import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

export interface CreateTaskStoreProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialStatus?: string
  initialProjectId?: string
  initialRoleId?: string
  statuses?: { value: string; label: string; slug?: string; category?: string }[]
  projects?: { id: string; name: string }[]
  users?: { id: string; username: string; email: string }[]
  onCreated?: (task: TaskDetail) => void
}

const TASK_CREATE_DRAFT_KEY_PREFIX = 'suar:task-create-draft:v1'

function taskCreateDraftKey(projectId: string, statusId: string): string {
  return `${TASK_CREATE_DRAFT_KEY_PREFIX}:${encodeURIComponent(projectId)}:${encodeURIComponent(statusId)}`
}

function createInitialTaskBrief(): TaskBriefV2 {
  return {
    ...createEmptyTaskBrief(),
    workItems: [
      {
        id: 'initial-work-item',
        affectedArea: '',
        requiredChange: '',
        resultingBehaviour: '',
      },
    ],
    scope: [{ id: 'initial-scope-item', text: '' }],
    outOfScope: [{ id: 'initial-out-of-scope-item', text: '' }],
    businessRules: [{
      id: 'initial-business-rule',
      actor: '',
      condition: '',
      permission: '',
      systemResult: '',
    }],
    constraints: [{ id: 'initial-constraint', text: '' }],
    dependencies: [{
      id: 'initial-dependency',
      dependency: '',
      owner: '',
      state: 'available',
    }],
    deliverables: [
      {
        id: 'initial-deliverable',
        outputType: '',
        locationOrRecipient: '',
        minimumState: '',
      },
    ],
    acceptanceCriteria: [
      {
        id: 'initial-acceptance-criterion',
        condition: '',
        action: '',
        observableResult: '',
      },
    ],
    qualityRequirements: [{
      id: 'initial-quality-requirement',
      property: '',
      appliesTo: '',
      observableCheck: '',
    }],
    desiredValue: { beneficiary: '', usefulState: '' },
  }
}

export function useCreateTaskStore(getProps: () => CreateTaskStoreProps) {
  const props = $derived(getProps())
  const { t } = useTranslation()
  const currentProjectId = $derived(
    (
      page as {
        props?: { auth?: { user?: { current_project?: { id?: string | null } | null } } }
      }
    ).props?.auth?.user?.current_project?.id ?? ''
  )

  let formData = $state<TaskCreateFormData>({
    title: '',
    description: '',
    task_status_id: '',
    task_type: 'feature_development',
    verification_method: 'code_review',
    project_id: '',
    priority: '',
    label: '',
    task_visibility: 'internal',
    reviewer_visibility: 'project',
    assigned_to: '',
    reviewer_user_id: '',
    due_date: '',
    parent_task_id: '',
    estimated_time: '0',
    required_skills: [],
    acceptance_criteria: '',
    context_background: '',
    role_in_task: '',
    business_domain: '',
    problem_category: '',
    tech_stack_text: '',
    learning_objectives_text: '',
    domain_tags_text: '',
    scope_text: '',
    out_of_scope_text: '',
    deliverables_text: '',
    quality_requirements_text: '',
    constraints_text: '',
    dependencies_text: '',
    authoring_mode: 'evidence_enabled',
    // A newly opened form is a draft until the creator deliberately chooses
    // “Publish and assign”. Do not present publish-only required fields first.
    authoring_intent: 'save_draft',
    creator_confirmed: false,
    constraints_addressed: false,
    dependencies_addressed: false,
    supporting_reference_uri: '',
    supporting_reference_title: '',
    reviewer_role_code: 'org_owner',
    profile_eligibility: true,
    brief: createInitialTaskBrief(),
  })

  let errors = $state<Record<string, string>>({})
  let formError = $state('')
  let submitting = $state(false)
  let wasOpen = $state(false)
  let selectedRoleId = $state('')
  let projectProfessionalRoleId = $state('')
  let availableRoles = $state<ProjectProfessionalRoleOption[]>([])
  let selectedProjectVisibility = $state<string | null>(null)
  let assigneeGroups = $state({
    projectMembers: [] as {
      id: string
      username: string
      email: string
      governanceRole?: string | null
      deliveryRoleName?: string | null
      projectProfessionalRoleId?: string | null
    }[],
    orgMembersOutsideProject: [] as {
      id: string
      username: string
      email: string
      orgRole?: string | null
    }[],
  })
  const prefilling = $state(false)
  let prefilledSkillCount = $state(0)
  let lastLoadedProjectId = ''
  let autoPrefillAttempted = $state(false)
  let assigneeGroupRequestKey = 0
  let frozenCreatePayload: Record<string, unknown> | null = null
  let activeDraftStorageKey = ''

  const roleMatchedProjectMembers = $derived(
    findRoleMatchedProjectMembers(selectedRoleId, assigneeGroups.projectMembers)
  )

  const scopedAssigneeUsers = $derived([
    ...assigneeGroups.projectMembers.map((member) => ({
      id: member.id,
      username: member.username,
      email: member.email,
    })),
    ...assigneeGroups.orgMembersOutsideProject
      .filter(
        (member) =>
          !assigneeGroups.projectMembers.some((projectMember) => projectMember.id === member.id)
      )
      .map((member) => ({
        id: member.id,
        username: member.username,
        email: member.email,
      })),
    ...(props.users || []).filter(
      (user) =>
        !assigneeGroups.projectMembers.some((member) => member.id === user.id) &&
        !assigneeGroups.orgMembersOutsideProject.some((member) => member.id === user.id)
    ),
  ])
  const isDocumentationItem = $derived(
    isDocumentationTaskStatusId(formData.task_status_id, props.statuses)
  )

  $effect(() => {
    if (!isDocumentationItem) return
    if (
      !formData.assigned_to &&
      !formData.reviewer_user_id &&
      !formData.due_date &&
      formData.estimated_time === '0' &&
      formData.authoring_mode === 'operational_only' &&
      formData.profile_eligibility === false
    ) return

    frozenCreatePayload = null
    formData = {
      ...formData,
      assigned_to: '',
      reviewer_user_id: '',
      due_date: '',
      estimated_time: '0',
      authoring_mode: 'operational_only',
      profile_eligibility: false,
    }
  })

  $effect(() => {
    if (props.open && !wasOpen) {
      const preferredStatus = props.initialStatus || props.statuses?.[0]?.value || ''
      const preferredProject = props.initialProjectId || currentProjectId || ''
      if (preferredStatus) {
        formData.task_status_id = preferredStatus
        formData.project_id = preferredProject
      } else if (preferredProject) {
        formData.project_id = preferredProject
      }
      if (preferredProject && preferredStatus) {
        restoreStoredDraft(preferredProject, preferredStatus)
      }
    }
    wasOpen = props.open
  })

  $effect(() => {
    const projectId = formData.project_id

    if (!projectId) {
      availableRoles = []
      selectedProjectVisibility = null
      assigneeGroups = { projectMembers: [], orgMembersOutsideProject: [] }
      selectedRoleId = ''
      projectProfessionalRoleId = ''
      prefilledSkillCount = 0
      lastLoadedProjectId = ''
      autoPrefillAttempted = false
      return
    }

    if (lastLoadedProjectId && lastLoadedProjectId !== projectId) {
      selectedRoleId = ''
      projectProfessionalRoleId = ''
      prefilledSkillCount = 0
      autoPrefillAttempted = false
    }
    lastLoadedProjectId = projectId

    fetch(`/api/v1/projects/${projectId}/professional-roles`)
      .then((r) => r.json())
      .then((payload) => {
        const data = payload as ProjectProfessionalRolesResponse
        availableRoles = data.data ?? []
        if (selectedRoleId && !availableRoles.some((role) => role.id === selectedRoleId)) {
          selectedRoleId = ''
          projectProfessionalRoleId = ''
          prefilledSkillCount = 0
        }
      })
      .catch(() => {
        availableRoles = []
        selectedRoleId = ''
        projectProfessionalRoleId = ''
        prefilledSkillCount = 0
      })
  })

  $effect(() => {
    const projectId = formData.project_id
    if (!projectId) {
      selectedProjectVisibility = null
      assigneeGroups = { projectMembers: [], orgMembersOutsideProject: [] }
      return
    }

    const requestKey = assigneeGroupRequestKey + 1
    assigneeGroupRequestKey = requestKey
    Promise.all([
      fetch(`/api/v1/projects/${projectId}`).then(
        (response) => response.json() as Promise<ProjectDetailApiResponse>
      ),
      fetch(`/projects/${projectId}/member-candidates`).then(
        (response) => response.json() as Promise<ProjectMemberCandidateResponse>
      ),
    ])
      .then(([projectPayload, candidatePayload]) => {
        if (requestKey !== assigneeGroupRequestKey) return

        selectedProjectVisibility = projectPayload.data?.project?.visibility ?? null
        assigneeGroups = {
          projectMembers: (projectPayload.data?.members ?? []).map((member) => ({
            id: member.userId,
            username: member.username,
            email: member.email,
            governanceRole: member.role,
            deliveryRoleName: member.professionalRoleName ?? null,
            projectProfessionalRoleId: member.projectProfessionalRoleId ?? null,
          })),
          orgMembersOutsideProject: (candidatePayload.data ?? []).map((member) => ({
            id: member.userId,
            username: member.username,
            email: member.email,
            orgRole: member.orgRole,
          })),
        }
      })
      .catch(() => {
        if (requestKey !== assigneeGroupRequestKey) return
        selectedProjectVisibility = null
        assigneeGroups = { projectMembers: [], orgMembersOutsideProject: [] }
      })
  })

  $effect(() => {
    if (
      props.open &&
      props.initialRoleId &&
      !autoPrefillAttempted &&
      formData.project_id &&
      availableRoles.some((role) => role.id === props.initialRoleId)
    ) {
      autoPrefillAttempted = true
      selectedRoleId = props.initialRoleId
      void handlePrefillFromRole()
    }
  })

  function handlePrefillFromRole() {
    if (!formData.project_id) return
    if (!selectedRoleId) {
      projectProfessionalRoleId = ''
      prefilledSkillCount = 0
      return
    }

    frozenCreatePayload = null
    projectProfessionalRoleId = selectedRoleId
    prefilledSkillCount = 0
  }

  function handleRoleChange(roleId: string) {
    selectedRoleId = roleId
    handlePrefillFromRole()
  }

  function handleAssignRoleMatchedMember(userId: string) {
    frozenCreatePayload = null
    formData.assigned_to = userId
  }

  function validateRequiredSkillMix(): string | null {
    const categoryCounts = countTaskSkillsByCategory(
      formData.required_skills.map((skill) => skill.categoryCode)
    )
    const violations = getTaskSkillCategoryViolations(categoryCounts)
    return violations.length > 0 ? formatTaskSkillCategoryViolations(violations) : null
  }

  function getCreateValidationErrors(intent: TaskCreateIntent): Record<string, string> {
    const validationErrors: Record<string, string> = {
      ...validateTaskCreate({ ...formData, is_documentation_item: isDocumentationItem }, intent, t),
    }
    const requiredSkillMixError =
      formData.required_skills.length > 0 ? validateRequiredSkillMix() : null

    if (requiredSkillMixError) {
      validationErrors.required_skills = requiredSkillMixError
    }

    return validationErrors
  }

  const buildFreshPayload = () => {
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

  const buildPayload = () => {
    if (frozenCreatePayload) {
      const requiredSkills = frozenCreatePayload.requiredSkills
      if (Array.isArray(requiredSkills)) {
        frozenCreatePayload = {
          ...frozenCreatePayload,
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
      return frozenCreatePayload
    }
    const payload = buildFreshPayload()
    frozenCreatePayload = payload
    return payload
  }

  function persistStoredDraft() {
    if (typeof window === 'undefined' || !formData.project_id || !formData.task_status_id) return

    try {
      const storageKey = taskCreateDraftKey(formData.project_id, formData.task_status_id)
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          formData,
          selectedRoleId,
          projectProfessionalRoleId,
        })
      )
      activeDraftStorageKey = storageKey
    } catch {
      // Storage may be unavailable in private browsing or a restricted iframe.
    }
  }

  function restoreStoredDraft(projectId: string, statusId: string) {
    if (typeof window === 'undefined') return

    try {
      const storageKey = taskCreateDraftKey(projectId, statusId)
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        formData?: Partial<TaskCreateFormData>
        selectedRoleId?: string
        projectProfessionalRoleId?: string
      }
      if (!parsed.formData || typeof parsed.formData !== 'object') return

      formData = {
        ...formData,
        ...parsed.formData,
        project_id: projectId,
        task_status_id: statusId,
        brief: parsed.formData.brief ?? formData.brief,
      }
      selectedRoleId = parsed.selectedRoleId ?? ''
      projectProfessionalRoleId = parsed.projectProfessionalRoleId ?? ''
      activeDraftStorageKey = storageKey
    } catch {
      window.localStorage.removeItem(taskCreateDraftKey(projectId, statusId))
    }
  }

  function clearStoredDraft(projectId: string, statusId: string) {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(taskCreateDraftKey(projectId, statusId))
    } catch {
      // Storage may be unavailable in private browsing or a restricted iframe.
    }
  }

  const resetForm = () => {
    if (activeDraftStorageKey && typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(activeDraftStorageKey)
      } catch {
        // Storage may be unavailable in private browsing or a restricted iframe.
      }
    } else if (formData.project_id && formData.task_status_id) {
      clearStoredDraft(formData.project_id, formData.task_status_id)
    }
    activeDraftStorageKey = ''
    frozenCreatePayload = null
    formData = {
      title: '',
      description: '',
      task_status_id: '',
      task_type: 'feature_development',
      verification_method: 'code_review',
      project_id: '',
      priority: '',
      label: '',
      task_visibility: 'internal',
      reviewer_visibility: 'project',
      assigned_to: '',
      reviewer_user_id: '',
      due_date: '',
      parent_task_id: '',
      estimated_time: '0',
      required_skills: [],
      acceptance_criteria: '',
      context_background: '',
      role_in_task: '',
      business_domain: '',
      problem_category: '',
      tech_stack_text: '',
      learning_objectives_text: '',
      domain_tags_text: '',
      scope_text: '',
      out_of_scope_text: '',
      deliverables_text: '',
      quality_requirements_text: '',
      constraints_text: '',
      dependencies_text: '',
      authoring_mode: 'evidence_enabled',
      authoring_intent: 'save_draft',
      creator_confirmed: false,
      constraints_addressed: false,
      dependencies_addressed: false,
      supporting_reference_uri: '',
      supporting_reference_title: '',
      reviewer_role_code: 'org_owner',
      profile_eligibility: true,
      brief: createInitialTaskBrief(),
    }
    errors = {}
    formError = ''
    selectedRoleId = ''
    projectProfessionalRoleId = ''
    prefilledSkillCount = 0
    selectedProjectVisibility = null
    autoPrefillAttempted = false
    assigneeGroups = { projectMembers: [], orgMembersOutsideProject: [] }
  }

  const handleSubmit = async () => {
    const intent: TaskCreateIntent = isDocumentationItem ? 'save_draft' : 'publish'
    if ((formData.authoring_intent ?? 'save_draft') !== intent) {
      frozenCreatePayload = null
    }
    formData = { ...formData, authoring_intent: intent }
    const newErrors = getCreateValidationErrors(intent)

    if (Object.keys(newErrors).length > 0) {
      errors = newErrors
      formError = ''
      return
    }

    submitting = true
    errors = {}
    formError = ''

    try {
      const response = await axios.post<{ data: TaskDetail }>(
        FRONTEND_ROUTES.TASKS,
        buildPayload(),
        {
          headers: { Accept: 'application/json' },
        }
      )
      props.onCreated?.(response.data.data)
      notificationStore.success(t('task.create.success', {}, 'Task created successfully'))
      props.onOpenChange(false)
      resetForm()
    } catch (error: unknown) {
      const normalizedError = normalizeTaskMutationError(
        error,
        t('task.mutation.fallback', {}, 'Unable to process the request. Please try again.'),
        t(
          'task.mutation.network_fallback',
          {},
          'Unable to reach the server. Check your network and try again.'
        )
      )
      errors = normalizedError.fieldErrors
      formError = normalizedError.message
      notificationStore.error(
        normalizedError.isPermission
          ? t(
              'task.create.permission_create_denied',
              {},
              'You do not have permission to create tasks'
            )
          : t('task.create.failed', {}, 'Unable to create task'),
        normalizedError.message || t('common.please_try_again', {}, 'Please try again')
      )
    } finally {
      submitting = false
    }
  }

  const handleClose = () => {
    props.onOpenChange(false)
  }

  // A creation draft is intentionally local to this modal. It must never
  // create an incomplete task on the board; closing the modal keeps formData
  // available for the next open in the same board session.
  const saveDraft = () => {
    if (submitting) return
    frozenCreatePayload = null
    formData = { ...formData, authoring_intent: 'save_draft' }
    errors = {}
    formError = ''
    persistStoredDraft()
    props.onOpenChange(false)
  }

  const discardDraft = () => {
    if (submitting) return
    resetForm()
    props.onOpenChange(false)
  }

  const setFormData = (updater: (prev: typeof formData) => typeof formData) => {
    frozenCreatePayload = null
    formData = updater(formData)
    const nextErrors = { ...errors }
    const previousErrorCount = Object.keys(nextErrors).length
    const currentValidationErrors = getCreateValidationErrors(
      formData.authoring_intent ?? 'save_draft'
    )
    for (const field of TASK_CREATE_VALIDATION_ORDER) {
      if (nextErrors[field] && !currentValidationErrors[field]) {
        delete nextErrors[field]
      }
    }
    errors = nextErrors
    if (formError && Object.keys(nextErrors).length < previousErrorCount) {
      formError = ''
    }
  }

  return {
    get formData() {
      return formData
    },
    set formData(v) {
      formData = v
    },
    get errors() {
      return errors
    },
    get formError() {
      return formError
    },
    get submitting() {
      return submitting
    },
    get selectedRoleId() {
      return selectedRoleId
    },
    set selectedRoleId(v) {
      selectedRoleId = v
    },
    get projectProfessionalRoleId() {
      return projectProfessionalRoleId
    },
    get availableRoles() {
      return availableRoles
    },
    get selectedProjectVisibility() {
      return selectedProjectVisibility
    },
    get assigneeGroups() {
      return assigneeGroups
    },
    get prefilling() {
      return prefilling
    },
    get prefilledSkillCount() {
      return prefilledSkillCount
    },
    get autoPrefillAttempted() {
      return autoPrefillAttempted
    },
    get roleMatchedProjectMembers() {
      return roleMatchedProjectMembers
    },
    get scopedAssigneeUsers() {
      return scopedAssigneeUsers
    },
    get isDocumentationItem() {
      return isDocumentationItem
    },

    handlePrefillFromRole,
    handleRoleChange,
    handleAssignRoleMatchedMember,
    handleSubmit,
    handleClose,
    saveDraft,
    discardDraft,
    setFormData,
    resetForm,
  }
}
