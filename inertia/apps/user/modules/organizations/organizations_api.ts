export interface JoinOrganizationResponse {
  data?: {
    message?: string
    organization?: {
      id?: string
      name?: string
    }
    joinRequest?: {
      status?: string | null
    }
  }
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
