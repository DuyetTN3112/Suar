import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { TransactionalAuditDeferralOptions } from '#modules/reviews/actions/dtos/request/transactional_audit_options'
import type {
  ReviewOrganizationReader,
  ReviewUserReaderWriter,
} from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type {
  ReviewMetricsReader,
  ReviewTrustSessionRow,
  ReviewTrustSignalRow,
} from '#modules/reviews/actions/ports/outbound/review_metrics_reader'
import type {
  ReviewTransaction,
  ReviewTransactionRunner,
} from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  calculateTrustScoreV2,
  determineTier,
  mapLevelCodeToNumber,
} from '#modules/reviews/domain/review-core/review_formulas'

/**
 * DTO for CalculateTrustScore
 */
export interface CalculateTrustScoreDTO {
  userId: string
}

/**
 * Result of trust score calculation
 */
export interface TrustScoreResult {
  userId: string
  rawScore: number
  calculatedScore: number
  tierCode: string
  tierName: string
  totalVerifiedReviews: number
}

export interface CalculateTrustScoreTransactionOptions
  extends TransactionalAuditDeferralOptions {
  signal?: AbortSignal
}

/**
 * Command: Calculate Trust Score for a User
 *
 * v3: Trust score stored as JSONB trust_data on users table.
 *
 * Pattern: FETCH → DECIDE (pure formulas) → PERSIST
 */
export default class CalculateTrustScoreCommand extends BaseCommand<
  CalculateTrustScoreDTO,
  TrustScoreResult
