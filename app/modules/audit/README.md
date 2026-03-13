# audit Backend Module

## Runtime Storage Update 2026-06-07

Audit runtime path hiện ghi/đọc hoàn toàn từ PostgreSQL table `audit_events`.

Storage tables:

- `audit_events`
- `error_events` hiện đã được wire từ `HttpExceptionHandler.report()` cho `5xx` và `429`

Repository/runtime files:

- [app/modules/audit/infra/repositories/postgres_audit_log_repository.ts](/home/tranngocduyet/Projects/Suar/app/modules/audit/infra/repositories/postgres_audit_log_repository.ts)
- [app/modules/audit/infra/repositories/audit_repository_provider.ts](/home/tranngocduyet/Projects/Suar/app/modules/audit/infra/repositories/audit_repository_provider.ts)
- [app/modules/audit/infra/repositories/read/audit_log_read_repository.ts](/home/tranngocduyet/Projects/Suar/app/modules/audit/infra/repositories/read/audit_log_read_repository.ts)

Admin audit log listing không truy cập MongoDB. Read path admin hiện truy vấn `audit_events` bằng query builder PostgreSQL, vẫn giữ nguyên contract response cho `/admin/audit-logs`.

Legacy MongoDB files (`infra/models/audit_log.ts`, `mongo_audit_log_repository.ts`, `dual_audit_log_repository.ts`) vẫn còn trong tree cho compatibility/backfill references, nhưng provider runtime không còn khởi tạo chúng.

### Kiến trúc lõi & Phân tích nghiệp vụ
- **PostgreSQL Storage**: Ghi trực tiếp hoạt động nghiệp vụ vào bảng `audit_events`. Sử dụng cơ chế fire-and-forget qua event emitter nhằm đảm bảo hoạt động ghi log không chặn luồng phản hồi HTTP chính.
- **Error Persistence**: Hệ thống tự động bắt các lỗi 5xx và 429 từ handler và persist vào bảng `error_events` để hỗ trợ giám sát.

## Module Path

```text
app/modules/audit
```

## Folder And File Inventory

```text
./ README.md
actions/ audit_action_context.ts create_audit_log.ts public_api.ts read_audit_logs.ts write_audit_log.ts
actions/services/ audit_public_api.ts
constants/ audit_constants.ts
controllers/mappers/ audit_log_response_mapper.ts
domain/ audit_change_formatter.ts audit_log_helpers.ts
events/ audit_events.ts
infra/models/ audit_log.ts
infra/repositories/ audit_log_repository_interface.ts audit_repository_provider.ts dual_audit_log_repository.ts mongo_audit_log_repository.ts postgres_audit_log_repository.ts
infra/repositories/read/ audit_log_read_repository.ts
infra/repositories/write/ audit_log_writer_repository.ts
listeners/ audit_log_listener.ts on_user_login.ts
middleware/ audit_log_middleware.ts
public_contracts/ audit_constants.ts audit_log_writer.ts
```

## Route Evidence

```text
(none)
```

## Symbol Evidence

