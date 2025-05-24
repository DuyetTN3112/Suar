# CQRS Pattern - Hybrid Manual Resolution

## Tổng quan

Dự án sử dụng **Hybrid CQRS với Manual Resolution** - một pattern kết hợp giữa CQRS truyền thống và manual dependency resolution để tránh conflicts với AdonisJS IoC container trong hot reload.

## Vấn đề đã giải quyết

### Root Cause: Double Decoration Conflict
```typescript
// ❌ TRƯỚC ĐÂY - Gây "Cannot inject [Function: Object]" khi hot reload
@inject()
export default class GetTaskQuery {
  constructor(protected ctx: HttpContext) {}
}

// Controller
@inject()
async index({ request }: HttpContext, query: GetTaskQuery) {
  // Double decoration: @inject() ở cả class và method parameter
}
```

**Kết quả**: 
- 🔴 "Cannot inject [Function: Object]" errors
- 🔴 "Underlying HTTP server died" messages  
- 🔴 Phải `:full-reload` liên tục

### Giải pháp: Manual Instantiation

```typescript
// ✅ SAU KHI SỬA - Không có @inject decorators
export default class GetTaskQuery {
  constructor(protected ctx: HttpContext) {}
}

// Controller - Manual instantiation
async index(ctx: HttpContext) {
  const { request, response } = ctx
  const query = new GetTaskQuery(ctx)
  const result = await query.execute(dto)
}
```

**Kết quả**:
- ✅ Không còn IoC container conflicts
- ✅ Hot reload ổn định
- ✅ TypeScript compile thành công
- ✅ Code rõ ràng, dễ debug

## Pattern Implementation

### 1. Query Classes (Reads)

**Constructor Signature:**
```typescript
constructor(protected ctx: HttpContext)
```

**Example:**
```typescript
// app/actions/tasks/queries/get_tasks_list_query.ts
import type { HttpContext } from '@adonisjs/core/http'
import { GetTasksListDTO } from '../dtos/get_tasks_list_dto.js'

export default class GetTasksListQuery {
  constructor(protected ctx: HttpContext) {}

  async execute(dto: GetTasksListDTO): Promise<TaskListResult> {
    const user = this.ctx.auth.user!
    const organizationId = user.current_organization_id
    
    // Query logic...
    return result
  }
}
```

**Controller Usage:**
```typescript
async index(ctx: HttpContext) {
  const { request, inertia } = ctx
  
  const dto = new GetTasksListDTO(
    request.input('page', 1),
    request.input('limit', 15)
  )
  
  const query = new GetTasksListQuery(ctx)
  const tasks = await query.execute(dto)
  
  return inertia.render('tasks/index', { tasks })
}
```

### 2. Command Classes (Writes)

#### A. Simple Commands (Không cần Notification)

**Constructor Signature:**
```typescript
constructor(protected ctx: HttpContext)
```

**Example:**
```typescript
// app/actions/tasks/commands/delete_task_command.ts
import type { HttpContext } from '@adonisjs/core/http'
import { DeleteTaskDTO } from '../dtos/delete_task_dto.js'

export default class DeleteTaskCommand {
  constructor(protected ctx: HttpContext) {}

  async execute(dto: DeleteTaskDTO): Promise<void> {
    const user = this.ctx.auth.user!
    
    // Command logic...
  }
}
```

**Controller Usage:**
```typescript
async destroy(ctx: HttpContext) {
  const { params, response, session } = ctx
  
  const dto = new DeleteTaskDTO(parseInt(params.id))
  
  const command = new DeleteTaskCommand(ctx)
  await command.execute(dto)
  
  session.flash('success', 'Task deleted successfully')
  return response.redirect().back()
}
```

#### B. Commands với Notifications

**Constructor Signature:**
```typescript
constructor(
  protected ctx: HttpContext,
  private createNotification: CreateNotification
)
```

**Example:**
```typescript
// app/actions/tasks/commands/create_task_command.ts
import type { HttpContext } from '@adonisjs/core/http'
import CreateNotification from '#actions/common/create_notification'
import { CreateTaskDTO } from '../dtos/create_task_dto.js'

export default class CreateTaskCommand {
  constructor(
    protected ctx: HttpContext,
    private createNotification: CreateNotification
  ) {}

  async execute(dto: CreateTaskDTO): Promise<Task> {
    const user = this.ctx.auth.user!
    
    // Create task...
    
    // Send notification
    await this.createNotification.handle({
      user_id: dto.assigned_to,
      type: 'task_assigned',
      title: 'New task assigned to you',
      message: `Task "${task.title}" has been assigned to you`,
      entity_type: 'task',
      entity_id: task.id
    })
    
    return task
  }
}
```

**Controller Usage:**
```typescript
async store(ctx: HttpContext) {
  const { request, response, session } = ctx
  
  const dto = new CreateTaskDTO(/* ... */)
  
  // Instantiate command with CreateNotification dependency
  const command = new CreateTaskCommand(ctx, new CreateNotification(ctx))
  const task = await command.execute(dto)
  
  session.flash('success', 'Task created successfully')
  return response.redirect().toRoute('tasks.show', { id: task.id })
}
```

### 3. Controller Pattern

**Standard Pattern:**
```typescript
export default class TasksController {
  // ✅ ĐÚNG - Không có @inject decorator
  async method(ctx: HttpContext) {
    const { request, response, session, auth } = ctx
    
    // Manual instantiation
    const query = new GetQuery(ctx)
    const result = await query.execute(dto)
  }
  
  // ❌ SAI - Có @inject decorator
  @inject()
  async oldMethod({ request }: HttpContext, query: GetQuery) {
    // Double decoration conflict!
  }
}
```

