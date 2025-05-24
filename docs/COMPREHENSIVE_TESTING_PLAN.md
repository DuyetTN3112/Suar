# Comprehensive Testing Plan - All CQRS Modules

**Date Created**: October 18, 2025  
**Status**: Planning Phase  
**Test Framework**: Japa Runner (already installed)

---

## 📊 Executive Summary

After successfully refactoring **6 major modules** to CQRS pattern, we now need comprehensive test coverage to ensure:
- ✅ Business logic correctness
- ✅ Data validation integrity
- ✅ Permission/security enforcement
- ✅ Cache behavior
- ✅ Transaction rollbacks
- ✅ Error handling

---

## 🎯 Testing Statistics Overview

### Modules Refactored (100% Complete)
1. ✅ **Tasks Module** - 8 DTOs + 6 Commands + 6 Queries = 20 files
2. ✅ **Projects Module** - 5 DTOs + 5 Commands + 3 Queries = 13 files
3. ✅ **Users Module** - 6 DTOs + 4 Commands + 2 Queries = 12 files
4. ✅ **Auth Module** - 5 DTOs + 5 Commands + 0 Queries = 10 files
5. ✅ **Organizations Module** - 11 DTOs + 10 Commands + 6 Queries = 27 files
6. ✅ **Conversations Module** - 10 DTOs + 7 Commands + 3 Queries = 20 files

**Total Files to Test**: 102 CQRS files + Integration tests

### Test Files to Create
- **Unit Tests**: ~102 test files (1 per DTO/Command/Query)
- **Integration Tests**: ~20 test files (controller + flow tests)
- **Total**: ~122 test files

---

## 📁 Proposed Test Directory Structure

```
tests/
├── unit/                           # Unit tests for DTOs, Commands, Queries
│   ├── tasks/
│   │   ├── dtos/                   # 8 test files
│   │   │   ├── create_task_dto.spec.ts
│   │   │   ├── update_task_dto.spec.ts
│   │   │   ├── delete_task_dto.spec.ts
│   │   │   ├── assign_task_dto.spec.ts
│   │   │   ├── update_task_status_dto.spec.ts
│   │   │   ├── update_task_time_dto.spec.ts
│   │   │   ├── get_tasks_list_dto.spec.ts
│   │   │   └── get_task_detail_dto.spec.ts
│   │   ├── commands/               # 6 test files
│   │   │   ├── create_task_command.spec.ts
│   │   │   ├── update_task_command.spec.ts
│   │   │   ├── delete_task_command.spec.ts
│   │   │   ├── assign_task_command.spec.ts
│   │   │   ├── update_task_status_command.spec.ts
│   │   │   └── update_task_time_command.spec.ts
│   │   └── queries/                # 6 test files
│   │       ├── get_tasks_list_query.spec.ts
│   │       ├── get_task_detail_query.spec.ts
│   │       ├── get_task_metadata_query.spec.ts
│   │       ├── get_task_audit_logs_query.spec.ts
│   │       ├── get_task_statistics_query.spec.ts
│   │       └── get_user_tasks_query.spec.ts
│   │
│   ├── projects/                   # 13 test files total
│   │   ├── dtos/                   # 5 test files
│   │   ├── commands/               # 5 test files
│   │   └── queries/                # 3 test files
│   │
│   ├── users/                      # 12 test files total
│   │   ├── dtos/                   # 6 test files
│   │   ├── commands/               # 4 test files
│   │   └── queries/                # 2 test files
│   │
│   ├── auth/                       # 10 test files total
│   │   ├── dtos/                   # 5 test files
│   │   └── commands/               # 5 test files
│   │
│   ├── organizations/              # 27 test files total
│   │   ├── dtos/                   # 11 test files
│   │   ├── commands/               # 10 test files
│   │   └── queries/                # 6 test files
│   │
│   └── conversations/              # 20 test files total
│       ├── dtos/                   # 10 test files
│       ├── commands/               # 7 test files
│       └── queries/                # 3 test files
│
├── integration/                    # Integration tests
│   ├── tasks_flow.spec.ts          # Full CRUD flow
│   ├── projects_flow.spec.ts
│   ├── users_flow.spec.ts
│   ├── auth_flow.spec.ts
│   ├── organizations_flow.spec.ts
│   ├── conversations_flow.spec.ts
│   ├── cache_invalidation.spec.ts  # Cache behavior
│   ├── permissions.spec.ts         # Permission hierarchy
│   ├── transactions.spec.ts        # Rollback behavior
│   └── notifications.spec.ts       # Notification triggering
│
├── helpers/                        # Test utilities
│   ├── factories/                  # Model factories
│   │   ├── user_factory.ts
│   │   ├── task_factory.ts
│   │   ├── project_factory.ts
│   │   ├── organization_factory.ts
│   │   ├── conversation_factory.ts
│   │   └── message_factory.ts
│   ├── database.ts                 # Test DB setup/teardown
│   ├── auth_helper.ts              # Auth mocking
│   ├── cache_helper.ts             # Redis mocking
│   └── context_helper.ts           # HttpContext mocking
│
└── config/
    ├── database.ts                 # Test database config
    ├── redis.ts                    # Test Redis config
    └── setup.ts                    # Global test setup
```

