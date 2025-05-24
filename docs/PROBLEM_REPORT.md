  3🔴 BÁO CÁO VẤN ĐỀ: HTTP Server Crash & Hot Reload Issue

**Ngày:** 18/10/2025  
**Mức độ:** 🔴 CRITICAL - Ảnh hưởng đến development workflow

---

## 📋 TRIỆU CHỨNG

### Lỗi chính:
```
[11:52:58.576] ERROR (shadcn_admin/18996): Cannot inject "[Function: Object]" in "[class GetTasksListQuery]"
    err: {
      "type": "RuntimeException",
      "message": "Cannot inject \"[Function: Object]\" in \"[class GetTasksListQuery]\"",
      "stack": "Error at inject (file:///D:/ShadcnAdmin/node_modules/@adonisjs/fold/build/chunk-KSBWZRP3.js:727:44)"
    }
```

### Tình trạng lặp lại:
```
[ info ] Underlying HTTP server died. Still watching for changes
```
- Server crash liên tục
- Phải chạy lệnh `:full-reload app\actions\tasks\queries\get_tasks_list_query.ts` 
- Hot reload không hoạt động ổn định

---

## 🔍 PHÂN TÍCH CHI TIẾT

### 1. Root Cause Analysis

#### File bị ảnh hưởng:
- `app/actions/tasks/queries/get_tasks_list_query.ts` (line 275)
- `app/controllers/tasks/tasks_controller.ts`

#### Vấn đề Dependency Injection:

**File: get_tasks_list_query.ts**
```typescript
@inject()
export default class GetTasksListQuery {
  constructor(protected ctx: HttpContext) {}
  // ... 274 lines of code
}
```

**File: tasks_controller.ts**
```typescript
@inject()
async index(
  { request, inertia, session }: HttpContext,
  getTasksListQuery: GetTasksListQuery,  // ❌ DI không ổn định
  getTaskMetadataQuery: GetTaskMetadataQuery
) { ... }
```

### 2. Nguyên nhân có thể:

#### A. **Circular Dependency** (khả năng cao nhất)
- `GetTasksListQuery` import models → models import queries → circular reference
- AdonisJS IoC container không thể resolve dependencies

#### B. **Double @inject() decoration**
- Class có `@inject()` decorator
- Controller method cũng có `@inject()` decorator
- Conflict trong DI resolution

#### C. **Hot Reload Race Condition**
- Khi file thay đổi, TypeScript recompile
- IoC container chưa kịp cleanup old instance
- New instance được tạo nhưng old dependencies còn reference

#### D. **Redis/Database Connection Issue**
```typescript
import redis from '@adonisjs/redis/services/main'
import db from '@adonisjs/lucid/services/db'
```
- Redis/DB connection không ổn định khi hot reload
- Singleton services bị stale

---

## 🔧 CÁC GIẢI PHÁP ĐỀ XUẤT

### ⭐ SOLUTION 1: Remove Class-Level @inject() (RECOMMENDED)

**Thay đổi:**
```typescript
// ❌ BEFORE (get_tasks_list_query.ts)
@inject()
export default class GetTasksListQuery {
  constructor(protected ctx: HttpContext) {}
}

// ✅ AFTER
export default class GetTasksListQuery {
  constructor(protected ctx: HttpContext) {}
}
```

**Lý do:** Controller method đã có `@inject()`, không cần class-level decorator

---

### ⭐ SOLUTION 2: Use Container.make() Instead of DI (STABLE)

**Thay đổi tasks_controller.ts:**
```typescript
// ❌ BEFORE
@inject()
async index(
  { request, inertia, session }: HttpContext,
  getTasksListQuery: GetTasksListQuery,
  getTaskMetadataQuery: GetTaskMetadataQuery
) { ... }

// ✅ AFTER
async index({ request, inertia, session }: HttpContext) {
  const getTasksListQuery = await this.ctx.containerResolver.make(GetTasksListQuery)
  const getTaskMetadataQuery = await this.ctx.containerResolver.make(GetTaskMetadataQuery)
  // ... rest of code
}
```

**Ưu điểm:**
- Không dùng decorator, tránh conflict
- Lazy loading, chỉ tạo instance khi cần
- Dễ debug hơn

---

### ⭐ SOLUTION 3: Refactor to Service Pattern (BEST PRACTICE)

