/**
 * Event Listeners Registration
 *
 * Preload file — đăng ký tất cả event listeners khi ứng dụng khởi động.
 * Import file này trong adonisrc.ts preloads.
 *
 * Mỗi listener file tự đăng ký handlers qua emitter.on()
 * khi được import — không cần gọi thêm hàm nào.
 */

// Listener registration bootstrap only. Business listeners live with the consuming module.
import '#modules/events/bootstrap/domain_event_outbox'
import '#modules/logger/listeners/lifecycle_log_listener'

import '#modules/audit/listeners/audit_log_listener'
import '#composition/auth_session_observed_composition'

import '#composition/cache_invalidation_listener_composition'
import '#composition/notification_runtime_composition'

import '#composition/user_profile_aggregate_composition'
import '#composition/user_talent_explainability_listener_composition'
import '#composition/review_listener_composition'
import '#composition/search_reindex_listener_composition'
