import ProcessDisputeResolvedEventCommand from '#modules/reviews/actions/commands/process_dispute_resolved_event_command'
import ProcessReviewConfirmedEventCommand from '#modules/reviews/actions/commands/process_review_confirmed_event_command'
import ProcessReviewSubmittedEventCommand from '#modules/reviews/actions/commands/process_review_submitted_event_command'
import type { ReviewAnomalyFlagWriter } from '#modules/reviews/actions/ports/outbound/review_anomaly_flag_writer'
import type { ReviewCryptography } from '#modules/reviews/actions/ports/outbound/review_cryptography'
import type { ReviewEventProcessingPorts } from '#modules/reviews/actions/ports/outbound/review_event_processing'
import type { ReviewExternalDependencies } from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type { ReviewExternalEffectPublisher } from '#modules/reviews/actions/ports/outbound/review_external_effects'
import type { TalentExplainabilityFactSourceReader } from '#modules/reviews/actions/ports/outbound/review_fact_source_readers'
import type { ReviewMetricsReader } from '#modules/reviews/actions/ports/outbound/review_metrics_reader'
import type { ReviewSessionReadStore } from '#modules/reviews/actions/ports/outbound/review_session_readers'

export interface ReviewEventActionFactoryDependencies {
  externalDependencies: ReviewExternalDependencies
  metricsReader?: ReviewMetricsReader
  externalEffects?: ReviewExternalEffectPublisher
  talentSources?: TalentExplainabilityFactSourceReader
  sessionReads?: ReviewSessionReadStore
  eventProcessing?: ReviewEventProcessingPorts
  cryptography?: ReviewCryptography
  anomalyFlags?: ReviewAnomalyFlagWriter
}

/**
 * Constructs Review integration-event consumers without executing them.
 */
export class ReviewEventActionFactory {
  constructor(private readonly dependencies: ReviewEventActionFactoryDependencies) {}

  makeProcessReviewSubmittedEventCommand(): ProcessReviewSubmittedEventCommand {
    const eventProcessing = this.requireEventProcessing()
    return new ProcessReviewSubmittedEventCommand(
      this.dependencies.externalDependencies.user,
      this.requireTalentSources(),
      this.requireCryptography(),
      this.requireMetricsReader(),
      this.requireSessionReads(),
      eventProcessing.transactions,
      eventProcessing.submittedReceipts,
      eventProcessing.sources,
      this.requireAnomalyFlags()
    )
  }

  makeProcessReviewConfirmedEventCommand(): ProcessReviewConfirmedEventCommand {
    const eventProcessing = this.requireEventProcessing()
    return new ProcessReviewConfirmedEventCommand(
      this.dependencies.externalDependencies,
      this.requireMetricsReader(),
      this.requireExternalEffects(),
      this.requireTalentSources(),
      this.requireSessionReads(),
      eventProcessing.transactions,
      eventProcessing.confirmedReceipts,
      eventProcessing.projectionLock
    )
  }

  makeProcessDisputeResolvedEventCommand(): ProcessDisputeResolvedEventCommand {
    const eventProcessing = this.requireEventProcessing()
    return new ProcessDisputeResolvedEventCommand(
      this.dependencies.externalDependencies,
      this.requireMetricsReader(),
      this.requireExternalEffects(),
      this.requireTalentSources(),
      eventProcessing.transactions,
      eventProcessing.disputeReceipts,
      eventProcessing.projectionLock,
      eventProcessing.sources
    )
  }

  private requireMetricsReader(): ReviewMetricsReader {
    if (!this.dependencies.metricsReader) {
      throw new Error('Review metrics capability is not configured')
    }
    return this.dependencies.metricsReader
  }

  private requireExternalEffects(): ReviewExternalEffectPublisher {
    if (!this.dependencies.externalEffects) {
      throw new Error('Review external effects capability is not configured')
    }
    return this.dependencies.externalEffects
  }

  private requireTalentSources(): TalentExplainabilityFactSourceReader {
    if (!this.dependencies.talentSources) {
      throw new Error('Review talent projection sources are not configured')
    }
    return this.dependencies.talentSources
  }

  private requireSessionReads(): ReviewSessionReadStore {
    if (!this.dependencies.sessionReads) {
      throw new Error('Review session read capability is not configured')
    }
    return this.dependencies.sessionReads
  }

  private requireEventProcessing(): ReviewEventProcessingPorts {
    if (!this.dependencies.eventProcessing) {
      throw new Error('Review event processing capabilities are not configured')
    }
    return this.dependencies.eventProcessing
  }

  private requireCryptography(): ReviewCryptography {
    if (!this.dependencies.cryptography) {
      throw new Error('Review cryptography capability is not configured')
    }
    return this.dependencies.cryptography
  }

  private requireAnomalyFlags(): ReviewAnomalyFlagWriter {
    if (!this.dependencies.anomalyFlags) {
      throw new Error('Review anomaly flag capability is not configured')
    }
    return this.dependencies.anomalyFlags
  }
}