**Tạo TasksService:**
```typescript
// app/services/tasks_service.ts
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

export default class TasksService {
  constructor(protected ctx: HttpContext) {}

  async getTasksList(dto: GetTasksListDTO) {
    // Move logic from GetTasksListQuery here
  }

  async getTaskDetail(dto: GetTaskDetailDTO) {
    // Move logic from GetTaskDetailQuery here
  }
}

// Controller
export default class TasksController {
  async index({ request, inertia, session, make }: HttpContext) {
    const tasksService = make(TasksService)
    const tasks = await tasksService.getTasksList(dto)
    return inertia.render('tasks/index', { tasks })
  }
}
```

**Ưu điểm:**
- Pattern đơn giản hơn CQRS cho medium projects
- Không có DI complexity
- Hot reload ổn định hơn

---

### ⭐ SOLUTION 4: Add Graceful Shutdown & Cleanup

**Thêm vào start/kernel.ts:**
```typescript
process.on('SIGTERM', async () => {
  await redis.quit()
  await db.manager.closeAll()
  process.exit(0)
})

process.on('SIGINT', async () => {
  await redis.quit()
  await db.manager.closeAll()
  process.exit(0)
})
```

---

## 🎯 RECOMMENDED ACTION PLAN

### Phase 1: Quick Fix (5 minutes)
1. Remove `@inject()` from all Query classes
2. Keep `@inject()` only in controller methods
3. Test hot reload

### Phase 2: If Phase 1 Fails (15 minutes)
1. Implement Solution 2 (Container.make())
2. Remove all `@inject()` decorators from controllers
3. Manually resolve dependencies

### Phase 3: Long-term (1-2 hours)
1. Refactor CQRS → Service Pattern
2. Simplify DI usage
3. Add proper error handling
4. Add graceful shutdown hooks

---

## 🔬 DEBUG CHECKLIST

Để tìm chính xác root cause, hãy kiểm tra:

### 1. Check Circular Dependencies
```bash
npm install -g madge
madge --circular --extensions ts ./app/actions/tasks/
```

### 2. Check IoC Container State
```typescript
// Add to get_tasks_list_query.ts
console.log('GetTasksListQuery instance created:', Date.now())
console.log('HttpContext:', !!this.ctx)
```

### 3. Check Redis/DB Connection
```typescript
// Add to execute() method
try {
  await redis.ping()
  console.log('✅ Redis connected')
} catch (err) {
  console.log('❌ Redis error:', err)
}
```

### 4. Enable Verbose Logging
```bash
# .env
LOG_LEVEL=trace
NODE_ENV=development
```

---

## 📊 IMPACT ASSESSMENT

### Current State:
- ❌ Development workflow bị gián đoạn
- ❌ Hot reload không hoạt động
- ❌ Phải manual reload liên tục
- ❌ Production risk (nếu lỗi xảy ra ở prod)

### After Fix:
- ✅ Stable hot reload
- ✅ Faster development
- ✅ No manual intervention
- ✅ Production-ready

---

## 🚨 URGENT QUESTIONS FOR EXPERT

1. **Có nên giữ CQRS pattern không?**
   - Nếu project < 10 modules → Service pattern đơn giản hơn
   - Nếu project > 10 modules → CQRS có lợi về scalability

2. **IoC container configuration có đúng không?**
   - Check `start/kernel.ts` middleware order
   - Check `adonisrc.ts` providers configuration

3. **Redis/Database connection pooling có ổn không?**
   - Check connection limits
   - Check timeout settings

4. **TypeScript compilation có issue không?**
   - Check `tsconfig.json` strict mode
   - Check decorator metadata emission

---

## 📝 FILES AFFECTED

1. ✏️ `app/actions/tasks/queries/get_tasks_list_query.ts` - Remove @inject()
2. ✏️ `app/controllers/tasks/tasks_controller.ts` - Refactor DI
3. ✏️ All other Query classes (19 files) - Same issue potential
4. ✏️ `start/kernel.ts` - Add shutdown hooks
5. ✏️ `config/database.ts` - Review connection settings
6. ✏️ `config/redis.ts` - Review connection settings

---

## 💡 TEMPORARY WORKAROUND

Nếu cần code ngay và không muốn fix toàn bộ:

```typescript
// tasks_controller.ts - Temporary workaround
async index(ctx: HttpContext) {
  // Manual instantiation - bypass DI
  const getTasksListQuery = new GetTasksListQuery(ctx)
  const result = await getTasksListQuery.execute(dto)
  // ...
}
```

⚠️ **WARNING:** Workaround này không recommended cho production!

---

**Next Steps:** Chọn 1 trong 4 solutions trên để implement 👆