| Kind | Symbol | File | Line |
|---|---|---|---:|
| interface | `AuditActionContext` | `app/modules/audit/actions/audit_action_context.ts` | 1 |
| interface | `AuthenticatedAuditActionContext` | `app/modules/audit/actions/audit_action_context.ts` | 8 |
| function | `makeSystemAuditActionContext` | `app/modules/audit/actions/audit_action_context.ts` | 12 |
| interface | `AuditLogData` | `app/modules/audit/actions/create_audit_log.ts` | 4 |
| class | `CreateAuditLog` | `app/modules/audit/actions/create_audit_log.ts` | 13 |
| function | `formatAuditChanges` | `app/modules/audit/actions/read_audit_logs.ts` | 59 |
| class | `AuditPublicApi` | `app/modules/audit/actions/services/audit_public_api.ts` | 24 |
| const | `auditPublicApi` | `app/modules/audit/actions/services/audit_public_api.ts` | 78 |
| interface | `WriteAuditLogInput` | `app/modules/audit/actions/write_audit_log.ts` | 5 |
| interface | `WriteAuditLogAllowAnonymousInput` | `app/modules/audit/actions/write_audit_log.ts` | 14 |
| enum | `AuditAction` | `app/modules/audit/constants/audit_constants.ts` | 18 |
| enum | `EntityType` | `app/modules/audit/constants/audit_constants.ts` | 49 |
| interface | `AuditLogResponseItem` | `app/modules/audit/controllers/mappers/audit_log_response_mapper.ts` | 2 |
| function | `mapTaskAuditLogResponse` | `app/modules/audit/controllers/mappers/audit_log_response_mapper.ts` | 10 |
| function | `formatAuditChanges` | `app/modules/audit/domain/audit_change_formatter.ts` | 1 |
| function | `pickAuditFields` | `app/modules/audit/domain/audit_log_helpers.ts` | 15 |
| function | `createAuditDescription` | `app/modules/audit/domain/audit_log_helpers.ts` | 31 |
| function | `createAuditDescriptionVi` | `app/modules/audit/domain/audit_log_helpers.ts` | 71 |
| function | `formatAuditChanges` | `app/modules/audit/domain/audit_log_helpers.ts` | 131 |
| interface | `LogDeleteManyParams` | `app/modules/audit/domain/audit_log_helpers.ts` | 180 |
| function | `prepareDeleteManyLog` | `app/modules/audit/domain/audit_log_helpers.ts` | 191 |
| function | `maskSensitiveFields` | `app/modules/audit/domain/audit_log_helpers.ts` | 219 |
| interface | `AuditableEvent` | `app/modules/audit/events/audit_events.ts` | 2 |
| interface | `AuditLogEvent` | `app/modules/audit/events/audit_events.ts` | 9 |
| const | `MongoAuditLogModel` | `app/modules/audit/infra/models/audit_log.ts` | 64 |
| interface | `AuditLogCreateData` | `app/modules/audit/infra/repositories/audit_log_repository_interface.ts` | 2 |
| interface | `AuditLogRecord` | `app/modules/audit/infra/repositories/audit_log_repository_interface.ts` | 13 |
| interface | `AuditLogQuery` | `app/modules/audit/infra/repositories/audit_log_repository_interface.ts` | 26 |
| interface | `AuditLogRepository` | `app/modules/audit/infra/repositories/audit_log_repository_interface.ts` | 37 |
| function | `getAuditLogRepository` | `app/modules/audit/infra/repositories/audit_repository_provider.ts` | 9 |
| const | `auditRepositoryProvider` | `app/modules/audit/infra/repositories/audit_repository_provider.ts` | 17 |
| class | `DualAuditLogRepository` | `app/modules/audit/infra/repositories/dual_audit_log_repository.ts` | 8 |
| class | `MongoAuditLogRepository` | `app/modules/audit/infra/repositories/mongo_audit_log_repository.ts` | 33 |
| class | `PostgresAuditLogRepository` | `app/modules/audit/infra/repositories/postgres_audit_log_repository.ts` | 26 |
| interface | `AuditLogRecord` | `app/modules/audit/infra/repositories/read/audit_log_read_repository.ts` | 7 |
| interface | `AdminAuditLogListParams` | `app/modules/audit/infra/repositories/read/audit_log_read_repository.ts` | 18 |
| interface | `AdminAuditLogRecord` | `app/modules/audit/infra/repositories/read/audit_log_read_repository.ts` | 30 |
| type | `AuditUserField` | `app/modules/audit/infra/repositories/read/audit_log_read_repository.ts` | 35 |
| class | `AuditLogMiddleware` | `app/modules/audit/middleware/audit_log_middleware.ts` | 18 |

## Import Evidence

### `app/modules/audit/actions/audit_action_context.ts`

```ts
// no imports
```

### `app/modules/audit/actions/create_audit_log.ts`

```ts
import type { AuditActionContext } from '#modules/audit/actions/audit_action_context'
import { writeAuditLog } from '#modules/audit/actions/write_audit_log'
```

### `app/modules/audit/actions/public_api.ts`

```ts
// no imports
```

### `app/modules/audit/actions/read_audit_logs.ts`

```ts
import { formatAuditChanges as formatChanges } from '#modules/audit/domain/audit_change_formatter'
import {
  listAdminAuditLogs as listAdminLogs,
  getAuditUsersByIds,
  getLastAuditActivityByUsers as getLastActivityByUsers,
  listAuditLogsByEntity as listByEntity,
  type AdminAuditLogListParams,
  type AdminAuditLogRecord,
  type AuditLogRecord,
  type AuditUserField,
} from '#modules/audit/infra/repositories/read/audit_log_read_repository'
```

