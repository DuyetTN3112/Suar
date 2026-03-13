# notifications Backend Module

## Runtime Storage Update 2026-06-07

Notifications runtime path hiện ghi/đọc trực tiếp từ bảng PostgreSQL `notifications`.

Repository/runtime files:

- [app/modules/notifications/infra/repositories/postgres_notification_repository.ts](/home/tranngocduyet/Projects/Suar/app/modules/notifications/infra/repositories/postgres_notification_repository.ts)
- [app/modules/notifications/infra/repositories/notification_repository_provider.ts](/home/tranngocduyet/Projects/Suar/app/modules/notifications/infra/repositories/notification_repository_provider.ts)

Behavior giữ nguyên ở application layer:

- create notification
- list by user
- unread count
- mark one/all as read
- delete one/all read

Behavior đổi ở persistence layer:

- IDs hiện là UUID PostgreSQL
- reads sắp xếp `created_at desc`
- owner checks thực hiện tại SQL `WHERE user_id = ?`

Legacy MongoDB files (`infra/models/notification.ts`, `mongo_notification_repository.ts`, `dual_notification_repository.ts`) vẫn còn trong tree cho compatibility/backfill references, nhưng provider runtime không còn khởi tạo chúng.

### Kiến trúc lõi & Phân tích nghiệp vụ
- **PostgreSQL-only**: Bỏ hoàn toàn MongoDB dependency. Mọi thao tác tạo, đọc, đếm số chưa đọc, đánh dấu đã đọc và xóa thông báo được xử lý trực tiếp trên PostgreSQL table `notifications`.

## Module Path

```text
app/modules/notifications
```

## Folder And File Inventory

```text
./ README.md
actions/ create_notification.ts delete_notification.ts get_user_notifications.ts list_notifications.ts mark_notification_as_read.ts notification_action_context.ts public_api.ts
actions/serializers/ notification_serializer.ts
actions/services/ notification_public_api.ts
application/dtos/common/ notification_pagination.ts
constants/ notification_constants.ts
controllers/ delete_notification_controller.ts latest_notifications_controller.ts list_notifications_controller.ts mark_notification_read_controller.ts
controllers/v1/ delete_notification_controller.ts list_notifications_controller.ts mark_notification_read_controller.ts
events/ notification_events.ts
infra/models/ notification.ts
infra/repositories/ dual_notification_repository.ts mongo_notification_repository.ts notification_repository_interface.ts notification_repository_provider.ts postgres_notification_repository.ts
infra/repositories/read/ notification_queries.ts shared.ts
infra/repositories/write/ notification_mutations.ts
listeners/ notification_listener.ts
public_contracts/ notification_constants.ts notification_creator.ts
```

## Route Evidence

```text
start/routes/api_v1.ts
start/routes/notifications.ts
```

## Symbol Evidence