---

## 🧪 Testing Approach by Layer

### 1. DTOs (Data Transfer Objects) - 55 test files

**What to Test**:
- ✅ Construction-time validation
- ✅ Valid inputs pass
- ✅ Invalid inputs throw errors
- ✅ Helper methods return correct values
- ✅ Edge cases (empty strings, nulls, undefined)

**Example Test Structure**:
```typescript
// tests/unit/tasks/dtos/create_task_dto.spec.ts
import { test } from '@japa/runner'
import CreateTaskDTO from '#actions/tasks/dtos/create_task_dto'

test.group('CreateTaskDTO', () => {
  test('should create DTO with valid data', async ({ assert }) => {
    const dto = new CreateTaskDTO({
      title: 'Test Task',
      organization_id: 1,
      created_by: 1,
    })
    
    assert.equal(dto.title, 'Test Task')
    assert.equal(dto.organization_id, 1)
  })

  test('should throw error if title is empty', async ({ assert }) => {
    assert.throws(
      () => new CreateTaskDTO({ title: '', organization_id: 1, created_by: 1 }),
      'Title is required'
    )
  })

  test('should throw error if title is too long', async ({ assert }) => {
    const longTitle = 'a'.repeat(501)
    assert.throws(
      () => new CreateTaskDTO({ title: longTitle, organization_id: 1, created_by: 1 }),
      'Title must be between 1 and 500 characters'
    )
  })

  test('isAssigned() should return true when assignee_id is set', async ({ assert }) => {
    const dto = new CreateTaskDTO({
      title: 'Test',
      organization_id: 1,
      created_by: 1,
      assignee_id: 5,
    })
    
    assert.isTrue(dto.isAssigned())
  })

  test('getDueInDays() should calculate correctly', async ({ assert }) => {
    const dto = new CreateTaskDTO({
      title: 'Test',
      organization_id: 1,
      created_by: 1,
      due_date: '2025-10-25', // 7 days from today (2025-10-18)
    })
    
    assert.equal(dto.getDueInDays(), 7)
  })
})
```

**Test Coverage Goals**:
- ✅ All validation rules
- ✅ All helper methods
- ✅ All edge cases
- ✅ Error messages are correct

---

### 2. Commands (Write Operations) - 37 test files

**What to Test**:
- ✅ Business logic correctness
- ✅ Permission checks (superadmin, creator, assignee, etc.)
- ✅ Transaction rollback on errors
- ✅ Database changes (inserts, updates, deletes)
- ✅ Audit logging
- ✅ Notification triggering
- ✅ Cache invalidation
- ✅ Error handling

