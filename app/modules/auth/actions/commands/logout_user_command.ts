import type { LogoutUserDTO } from '../dtos/request/logout_user_dto.js'

import type { AuthActionContext } from '#modules/auth/actions/auth_action_context'
import type { AuthEventIdentityGenerator } from '#modules/auth/actions/ports/outbound/auth_event_identity_generator'
import type { AuthLogoutEvent } from '#modules/auth/actions/ports/outbound/auth_logout_event_publisher'
import type { AuthSessionObservation } from '#modules/auth/domain/auth_session_observation'
import loggerService from '#modules/logger/public_contracts/application_logger'

export interface LogoutUserCommandDependencies {
  stageEvidence(payload: AuthSessionObservation): Promise<void>
  publishLogout(event: AuthLogoutEvent): Promise<void>
}

export interface LogoutUserCommandInput {
  context: AuthActionContext
  dto: LogoutUserDTO
  revokeWebSession(): Promise<void>
}

export default class LogoutUserCommand {
  constructor(
    private readonly dependencies: LogoutUserCommandDependencies,
    private readonly eventIdentities: AuthEventIdentityGenerator
  ) {}

  async execute(input: LogoutUserCommandInput): Promise<void> {
    await input.revokeWebSession()
    const eventIdentity = this.eventIdentities.next()

    await Promise.all([
      this.settlePostCommitEffect(
        'auth.logout.durable_stage',
        () =>
          this.dependencies.stageEvidence({
            eventId: eventIdentity.eventId,
            userId: input.dto.userId,
            action: 'logout',
            occurredAt: eventIdentity.occurredAt,
            ipAddress: input.context.ip,
            userAgent: input.context.userAgent,
            method: null,
            requestId: input.context.requestId ?? null,
            traceId: input.context.traceId ?? null,
          }),
        {
          userId: input.dto.userId,
          eventId: eventIdentity.eventId,
        }
      ),
      this.settlePostCommitEffect(
        'auth.logout.event',
        () =>
          this.dependencies.publishLogout({
            userId: input.dto.userId,
            ip: input.dto.ipAddress || '',
            ...(input.dto.sessionId ? { sessionId: input.dto.sessionId } : {}),
          }),
        {
          userId: input.dto.userId,
        }
      ),
    ])
  }

  private async settlePostCommitEffect(
    effectName: string,
    effect: () => Promise<void>,
    context: { userId: string; eventId?: string }
  ): Promise<void> {
    try {
      await effect()
    } catch (error) {
      try {
        loggerService.error('Auth post-commit effect failed', {
          effectName,
          committed: true,
          userId: context.userId,
          ...(context.eventId ? { eventId: context.eventId } : {}),
          errorName: error instanceof Error ? error.name : 'UnknownError',
        })
      } catch {
        // Telemetry failure must never alter the completed authentication operation.
      }
    }
  }
}
