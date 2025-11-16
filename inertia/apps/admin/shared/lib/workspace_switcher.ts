import { FRONTEND_ROUTES } from '@/apps/org/shared/constants'
import { translationStore } from '@/apps/admin/shared/stores/translation.svelte'

interface SwitchResponsePayload {
  data?: {
    message?: string
    redirect?: string
  }
}

export interface WorkspaceSwitchResult {
  message?: string
  redirect?: string
}

function getCsrfToken(): string {
  return document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
}

function getErrorMessage(payload: SwitchResponsePayload, fallback: string): string {
  return payload.data?.message?.trim() || fallback
}

async function postWorkspaceSwitch(
  url: string,
  body: Record<string, unknown>,
  fallbackError: string
): Promise<WorkspaceSwitchResult> {
  const csrfToken = getCsrfToken()
  if (!csrfToken) {
    throw new Error(translationStore.t('common.csrf_token_missing', {}, 'CSRF token not found. Please reload the page.'))
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': csrfToken,
    },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  })

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    if (!response.ok) {
      throw new Error(fallbackError)
    }

    return {}
  }

  const payload = (await response.json()) as SwitchResponsePayload
  if (!response.ok || !payload.data) {
    throw new Error(getErrorMessage(payload, fallbackError))
  }

  return {
    message: payload.data.message,
    redirect: payload.data.redirect,
  }
}

export async function requestOrganizationSwitch(options: {
  organizationId: string
  currentPath?: string
}): Promise<WorkspaceSwitchResult> {
  return postWorkspaceSwitch(
    FRONTEND_ROUTES.SWITCH_ORGANIZATION,
    {
      organizationId: options.organizationId,
      ...(options.currentPath ? { currentPath: options.currentPath } : {}),
    },
    translationStore.t('common.switch_organization_error', {}, 'Unable to switch organization')
  )
}

export async function requestProjectSwitch(options: {
  projectId: string
  currentPath?: string
}): Promise<WorkspaceSwitchResult> {
  return postWorkspaceSwitch(
    FRONTEND_ROUTES.SWITCH_PROJECT,
    {
      projectId: options.projectId,
      ...(options.currentPath ? { currentPath: options.currentPath } : {}),
    },
    translationStore.t('common.switch_project_error', {}, 'Unable to switch project')
  )
}