**Example Test Structure**:
```typescript
// tests/unit/tasks/commands/create_task_command.spec.ts
import { test } from '@japa/runner'
import { DatabaseHelper } from '#tests/helpers/database'
import { UserFactory, OrganizationFactory } from '#tests/helpers/factories'
import { ContextHelper } from '#tests/helpers/context_helper'
import CreateTaskCommand from '#actions/tasks/commands/create_task_command'
import CreateTaskDTO from '#actions/tasks/dtos/create_task_dto'

test.group('CreateTaskCommand', (group) => {
  group.each.setup(async () => {
    // Setup test database
    await DatabaseHelper.truncate()
  })

  test('should create task successfully', async ({ assert }) => {
    // Arrange
    const user = await UserFactory.create({ role_id: 1 })
    const org = await OrganizationFactory.create()
    const ctx = ContextHelper.makeHttpContext({ user })
    
    const dto = new CreateTaskDTO({
      title: 'Test Task',
      organization_id: org.id,
      created_by: user.id,
    })
    
    const command = new CreateTaskCommand(ctx)
    
    // Act
    const task = await command.execute(dto)
    
    // Assert
    assert.exists(task.id)
    assert.equal(task.title, 'Test Task')
    assert.equal(task.organization_id, org.id)
    assert.equal(task.created_by, user.id)
  })

  test('should rollback transaction on error', async ({ assert }) => {
    const user = await UserFactory.create()
    const ctx = ContextHelper.makeHttpContext({ user })
    
    const dto = new CreateTaskDTO({
      title: 'Test',
      organization_id: 999, // Non-existent org
      created_by: user.id,
    })
    
    const command = new CreateTaskCommand(ctx)
    
    // Act & Assert
    await assert.rejects(
      () => command.execute(dto),
      'Organization not found'
    )
    
    // Verify no task was created
    const taskCount = await Task.query().count('* as total')
    assert.equal(taskCount[0].$extras.total, 0)
  })

  test('should create audit log', async ({ assert }) => {
    const user = await UserFactory.create()
    const org = await OrganizationFactory.create()
    const ctx = ContextHelper.makeHttpContext({ user })
    
    const dto = new CreateTaskDTO({
      title: 'Test',
      organization_id: org.id,
      created_by: user.id,
    })
    
    const command = new CreateTaskCommand(ctx)
    await command.execute(dto)
    
    // Assert audit log created
    const auditLog = await AuditLog.query()
      .where('action', 'create_task')
      .first()
    
    assert.exists(auditLog)
    assert.equal(auditLog.user_id, user.id)
  })

  test('should invalidate cache', async ({ assert }) => {
    const user = await UserFactory.create()
    const org = await OrganizationFactory.create()
    const ctx = ContextHelper.makeHttpContext({ user })
    
    // Pre-populate cache
    await redis.set(`user:${user.id}:tasks`, 'cached_data', 'EX', 300)
    
    const dto = new CreateTaskDTO({
      title: 'Test',
      organization_id: org.id,
      created_by: user.id,
    })
    
    const command = new CreateTaskCommand(ctx)
    await command.execute(dto)
    
    // Assert cache was cleared
    const cachedData = await redis.get(`user:${user.id}:tasks`)
    assert.isNull(cachedData)
  })
})
```

**Test Coverage Goals**:
- ✅ Happy path
- ✅ Permission denied scenarios
- ✅ Validation errors
- ✅ Transaction rollbacks
- ✅ Side effects (audit logs, notifications, cache)

---

### 3. Queries (Read Operations) - 20 test files

**What to Test**:
- ✅ Data retrieval correctness
- ✅ Filters work as expected
- ✅ Pagination works
- ✅ Search functionality
- ✅ Sorting works
- ✅ Relations are loaded
- ✅ Permission filtering (only see allowed data)
- ✅ Caching behavior (cache hit/miss)
- ✅ No state changes (idempotent)

