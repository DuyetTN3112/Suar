import {
  IMPORTED_CLAIM_VERIFIED_CAPABILITY_NOTE,
  VERIFIED_SUMMARY_GOVERNANCE_WARNING,
} from './profile_copy'
import type { ProfileChartCardSummary, SpiderChartPoint } from './types.svelte'

export interface ProfileChartCardSummaryInput {
  points: SpiderChartPoint[]
  totalSkills: number
  verifiedSkills: number
  importedSkills: number
  disputedSkills: number
}

export function buildProfileChartCardSummary(
  input: ProfileChartCardSummaryInput
): ProfileChartCardSummary {
  const reviewedPoints = input.points.filter(
    (point) => point.total_reviews > 0 || point.source === 'reviewed'
  )
  const strongestVerified =
    [...reviewedPoints].sort(
      (a, b) => b.avg_percentage - a.avg_percentage || b.total_reviews - a.total_reviews
    )[0] ?? null
  const mostEvidenced =
    [...reviewedPoints].sort(
      (a, b) => b.total_reviews - a.total_reviews || b.avg_percentage - a.avg_percentage
    )[0] ?? null
  const coverageRatio = input.totalSkills > 0 ? input.verifiedSkills / input.totalSkills : null
  const warnings: string[] = []

  if (input.importedSkills > 0) {
    warnings.push(IMPORTED_CLAIM_VERIFIED_CAPABILITY_NOTE)
  }

  if (input.disputedSkills > 0) {
    warnings.push(`Some skills are in dispute, so ${VERIFIED_SUMMARY_GOVERNANCE_WARNING.toLowerCase()}`)
  }

  if (coverageRatio !== null && coverageRatio < 0.75) {
    warnings.push(
      'Coverage is still limited, so read this capability summary with each skill evidence trail.'
    )
  }

  return {
    chart_mode:
      reviewedPoints.length === 0
        ? 'insufficient_data'
        : reviewedPoints.length >= 3
          ? 'radar'
          : 'list_fallback',
    verified_average_score:
      reviewedPoints.length > 0
        ? reviewedPoints.reduce((sum, point) => sum + point.avg_percentage, 0) /
          reviewedPoints.length
        : null,
    confidence_summary:
      reviewedPoints.length === 0
        ? null
        : coverageRatio === null
          ? 'Confidence: Unknown'
          : coverageRatio < 0.5
            ? 'Confidence: Low because coverage is very limited'
            : coverageRatio < 0.75
              ? 'Confidence: Medium-low because coverage is limited'
              : 'Confidence: Medium-high because verified coverage is broad enough',
    warnings,
    strongest_verified_skill_name: strongestVerified?.skill_name ?? null,
    most_evidenced_skill_name: mostEvidenced?.skill_name ?? null,
    most_evidenced_review_count: mostEvidenced?.total_reviews ?? 0,
    needs_verification_names: input.points
      .filter((point) => point.source === 'imported' && point.total_reviews <= 0)
      .slice(0, 2)
      .map((point) => point.skill_name),
  }
}