| Kind | Symbol | File | Line |
|---|---|---|---:|
| interface | `NotificationData` | `app/modules/notifications/actions/create_notification.ts` | 8 |
| interface | `NotificationCreator` | `app/modules/notifications/actions/create_notification.ts` | 17 |
| class | `CreateNotification` | `app/modules/notifications/actions/create_notification.ts` | 27 |
| class | `DeleteNotification` | `app/modules/notifications/actions/delete_notification.ts` | 6 |
| class | `GetUserNotifications` | `app/modules/notifications/actions/get_user_notifications.ts` | 24 |
| class | `ListNotifications` | `app/modules/notifications/actions/list_notifications.ts` | 25 |
| class | `MarkNotificationAsRead` | `app/modules/notifications/actions/mark_notification_as_read.ts` | 6 |
| interface | `NotificationActionContext` | `app/modules/notifications/actions/notification_action_context.ts` | 1 |
| interface | `AuthenticatedNotificationActionContext` | `app/modules/notifications/actions/notification_action_context.ts` | 8 |
| function | `makeSystemNotificationActionContext` | `app/modules/notifications/actions/notification_action_context.ts` | 12 |
| interface | `RawNotificationData` | `app/modules/notifications/actions/serializers/notification_serializer.ts` | 7 |
| interface | `SerializedNotification` | `app/modules/notifications/actions/serializers/notification_serializer.ts` | 22 |
| function | `serializeNotification` | `app/modules/notifications/actions/serializers/notification_serializer.ts` | 37 |
| function | `serializeNotifications` | `app/modules/notifications/actions/serializers/notification_serializer.ts` | 66 |
| class | `NotificationPublicApi` | `app/modules/notifications/actions/services/notification_public_api.ts` | 8 |
| const | `notificationPublicApi` | `app/modules/notifications/actions/services/notification_public_api.ts` | 20 |
| const | `NOTIFICATION_PAGINATION` | `app/modules/notifications/application/dtos/common/notification_pagination.ts` | 1 |
| const | `BACKEND_NOTIFICATION_TYPES` | `app/modules/notifications/constants/notification_constants.ts` | 21 |
| type | `BackendNotificationType` | `app/modules/notifications/constants/notification_constants.ts` | 84 |
| const | `BACKEND_NOTIFICATION_ENTITY_TYPES` | `app/modules/notifications/constants/notification_constants.ts` | 87 |
| type | `BackendNotificationEntityType` | `app/modules/notifications/constants/notification_constants.ts` | 95 |
| type | `NotificationTypeValue` | `app/modules/notifications/constants/notification_constants.ts` | 99 |
| enum | `NotificationPriority` | `app/modules/notifications/constants/notification_constants.ts` | 104 |
| class | `DeleteNotificationController` | `app/modules/notifications/controllers/delete_notification_controller.ts` | 10 |
| class | `LatestNotificationsController` | `app/modules/notifications/controllers/latest_notifications_controller.ts` | 13 |
| class | `ListNotificationsController` | `app/modules/notifications/controllers/list_notifications_controller.ts` | 13 |
| class | `MarkNotificationReadController` | `app/modules/notifications/controllers/mark_notification_read_controller.ts` | 10 |
| class | `DeleteNotificationController` | `app/modules/notifications/controllers/v1/delete_notification_controller.ts` | 6 |
| class | `ListNotificationsController` | `app/modules/notifications/controllers/v1/list_notifications_controller.ts` | 31 |
| class | `MarkNotificationReadController` | `app/modules/notifications/controllers/v1/mark_notification_read_controller.ts` | 6 |
| interface | `NotificationCreatedEvent` | `app/modules/notifications/events/notification_events.ts` | 2 |
| class | `DualNotificationRepository` | `app/modules/notifications/infra/repositories/dual_notification_repository.ts` | 7 |
| class | `MongoNotificationRepository` | `app/modules/notifications/infra/repositories/mongo_notification_repository.ts` | 15 |
| interface | `NotificationCreateData` | `app/modules/notifications/infra/repositories/notification_repository_interface.ts` | 2 |
| interface | `NotificationRecord` | `app/modules/notifications/infra/repositories/notification_repository_interface.ts` | 12 |
| interface | `NotificationRepository` | `app/modules/notifications/infra/repositories/notification_repository_interface.ts` | 27 |
| function | `getNotificationRepository` | `app/modules/notifications/infra/repositories/notification_repository_provider.ts` | 9 |
| const | `notificationRepositoryProvider` | `app/modules/notifications/infra/repositories/notification_repository_provider.ts` | 17 |
| class | `PostgresNotificationRepository` | `app/modules/notifications/infra/repositories/postgres_notification_repository.ts` | 26 |
| const | `findByUser` | `app/modules/notifications/infra/repositories/read/notification_queries.ts` | 8 |
| const | `getUnreadCount` | `app/modules/notifications/infra/repositories/read/notification_queries.ts` | 36 |
| interface | `NotificationLeanDoc` | `app/modules/notifications/infra/repositories/read/shared.ts` | 5 |
| const | `toNotificationRecord` | `app/modules/notifications/infra/repositories/read/shared.ts` | 20 |
| const | `create` | `app/modules/notifications/infra/repositories/write/notification_mutations.ts` | 11 |
| const | `markAsRead` | `app/modules/notifications/infra/repositories/write/notification_mutations.ts` | 37 |
| const | `markAllAsRead` | `app/modules/notifications/infra/repositories/write/notification_mutations.ts` | 53 |
| const | `deleteNotification` | `app/modules/notifications/infra/repositories/write/notification_mutations.ts` | 62 |
| const | `deleteAllRead` | `app/modules/notifications/infra/repositories/write/notification_mutations.ts` | 75 |