> {
  private static readonly TRUST_SCORING_VERSION = 'trust_v2'

  constructor(
    execCtx: ReviewActionContext,
    private readonly organizationReader: ReviewOrganizationReader,
    private readonly userWriter: ReviewUserReaderWriter,
    private readonly metricsReader: ReviewMetricsReader,
    transactions?: ReviewTransactionRunner
  ) {
    super(execCtx, transactions)
  }

  async handle(dto: CalculateTrustScoreDTO): Promise<TrustScoreResult> {
    return await this.executeInTransaction((trx) => this.handleInTransaction(dto, trx))
  }

  async handleInTransaction(
    dto: CalculateTrustScoreDTO,
    trx: ReviewTransaction,
    options: CalculateTrustScoreTransactionOptions = {}
  ): Promise<TrustScoreResult> {
    options.signal?.throwIfAborted()

    const fetched = await this.fetchTrustScoreData(dto.userId, trx)
    const computed = this.computeTrustScore(fetched)

    await this.persistTrustScore(dto.userId, computed, trx)
    const auditWrite = () => this.logTrustScoreAudit(dto.userId, computed, trx)
    if (options.deferAuditWrite) {
      options.deferAuditWrite(auditWrite)
    } else {
      await auditWrite()
    }

    options.signal?.throwIfAborted()
    return {
      userId: dto.userId,
      rawScore: computed.rawScore,
      calculatedScore: computed.calculatedScore,
      tierCode: computed.tierCode,
      tierName: computed.tierName,
      totalVerifiedReviews: computed.totalVerifiedReviews,
    }
  }

  private async fetchTrustScoreData(
    userId: string,
    trx: ReviewTransaction
  ): Promise<TrustScoreFetchResult> {
    const sessions = await this.metricsReader.listCompletedSessionsForTrust(
      userId,
      trx
    )

    const sessionIds = sessions.map((session) => session.id)

    const reviews = sessionIds.length
      ? await this.metricsReader.listSkillReviewTrustRows(sessionIds, trx)
      : []

    const evidenceCountResult = sessionIds.length
      ? await this.metricsReader.countSessionsWithEvidence(sessionIds, trx)
      : [{ total: 0 }]

    const sessionsWithEvidence = Number(
      evidenceCountResult[0]?.total ?? 0
    )

    const organizationIds = await this.organizationReader.listOrganizationIdsByUser(
      userId,
      trx
    )

    let belongsToPartnerOrg = false
    if (organizationIds.length > 0) {
      belongsToPartnerOrg = await this.organizationReader.hasAnyActivePartnerByIds(
        organizationIds,
        trx
      )
    }

    return {
      sessions,
      reviews,
      sessionsWithEvidence,
      organizationIds,
      belongsToPartnerOrg,
    }
  }

  private computeTrustScore(fetched: TrustScoreFetchResult): TrustScoreComputationResult {
    const totalCompletedSessions = fetched.sessions.length
    const totalReviews = fetched.reviews.length
    const recentSessions = this.countRecentSessions(fetched.sessions)
    const { reviewConsistency, reviewerCredibility } = this.calculateReviewSignals(fetched.reviews)

    const evidenceCoverage =
      totalCompletedSessions > 0 ? (fetched.sessionsWithEvidence / totalCompletedSessions) * 100 : 0
    const volumeScore = Math.min(100, totalCompletedSessions * 2)
    const recencyScore = Math.min(100, recentSessions * 10)
    const volumeRecency = (volumeScore + recencyScore) / 2
    const orgPartnerWeight = fetched.belongsToPartnerOrg
      ? 100
      : fetched.organizationIds.length > 0
        ? 70
        : 30

    const rawScore = calculateTrustScoreV2({
      reviewConsistency,
      reviewerCredibility,
      evidenceCoverage,
      orgPartnerWeight,
      volumeRecency,
    })

    const { tierCode, tierWeight, tierName } = determineTier(
      fetched.organizationIds.length > 0,
      fetched.belongsToPartnerOrg
    )

    // v2: org trust signal already contributes in orgPartnerWeight.
    // Keep `calculated_score` equal to raw score to avoid double weighting.
    const calculatedScore = rawScore

    return {
      rawScore,
      calculatedScore,
      tierCode,
      tierName,
      tierWeight,
      totalVerifiedReviews: totalReviews,
      scoringVersion: CalculateTrustScoreCommand.TRUST_SCORING_VERSION,
      signals: {
        reviewConsistency,
        reviewerCredibility,
        evidenceCoverage,
        orgPartnerWeight,
        volumeRecency,
      },
    }
  }

  private countRecentSessions(sessions: ReviewTrustSessionRow[]): number {
    const recentCutoff = DateTime.now().minus({ days: 90 })

    return sessions.filter((session) => {
      const createdAt =
        session.created_at instanceof Date
          ? DateTime.fromJSDate(session.created_at)
          : DateTime.fromISO(session.created_at)

      return createdAt.isValid && createdAt.toMillis() >= recentCutoff.toMillis()
    }).length
  }

  private calculateReviewSignals(reviews: ReviewTrustSignalRow[]): {
    reviewConsistency: number
    reviewerCredibility: number
  } {
    const reviewConsistencyBySession = new Map<
      string,
      { managerLevels: number[]; peerLevels: number[] }
    >()
    let reviewerCredibilityTotal = 0
    let reviewerCredibilityCount = 0

    for (const review of reviews) {
      const bucket = reviewConsistencyBySession.get(review.review_session_id) ?? {
        managerLevels: [],
        peerLevels: [],
      }

      const levelNum = mapLevelCodeToNumber(review.assigned_public_proficiency_code)
      if (review.reviewer_type === 'manager') {
        bucket.managerLevels.push(levelNum)
      } else {
        bucket.peerLevels.push(levelNum)
      }
      reviewConsistencyBySession.set(review.review_session_id, bucket)

      reviewerCredibilityTotal += Number(review.reviewer_credibility_score)
      reviewerCredibilityCount += 1
    }

    const consistencyScores: number[] = []
    for (const bucket of reviewConsistencyBySession.values()) {
      if (bucket.managerLevels.length === 0 || bucket.peerLevels.length === 0) {
        continue
      }

      const managerAvg =
        bucket.managerLevels.reduce((sum, value) => sum + value, 0) / bucket.managerLevels.length
      const peerAvg =
        bucket.peerLevels.reduce((sum, value) => sum + value, 0) / bucket.peerLevels.length
      const delta = Math.abs(managerAvg - peerAvg)
      consistencyScores.push(Math.max(0, 100 - delta * 15))
    }

    const reviewConsistency =
      consistencyScores.length > 0
        ? consistencyScores.reduce((sum, value) => sum + value, 0) / consistencyScores.length
        : 50

    const reviewerCredibility =
      reviewerCredibilityCount > 0 ? reviewerCredibilityTotal / reviewerCredibilityCount : 50

    return { reviewConsistency, reviewerCredibility }
  }

  private async persistTrustScore(
    userId: string,
    computed: TrustScoreComputationResult,
    trx: ReviewTransaction
  ): Promise<void> {
    await this.userWriter.mergeTrustData(
      userId,
      {
        current_tier_code: computed.tierCode,
        calculated_score: computed.calculatedScore,
        raw_score: computed.rawScore,
        total_verified_reviews: computed.totalVerifiedReviews,
        last_calculated_at: DateTime.now().toISO(),
        scoring_version: computed.scoringVersion,
      },
      trx
    )
  }

  private async logTrustScoreAudit(
    userId: string,
    computed: TrustScoreComputationResult,
    trx: ReviewTransaction
  ): Promise<void> {
    if (this.execCtx.userId) {
      await auditPublicApi.write(
        this.execCtx,
        {
          user_id: this.execCtx.userId,
          action: 'calculate_trust_score',
          critical: true,
          entity_type: 'user',
          entity_id: userId,
          old_values: null,
          new_values: {
            raw_score: computed.rawScore,
            calculated_score: computed.calculatedScore,
            tier_code: computed.tierCode,
            tier_name: computed.tierName,
            total_reviews: computed.totalVerifiedReviews,
            v2_signals: {
              review_consistency: Math.round(computed.signals.reviewConsistency * 10) / 10,
              reviewer_credibility: Math.round(computed.signals.reviewerCredibility * 10) / 10,
              evidence_coverage: Math.round(computed.signals.evidenceCoverage * 10) / 10,
              org_partner_weight: computed.signals.orgPartnerWeight,
              volume_recency: Math.round(computed.signals.volumeRecency * 10) / 10,
              tier_weight: computed.tierWeight,
              scoring_version: computed.scoringVersion,
            },
          },
        },
        trx
      )
    }
  }
}

interface TrustScoreFetchResult {
  sessions: ReviewTrustSessionRow[]
  reviews: ReviewTrustSignalRow[]
  sessionsWithEvidence: number
  organizationIds: string[]
  belongsToPartnerOrg: boolean
}

interface TrustScoreComputationResult {
  rawScore: number
  calculatedScore: number
  tierCode: string
  tierName: string
  tierWeight: number
  totalVerifiedReviews: number
  scoringVersion: string
  signals: {
    reviewConsistency: number
    reviewerCredibility: number
    evidenceCoverage: number
    orgPartnerWeight: number
    volumeRecency: number
  }
}
