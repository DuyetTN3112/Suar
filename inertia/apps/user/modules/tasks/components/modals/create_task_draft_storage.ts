import type { TaskCreateFormData } from '@/apps/user/modules/tasks/types/create_form_types'

const TASK_CREATE_DRAFT_KEY_PREFIX = 'suar:task-create-draft:v1'

export function taskCreateDraftKey(projectId: string, statusId: string): string {
  return `${TASK_CREATE_DRAFT_KEY_PREFIX}:${encodeURIComponent(projectId)}:${encodeURIComponent(statusId)}`
}

export function persistTaskCreateDraft(
  formData: TaskCreateFormData,
  selectedRoleId: string,
  projectProfessionalRoleId: string
): string | null {
  if (typeof window === 'undefined' || !formData.project_id || !formData.task_status_id) return null

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
    return storageKey
  } catch {
    // Storage may be unavailable in private browsing or a restricted iframe.
    return null
  }
}

export interface RestoredDraftData {
  formData?: Partial<TaskCreateFormData>
  selectedRoleId?: string
  projectProfessionalRoleId?: string
}

export function restoreTaskCreateDraft(projectId: string, statusId: string): RestoredDraftData | null {
  if (typeof window === 'undefined') return null

  const storageKey = taskCreateDraftKey(projectId, statusId)
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as RestoredDraftData
    if (!parsed.formData || typeof parsed.formData !== 'object') return null
    return parsed
  } catch {
    window.localStorage.removeItem(storageKey)
    return null
  }
}

export function clearTaskCreateDraft(projectId: string, statusId: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(taskCreateDraftKey(projectId, statusId))
  } catch {
    // Storage may be unavailable in private browsing or a restricted iframe.
  }
}