## Import Evidence

### `app/modules/notifications/actions/create_notification.ts`

```ts
import type { NotificationRecord } from '#modules/notifications/infra/repositories/notification_repository_interface'
import { notificationRepositoryProvider } from '#modules/notifications/infra/repositories/notification_repository_provider'
import type {
  BackendNotificationEntityType,
  NotificationTypeValue,
} from '#modules/notifications/public_contracts/notification_constants'
```

### `app/modules/notifications/actions/delete_notification.ts`

```ts
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { NotificationActionContext } from '#modules/notifications/actions/notification_action_context'
import { notificationRepositoryProvider } from '#modules/notifications/infra/repositories/notification_repository_provider'
```

### `app/modules/notifications/actions/get_user_notifications.ts`

```ts
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { NotificationActionContext } from '#modules/notifications/actions/notification_action_context'
import type { NotificationRecord } from '#modules/notifications/infra/repositories/notification_repository_interface'
import { notificationRepositoryProvider } from '#modules/notifications/infra/repositories/notification_repository_provider'
```

### `app/modules/notifications/actions/list_notifications.ts`

```ts
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { NotificationActionContext } from '#modules/notifications/actions/notification_action_context'
import type { NotificationRecord } from '#modules/notifications/infra/repositories/notification_repository_interface'
import { notificationRepositoryProvider } from '#modules/notifications/infra/repositories/notification_repository_provider'
```

### `app/modules/notifications/actions/mark_notification_as_read.ts`

```ts
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { NotificationActionContext } from '#modules/notifications/actions/notification_action_context'
import { notificationRepositoryProvider } from '#modules/notifications/infra/repositories/notification_repository_provider'
```

### `app/modules/notifications/actions/notification_action_context.ts`

```ts
// no imports
```

### `app/modules/notifications/actions/public_api.ts`

```ts
// no imports
```

### `app/modules/notifications/actions/serializers/notification_serializer.ts`

```ts
// no imports
```

### `app/modules/notifications/actions/services/notification_public_api.ts`

```ts
import CreateNotification, {
  type NotificationCreator,
  type NotificationData,
} from '../create_notification.js'
import type { NotificationRecord } from '#modules/notifications/infra/repositories/notification_repository_interface'
```

