export interface JoinOrganizationResponse {
  success?: boolean
  message?: string
  joinRequest?: {
    status?: string | null
  }
  membership?: {
    status?: string | null
  }
}

export interface SwitchOrganizationResponse {
  success?: boolean
  message?: string
  redirect?: string
}

function getCsrfToken(): string | null {
  return document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? null
}

export async function joinOrganizationRequest(
  organizationId: string
): Promise<JoinOrganizationResponse> {
  const csrfToken = getCsrfToken()
  if (!csrfToken) {
    throw new Error('missing-csrf-token')
  }

  const response = await fetch(`/organizations/${organizationId}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': csrfToken,
    },
    credentials: 'same-origin',
  })

  return (await response.json()) as JoinOrganizationResponse
}

export async function switchOrganizationRequest(
  route: string,
  organizationId: string
): Promise<{ ok: boolean; data: SwitchOrganizationResponse }> {
  const csrfToken = getCsrfToken() ?? ''

  const response = await fetch(route, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': csrfToken,
    },
    credentials: 'same-origin',
    body: JSON.stringify({ organization_id: organizationId }),
  })

  return {
    ok: response.ok,
    data: (await response.json()) as SwitchOrganizationResponse,
  }
}
