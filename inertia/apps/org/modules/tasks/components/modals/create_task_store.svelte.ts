import { page } from '@inertiajs/svelte'
import axios from 'axios'

import { findRoleMatchedProjectMembers } from '@/apps/org/modules/tasks/lib/create_prefill'
import { normalizeTaskMutationError } from '@/apps/org/modules/tasks/lib/errors/task_mutation_errors'
import {
  countTaskSkillsByCategory,
  formatTaskSkillCategoryViolations,
  getTaskSkillCategoryViolations,
} from '@/apps/org/modules/tasks/lib/rules/task_skill_category_rules'
import type { TaskCreateFormData } from '@/apps/org/modules/tasks/types/create_form_types'
import type {
  ProjectProfessionalRoleOption,
  ProjectProfessionalRolesResponse,
  ProjectDetailApiResponse,
  ProjectMemberCandidateResponse,
} from '@/apps/org/modules/tasks/types/create_task_types'
import type { TaskDetail } from '@/apps/org/modules/tasks/types/index.svelte'
import { FRONTEND_ROUTES } from '@/apps/org/shared/constants'
import { notificationStore } from '@/apps/org/shared/stores/notification_store.svelte'
import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
import { isDocumentationTaskStatusId } from '@/apps/shared/tasks/documentation_task_status'
import {
  TASK_CREATE_VALIDATION_ORDER,
  validateTaskCreate,
  type TaskCreateIntent,
} from '@/apps/shared/tasks/task_create_validation'
import { toIsoDueAt } from '@/apps/shared/tasks/task_schedule'

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
    authoring_intent: 'save_draft',
    creator_confirmed: false,
    constraints_addressed: false,
    dependencies_addressed: false,
    supporting_reference_uri: '',
    supporting_reference_title: '',
    reviewer_role_code: 'org_owner',
    profile_eligibility: true,
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
  let prefilling = $state(false)
  let prefilledSkillCount = $state(0)
  let lastLoadedProjectId = ''
  let autoPrefillAttempted = $state(false)
  let assigneeGroupRequestKey = 0
  let frozenCreatePayload: Record<string, unknown> | null = null

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
      handlePrefillFromRole()
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

  const parseListInput = (raw: string) =>
    raw
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)

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

  const resetForm = () => {
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