**Example Test Structure**:
```typescript
// tests/unit/tasks/queries/get_tasks_list_query.spec.ts
import { test } from '@japa/runner'
import { DatabaseHelper } from '#tests/helpers/database'
import { UserFactory, TaskFactory } from '#tests/helpers/factories'
import { ContextHelper } from '#tests/helpers/context_helper'
import GetTasksListQuery from '#actions/tasks/queries/get_tasks_list_query'
import GetTasksListDTO from '#actions/tasks/dtos/get_tasks_list_dto'

test.group('GetTasksListQuery', (group) => {
  group.each.setup(async () => {
    await DatabaseHelper.truncate()
  })

  test('should return paginated tasks', async ({ assert }) => {
    const user = await UserFactory.create()
    await TaskFactory.createMany(15, { created_by: user.id })
    
    const dto = new GetTasksListDTO({ page: 1, limit: 10 })
    const ctx = ContextHelper.makeHttpContext({ user })
    const query = new GetTasksListQuery(ctx)
    
    const result = await query.execute(dto)
    
    assert.equal(result.data.length, 10)
    assert.equal(result.pagination.total, 15)
    assert.equal(result.pagination.page, 1)
    assert.equal(result.pagination.last_page, 2)
  })

  test('should filter by status_id', async ({ assert }) => {
    const user = await UserFactory.create()
    await TaskFactory.createMany(5, { status_id: 1, created_by: user.id })
    await TaskFactory.createMany(3, { status_id: 2, created_by: user.id })
    
    const dto = new GetTasksListDTO({ page: 1, limit: 10, status_id: 1 })
    const ctx = ContextHelper.makeHttpContext({ user })
    const query = new GetTasksListQuery(ctx)
    
    const result = await query.execute(dto)
    
    assert.equal(result.data.length, 5)
    result.data.forEach(task => assert.equal(task.status_id, 1))
  })

  test('should cache results', async ({ assert }) => {
    const user = await UserFactory.create()
    await TaskFactory.createMany(5, { created_by: user.id })
    
    const dto = new GetTasksListDTO({ page: 1, limit: 10 })
    const ctx = ContextHelper.makeHttpContext({ user })
    const query = new GetTasksListQuery(ctx)
    
    // First call - cache miss
    const result1 = await query.execute(dto)
    
    // Check cache was set
    const cacheKey = dto.getCacheKey()
    const cached = await redis.get(cacheKey)
    assert.exists(cached)
    
    // Second call - cache hit (should be instant)
    const result2 = await query.execute(dto)
    assert.deepEqual(result1, result2)
  })

  test('should only return tasks user has permission to see', async ({ assert }) => {
    const user1 = await UserFactory.create()
    const user2 = await UserFactory.create()
    
    await TaskFactory.createMany(5, { created_by: user1.id })
    await TaskFactory.createMany(3, { created_by: user2.id })
    
    const dto = new GetTasksListDTO({ page: 1, limit: 10 })
    const ctx = ContextHelper.makeHttpContext({ user: user1 })
    const query = new GetTasksListQuery(ctx)
    
    const result = await query.execute(dto)
    
    // Should only see own tasks (unless superadmin)
    assert.equal(result.data.length, 5)
    result.data.forEach(task => assert.equal(task.created_by, user1.id))
  })
})
```

**Test Coverage Goals**:
- ✅ All filter combinations
- ✅ Pagination edge cases
- ✅ Cache behavior
- ✅ Permission filtering
- ✅ Search accuracy

---

## 🔧 Phase 0: Test Infrastructure Setup

### Tasks
1. **Install Test Dependencies** (if missing)
   ```bash
   npm install @japa/runner @japa/assert @japa/expect-type @japa/api-client --save-dev
   ```

2. **Create Test Database Configuration**
   ```typescript
   // tests/config/database.ts
   export default {
     client: 'mysql2',
     connection: {
       host: env.get('TEST_DB_HOST', 'localhost'),
       user: env.get('TEST_DB_USER', 'root'),
       password: env.get('TEST_DB_PASSWORD', ''),
       database: env.get('TEST_DB_DATABASE', 'shadcn_admin_test'),
     },
   }
   ```

3. **Create Test Helpers**
   - DatabaseHelper: truncate, seed, migrate
   - ContextHelper: mock HttpContext
   - CacheHelper: mock Redis
   - AuthHelper: mock authentication

4. **Create Factories**
   - UserFactory
   - TaskFactory
   - ProjectFactory
   - OrganizationFactory
   - ConversationFactory
   - MessageFactory

5. **Update package.json**
   ```json
   {
     "scripts": {
       "test": "node ace test",
       "test:watch": "node ace test --watch",
       "test:coverage": "node ace test --coverage"
     }
   }
   ```

---

## 📅 Testing Roadmap (Priority Order)

### Priority 1: Core Modules (4-5 weeks)
1. **Tasks Module** (1.5 weeks)
   - 8 DTO tests
   - 6 Command tests
   - 6 Query tests
   - Integration tests

2. **Users Module** (1 week)
   - 6 DTO tests
   - 4 Command tests
   - 2 Query tests
   - Integration tests

3. **Auth Module** (1 week)
   - 5 DTO tests
   - 5 Command tests
   - Integration tests (login, register, password reset flows)

4. **Projects Module** (1 week)
   - 5 DTO tests
   - 5 Command tests
   - 3 Query tests

### Priority 2: Complex Modules (2-3 weeks)
5. **Organizations Module** (1.5 weeks)
   - 11 DTO tests
   - 10 Command tests
   - 6 Query tests

6. **Conversations Module** (1 week)
   - 10 DTO tests
   - 7 Command tests (test stored procedures)
   - 3 Query tests (test complex queries)

### Priority 3: Integration & Coverage (1 week)
7. **Integration Tests**
   - End-to-end flows
   - Cache invalidation
   - Transaction rollbacks
   - Permission hierarchy

8. **Coverage & Documentation**
   - Generate coverage report
   - Document testing patterns
   - Create testing guide

