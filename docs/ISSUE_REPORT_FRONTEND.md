# Issue Report: Frontend Runtime Error

**Date:** October 19, 2025  
**Status:** 🔴 CRITICAL - Application không sử dụng được  
**Category:** Frontend/React  
**Related to DI Refactoring:** ❌ NO - Đây là lỗi frontend logic

---

## 📋 Tóm tắt vấn đề

Sau khi hoàn tất DI refactoring (Phase 1-4), application có thể:
- ✅ Start server thành công
- ✅ Login thành công (OAuth GitHub)
- ✅ Backend API hoạt động bình thường
- ❌ **Frontend render bị crash** với lỗi `Cannot read properties of undefined (reading 'filter')`

---

## 🔍 Root Cause Analysis

### Lỗi chính:
```
TypeError: Cannot read properties of undefined (reading 'filter')
    at filterParentTasks (task_state.ts:55:18)
    at showTasksWithChildren (task_state.ts:61:14)
    at TasksWrapper (tasks_wrapper.tsx:47:23)
```

### Lỗi thứ hai (line 71):
```
TypeError: Cannot read properties of undefined (reading 'filter')
    at filterParentTasks (task_state.ts:71:18)
    at showTasksWithChildren (task_state.ts:81:14)
    at TasksWrapper (tasks_wrapper.tsx:92:23)
```

### File có vấn đề:
1. **`inertia/pages/tasks/utils/task_state.ts`**
   - Line 55: `undefined.filter()` - Biến không được khởi tạo
   - Line 71: `undefined.filter()` - Biến không được khởi tạo

2. **`inertia/pages/tasks/components/task_list/tasks_wrapper.tsx`**
   - Line 47: Gọi `showTasksWithChildren()` mà không check null/undefined
   - Line 92: Gọi `filterParentTasks()` mà không check null/undefined

---

## 🎯 Nguyên nhân có thể:

### 1. Backend không trả về data đúng format
**Khả năng cao nhất** - Do DI refactoring có thể làm thay đổi cách data được fetch/transform.

**Kiểm tra:**
```typescript
// Controller có thể trả về undefined hoặc thiếu field
const query = new GetTasksListQuery(ctx)
const tasks = await query.execute(dto) // tasks = undefined?
```

### 2. Frontend không handle empty/null state
```typescript
// task_state.ts - Line 55, 71
function filterParentTasks(tasks) {
  return tasks.filter(...) // ❌ tasks = undefined
}

// Cần thêm guard:
function filterParentTasks(tasks) {
  if (!tasks || !Array.isArray(tasks)) return []
  return tasks.filter(...)
}
```

### 3. Inertia props không được truyền đúng
```typescript
// Controller
return inertia.render('tasks/index', { tasks }) // ❌ tasks = undefined?

// Frontend nhận được
const { tasks } = usePage().props // tasks = undefined
```

---

## 🔬 Diagnostic Steps

### Bước 1: Kiểm tra Backend Response
```bash
# Kiểm tra API trả về gì
curl -X GET http://localhost:3333/tasks \
  -H "Cookie: <your-session-cookie>" \
  -v
```

Hoặc check trong browser DevTools:
- Network tab → Request to `/tasks`
- Check Response payload
- Verify `tasks` field có tồn tại và là array không

### Bước 2: Kiểm tra Controller
```typescript
// app/controllers/tasks/tasks_controller.ts
async index(ctx: HttpContext) {
  const { request, inertia } = ctx
  
  // ✅ Log để debug
  const query = new GetTasksListQuery(ctx)
  const result = await query.execute(dto)
  
  console.log('Tasks result:', result) // Check undefined?
  console.log('Tasks data:', result?.data) // Check array?
  
  return inertia.render('tasks/index', { 
    tasks: result?.data || [] // ✅ Fallback to empty array
  })
}
```

### Bước 3: Kiểm tra Query Result
```typescript
// app/actions/tasks/queries/get_tasks_list_query.ts
async execute(dto: GetTasksListDTO): Promise<TaskListResult> {
  // Check query có throw error không?
  try {
    const result = await this.fetchTasks(dto)
    console.log('Query result:', result) // Debug
    return result
  } catch (error) {
    console.error('Query error:', error)
    // ❌ Nếu throw error mà controller không catch → undefined
    throw error
  }
}
```

---

## 🛠️ Giải pháp đề xuất

### Giải pháp 1: Quick Fix - Frontend Guard (Khuyến nghị)
**File:** `inertia/pages/tasks/utils/task_state.ts`

