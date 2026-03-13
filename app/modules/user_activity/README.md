# user_activity Backend Module

## Runtime Storage Update 2026-06-07

User activity runtime path hiện ghi/đọc trực tiếp từ PostgreSQL table `user_activity_events`.

Repository/runtime files:

- [app/modules/user_activity/infra/repositories/postgres_user_activity_log_repository.ts](/home/tranngocduyet/Projects/Suar/app/modules/user_activity/infra/repositories/postgres_user_activity_log_repository.ts)
- [app/modules/user_activity/infra/repositories/user_activity_repository_provider.ts](/home/tranngocduyet/Projects/Suar/app/modules/user_activity/infra/repositories/user_activity_repository_provider.ts)

Current supported operations:

- append activity event
- paginate by `user_id`
- optional filter by `action_type`

Legacy MongoDB files (`infra/models/user_activity_log.ts`, `mongo_user_activity_log_repository.ts`, `dual_user_activity_log_repository.ts`) vẫn còn trong tree cho compatibility/backfill references, nhưng provider runtime không còn khởi tạo chúng.

### Kiến trúc lõi & Phân tích nghiệp vụ
- **PostgreSQL Events**: Lưu vết đăng nhập, đăng xuất và các hoạt động thiết yếu khác trực tiếp vào bảng `user_activity_events` trên PostgreSQL.

## Module Path

```text
app/modules/user_activity
```

## Folder And File Inventory

```text
./ README.md
actions/ public_api.ts
actions/services/ user_activity_public_api.ts
infra/models/ user_activity_log.ts
infra/repositories/ dual_user_activity_log_repository.ts mongo_user_activity_log_repository.ts postgres_user_activity_log_repository.ts user_activity_repository_interface.ts user_activity_repository_provider.ts
infra/repositories/read/ shared.ts user_activity_queries.ts
infra/repositories/write/ user_activity_mutations.ts
listeners/ on_user_login.ts
```

## Route Evidence

```text
(none)
```

## Symbol Evidence

| Kind | Symbol | File | Line |
|---|---|---|---:|
| class | `UserActivityPublicApi` | `app/modules/user_activity/actions/services/user_activity_public_api.ts` | 4 |
| const | `userActivityPublicApi` | `app/modules/user_activity/actions/services/user_activity_public_api.ts` | 11 |
| class | `DualUserActivityLogRepository` | `app/modules/user_activity/infra/repositories/dual_user_activity_log_repository.ts` | 7 |
| class | `MongoUserActivityLogRepository` | `app/modules/user_activity/infra/repositories/mongo_user_activity_log_repository.ts` | 15 |
| class | `PostgresUserActivityLogRepository` | `app/modules/user_activity/infra/repositories/postgres_user_activity_log_repository.ts` | 23 |
| interface | `ActivityLogLeanDoc` | `app/modules/user_activity/infra/repositories/read/shared.ts` | 5 |
| const | `toUserActivityLogRecord` | `app/modules/user_activity/infra/repositories/read/shared.ts` | 17 |
| const | `findByUser` | `app/modules/user_activity/infra/repositories/read/user_activity_queries.ts` | 7 |
| interface | `UserActivityLogCreateData` | `app/modules/user_activity/infra/repositories/user_activity_repository_interface.ts` | 2 |
| interface | `UserActivityLogRecord` | `app/modules/user_activity/infra/repositories/user_activity_repository_interface.ts` | 12 |
| interface | `UserActivityLogRepository` | `app/modules/user_activity/infra/repositories/user_activity_repository_interface.ts` | 24 |
| function | `getUserActivityLogRepository` | `app/modules/user_activity/infra/repositories/user_activity_repository_provider.ts` | 9 |
| const | `userActivityRepositoryProvider` | `app/modules/user_activity/infra/repositories/user_activity_repository_provider.ts` | 17 |
| const | `create` | `app/modules/user_activity/infra/repositories/write/user_activity_mutations.ts` | 5 |

## Import Evidence

### `app/modules/user_activity/actions/public_api.ts`

```ts
// no imports
```

### `app/modules/user_activity/actions/services/user_activity_public_api.ts`

```ts
import type { UserActivityLogCreateData } from '#modules/user_activity/infra/repositories/user_activity_repository_interface'
import { userActivityRepositoryProvider } from '#modules/user_activity/infra/repositories/user_activity_repository_provider'
```
## Code Snippets

### `app/modules/user_activity/infra/repositories/read/user_activity_queries.ts`

```ts
import { toUserActivityLogRecord, type ActivityLogLeanDoc } from './shared.js'

import MongoUserActivityLog from '#modules/user_activity/infra/models/user_activity_log'
import type { UserActivityLogRecord } from '#modules/user_activity/infra/repositories/user_activity_repository_interface'


export const findByUser = async (
  userId: string,
  options?: { actionType?: string; limit?: number; page?: number }
): Promise<{ data: UserActivityLogRecord[]; total: number }> => {
  const page = options?.page ?? 1
  const limit = options?.limit ?? 50
  const skip = (page - 1) * limit

  const filter: Record<string, string> = { user_id: userId }
  if (options?.actionType) {
    filter.action_type = options.actionType
  }

  const [rawDocs, total] = await Promise.all([
    MongoUserActivityLog.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).lean().exec(),
    MongoUserActivityLog.countDocuments(filter).exec(),
  ])

  const docs = rawDocs as unknown as ActivityLogLeanDoc[]

  return {
    data: docs.map((doc) => toUserActivityLogRecord(doc)),
    total,
  }
}

```

### `app/modules/user_activity/infra/repositories/postgres_user_activity_log_repository.ts`

```ts
import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import type {
  UserActivityLogCreateData,
  UserActivityLogRecord,
  UserActivityLogRepository,
} from '#modules/user_activity/infra/repositories/user_activity_repository_interface'

interface UserActivityRow {
  id: string
  user_id: string
  action_type: string
  action_data: Record<string, unknown> | null
  related_entity_type: string | null
  related_entity_id: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: Date
}

export default class PostgresUserActivityLogRepository implements UserActivityLogRepository {
  async create(data: UserActivityLogCreateData): Promise<void> {
    await db.table('user_activity_events').insert({
      id: randomUUID(),
      user_id: data.user_id,
      action_type: data.action_type,
      action_data: data.action_data ?? null,
      related_entity_type: data.related_entity_type ?? null,
      related_entity_id: data.related_entity_id ?? null,
      ip_address: data.ip_address ?? null,
      user_agent: data.user_agent ?? null,
    })
  }

  async findByUser(
    userId: string,
    options?: { actionType?: string; limit?: number; page?: number }
  ): Promise<{ data: UserActivityLogRecord[]; total: number }> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 50
    const offset = (page - 1) * limit
    let baseQuery = db.from('user_activity_events').where('user_id', userId)

    if (options?.actionType) {
      baseQuery = baseQuery.where('action_type', options.actionType)
    }

    const rows = (await baseQuery.clone().orderBy('created_at', 'desc').offset(offset).limit(limit)) as
      | UserActivityRow[]
    const totalResult = (await baseQuery.clone().count('* as count').first()) as
      | { count?: number | string }
      | undefined

    return {
      data: rows.map((row) => this.toRecord(row)),
      total: Number(totalResult?.count ?? 0),
    }
  }

  private toRecord(row: UserActivityRow): UserActivityLogRecord {
    return {
      id: row.id,
      user_id: row.user_id,
      action_type: row.action_type,
      action_data: row.action_data,
      related_entity_type: row.related_entity_type,
      related_entity_id: row.related_entity_id,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      created_at: new Date(row.created_at),
    }
  }
}

```
