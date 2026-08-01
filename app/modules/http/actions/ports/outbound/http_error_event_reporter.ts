export interface HttpErrorEventPayload {
  code: string
  status: number
  severity: 'error' | 'warning'
  message: string
  safe_message: string | null
  details: Record<string, unknown> | null
  request_id: string | null
  correlation_id: string | null
  actor_user_id: string | null
  actor_org_id: string | null
  method: string | null
  url: string | null
  ip_address: string | null
  user_agent: string | null
}

export abstract class HttpErrorEventReporter {
  abstract enqueue(payload: HttpErrorEventPayload): void
}
