/**
 * Event Listeners Registration
 *
 * Preload file — đăng ký tất cả event listeners khi ứng dụng khởi động.
 * Import file này trong adonisrc.ts preloads.
 *
 * Mỗi listener file tự đăng ký handlers qua emitter.on()
 * khi được import — không cần gọi thêm hàm nào.
 */

// DB Trigger replacements — org, project, message, task version
import '#listeners/trigger_listeners'

// Audit log — async, non-blocking, uses RepositoryFactory (Sprint 5)
import '#listeners/audit_log_listener'

// Cache invalidation — auto-invalidate khi data thay đổi + permission cache (Sprint 6)
import '#listeners/cache_invalidation_listener'

// Sprint 7: User activity — login/logout audit + last_login_at update
import '#listeners/activity_listener'

// Sprint 7: Notifications — task application submitted/reviewed
import '#listeners/notification_listener'

// Sprint 7: Reviews — spider chart cache invalidation, reviewer credibility
import '#listeners/review_listener'

// Sprint 7: Cleanup — remove user from projects/conversations when removed from org
import '#listeners/cleanup_listener'