**Total Estimated Time**: 8-10 weeks for comprehensive coverage

---

## 🎯 Test Coverage Goals

### Target Metrics
- **Line Coverage**: 80%+
- **Branch Coverage**: 75%+
- **Function Coverage**: 85%+

### Critical Paths (Must be 100%)
- ✅ Authentication flow
- ✅ Permission checks
- ✅ Transaction rollbacks
- ✅ Data validation
- ✅ Cache invalidation

---

## 📝 Testing Best Practices

### 1. Arrange-Act-Assert Pattern
```typescript
test('should do something', async ({ assert }) => {
  // Arrange - Setup test data
  const user = await UserFactory.create()
  
  // Act - Execute the action
  const result = await doSomething(user)
  
  // Assert - Verify the outcome
  assert.equal(result.status, 'success')
})
```

### 2. Use Factories for Test Data
```typescript
// Good ✅
const user = await UserFactory.create({ role_id: 1 })

// Bad ❌
const user = await User.create({
  name: 'Test',
  email: 'test@example.com',
  password: 'password',
  // ... 20 more fields
})
```

### 3. Test One Thing Per Test
```typescript
// Good ✅
test('should validate email format', ...)
test('should validate password length', ...)

// Bad ❌
test('should validate all fields', ...) // Too broad
```

### 4. Clean Up After Each Test
```typescript
test.group('MyTests', (group) => {
  group.each.setup(async () => {
    await DatabaseHelper.truncate()
  })
  
  group.each.teardown(async () => {
    await redis.flushdb()
  })
})
```

### 5. Mock External Services
```typescript
// Mock email service
test('should send password reset email', async ({ assert }) => {
  const emailSpy = sinon.spy(mailService, 'send')
  
  await resetPassword.execute(dto)
  
  assert.isTrue(emailSpy.called)
})
```

---

## 🚀 Getting Started

### Step 1: Setup Infrastructure
```bash
# Create test database
mysql -u root -p -e "CREATE DATABASE shadcn_admin_test;"

# Run migrations on test DB
NODE_ENV=test node ace migration:run

# Create tests directory
mkdir -p tests/{unit,integration,helpers/factories,config}
```

### Step 2: Write Your First Test
```typescript
// tests/unit/tasks/dtos/create_task_dto.spec.ts
import { test } from '@japa/runner'
import CreateTaskDTO from '#actions/tasks/dtos/create_task_dto'

test.group('CreateTaskDTO', () => {
  test('should create with valid data', ({ assert }) => {
    const dto = new CreateTaskDTO({
      title: 'Test',
      organization_id: 1,
      created_by: 1,
    })
    
    assert.equal(dto.title, 'Test')
  })
})
```

### Step 3: Run Tests
```bash
npm test
```

---

## 📊 Progress Tracking

Use the todo list to track progress:

- [ ] Phase 0: Test Infrastructure Setup
- [ ] Tasks Module - DTOs Tests (8 files)
- [ ] Tasks Module - Commands Tests (6 files)
- [ ] Tasks Module - Queries Tests (6 files)
- [ ] Projects Module - DTOs Tests (5 files)
- [ ] Projects Module - Commands Tests (5 files)
- [ ] Projects Module - Queries Tests (3 files)
- [ ] Users Module - DTOs Tests (6 files)
- [ ] Users Module - Commands Tests (4 files)
- [ ] Users Module - Queries Tests (2 files)
- [ ] Auth Module - DTOs Tests (5 files)
- [ ] Auth Module - Commands Tests (5 files)
- [ ] Organizations Module - DTOs Tests (11 files)
- [ ] Organizations Module - Commands Tests (10 files)
- [ ] Organizations Module - Queries Tests (6 files)
- [ ] Conversations Module - DTOs Tests (10 files)
- [ ] Conversations Module - Commands Tests (7 files)
- [ ] Conversations Module - Queries Tests (3 files)
- [ ] Integration Tests
- [ ] Documentation & CI/CD

---

## 🎉 Expected Outcome

After completing this testing plan:

✅ **High Code Quality** - 80%+ test coverage  
✅ **Confidence** - Refactor without fear  
✅ **Documentation** - Tests serve as living documentation  
✅ **Regression Prevention** - Catch bugs early  
✅ **Maintainability** - Easy to add new features  
✅ **Professional** - Production-ready codebase  

---

**Next Steps**: Start with Phase 0 (Infrastructure Setup) and then tackle modules one by one in priority order.