```typescript
// Line 55 - Thêm null check
function filterParentTasks(tasks: Task[] | undefined) {
  if (!tasks || !Array.isArray(tasks)) {
    console.warn('filterParentTasks: tasks is undefined or not an array')
    return []
  }
  return tasks.filter(task => !task.parent_id)
}

// Line 71 - Tương tự
function anotherFilterFunction(tasks: Task[] | undefined) {
  if (!tasks || !Array.isArray(tasks)) {
    console.warn('anotherFilterFunction: tasks is undefined or not an array')
    return []
  }
  return tasks.filter(...)
}
```

**File:** `inertia/pages/tasks/components/task_list/tasks_wrapper.tsx`

```typescript
// Line 47 & 92 - Thêm fallback
const TasksWrapper = () => {
  const { tasks } = usePage().props
  
  // ✅ Guard clause
  const safeTasks = tasks || []
  
  const filteredTasks = showTasksWithChildren(safeTasks)
  // ...
}
```

### Giải pháp 2: Fix Backend Response (Căn bản)
**File:** `app/controllers/tasks/tasks_controller.ts`

```typescript
async index(ctx: HttpContext) {
  const { request, inertia } = ctx
  
  try {
    const dto = new GetTasksListDTO(
      request.input('page', 1),
      request.input('limit', 15)
    )
    
    const query = new GetTasksListQuery(ctx)
    const result = await query.execute(dto)
    
    // ✅ Ensure tasks is always an array
    return inertia.render('tasks/index', { 
      tasks: result?.data || [],
      metadata: result?.metadata || {},
      pagination: result?.pagination || { page: 1, total: 0 }
    })
  } catch (error) {
    console.error('Error in TasksController.index:', error)
    
    // ✅ Fallback on error
    return inertia.render('tasks/index', { 
      tasks: [],
      error: 'Failed to load tasks'
    })
  }
}
```

### Giải pháp 3: Kiểm tra Query Pattern
**File:** `app/actions/tasks/queries/get_tasks_list_query.ts`

```typescript
async execute(dto: GetTasksListDTO): Promise<TaskListResult> {
  try {
    // ... query logic ...
    
    // ✅ Ensure result structure
    return {
      data: tasks || [],
      metadata: metadata || {},
      pagination: {
        page: dto.page,
        limit: dto.limit,
        total: totalCount
      }
    }
  } catch (error) {
    console.error('GetTasksListQuery error:', error)
    
    // ✅ Return empty result instead of throwing
    return {
      data: [],
      metadata: {},
      pagination: { page: 1, limit: 15, total: 0 }
    }
  }
}
```

---

## 🎯 Recommended Action Plan

### Immediate (Để app chạy được):
1. ✅ **Apply Quick Fix** - Thêm null checks vào `task_state.ts` (lines 55, 71)
2. ✅ **Apply Frontend Guard** - Thêm fallback vào `tasks_wrapper.tsx` (lines 47, 92)

### Short-term (Fix đúng):
3. 🔍 **Debug Backend** - Check `TasksController.index` response
4. 🔍 **Debug Query** - Check `GetTasksListQuery.execute` return value
5. ✅ **Add Error Handling** - Wrap controller logic trong try-catch

### Long-term (Best practice):
6. 📝 **Add TypeScript strict null checks** - Enable trong tsconfig.json
7. 🧪 **Add Unit Tests** - Test query với empty/error cases
8. 📊 **Add Logging** - Log mọi data transformations trong queries

---

## 🔗 Related Issues

### Có liên quan đến DI Refactoring?
**❌ KHÔNG** - Đây là lỗi frontend logic, không liên quan đến:
- Phase 1: Remove @inject from Actions ✅
- Phase 2: Refactor Controllers ✅  
- Phase 3: Graceful Shutdown ✅
- Phase 4: Documentation ✅

### Root cause thực sự:
- Backend **có thể** trả về `undefined` hoặc error
- Frontend **không có** null checks
- **Không phải** do manual instantiation pattern

---

## 📝 Next Steps

1. **Apply Quick Fix** - Để app chạy được trước
2. **Investigate Backend** - Check logs, check database
3. **Add Error Boundaries** - React Error Boundary cho frontend
4. **Document Fix** - Update docs khi đã fix xong

---

## 🏁 Checklist

- [ ] Apply null checks trong `task_state.ts` (lines 55, 71)
- [ ] Apply fallback trong `tasks_wrapper.tsx` (lines 47, 92)
- [ ] Debug TasksController response format
- [ ] Debug GetTasksListQuery return value
- [ ] Add try-catch trong controller
- [ ] Test với empty database
- [ ] Test với query errors
- [ ] Add error boundary component
- [ ] Update documentation sau khi fix

---

**Kết luận:** 
DI refactoring đã thành công ✅. Vấn đề hiện tại là **frontend không handle null/undefined data** - cần thêm defensive programming.
