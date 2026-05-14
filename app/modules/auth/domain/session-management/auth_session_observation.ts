export interface AuthSessionObservation {
  eventId: string
  userId: string
  action: 'login' | 'logout'
  occurredAt: string
  ipAddress: string
  userAgent: string
  method: string | null
  requestId: string | null
  traceId: string | null
}

export function buildAuthSessionEvidence(observation: AuthSessionObservation) {
  return {
    audit: {
      user_id: observation.userId,
      action: observation.action,
      event_name: `auth.${observation.action}.succeeded`,
      event_family: 'auth.session',
      module: 'auth',
      outcome: 'success',
      entity_type: 'user',
      entity_id: observation.userId,
      target_type: 'user',
      target_id: observation.userId,
      correlation_key: observation.eventId,
      retention_class: 'user_security_2y',
      source_occurred_at: observation.occurredAt,
      critical: true,
      ...(observation.method ? { new_values: { method: observation.method } } : {}),
    },
  } as const
}
