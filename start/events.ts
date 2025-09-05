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
import '#modules/logger/listeners/lifecycle_log_listener'

import '#modules/audit/listeners/audit_log_listener'
import '#modules/audit/listeners/on_user_login'

import '#modules/cache/listeners/cache_invalidation_listener'

import '#modules/user_activity/listeners/on_user_login'

import '#modules/notifications/listeners/notification_listener'

import '#modules/reviews/listeners/review_listener'

import '#modules/projects/listeners/organization_member_removed_listener'

// Module-owned task completion side effects
import '#modules/tasks/actions/listeners/task_completion_listener'
import '#modules/reviews/actions/listeners/assignment_completion_listener'