## Best Practices

### 1. Constructor Dependencies

**Query/Command dependencies:**
- ✅ Chỉ nhận `ctx: HttpContext` là tham số đầu tiên
- ✅ Commands cần notification: thêm `CreateNotification` là tham số thứ 2
- ❌ KHÔNG dùng `@inject()` decorator
- ❌ KHÔNG inject services qua constructor (trừ CreateNotification)

**Lý do:**
- Services (redis, db, mail) được import trực tiếp trong method
- Tránh circular dependencies
- Manual control = dễ debug

### 2. Service Usage

```typescript
// ✅ ĐÚNG - Import at top, use in methods
import redis from '@adonisjs/redis/services/main'
import db from '@adonisjs/lucid/services/db'

export default class GetTaskQuery {
  constructor(protected ctx: HttpContext) {}
  
  async execute(dto: DTO) {
    // Use services directly
    const cached = await redis.get(key)
    const result = await db.from('tasks').select('*')
  }
}

// ❌ SAI - Inject services via constructor
export default class GetTaskQuery {
  constructor(
    protected ctx: HttpContext,
    private redis: Redis,  // ❌ No!
    private db: Database   // ❌ No!
  ) {}
}
```

### 3. Error Handling

```typescript
async execute(dto: DTO) {
  try {
    // Business logic
    const result = await this.performOperation(dto)
    return result
  } catch (error) {
    // Log error
    console.error('Error in GetTaskQuery:', error)
    
    // Re-throw or handle gracefully
    throw new BusinessLogicError('Failed to fetch tasks', { cause: error })
  }
}
```

### 4. Transaction Management

```typescript
import db from '@adonisjs/lucid/services/db'

async execute(dto: CreateTaskDTO): Promise<Task> {
  const trx = await db.transaction()
  
  try {
    // All operations in transaction
    const task = await Task.create(dto, { client: trx })
    await this.createAuditLog(task, trx)
    
    await trx.commit()
    return task
  } catch (error) {
    await trx.rollback()
    throw error
  }
}
```

## Graceful Shutdown

### Setup (start/kernel.ts)

```typescript
// Cleanup khi shutdown
process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)
process.on('SIGUSR2', hotReloadCleanup)

// HMR cleanup
if (import.meta.hot) {
  import.meta.hot.dispose(async () => {
    await redis.quit()
    await db.manager.closeAll()
  })
}
```

**Lợi ích:**
- ✅ Không còn stale connections
- ✅ Hot reload ổn định
- ✅ Graceful shutdown khi deploy

## Migration Guide

### Từ IoC Container sang Manual Resolution

**TRƯỚC:**
```typescript
// Query with @inject
@inject()
export default class GetTaskQuery {
  constructor(protected ctx: HttpContext) {}
}

// Controller with @inject
export default class TasksController {
  @inject()
  async index({ request }: HttpContext, query: GetTaskQuery) {
    return await query.execute(dto)
  }
}
```

**SAU:**
```typescript
// Query - Remove @inject
export default class GetTaskQuery {
  constructor(protected ctx: HttpContext) {}
}

// Controller - Manual instantiation
export default class TasksController {
  async index(ctx: HttpContext) {
    const { request } = ctx
    const query = new GetTaskQuery(ctx)
    return await query.execute(dto)
  }
}
```

### Checklist

- [ ] Xóa `import { inject } from '@adonisjs/core'`
- [ ] Xóa `@inject()` decorator từ class
- [ ] Xóa `@inject()` decorator từ controller methods
- [ ] Thay method signature: `async method(ctx: HttpContext)`
- [ ] Destructure ctx: `const { request, response } = ctx`
- [ ] Manual instantiation: `const query = new Query(ctx)`
- [ ] Với commands cần notification: `new Command(ctx, new CreateNotification(ctx))`

## Troubleshooting

### "Cannot inject [Function: Object]"

**Nguyên nhân:** Vẫn còn `@inject()` decorators gây double decoration.

**Giải pháp:**
```bash
# Tìm tất cả @inject trong actions
grep -r "@inject()" app/actions/

# Tìm tất cả @inject trong controllers
grep -r "@inject()" app/controllers/
```

Xóa tất cả `@inject()` và áp dụng manual instantiation.

### Hot Reload vẫn lỗi

**Kiểm tra:**
1. Có còn `@inject()` decorators không?
2. Graceful shutdown hooks đã được thêm vào `start/kernel.ts`?
3. Redis/DB connections đã được cleanup đúng cách?

**Test:**
```bash
npm run dev
# Thay đổi 1 query file
# Kiểm tra terminal không có "Cannot inject" errors
```

## Tham khảo

- [PROBLEM_REPORT.md](./PROBLEM_REPORT.md) - Root cause analysis
- [CQRS_REFACTORING_README.md](./CQRS_REFACTORING_README.md) - Chi tiết refactoring
- [AdonisJS Dependency Injection](https://docs.adonisjs.com/guides/dependency-injection)

## Kết luận

Pattern này cung cấp:
- ✅ **Stability**: Hot reload không còn crashes
- ✅ **Clarity**: Code rõ ràng, dễ hiểu, dễ debug
- ✅ **Maintainability**: Pattern nhất quán toàn dự án
- ✅ **Performance**: Không overhead từ IoC container resolution

**Nguyên tắc vàng**: 
> "Manual instantiation với `new Class(ctx)` > IoC container với `@inject()`"
