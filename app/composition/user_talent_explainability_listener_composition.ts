import { createHash } from 'node:crypto'

import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import { userAccountRepository, userTransactionRunner } from './user_persistence_composition.js'

import { stageDomainEvent } from '#modules/events/public_contracts/domain_event_outbox'
import loggerService from '#modules/logger/public_contracts/application_logger'
import {
  handleTalentExplainabilityProjectionChanged,
  type TalentExplainabilityProjectionListenerDependencies,
} from '#modules/users/listeners/talent_explainability_projection_listener'

export const talentExplainabilityProjectionListenerDependencies: TalentExplainabilityProjectionListenerDependencies =
  {
    apply: (userId, projection) =>
      userTransactionRunner.run((transaction) =>
        userAccountRepository.applyTalentExplainabilityProjectionV1(userId, projection, transaction)
      ),
    stageSearchReindex: async (event) => {
      await db.transaction(async (transaction) => {
        await stageDomainEvent(transaction, {
          eventName: 'search:talent-reindex-requested',
          dedupeKey: createHash('sha256')
            .update(`talent:explainability:${event.revieweeUserId}:${event.sourceRevision}`)
            .digest('hex'),
          aggregateType: 'user_talent',
          aggregateId: event.revieweeUserId,
          payload: {
            userId: event.revieweeUserId,
            sourceEventName: 'reviews:talent-explainability-projection:changed:v1',
            sourceEventId: event.sourceRevision,
          },
        })
      })
    },
    logger: loggerService,
  }

emitter.on('reviews:talent-explainability-projection:changed:v1', (event) =>
  handleTalentExplainabilityProjectionChanged(
    event,
    talentExplainabilityProjectionListenerDependencies
  )
)
