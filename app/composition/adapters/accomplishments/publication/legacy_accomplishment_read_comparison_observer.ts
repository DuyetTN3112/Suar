import { platformOperationalLogger } from '#modules/observability/public_contracts/platform_operational_logger'
import type { LegacyAccomplishmentReadComparisonObserver, LegacyAccomplishmentReadComparison  } from '#modules/users/actions/ports/outbound/legacy_accomplishment_read_comparison_observer'

export default class LegacyAccomplishmentReadComparisonObserverAdapter
  implements LegacyAccomplishmentReadComparisonObserver
{
  observe(comparison: LegacyAccomplishmentReadComparison): void {
    platformOperationalLogger.log('info', {
      event_name: 'accomplishment.legacy_read.comparison',
      event_family: 'rollout_observation',
      module: 'accomplishments',
      subsystem: 'legacy_backfill',
      workflow: 'dual_read',
      stage: 'completed',
      severity: 'info',
      outcome: 'success',
      occurred_at: new Date().toISOString(),
      actor: { initiator_type: 'system' },
      request: null,
      trace: {
        id: 'legacy-read-comparison',
        workflow_id: 'dual_read',
        correlation_key: `legacy-read:${comparison.viewerScope}`,
      },
      target: { type: 'user_work_history', id: null, scope: comparison.viewerScope },
      change: {
        legacy_candidate_count: comparison.legacyCandidateCount,
        verified_candidate_count: comparison.verifiedCandidateCount,
        overlap_count: comparison.overlapCount,
        legacy_only_count: comparison.legacyOnlyCount,
        verified_only_count: comparison.verifiedOnlyCount,
        merged_count: comparison.mergedCount,
      },
      runtime: null,
      error: null,
      compliance: {
        redaction_applied: true,
        retention_class: 'transient_runtime',
        contains_user_input: false,
        contains_sensitive_fields: false,
      },
    })
  }
}
