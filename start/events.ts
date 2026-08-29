/**
 * Event Listeners Registration
 *
 * Preload file — đăng ký tất cả event listeners khi ứng dụng khởi động.
 * Import file này trong adonisrc.ts preloads.
 *
 * Listener handlers thuộc consuming module; outer composition đăng ký
 * emitter.on() và cung cấp concrete dependencies khi preload file này.
 */

// Listener registration bootstrap only. Business listeners live with the consuming module.
import '#modules/events/bootstrap/domain_event_outbox'
import '#composition/observability/platform/lifecycle_log_listener_composition'
import '#composition/admin/audit/audit_log_listener_composition'
import '#composition/auth/session/auth_session_observed_composition'

import '#composition/cache/invalidation-outbox/cache_invalidation_listener_composition'
import '#composition/notifications/notification-runtime/notification_runtime_composition'

import '#composition/users/user-profile/user_profile_aggregate_composition'
import '#composition/users/user-talent/user_talent_explainability_listener_composition'
import '#composition/reviews/events/review_listener_composition'
import '#composition/search/reindexing/search_reindex_listener_composition'
