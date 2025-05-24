# Action/Command Pattern - Developer Guidelines

## Mục Lục
1. [Giới Thiệu](#giới-thiệu)
2. [Kiến Trúc CQRS](#kiến-trúc-cqrs)
3. [Naming Conventions](#naming-conventions)
4. [Cấu Trúc Thư Mục](#cấu-trúc-thư-mục)
5. [Base Classes](#base-classes)
6. [DTOs (Data Transfer Objects)](#dtos-data-transfer-objects)
7. [Ví Dụ Thực Tế](#ví-dụ-thực-tế)
8. [Best Practices](#best-practices)
9. [Anti-Patterns](#anti-patterns)
10. [Testing](#testing)

---

## Giới Thiệu

Action/Command Pattern là mô hình kiến trúc giúp tách biệt logic nghiệp vụ khỏi Controllers, tuân thủ nguyên tắc **SOLID** và **CQRS** (Command Query Responsibility Segregation).

### Lợi Ích

✅ **Maintainability**: Code dễ đọc, dễ hiểu, dễ bảo trì
✅ **Testability**: Logic nghiệp vụ tách biệt, dễ test
✅ **Reusability**: Actions có thể được tái sử dụng
✅ **Single Responsibility**: Mỗi Action chỉ làm một việc
✅ **Clear Intent**: Tên Action phản ánh rõ mục đích của người dùng

---

## Kiến Trúc CQRS

CQRS tách biệt hai loại operations:

### Commands (Write Operations)
- **Mục đích**: Thay đổi trạng thái hệ thống
- **Trả về**: Thường trả về entity vừa tạo/sửa hoặc void
- **Ví dụ**: Tạo user, cập nhật profile, xóa task
- **Đặc điểm**:
  - Sử dụng transactions
  - Ghi audit logs
  - Có thể trigger side effects (notifications, events)
  - Không nên được cache

### Queries (Read Operations)
- **Mục đích**: Lấy dữ liệu để hiển thị
- **Trả về**: Dữ liệu được yêu cầu
- **Ví dụ**: Lấy danh sách users, xem chi tiết task
- **Đặc điểm**:
  - KHÔNG thay đổi state
  - Có thể được cache
  - Tối ưu cho performance
  - Idempotent (gọi nhiều lần cho kết quả giống nhau)

---

## Naming Conventions

### Commands

Commands phải phản ánh **User Intent** (mục đích của người dùng), không chỉ là CRUD operations.

#### ❌ Sai
```typescript
CreateUserCommand    // Quá generic
UpdateUserCommand    // Không rõ update cái gì
DeleteUserCommand    // Không rõ context
```

#### ✅ Đúng
```typescript
RegisterUserCommand              // Đăng ký user mới vào hệ thống
UpdateUserProfileCommand         // Cập nhật thông tin profile
CorrectUserEmailCommand          // Sửa email sai
SuspendUserAccountCommand        // Tạm ngưng tài khoản
ReactivateUserAccountCommand     // Kích hoạt lại tài khoản
AssignUserToOrganizationCommand  // Gán user vào tổ chức
```

#### Patterns Thường Dùng
- `Register*Command` - Đăng ký, tạo mới
- `Update*Command` - Cập nhật
- `Correct*Command` - Sửa thông tin sai
- `Assign*Command` - Gán, phân công
- `Remove*Command` - Xóa, loại bỏ
- `Suspend*Command` - Tạm ngưng
- `Activate*Command` - Kích hoạt
- `Cancel*Command` - Hủy
- `Complete*Command` - Hoàn thành
- `Approve*Command` - Phê duyệt

### Queries

Queries sử dụng prefix: `Get`, `Search`, `Find`, `List`

#### ✅ Đúng
```typescript
GetUserDetailQuery           // Lấy chi tiết 1 user
GetUsersListQuery           // Lấy danh sách users
SearchUsersByNameQuery      // Tìm kiếm users theo tên
FindUserByEmailQuery        // Tìm user theo email
GetTaskStatisticsQuery      // Lấy thống kê tasks
ListOrganizationMembersQuery // Lấy danh sách members
```

#### Patterns Thường Dùng
- `Get*DetailQuery` - Lấy chi tiết 1 entity
- `Get*ListQuery` - Lấy danh sách (có pagination)
- `Search*Query` - Tìm kiếm với điều kiện
- `Find*ByQuery` - Tìm theo field cụ thể
- `Get*StatisticsQuery` - Lấy số liệu thống kê
- `List*Query` - Liệt kê (không pagination)

---

## Cấu Trúc Thư Mục

### Cấu trúc CQRS chuẩn

```
app/actions/
├── shared/                          # Infrastructure
│   ├── base_command.ts              # Base Command class
│   ├── base_query.ts                # Base Query class
│   ├── interfaces.ts                # Interfaces
│   ├── result.ts                    # Result wrapper
│   ├── common_dtos.ts               # Common DTOs
│   └── index.ts                     # Exports
│
├── users/                           # Domain: Users
│   ├── commands/                    # Write operations
│   │   ├── register_user_command.ts
│   │   ├── update_user_profile_command.ts
│   │   ├── suspend_user_account_command.ts
│   │   └── assign_user_to_organization_command.ts
│   │
│   ├── queries/                     # Read operations
│   │   ├── get_user_detail_query.ts
│   │   ├── get_users_list_query.ts
│   │   ├── search_users_query.ts
│   │   └── find_user_by_email_query.ts
│   │
│   └── dtos/                        # User-specific DTOs
│       ├── register_user_dto.ts
│       ├── update_user_profile_dto.ts
│       └── user_filters_dto.ts
│
├── tasks/                           # Domain: Tasks
│   ├── commands/
│   ├── queries/
│   └── dtos/
│
└── organizations/                   # Domain: Organizations
    ├── commands/
    ├── queries/
    └── dtos/
```

---

## Base Classes

### BaseCommand

Tất cả Commands phải extend `BaseCommand`:

```typescript
import { BaseCommand } from '#actions/shared'

export default class RegisterUserCommand extends BaseCommand<RegisterUserDTO, User> {
  async handle(dto: RegisterUserDTO): Promise<User> {
    // Implementation
  }
}
```

#### Features của BaseCommand

1. **Transaction Management**
```typescript
return await this.executeInTransaction(async (trx) => {
  // All DB operations here
})
```

2. **Audit Logging**
```typescript
await this.logAudit('create', 'user', user.id, null, user.toJSON())
```

3. **Get Current User**
```typescript
const currentUser = this.getCurrentUser() // Throws if not authenticated
```

4. **Get Organization Context**
```typescript
const orgId = this.getCurrentOrganizationId() // Throws if not found
```

### BaseQuery

Tất cả Queries phải extend `BaseQuery`:

```typescript
import { BaseQuery } from '#actions/shared'

export default class GetUsersListQuery extends BaseQuery<GetUsersListDTO, PaginatedResult<User>> {
  async handle(dto: GetUsersListDTO): Promise<PaginatedResult<User>> {
    // Implementation
  }
}
```

#### Features của BaseQuery

1. **Caching**
```typescript
return await this.executeWithCache(
  'users:list:page:1',
  300, // TTL 5 minutes
  async () => {
    // Fetch data
  }
)
```

2. **Cache Key Generation**
```typescript
const cacheKey = this.generateCacheKey('users:list', { 
  page: 1, 
  limit: 10 
})
```

---

## DTOs (Data Transfer Objects)

DTOs là objects đơn giản chứa dữ liệu input/output của Actions.

### Common DTOs

Đã có sẵn trong `app/actions/shared/common_dtos.ts`:

```typescript
import { PaginationDTO, PaginatedResult, SearchDTO } from '#actions/shared'

// Pagination
const pagination = new PaginationDTO(1, 10) // page, limit

// Search
const search = new SearchDTO('john')

// Paginated result
const result = PaginatedResult.create(users, total, pagination)
```

### Custom DTOs

Tạo DTOs cho từng domain:

```typescript
// app/actions/users/dtos/register_user_dto.ts
import type { Command } from '#actions/shared'

export class RegisterUserDTO implements Command {
  constructor(
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly email: string,
    public readonly password: string,
    public readonly roleId: number
  ) {
    // Validation
    this.validate()
  }

  private validate(): void {
    if (!this.email.includes('@')) {
      throw new Error('Invalid email format')
    }
    if (this.password.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }
  }
}
```

### DTO Best Practices

✅ **DO**:
- Sử dụng `readonly` cho tất cả properties
- Validate trong constructor
- Implement `Command` hoặc `Query` interface
- Giữ DTOs immutable (không có setters)

❌ **DON'T**:
- Đừng thêm logic nghiệp vụ vào DTOs
- Đừng có methods phức tạp
- Đừng inject dependencies vào DTOs

---

## Ví Dụ Thực Tế

### Example 1: Register User Command

#### 1. Tạo DTO
```typescript
// app/actions/users/dtos/register_user_dto.ts
import type { Command } from '#actions/shared'

export class RegisterUserDTO implements Command {
  constructor(
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly email: string,
    public readonly password: string
  ) {}
}
```

#### 2. Tạo Command
```typescript
// app/actions/users/commands/register_user_command.ts
import { BaseCommand } from '#actions/shared'
import { RegisterUserDTO } from '../dtos/register_user_dto.js'
import User from '#models/user'
import UserProfile from '#models/user_profile'
import UserSetting from '#models/user_setting'

export default class RegisterUserCommand extends BaseCommand<RegisterUserDTO, User> {
  async handle(dto: RegisterUserDTO): Promise<User> {
    return await this.executeInTransaction(async (trx) => {
      // 1. Create user
      const user = await this.createUser(dto, trx)
      
      // 2. Create profile
      await this.createUserProfile(user.id, trx)
      
      // 3. Create default settings
      await this.createDefaultSettings(user.id, trx)
      
      // 4. Log audit
      await this.logAudit('user_registered', 'user', user.id, null, user.toJSON())
      
      return user
    })
  }

  // Private subtasks
  private async createUser(dto: RegisterUserDTO, trx: any): Promise<User> {
    return await User.create({
      first_name: dto.firstName,
      last_name: dto.lastName,
      email: dto.email,
      password: dto.password,
      status_id: 1,
      role_id: 2,
    }, { client: trx })
  }

  private async createUserProfile(userId: number, trx: any): Promise<void> {
    await UserProfile.create({
      user_id: userId,
      language: 'vi',
    }, { client: trx })
  }

  private async createDefaultSettings(userId: number, trx: any): Promise<void> {
    await UserSetting.create({
      user_id: userId,
      theme: 'light',
      notifications_enabled: true,
    }, { client: trx })
  }
}
```

#### 3. Controller (Thin)
```typescript
// app/controllers/users/users_controller.ts
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import RegisterUserCommand from '#actions/users/commands/register_user_command'
import { RegisterUserDTO } from '#actions/users/dtos/register_user_dto'

export default class UsersController {
  @inject()
  async store(
    { request, response, session }: HttpContext,
    registerUser: RegisterUserCommand
  ) {
    // 1. Build DTO from request
    const dto = new RegisterUserDTO(
      request.input('first_name'),
      request.input('last_name'),
      request.input('email'),
      request.input('password')
    )

    // 2. Execute command
    const user = await registerUser.handle(dto)

    // 3. Return response
    session.flash('success', 'User registered successfully')
    return response.redirect().toRoute('users.index')
  }
}
```

### Example 2: Get Users List Query

#### 1. Tạo DTO
```typescript
// app/actions/users/dtos/get_users_list_dto.ts
import { PaginationDTO, SearchDTO, type Query } from '#actions/shared'

export class GetUsersListDTO implements Query {
  constructor(
    public readonly pagination: PaginationDTO,
    public readonly organizationId: number,
    public readonly search?: SearchDTO,
    public readonly roleId?: number,
    public readonly statusId?: number
  ) {}
}
```

#### 2. Tạo Query
```typescript
// app/actions/users/queries/get_users_list_query.ts
import { BaseQuery, PaginatedResult } from '#actions/shared'
import { GetUsersListDTO } from '../dtos/get_users_list_dto.js'
import User from '#models/user'

export default class GetUsersListQuery extends BaseQuery<
  GetUsersListDTO,
  PaginatedResult<User>
> {
  async handle(dto: GetUsersListDTO): Promise<PaginatedResult<User>> {
    const cacheKey = this.generateCacheKey('users:list', {
      page: dto.pagination.page,
      limit: dto.pagination.limit,
      orgId: dto.organizationId,
      search: dto.search?.searchTerm || '',
    })

    return await this.executeWithCache(cacheKey, 300, async () => {
      const query = this.buildQuery(dto)
      const users = await query.paginate(dto.pagination.page, dto.pagination.limit)
      
      return PaginatedResult.create(
        users.all(),
        users.total,
        dto.pagination
      )
    })
  }

  private buildQuery(dto: GetUsersListDTO) {
    let query = User.query()
      .preload('role')
      .preload('status')
      .whereNull('deleted_at')

    // Apply filters
    if (dto.organizationId) {
      query = query.whereHas('organization_users', (q) => {
        q.where('organization_id', dto.organizationId)
      })
    }

    if (dto.roleId) {
      query = query.where('role_id', dto.roleId)
    }

    if (dto.statusId) {
      query = query.where('status_id', dto.statusId)
    }

    if (dto.search) {
      query = query.where((q) => {
        q.whereILike('first_name', `%${dto.search!.searchTerm}%`)
          .orWhereILike('last_name', `%${dto.search!.searchTerm}%`)
          .orWhereILike('email', `%${dto.search!.searchTerm}%`)
      })
    }

    return query
  }
}
```

#### 3. Controller
```typescript
@inject()
async index(
  { request, inertia, auth }: HttpContext,
  getUsersList: GetUsersListQuery
) {
  // Build DTO
  const dto = new GetUsersListDTO(
    new PaginationDTO(
      request.input('page', 1),
      request.input('limit', 10)
    ),
    auth.user!.current_organization_id!,
    request.input('search') ? new SearchDTO(request.input('search')) : undefined,
    request.input('role_id'),
    request.input('status_id')
  )

  // Execute query
  const result = await getUsersList.handle(dto)

  // Render
  return inertia.render('users/index', {
    users: result.data,
    meta: result.meta,
  })
}
```

---

## Best Practices

### 1. Single Responsibility Principle (SRP)

✅ **Mỗi Action chỉ làm một việc**
```typescript
// Good
RegisterUserCommand          // Chỉ đăng ký user
SendWelcomeEmailCommand      // Chỉ gửi email chào mừng

// Bad
RegisterUserAndSendEmailCommand  // Làm 2 việc
```

### 2. Use Transactions for Commands

✅ **Luôn dùng transaction cho operations thay đổi nhiều tables**
```typescript
return await this.executeInTransaction(async (trx) => {
  await User.create({ ... }, { client: trx })
  await UserProfile.create({ ... }, { client: trx })
  await UserSetting.create({ ... }, { client: trx })
})
```

### 3. Tách Subtasks

✅ **Nếu handle() quá dài, tách thành private methods**
```typescript
async handle(dto: RegisterUserDTO): Promise<User> {
  return await this.executeInTransaction(async (trx) => {
    const user = await this.createUser(dto, trx)
    await this.createUserProfile(user.id, trx)
    await this.createDefaultSettings(user.id, trx)
    await this.sendWelcomeEmail(user.email)
    return user
  })
}

// Private subtasks
private async createUser(dto: RegisterUserDTO, trx: any) { ... }
private async createUserProfile(userId: number, trx: any) { ... }
```

### 4. Validation ở DTO

✅ **Validate input trong DTO constructor**
```typescript
export class RegisterUserDTO implements Command {
  constructor(
    public readonly email: string,
    public readonly password: string
  ) {
    this.validate()
  }

  private validate(): void {
    if (!this.email.includes('@')) {
      throw new Error('Invalid email')
    }
    if (this.password.length < 8) {
      throw new Error('Password too short')
    }
  }
}
```

### 5. Cache Queries

✅ **Cache các queries hay được gọi**
```typescript
return await this.executeWithCache(
  `users:detail:${dto.id}`,
  300, // 5 minutes
  async () => await User.find(dto.id)
)
```

### 6. Logging và Monitoring

✅ **Log tất cả Commands quan trọng**
```typescript
await this.logAudit('user_registered', 'user', user.id, null, user.toJSON())
```

---

## Anti-Patterns

### ❌ 1. Fat Controller

**Sai**:
```typescript
// Controller chứa quá nhiều logic
async store({ request, response }: HttpContext) {
  const user = await User.create({ ... })
  await UserProfile.create({ ... })
  await UserSetting.create({ ... })
  await AuditLog.create({ ... })
  await Notification.create({ ... })
  return response.redirect().back()
}
```

**Đúng**:
```typescript
// Controller mỏng, gọi Command
@inject()
async store({ request, response }: HttpContext, registerUser: RegisterUserCommand) {
  const dto = new RegisterUserDTO(...)
  await registerUser.handle(dto)
  return response.redirect().back()
}
```

### ❌ 2. Query Thay Đổi State

**Sai**:
```typescript
// Query không nên thay đổi state
export default class GetUserDetailQuery extends BaseQuery<IdDTO, User> {
  async handle(dto: IdDTO): Promise<User> {
    const user = await User.find(dto.id)
    user.last_accessed_at = DateTime.now() // ❌ Thay đổi state
    await user.save()
    return user
  }
}
```

**Đúng**:
```typescript
// Tạo Command riêng cho việc tracking
export default class TrackUserAccessCommand extends BaseCommand<IdDTO, void> {
  async handle(dto: IdDTO): Promise<void> {
    await User.query()
      .where('id', dto.id)
      .update({ last_accessed_at: DateTime.now() })
  }
}
```

### ❌ 3. CRUD Naming

**Sai**:
```typescript
CreateUserCommand    // Generic, không rõ intent
UpdateUserCommand
DeleteUserCommand
```

**Đúng**:
```typescript
RegisterUserCommand              // Rõ ràng user intent
UpdateUserProfileCommand
SuspendUserAccountCommand
```

### ❌ 4. God Action

**Sai**:
```typescript
// Action làm quá nhiều thứ
export default class ManageUserCommand extends BaseCommand<any, any> {
  async handle(data: any) {
    if (data.action === 'create') { ... }
    else if (data.action === 'update') { ... }
    else if (data.action === 'delete') { ... }
    else if (data.action === 'suspend') { ... }
  }
}
```

**Đúng**:
```typescript
// Tách thành nhiều Commands riêng biệt
RegisterUserCommand
UpdateUserProfileCommand
RemoveUserCommand
SuspendUserAccountCommand
```

---

## Testing

### Testing Commands

```typescript
// tests/unit/actions/users/commands/register_user_command.test.ts
import { test } from '@japa/runner'
import RegisterUserCommand from '#actions/users/commands/register_user_command'
import { RegisterUserDTO } from '#actions/users/dtos/register_user_dto'

test.group('RegisterUserCommand', () => {
  test('should register a new user successfully', async ({ assert }) => {
    // Arrange
    const dto = new RegisterUserDTO(
      'John',
      'Doe',
      'john@example.com',
      'password123'
    )

    const command = new RegisterUserCommand(mockHttpContext)

    // Act
    const user = await command.handle(dto)

    // Assert
    assert.exists(user.id)
    assert.equal(user.email, 'john@example.com')
  })

  test('should rollback on error', async ({ assert }) => {
    // Test transaction rollback
  })
})
```

### Testing Queries

```typescript
// tests/unit/actions/users/queries/get_users_list_query.test.ts
import { test } from '@japa/runner'
import GetUsersListQuery from '#actions/users/queries/get_users_list_query'
import { GetUsersListDTO } from '#actions/users/dtos/get_users_list_dto'
import { PaginationDTO } from '#actions/shared'

test.group('GetUsersListQuery', () => {
  test('should return paginated users', async ({ assert }) => {
    // Arrange
    const dto = new GetUsersListDTO(
      new PaginationDTO(1, 10),
      1 // organizationId
    )

    const query = new GetUsersListQuery(mockHttpContext)

    // Act
    const result = await query.handle(dto)

    // Assert
    assert.isArray(result.data)
    assert.equal(result.meta.perPage, 10)
  })
})
```

---

## Checklist Khi Tạo Action Mới

### Command Checklist

- [ ] Tên Command phản ánh user intent (không phải CRUD)
- [ ] Extend `BaseCommand`
- [ ] Có DTO rõ ràng với validation
- [ ] Sử dụng `executeInTransaction` cho multi-table operations
- [ ] Gọi `logAudit` cho các thao tác quan trọng
- [ ] Tách logic phức tạp thành private methods
- [ ] Viết tests

### Query Checklist

- [ ] Tên Query bắt đầu với Get/Search/Find
- [ ] Extend `BaseQuery`
- [ ] Có DTO rõ ràng
- [ ] KHÔNG thay đổi state
- [ ] Sử dụng `executeWithCache` nếu cần
- [ ] Viết tests

---

## Tài Liệu Tham Khảo

- [CQRS Pattern - Martin Fowler](https://martinfowler.com/bliki/CQRS.html)
- [Command Pattern - Refactoring Guru](https://refactoring.guru/design-patterns/command)
- [SOLID Principles](https://www.digitalocean.com/community/conceptual-articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design)
- [AdonisJS Documentation](https://docs.adonisjs.com)

---

**Version**: 1.0
**Last Updated**: 18/10/2025
**Maintained by**: Development Team
