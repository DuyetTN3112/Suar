/**
 * Event Listeners Registration
 *
 * Preload file — đăng ký tất cả event listeners khi ứng dụng khởi động.
 * Import file này trong adonisrc.ts preloads.
 *
 * Mỗi listener file tự đăng ký handlers qua emitter.on()
 * khi được import — không cần gọi thêm hàm nào.
 */

// Cross-cutting listeners live in app/listeners; module-owned listeners live in app/actions/<module>/listeners.
import '#listeners/lifecycle_log_listener'

// Audit log — async, non-blocking, uses auditRepositoryProvider
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

// Module-owned task completion side effects
import '#actions/tasks/listeners/task_completion_listener'
import '#actions/reviews/listeners/assignment_completion_listener'
