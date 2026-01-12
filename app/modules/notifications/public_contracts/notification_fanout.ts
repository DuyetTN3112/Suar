import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export interface NotificationFanoutTemplateV1Input {
  eventName: string
  businessEventId: string
  type: string
  schemaVersion: 1
  scope: { kind: 'user'; id: string } | { kind: 'organization'; id: string } | { kind: 'system' }
  actor?: { type: string; id: string }
  subject?: { type: string; id: string }
  parameters: Record<string, unknown>
  occurredAt: string
  correlationId?: string
  dedupeKey?: string
}

export interface NotificationFanoutStageResult {
  status: 'staged' | 'duplicate'
  jobId: string
  targetCount: number
}

export interface NotificationFanoutStagerContract {
  stage(
    template: NotificationFanoutTemplateV1Input,
    recipientIds: readonly string[],
    options: { trx: object; now?: Date }
  ): Promise<NotificationFanoutStageResult>
}

let provider: NotificationFanoutStagerContract | null = null

export function registerNotificationFanoutProvider(
  implementation: NotificationFanoutStagerContract
): void {
  provider = implementation
}

export const notificationFanoutPublicApi: NotificationFanoutStagerContract = {
  stage(template, recipientIds, options) {
    if (!provider) {
      throw new InvariantViolationException('Notification fanout provider has not been registered')
    }
    return provider.stage(template, recipientIds, options)
  },
}