### `app/modules/audit/actions/services/audit_public_api.ts`

```ts
import CreateAuditLog, { type AuditLogData } from '../create_audit_log.js'
import {
  type AdminAuditLogListParams,
  type AdminAuditLogRecord,
  buildAuditUserMap,
  formatAuditChanges,
  getLastAuditActivityByUsers,
  listAdminAuditLogs,
  listAuditLogsByEntity,
} from '../read_audit_logs.js'
import {
  writeAuditLog,
  writeAuditLogAllowAnonymous,
  type WriteAuditLogAllowAnonymousInput,
  type WriteAuditLogInput,
} from '../write_audit_log.js'
import type { AuditActionContext } from '#modules/audit/actions/audit_action_context'
import type {
  AuditLogRecord,
  AuditUserField,
} from '#modules/audit/infra/repositories/read/audit_log_read_repository'
```

### `app/modules/audit/actions/write_audit_log.ts`

```ts
import type { AuditActionContext } from '#modules/audit/actions/audit_action_context'
import { writeAuditLog as persistAuditLog } from '#modules/audit/infra/repositories/write/audit_log_writer_repository'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
```

### `app/modules/audit/controllers/mappers/audit_log_response_mapper.ts`

```ts
// no imports
```
## Code Snippets

### `app/modules/audit/controllers/mappers/audit_log_response_mapper.ts`

```ts

export interface AuditLogResponseItem {
  id: string
  action: string
  user: { id: string; name: string; email: string } | null
  timestamp: Date
  changes: { field: string; oldValue: unknown; newValue: unknown }[]
}

export function mapTaskAuditLogResponse(
  auditLogs: AuditLogResponseItem[]
): { success: true; data: AuditLogResponseItem[] } {
  return {
    success: true,
    data: auditLogs,
  }
}

```

### `app/modules/audit/domain/audit_change_formatter.ts`

```ts
export function formatAuditChanges(
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>
): { field: string; oldValue: unknown; newValue: unknown }[] {
  const changes: { field: string; oldValue: unknown; newValue: unknown }[] = []

  for (const key in newValues) {
    if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
      changes.push({
        field: key,
        oldValue: oldValues[key] ?? null,
        newValue: newValues[key] ?? null,
      })
    }
  }

  return changes
}

```

### `app/modules/audit/domain/audit_log_helpers.ts`

```ts
/**
 * Audit Log Helpers
 *
 * Helpers for audit logging operations.
 * Pattern học từ ancarat-bo: action_log_helpers.ts
 *
 * @module AuditLogHelpers
 */

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'

/**
 * Pick specific fields from an object for audit logging
 */
export function pickAuditFields<T extends object, K extends keyof T>(
  obj: T,
  fields: readonly K[]
): Pick<T, K> {
  const result: Partial<Pick<T, K>> = {}
  fields.forEach((field) => {
    if (field in obj) {
      result[field] = obj[field]
    }
  })
  return result as Pick<T, K>
}

/**
 * Tạo mô tả cho audit log
 */
export function createAuditDescription(
  action: AuditAction,
  entityType: EntityType,
  entityId: number | string,
  additionalInfo?: string
): string {
  const actionMap: Partial<Record<AuditAction, string>> = {
    [AuditAction.CREATE]: 'Created',
    [AuditAction.UPDATE]: 'Updated',
    [AuditAction.DELETE]: 'Deleted',
    [AuditAction.SOFT_DELETE]: 'Soft deleted',
    [AuditAction.HARD_DELETE]: 'Hard deleted',
    [AuditAction.RESTORE]: 'Restored',
    [AuditAction.LOGIN]: 'Logged in',
    [AuditAction.LOGOUT]: 'Logged out',
    [AuditAction.APPROVE]: 'Approved',
    [AuditAction.REJECT]: 'Rejected',
    [AuditAction.INVITE]: 'Invited to',
    [AuditAction.JOIN]: 'Joined',
    [AuditAction.LEAVE]: 'Left',
    [AuditAction.TRANSFER]: 'Transferred',
    [AuditAction.ASSIGN]: 'Assigned',
    [AuditAction.UNASSIGN]: 'Unassigned',
    [AuditAction.UPDATE_STATUS]: 'Updated status',
    [AuditAction.UPDATE_TIME]: 'Updated time',
    [AuditAction.REVOKE_ACCESS]: 'Revoked access',
    [AuditAction.SWITCH_ORGANIZATION]: 'Switched organization',
    [AuditAction.DEACTIVATE]: 'Deactivated',
    [AuditAction.UPDATE_MEMBER_ROLE]: 'Updated member role',
  }

  const actionText = actionMap[action] ?? action
  const description = `${actionText} ${entityType} #${entityId}${additionalInfo ? ` - ${additionalInfo}` : ''}`

  return description
}

