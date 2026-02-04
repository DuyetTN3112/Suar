/**
 * Common Constants
 *
 * Các constants dùng chung cho toàn bộ ứng dụng.
 *
 * CLEANUP 2026-03-01:
 *   - XÓA CommonState, COMMON_STATES, commonStateOptions, getCommonStateName, getCommonStateStyle
 *     → DB v3 không dùng 0/1 state, không ai import
 *   - XÓA Visibility, visibilityOptions, getVisibilityLabel
 *     → Trùng với ProjectVisibility, values sai (DB v3 dùng 'private','team','public' không phải 'organization')
 *
 * @module CommonConstants
 */

/**
 * Pagination defaults
 * Dùng thay cho hardcoded `20`, `100` rải rác trong DTOs/queries.
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 20,
  MAX_PER_PAGE: 100,
} as const

/**
 * Cache TTL (seconds)
 */
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
} as const