### `app/modules/notifications/controllers/delete_notification_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import DeleteNotification from '#modules/notifications/actions/delete_notification'
```

### `app/modules/notifications/controllers/latest_notifications_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { optionalActionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetUserNotifications from '#modules/notifications/actions/get_user_notifications'
import { serializeNotifications } from '#modules/notifications/actions/serializers/notification_serializer'
import { NOTIFICATION_PAGINATION as PAGINATION } from '#modules/notifications/application/dtos/common/notification_pagination'
```

### `app/modules/notifications/controllers/list_notifications_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { optionalActionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetUserNotifications from '#modules/notifications/actions/get_user_notifications'
import { serializeNotifications } from '#modules/notifications/actions/serializers/notification_serializer'
import { NOTIFICATION_PAGINATION as PAGINATION } from '#modules/notifications/application/dtos/common/notification_pagination'
```

### `app/modules/notifications/controllers/mark_notification_read_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import MarkNotificationAsRead from '#modules/notifications/actions/mark_notification_as_read'
```

### `app/modules/notifications/controllers/v1/delete_notification_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import DeleteNotification from '#modules/notifications/actions/delete_notification'
```

### `app/modules/notifications/controllers/v1/list_notifications_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { optionalActionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { mapApiV1NotificationResponse, mapApiV1Pagination } from '#modules/http/api_v1/response_mappers'
import GetUserNotifications from '#modules/notifications/actions/get_user_notifications'
import { serializeNotifications } from '#modules/notifications/actions/serializers/notification_serializer'
import { NOTIFICATION_PAGINATION as PAGINATION } from '#modules/notifications/application/dtos/common/notification_pagination'
```

### `app/modules/notifications/controllers/v1/mark_notification_read_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import MarkNotificationAsRead from '#modules/notifications/actions/mark_notification_as_read'
```
## Code Snippets

### `start/routes/notifications.ts`

```ts
import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { throttle } from '#start/limiter'

const ListNotificationsController = () =>
  import('#modules/notifications/controllers/list_notifications_controller')
const LatestNotificationsController = () =>
  import('#modules/notifications/controllers/latest_notifications_controller')
const MarkNotificationReadController = () =>
  import('#modules/notifications/controllers/mark_notification_read_controller')
const DeleteNotificationController = () =>
  import('#modules/notifications/controllers/delete_notification_controller')

router
  .group(() => {
    // Notifications routes
    router.get('/notifications', [ListNotificationsController, 'handle']).as('notifications.index')
    router
      .get('/notifications/latest', [LatestNotificationsController, 'handle'])
      .as('notifications.latest')
    router
      .post('/notifications/:id/mark-as-read', [MarkNotificationReadController, 'markOne'])
      .as('notifications.mark_as_read')
    router
      .post('/notifications/mark-all-as-read', [MarkNotificationReadController, 'markAll'])
      .as('notifications.mark_all_as_read')
    router
      .delete('/notifications/:id', [DeleteNotificationController, 'destroy'])
      .as('notifications.destroy')
    router
      .delete('/notifications', [DeleteNotificationController, 'destroyAllRead'])
      .as('notifications.destroy_all_read')
  })
  .use([middleware.auth(), throttle])

```

### `app/modules/notifications/controllers/delete_notification_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import DeleteNotification from '#modules/notifications/actions/delete_notification'

/**
 * DELETE /notifications/:id → Delete single notification
 * DELETE /notifications → Delete all read notifications
 */
export default class DeleteNotificationController {
  async destroy(ctx: HttpContext) {
    const { params, response } = ctx
    try {
      const deleteNotification = new DeleteNotification(actionContextFromHttp(ctx))
      await deleteNotification.handle({ id: params.id as string })
      response.json({ success: true })
    } catch {
      response.json({ success: false, error: 'Notification system unavailable' })
    }
  }

  async destroyAllRead(ctx: HttpContext) {
    const { response } = ctx
    try {
      const deleteNotification = new DeleteNotification(actionContextFromHttp(ctx))
      await deleteNotification.deleteAllRead()
      response.json({ success: true })
    } catch {
      response.json({ success: false, error: 'Notification system unavailable' })
    }
  }
}

```

### `app/modules/notifications/controllers/latest_notifications_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'

import { optionalActionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetUserNotifications from '#modules/notifications/actions/get_user_notifications'
import { serializeNotifications } from '#modules/notifications/actions/serializers/notification_serializer'
import { NOTIFICATION_PAGINATION as PAGINATION } from '#modules/notifications/application/dtos/common/notification_pagination'

const LATEST_NOTIFICATIONS_DEFAULT_LIMIT = 10

/**
 * GET /notifications/latest → Get latest notifications (JSON API)
 */
export default class LatestNotificationsController {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx
    try {
      const getUserNotifications = new GetUserNotifications(optionalActionContextFromHttp(ctx))
      const limit = Number(request.input('limit', LATEST_NOTIFICATIONS_DEFAULT_LIMIT))
      const result = await getUserNotifications.handle({
        page: PAGINATION.DEFAULT_PAGE,
        limit,
        unread_only: false,
      })
      const notificationsData = serializeNotifications(result.notifications)

      response.json({
        notifications: notificationsData,
        unread_count: result.unread_count,
      })
    } catch {
      // Gracefully handle missing notifications table or other DB errors
      response.json({
        notifications: [],
        unread_count: 0,
      })
    }
  }
}

```

### `app/modules/notifications/controllers/list_notifications_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'

import { optionalActionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetUserNotifications from '#modules/notifications/actions/get_user_notifications'
import { serializeNotifications } from '#modules/notifications/actions/serializers/notification_serializer'
import { NOTIFICATION_PAGINATION as PAGINATION } from '#modules/notifications/application/dtos/common/notification_pagination'

const NOTIFICATIONS_DEFAULT_LIMIT = 15

/**
 * GET /notifications → List notifications (Inertia page)
 */
export default class ListNotificationsController {
  async handle(ctx: HttpContext) {
    const { request, inertia } = ctx
    try {
      const getUserNotifications = new GetUserNotifications(optionalActionContextFromHttp(ctx))
      const page = Number(request.input('page', PAGINATION.DEFAULT_PAGE))
      const limit = Number(request.input('limit', NOTIFICATIONS_DEFAULT_LIMIT))
      const unreadOnly = request.input('unread_only') === 'true'
      const result = await getUserNotifications.handle({ page, limit, unread_only: unreadOnly })
      return await inertia.render('notifications/index', {
        notifications: {
          data: serializeNotifications(result.notifications),
          meta: result.meta,
        },
        unread_count: result.unread_count,
        filters: { page, limit, unread_only: unreadOnly },
      })
    } catch {
      // Gracefully handle missing notifications table or other DB errors
      return await inertia.render('notifications/index', {
        notifications: {
          data: [],
          meta: {
            total: 0,
            per_page: NOTIFICATIONS_DEFAULT_LIMIT,
            current_page: PAGINATION.DEFAULT_PAGE,
            last_page: 1,
          },
        },
        unread_count: 0,
        filters: {
          page: PAGINATION.DEFAULT_PAGE,
          limit: NOTIFICATIONS_DEFAULT_LIMIT,
          unread_only: false,
        },
      })
    }
  }
}

```

### `app/modules/notifications/controllers/mark_notification_read_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import MarkNotificationAsRead from '#modules/notifications/actions/mark_notification_as_read'

/**
 * POST /notifications/:id/mark-as-read → Mark single notification as read
 * POST /notifications/mark-all-as-read → Mark all notifications as read
 */
export default class MarkNotificationReadController {
  async markOne(ctx: HttpContext) {
    const { params, response } = ctx
    try {
      const markAsRead = new MarkNotificationAsRead(actionContextFromHttp(ctx))
      await markAsRead.handle({ id: params.id as string })
      response.json({ success: true })
    } catch {
      response.json({ success: false, error: 'Notification system unavailable' })
    }
  }

  async markAll(ctx: HttpContext) {
    const { response } = ctx
    try {
      const markAsRead = new MarkNotificationAsRead(actionContextFromHttp(ctx))
      await markAsRead.markAllAsRead()
      response.json({ success: true })
    } catch {
      response.json({ success: false, error: 'Notification system unavailable' })
    }
  }
}

```

### `app/modules/notifications/infra/repositories/read/notification_queries.ts`

```ts
import { toNotificationRecord, type NotificationLeanDoc } from './shared.js'

import { NOTIFICATION_PAGINATION as PAGINATION } from '#modules/notifications/application/dtos/common/notification_pagination'
import MongoNotification from '#modules/notifications/infra/models/notification'
import type { NotificationRecord } from '#modules/notifications/infra/repositories/notification_repository_interface'


export const findByUser = async (
  userId: string,
  options?: { isRead?: boolean; limit?: number; page?: number }
): Promise<{ data: NotificationRecord[]; total: number }> => {
  const page = options?.page ?? 1
  const limit = options?.limit ?? PAGINATION.DEFAULT_PER_PAGE
  const skip = (page - 1) * limit

  const filter: Record<string, string | boolean> = { user_id: userId }
  if (options?.isRead !== undefined) {
    filter.is_read = options.isRead
  }

  const mongoFilter = filter as unknown as Parameters<(typeof MongoNotification)['find']>[0]

  const [rawDocs, total] = await Promise.all([
    MongoNotification.find(mongoFilter).sort({ created_at: -1 }).skip(skip).limit(limit).lean().exec(),
    MongoNotification.countDocuments(mongoFilter).exec(),
  ])

  const docs = rawDocs as unknown as NotificationLeanDoc[]

  return {
    data: docs.map((doc) => toNotificationRecord(doc)),
    total,
  }
}

export const getUnreadCount = async (userId: string): Promise<number> => {
  const filter = {
    user_id: userId,
    is_read: false,
  } as unknown as Parameters<(typeof MongoNotification)['countDocuments']>[0]
  return MongoNotification.countDocuments(filter).exec()
}

```

### `app/modules/notifications/public_contracts/notification_constants.ts`

```ts
export * from '#modules/notifications/constants/notification_constants'

```

### `app/modules/notifications/public_contracts/notification_creator.ts`

```ts
export { notificationPublicApi } from '#modules/notifications/actions/services/notification_public_api'
export type { NotificationCreator, NotificationData } from '#modules/notifications/actions/create_notification'

```

### `app/modules/notifications/infra/repositories/postgres_notification_repository.ts`

```ts
import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import type {
  NotificationCreateData,
  NotificationRecord,
  NotificationRepository,
} from '#modules/notifications/infra/repositories/notification_repository_interface'

interface NotificationRow {
  id: string
  user_id: string
  title: string
  message: string
  is_read: boolean
  type: string
  related_entity_type: string | null
  related_entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: Date
  updated_at: Date | null
  read_at: Date | null
}

export default class PostgresNotificationRepository implements NotificationRepository {
  async create(data: NotificationCreateData): Promise<NotificationRecord | null> {
    const id = randomUUID()

    await db.table('notifications').insert({
      id,
      user_id: data.user_id,
      title: data.title,
      message: data.message,
      type: data.type,
      related_entity_type: data.related_entity_type ?? null,
      related_entity_id: data.related_entity_id ?? null,
      metadata: data.metadata ?? null,
    })

    const row = (await db.from('notifications').where('id', id).first()) as NotificationRow | undefined
    return row ? this.toRecord(row) : null
  }

  async findByUser(
    userId: string,
    options?: { isRead?: boolean; limit?: number; page?: number }
  ): Promise<{ data: NotificationRecord[]; total: number }> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 10
    const offset = (page - 1) * limit
    let baseQuery = db.from('notifications').where('user_id', userId)

    if (options?.isRead !== undefined) {
      baseQuery = baseQuery.where('is_read', options.isRead)
    }

    const rows = (await baseQuery.clone().orderBy('created_at', 'desc').offset(offset).limit(limit)) as
      | NotificationRow[]
    const totalResult = (await baseQuery.clone().count('* as count').first()) as
      | { count?: number | string }
      | undefined

    return {
      data: rows.map((row) => this.toRecord(row)),
      total: Number(totalResult?.count ?? 0),
    }
  }

  async markAsRead(notificationId: string, userId?: string): Promise<boolean> {
    let query = db.from('notifications').where('id', notificationId)
    if (userId !== undefined) {
      query = query.where('user_id', userId)
    }

    const affected = Number(await query.update({
      is_read: true,
      read_at: new Date(),
      updated_at: new Date(),
    }))

    return affected > 0
  }

  async markAllAsRead(userId: string): Promise<void> {
    await db
      .from('notifications')
      .where('user_id', userId)
      .where('is_read', false)
      .update({
        is_read: true,
        read_at: new Date(),
        updated_at: new Date(),
      })
  }

  async delete(notificationId: string, userId?: string): Promise<boolean> {
    let query = db.from('notifications').where('id', notificationId)
    if (userId !== undefined) {
      query = query.where('user_id', userId)
    }

    const affected = Number(await query.delete())
    return affected > 0
  }

  async deleteAllRead(userId: string): Promise<void> {
    await db.from('notifications').where('user_id', userId).where('is_read', true).delete()
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = (await db
      .from('notifications')
      .where('user_id', userId)
      .where('is_read', false)
      .count('* as count')
      .first()) as { count?: number | string } | undefined

    return Number(result?.count ?? 0)
  }

  private toRecord(row: NotificationRow): NotificationRecord {
    return {
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      message: row.message,
      is_read: row.is_read,
      type: row.type,
      related_entity_type: row.related_entity_type,
      related_entity_id: row.related_entity_id,
      metadata: row.metadata,
      created_at: new Date(row.created_at),
      updated_at: row.updated_at ? new Date(row.updated_at) : null,
      read_at: row.read_at ? new Date(row.read_at) : null,
    }
  }
}

```