/**
 * Tạo mô tả tiếng Việt cho audit log
 */
export function createAuditDescriptionVi(
  action: AuditAction,
  entityType: EntityType,
  entityId: number | string,
  additionalInfo?: string
): string {
  const actionMap: Partial<Record<AuditAction, string>> = {
    [AuditAction.CREATE]: 'Đã tạo',
    [AuditAction.UPDATE]: 'Đã cập nhật',
    [AuditAction.DELETE]: 'Đã xóa',
    [AuditAction.SOFT_DELETE]: 'Đã xóa mềm',
    [AuditAction.HARD_DELETE]: 'Đã xóa vĩnh viễn',
    [AuditAction.RESTORE]: 'Đã khôi phục',
    [AuditAction.LOGIN]: 'Đã đăng nhập',
    [AuditAction.LOGOUT]: 'Đã đăng xuất',
    [AuditAction.APPROVE]: 'Đã phê duyệt',
    [AuditAction.REJECT]: 'Đã từ chối',
    [AuditAction.INVITE]: 'Đã mời vào',
    [AuditAction.JOIN]: 'Đã tham gia',
    [AuditAction.LEAVE]: 'Đã rời khỏi',
    [AuditAction.TRANSFER]: 'Đã chuyển giao',
    [AuditAction.ASSIGN]: 'Đã giao việc',
    [AuditAction.UNASSIGN]: 'Đã bỏ giao việc',
    [AuditAction.UPDATE_STATUS]: 'Đã cập nhật trạng thái',
    [AuditAction.UPDATE_TIME]: 'Đã cập nhật thời gian',
    [AuditAction.REVOKE_ACCESS]: 'Đã thu hồi quyền truy cập',
    [AuditAction.SWITCH_ORGANIZATION]: 'Đã chuyển tổ chức',
    [AuditAction.DEACTIVATE]: 'Đã vô hiệu hóa',
    [AuditAction.UPDATE_MEMBER_ROLE]: 'Đã cập nhật vai trò thành viên',
  }

  const entityMap: Partial<Record<EntityType, string>> = {
    [EntityType.USER]: 'người dùng',
    [EntityType.ORGANIZATION]: 'tổ chức',
    [EntityType.ORGANIZATION_USER]: 'thành viên tổ chức',
    [EntityType.PROJECT]: 'dự án',
    [EntityType.PROJECT_MEMBER]: 'thành viên dự án',
    [EntityType.TASK]: 'công việc',
    [EntityType.TASK_APPLICATION]: 'đơn ứng tuyển',
    [EntityType.TASK_ASSIGNMENT]: 'phân công',
    [EntityType.REVIEW]: 'đánh giá',
    [EntityType.NOTIFICATION]: 'thông báo',
    [EntityType.CONVERSATION]: 'cuộc trò chuyện',
    [EntityType.MESSAGE]: 'tin nhắn',
    [EntityType.PROJECT_SKILL]: 'kỹ năng dự án',
    [EntityType.PROJECT_PROFESSIONAL_ROLE]: 'vai trò dự án',
    [EntityType.PROJECT_PROFESSIONAL_ROLE_SKILL]: 'kỹ năng vai trò dự án',
  }

  const actionText = actionMap[action] ?? action
  const entityText = entityMap[entityType] ?? entityType
  const description = `${actionText} ${entityText} #${entityId}${additionalInfo ? ` - ${additionalInfo}` : ''}`

  return description
}

/**
 * Format changes for audit log
 * So sánh old và new values, trả về các thay đổi
 */
