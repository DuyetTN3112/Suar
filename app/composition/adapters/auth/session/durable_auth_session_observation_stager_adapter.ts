import db from '@adonisjs/lucid/services/db'

import { AuthSessionObservationStager } from '#modules/auth/actions/ports/outbound/auth_session_observation_stager'
import type { AuthSessionObservation } from '#modules/auth/domain/session-management/auth_session_observation'
import {
  stageDomainEvent,
  type StageDomainEventInput,
  type StageDomainEventResult,
} from '#modules/events/public_contracts/domain_event_outbox'

export interface DurableAuthSessionObservationStagerDependencies {
  transaction<T>(callback: (trx: object) => Promise<T>): Promise<T>
  stage(
    trx: object,
    input: StageDomainEventInput
  ): Promise<StageDomainEventResult>
}

const defaultDependencies: DurableAuthSessionObservationStagerDependencies = {
  transaction: (callback) => db.transaction(callback),
  stage: stageDomainEvent,
}

export class DurableAuthSessionObservationStagerAdapter extends AuthSessionObservationStager {
  constructor(
    private readonly dependencies: DurableAuthSessionObservationStagerDependencies =
      defaultDependencies
  ) {
    super()
  }

  async stage(observation: AuthSessionObservation): Promise<void> {
    await this.dependencies.transaction((trx) =>
      this.dependencies.stage(trx, {
        eventName: 'auth:session:observed:v1',
        dedupeKey: observation.eventId,
        aggregateType: 'auth_session',
        aggregateId: observation.userId,
        payload: observation,
      })
    )
  }
}
