/**
 * Moderation Constants
 *
 * Bounded Context: Fraud & Anomaly Moderation
 */

export enum FlaggedReviewStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  DISMISSED = 'dismissed',
  CONFIRMED = 'confirmed',
}

export enum AnomalyFlagType {
  SUDDEN_SPIKE = 'sudden_spike',
  MUTUAL_HIGH = 'mutual_high',
  BULK_SAME_LEVEL = 'bulk_same_level',
  FREQUENCY_ANOMALY = 'frequency_anomaly',
  NEW_ACCOUNT_HIGH = 'new_account_high',
  IP_COLLUSION = 'ip_collusion',
}

export enum AnomalySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export const ANOMALY_DETECTION_DEFAULTS = {
  SUDDEN_SPIKE_DAYS: 30,
  SUDDEN_SPIKE_LEVEL_THRESHOLD: 2,
  MUTUAL_HIGH_THRESHOLD: 3,
  BULK_SAME_LEVEL_RATIO: 0.8,
  FREQUENCY_WINDOW_HOURS: 24,
  FREQUENCY_THRESHOLD: 5,
  NEW_ACCOUNT_DAYS: 30,
} as const