export function formatAuditChanges<T extends object>(
  oldValues: T | null,
  newValues: T | null,
  excludeFields: (keyof T)[] = []
): { field: string; oldValue: unknown; newValue: unknown }[] {
  const changes: { field: string; oldValue: unknown; newValue: unknown }[] = []

  if (!oldValues && !newValues) {
    return changes
  }

  const allKeys = new Set([
    ...Object.keys(oldValues ?? {}),
    ...Object.keys(newValues ?? {}),
  ]) as Set<keyof T>

  allKeys.forEach((key) => {
    if (excludeFields.includes(key)) {
      return
    }

    const oldVal = oldValues ? oldValues[key] : undefined
    const newVal = newValues ? newValues[key] : undefined

    // Skip if both are undefined
    if (oldVal === undefined && newVal === undefined) {
      return
    }

    // Compare values (handle objects by JSON stringify)
    const oldStr = JSON.stringify(oldVal)
    const newStr = JSON.stringify(newVal)

    if (oldStr !== newStr) {
      changes.push({
        field: String(key),
        oldValue: oldVal,
        newValue: newVal,
      })
    }
  })

  return changes
}

/**
 * Log params for bulk delete operations
 * Pattern từ ancarat-bo: logDeleteMany
 */
export interface LogDeleteManyParams<T = object, F extends keyof T = keyof T> {
  userId: number
  entityType: EntityType
  deletedItems: T[]
  fields?: readonly F[]
  description?: string
}

/**
 * Chuẩn bị data cho bulk delete audit log
 */
export function prepareDeleteManyLog<T extends object, F extends keyof T = keyof T>({
  deletedItems,
  fields = ['id'] as unknown as readonly F[],
}: LogDeleteManyParams<T, F>): Record<string, unknown>[] {
  return deletedItems.map((item) => {
    const result: Record<string, unknown> = {}
    fields.forEach((field) => {
      result[String(field)] = item[field]
    })
    return result
  })
}

/**
 * Sensitive fields that should be masked in audit logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'password_hash',
  'token',
  'secret',
  'api_key',
  'refresh_token',
]

/**
 * Mask sensitive fields in an object for audit logging
 */
export function maskSensitiveFields<T extends object>(obj: T): T {
  const result = { ...obj }

  for (const key of Object.keys(result) as (keyof T)[]) {
    if (SENSITIVE_FIELDS.includes(String(key).toLowerCase())) {
      ;(result[key] as unknown) = '***MASKED***'
    }
  }

  return result
}

```

### `app/modules/audit/middleware/audit_log_middleware.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import emitter from '@adonisjs/core/services/emitter'
import type { NextFn } from '@adonisjs/core/types/http'

import loggerService from '#modules/logger/public_contracts/logger_service'

/**
 * Audit Log Middleware — Emit audit:log event sau khi request hoàn thành.
 *
 * TRƯỚC: Ghi trực tiếp qua AuditLog.create() — coupling cao, triple audit path
 * SAU: Emit event → AuditLogListener xử lý (Repository Pattern, DualWrite)
 *
 * SINGLE AUDIT PATH: Event-driven only
 *   middleware → emit('audit:log') → AuditLogListener → auditRepositoryProvider
 *
 * Pattern: Fire-and-forget, non-blocking
 */
export default class AuditLogMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { action?: string; entityType?: string } = {}
  ): Promise<void> {
    const startTime = Date.now()

    await next()

    if (!ctx.auth.user) {
      return
    }

    const entityId = ctx.params.id as string | undefined
    const duration = Date.now() - startTime

    // Fire-and-forget: emit event → AuditLogListener handles persistence
    try {
      void emitter.emit('audit:log', {
        userId: ctx.auth.user.id,
        action: options.action ?? ctx.request.method(),
        entityType: options.entityType ?? undefined,
        entityId: entityId ?? undefined,
        ipAddress: ctx.request.ip(),
        userAgent: ctx.request.header('user-agent') ?? '',
        newValues: {
          method: ctx.request.method(),
          url: ctx.request.url(),
          duration: `${String(duration)}ms`,
          status: ctx.response.getStatus(),
        },
      })
    } catch (error) {
      // Audit failure KHÔNG block response
      loggerService.error('Audit log emit failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: ctx.auth.user.id,
        url: ctx.request.url(),
      })
    }
  }
}

```

### `app/modules/audit/public_contracts/audit_constants.ts`

```ts
export * from '#modules/audit/constants/audit_constants'

