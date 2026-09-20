import { page } from '@inertiajs/svelte'
import axios from 'axios'

import { normalizeTaskMutationError } from '@/apps/org/modules/tasks/lib/errors/task_mutation_errors'
import {
  countTaskSkillsByCategory,
  formatTaskSkillCategoryViolations,
  getTaskSkillCategoryViolations,
} from '@/apps/org/modules/tasks/lib/rules/task_skill_category_rules'
import type { TaskCreateFormData } from '@/apps/org/modules/tasks/types/create_form_types'
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

import { getDefaultOrgTaskCreateFormData } from './create_task_brief_defaults.js'
import {
  buildOrgFreshPayload,
  cleanOrgFrozenCreatePayload,
} from './create_task_payload_builder.js'
import { useCreateTaskProjectContext } from './create_task_project_context.svelte.js'

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

  let formData = $state<TaskCreateFormData>(getDefaultOrgTaskCreateFormData())

  let errors = $state<Record<string, string>>({})
  let formError = $state('')
  let submitting = $state(false)
  let wasOpen = $state(false)
  let frozenCreatePayload: Record<string, unknown> | null = null

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

  const projectContext = useCreateTaskProjectContext({
    getOpen: () => props.open,
    getInitialRoleId: () => props.initialRoleId,
    getProjectId: () => formData.project_id,
    getFallbackUsers: () => props.users,
    onClearFrozenPayload: () => {
      frozenCreatePayload = null
    },
    onAssignUser: (userId) => {
      formData.assigned_to = userId
    },
  })



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

  const buildPayload = () => {
    if (frozenCreatePayload) {
      frozenCreatePayload = cleanOrgFrozenCreatePayload(frozenCreatePayload)
      return frozenCreatePayload
    }
    const payload = buildOrgFreshPayload(
      formData,
      projectContext.projectProfessionalRoleId,
      isDocumentationItem
    )
    frozenCreatePayload = payload
    return payload
  }

  const resetForm = () => {
    frozenCreatePayload = null
    formData = getDefaultOrgTaskCreateFormData()
    errors = {}
    formError = ''
    projectContext.resetProjectContext()
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
      return projectContext.selectedRoleId
    },
    set selectedRoleId(v) {
      projectContext.selectedRoleId = v
    },
    get projectProfessionalRoleId() {
      return projectContext.projectProfessionalRoleId
    },
    get availableRoles() {
      return projectContext.availableRoles
    },
    get selectedProjectVisibility() {
      return projectContext.selectedProjectVisibility
    },
    get assigneeGroups() {
      return projectContext.assigneeGroups
    },
    get prefilling() {
      return projectContext.prefilling
    },
    get prefilledSkillCount() {
      return projectContext.prefilledSkillCount
    },
    get autoPrefillAttempted() {
      return projectContext.autoPrefillAttempted
    },
    get roleMatchedProjectMembers() {
      return projectContext.roleMatchedProjectMembers
    },
    get scopedAssigneeUsers() {
      return projectContext.scopedAssigneeUsers
    },
    get isDocumentationItem() {
      return isDocumentationItem
    },

    handlePrefillFromRole: projectContext.handlePrefillFromRole,
    handleRoleChange: projectContext.handleRoleChange,
    handleAssignRoleMatchedMember: projectContext.handleAssignRoleMatchedMember,
    handleSubmit,
    handleClose,
    saveDraft,
    discardDraft,
    setFormData,
    resetForm,
  }
}
