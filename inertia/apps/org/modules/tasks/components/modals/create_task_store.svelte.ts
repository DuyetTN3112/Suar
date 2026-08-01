import { page } from '@inertiajs/svelte'
import axios from 'axios'

import {
  buildPrefilledTaskSkills,
  findRoleMatchedProjectMembers,
} from '@/apps/org/modules/tasks/lib/create_prefill'
import { normalizeTaskMutationError } from '@/apps/org/modules/tasks/lib/errors/task_mutation_errors'
import {
  getTaskContractPreset,
  inferTaskTypeFromRoleCode,
  mergeTaskContractPreset,
} from '@/apps/org/modules/tasks/lib/rules/task_contract_presets'
import {
  countTaskSkillsByCategory,
  formatTaskSkillCategoryViolations,
  getTaskSkillCategoryViolations,
} from '@/apps/org/modules/tasks/lib/rules/task_skill_category_rules'
import type { TaskCreateFormData } from '@/apps/org/modules/tasks/types/create_form_types'
import type {
  ProjectProfessionalRoleOption,
  ProjectProfessionalRolesResponse,
  RoleRequirementsResponse,
  ProjectDetailApiResponse,
  ProjectMemberCandidateResponse,
} from '@/apps/org/modules/tasks/types/create_task_types'
import type { TaskDetail } from '@/apps/org/modules/tasks/types/index.svelte'
import { FRONTEND_ROUTES } from '@/apps/org/shared/constants'
import { notificationStore } from '@/apps/org/shared/stores/notification_store.svelte'
import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

export interface CreateTaskStoreProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialStatus?: string
  initialProjectId?: string
  initialRoleId?: string
  statuses?: { value: string; label: string }[]
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
    assigned_to: '',
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

  $effect(() => {
    if (props.open && !wasOpen) {
      const preferredStatus = props.initialStatus || props.statuses?.[0]?.value || ''
      const preferredProject =
        props.initialProjectId || currentProjectId || props.projects?.[0]?.id || ''
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
      void handlePrefillFromRole()
    }
  })

  async function handlePrefillFromRole() {
    if (!formData.project_id) return
    if (!selectedRoleId) {
      projectProfessionalRoleId = ''
      prefilledSkillCount = 0
      return
    }

    prefilling = true
    try {
      const resp = await fetch(
        `/api/v1/projects/${formData.project_id}/professional-roles/${selectedRoleId}/requirements`
      )
      const data = (await resp.json()) as RoleRequirementsResponse
      if (data.data?.requirements) {
        const roleForPrefill = availableRoles.find((role) => role.id === selectedRoleId) ?? null
        const inferredTaskType = inferTaskTypeFromRoleCode(roleForPrefill?.code ?? null)
        const preset = getTaskContractPreset(inferredTaskType, t)
        const nextFormData = preset ? mergeTaskContractPreset(formData, preset) : formData
        formData = {
          ...nextFormData,
          required_skills: buildPrefilledTaskSkills(data.data.requirements),
        }
        projectProfessionalRoleId = selectedRoleId
        prefilledSkillCount = formData.required_skills.length
        if (!formData.assigned_to) {
          const matchedMembers = findRoleMatchedProjectMembers(
            selectedRoleId,
            assigneeGroups.projectMembers
          )
          if (matchedMembers.length === 1) {
            formData.assigned_to = matchedMembers[0]?.id ?? ''
          }
        }
        if (errors.required_skills) {
          const nextErrors = { ...errors }
          delete nextErrors.required_skills
          errors = nextErrors
        }
      }
    } catch {
      notificationStore.error(
        t('task.create.role_prefill_failed', {}, 'Unable to prefill skills from role')
      )
    } finally {
      prefilling = false
    }
  }

  async function handleRoleChange(roleId: string) {
    selectedRoleId = roleId
    await handlePrefillFromRole()
  }

  function handleAssignRoleMatchedMember(userId: string) {
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

  const buildPayload = () => ({
    title: formData.title,
    description: formData.description,
    taskStatusId: formData.task_status_id,
    projectId: formData.project_id,
    taskType: formData.task_type,
    verificationMethod: formData.verification_method,
    priority: formData.priority || undefined,
    label: formData.label || undefined,
    taskVisibility: formData.task_visibility,
    assignedTo: formData.assigned_to || undefined,
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
      targetLevelId: skill.target_level_id || undefined,
      assessmentCeilingLevelId: skill.assessment_ceiling_level_id || undefined,
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
    businessDomain: formData.business_domain || undefined,
    problemCategory: formData.problem_category || undefined,
    techStack: parseListInput(formData.tech_stack_text),
    learningObjectives: parseListInput(formData.learning_objectives_text),
    domainTags: parseListInput(formData.domain_tags_text),
  })

  const resetForm = () => {
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
      assigned_to: '',
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
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title =
        t('task.title', {}, 'Title') + ' ' + t('common.is_required', {}, 'is required')
    }
    if (!formData.task_status_id) {
      newErrors.task_status_id =
        t('task.status', {}, 'Status') + ' ' + t('common.is_required', {}, 'is required')
    }
    if (!formData.project_id) {
      newErrors.project_id = t('task.create.project_required', {}, 'Project is required')
    }
    if (formData.required_skills.length === 0) {
      newErrors.required_skills =
        t('task.marketplace_card.required_skills', {}, 'Required skills') +
        ' ' +
        t('common.is_required', {}, 'is required')
    } else {
      const requiredSkillMixError = validateRequiredSkillMix()
      if (requiredSkillMixError) {
        newErrors.required_skills = requiredSkillMixError
      }
    }
    if (!formData.acceptance_criteria.trim()) {
      newErrors.acceptance_criteria = t('task.create.acceptance_criteria_required', {}, 'Acceptance criteria is required')
    }

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
        t('task.mutation.network_fallback', {}, 'Unable to reach the server. Check your network and try again.')
      )
      errors = normalizedError.fieldErrors
      formError = normalizedError.message
      notificationStore.error(
        normalizedError.isPermission
          ? t('task.create.permission_create_denied', {}, 'You do not have permission to create tasks')
          : t('task.create.failed', {}, 'Unable to create task'),
        normalizedError.message || t('common.please_try_again', {}, 'Please try again')
      )
    } finally {
      submitting = false
    }
  }

  const handleClose = () => {
    props.onOpenChange(false)
    resetForm()
  }

  const setFormData = (updater: (prev: typeof formData) => typeof formData) => {
    formData = updater(formData)
    const nextErrors = { ...errors }
    const previousErrorCount = Object.keys(nextErrors).length
    if (errors.required_skills && formData.required_skills.length > 0) {
      delete nextErrors.required_skills
    }
    if (errors.task_status_id && formData.task_status_id) {
      delete nextErrors.task_status_id
    }
    if (errors.project_id && formData.project_id) {
      delete nextErrors.project_id
    }
    if (errors.acceptance_criteria && formData.acceptance_criteria.trim()) {
      delete nextErrors.acceptance_criteria
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

    handlePrefillFromRole,
    handleRoleChange,
    handleAssignRoleMatchedMember,
    handleSubmit,
    handleClose,
    setFormData,
    resetForm,
  }
}