```

### `app/modules/audit/public_contracts/audit_log_writer.ts`

```ts
export { auditPublicApi } from '#modules/audit/actions/services/audit_public_api'
export type { AuditLogData } from '#modules/audit/actions/create_audit_log'

```

### `app/modules/audit/infra/repositories/read/audit_log_read_repository.ts`

```ts
import db from '@adonisjs/lucid/services/db'

import UserRepository from '../../../../users/infra/repositories/user_repository.js'
import { auditRepositoryProvider } from '../audit_repository_provider.js'


export interface AuditLogRecord {
  id: string
  user_id: string | null
  entity_type: string
  entity_id: string | null
  action: string
  created_at: Date
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
}

export interface AdminAuditLogListParams {
  page: number
  perPage: number
  search?: string
  action?: string
  resourceType?: string
  userId?: string
  from?: Date
  to?: Date
  searchMatchedUserIds?: string[]
}

export interface AdminAuditLogRecord extends AuditLogRecord {
  ip_address: string | null
  user_agent: string | null
}

export type AuditUserField = 'id' | 'username' | 'email'

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const buildAdminAuditLogFilter = (
  params: AdminAuditLogListParams
): ReturnType<typeof db.from> => {
  let query = db.from('audit_events')

  if (params.action) {
    query = query.where('action', params.action)
  }

  if (params.resourceType) {
    query = query.where('entity_type', params.resourceType)
  }

  if (params.userId) {
    query = query.where('user_id', params.userId)
  }

  if (params.from) {
    query = query.where('occurred_at', '>=', params.from)
  }

  if (params.to) {
    query = query.where('occurred_at', '<=', params.to)
  }

  const search = params.search?.trim()
  if (search) {
    const normalized = `%${escapeRegex(search).replace(/[%_]/g, '\\$&')}%`
    const matchedUserIds = params.searchMatchedUserIds ?? []
    query = query.where((builder) => {
      let scopedBuilder = builder
        .whereILike('action', normalized)
        .orWhereILike('entity_type', normalized)
        .orWhereILike('entity_id', normalized)
        .orWhereILike('ip_address', normalized)

      if (matchedUserIds.length > 0) {
        scopedBuilder = scopedBuilder.orWhereIn('user_id', matchedUserIds)
      }

      return scopedBuilder
    })
  }

  return query
}

export async function listAuditLogsByEntity(
  entityType: string,
  entityId: string,
  limit: number
): Promise<AuditLogRecord[]> {
  const auditRepo = auditRepositoryProvider.getAuditLogRepository()
  const { data: logs } = await auditRepo.findMany({
    entity_type: entityType,
    entity_id: entityId,
    limit,
  })

  return logs
}

export async function listAdminAuditLogs(params: AdminAuditLogListParams): Promise<{
  data: AdminAuditLogRecord[]
  total: number
}> {
  const page = Math.max(1, params.page)
  const perPage = Math.max(1, params.perPage)
  const offset = (page - 1) * perPage
  const baseQuery = buildAdminAuditLogFilter(params)

  const rows = (await baseQuery.clone().orderBy('occurred_at', 'desc').offset(offset).limit(perPage)) as {
    id: string
    user_id: string | null
    action: string
    entity_type: string
    entity_id: string | null
    old_values: Record<string, unknown> | null
    new_values: Record<string, unknown> | null
    ip_address: string | null
    user_agent: string | null
    occurred_at: Date | string
  }[]
  const totalResult = (await baseQuery.clone().count('* as count').first()) as
    | { count?: number | string }
    | undefined
  const total = Number(totalResult?.count ?? 0)

  return {
    data: rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      old_values: row.old_values,
      new_values: row.new_values,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      created_at: new Date(row.occurred_at),
    })),
    total,
  }
}

export async function getLastAuditActivityByUsers(
  entityType: string,
  entityId: string,
  userIds: string[]
): Promise<Map<string, Date | null>> {
  if (userIds.length === 0) {
    return new Map<string, Date | null>()
  }

  const auditRepo = auditRepositoryProvider.getAuditLogRepository()
  return await auditRepo.getLastActivityByUsers(entityType, entityId, userIds)
}

export async function getAuditUsersByIds(
  userIds: string[],
  fields: AuditUserField[] = ['id', 'username', 'email']
): Promise<{ id: string; username: string | null; email: string | null }[]> {
  return await UserRepository.findByIds(userIds, fields)
}

```
