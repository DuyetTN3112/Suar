# CQRS Action Pattern Refactoring - Project Overview

## 📚 Tài Liệu

Dự án này đang trong quá trình refactoring để áp dụng **Action/Command Pattern** theo nguyên tắc **CQRS** (Command Query Responsibility Segregation).

### Tài Liệu Chính

1. **[ARCHITECTURE_ANALYSIS.md](./ARCHITECTURE_ANALYSIS.md)** 
   - Báo cáo phân tích kiến trúc hệ thống hiện tại
   - Các vấn đề cần cải thiện
   - Kế hoạch refactoring chi tiết

2. **[ACTION_PATTERN_GUIDE.md](./ACTION_PATTERN_GUIDE.md)**
   - Hướng dẫn đầy đủ về Action/Command Pattern
   - Naming conventions
   - Best practices & Anti-patterns
   - Ví dụ code thực tế

3. **[MIGRATION_EXAMPLE.md](./MIGRATION_EXAMPLE.md)**
   - Ví dụ migration cụ thể (Users module)
   - So sánh Before/After
   - Step-by-step guide

---

## 🎯 Mục Tiêu Refactoring

### Nguyên Tắc Cốt Lõi

1. **Single Responsibility Principle (SRP)**
   - Mỗi Action chỉ làm một việc
   - Controllers chỉ xử lý HTTP concerns

2. **Command Query Separation (CQS/CQRS)**
   - Commands: Thay đổi state (Write)
   - Queries: Chỉ đọc dữ liệu (Read)

3. **Clean Architecture**
   - Tách biệt concerns
   - Dependency Inversion
   - Testability

---

## 📁 Cấu Trúc Mới

```
app/
└── actions/
    ├── shared/                      # Base classes & utilities
    │   ├── base_command.ts          # ✅ DONE
    │   ├── base_query.ts            # ✅ DONE
    │   ├── interfaces.ts            # ✅ DONE
    │   ├── result.ts                # ✅ DONE
    │   ├── common_dtos.ts           # ✅ DONE
    │   └── index.ts                 # ✅ DONE
    │
    ├── users/                       # ⏳ TODO
    │   ├── commands/
    │   │   ├── register_user_command.ts
    │   │   ├── update_user_profile_command.ts
    │   │   └── suspend_user_account_command.ts
    │   ├── queries/
    │   │   ├── get_users_list_query.ts
    │   │   ├── get_user_detail_query.ts
    │   │   └── search_users_query.ts
    │   └── dtos/
    │       ├── register_user_dto.ts
    │       └── get_users_list_dto.ts
    │
    ├── auth/                        # ⏳ TODO
    │   ├── commands/
    │   ├── queries/
    │   └── dtos/
    │
    ├── tasks/                       # ⏳ TODO
    │   ├── commands/
    │   ├── queries/
    │   └── dtos/
    │
    └── organizations/               # ⏳ TODO
        ├── commands/
        ├── queries/
        └── dtos/
```

---

## ✅ Progress Tracker

### Phase 1: Foundation (✅ COMPLETED)
- [x] Tạo BaseCommand & BaseQuery
- [x] Tạo Interfaces (CommandHandler, QueryHandler)
- [x] Tạo Result wrapper
- [x] Tạo Common DTOs
- [x] Viết Documentation

### Phase 2: High Priority Modules (⏳ IN PROGRESS)
- [ ] Refactor Users Actions
  - [ ] Commands (RegisterUser, UpdateUserProfile, SuspendUser)
  - [ ] Queries (GetUsersList, GetUserDetail, SearchUsers)
  - [ ] DTOs
  - [ ] Update Controllers
- [ ] Refactor Auth Actions
  - [ ] Commands (AuthenticateUser, RegisterNewUser, ResetPassword)
  - [ ] Queries (ValidateToken, CheckPermission)
  - [ ] DTOs
  - [ ] Update Controllers

### Phase 3: Medium Priority Modules (📋 PLANNED)
- [ ] Refactor Tasks Actions
- [ ] Refactor Organizations Actions
- [ ] Refactor Projects Actions

### Phase 4: Low Priority Modules (📋 PLANNED)
- [ ] Refactor Settings Actions
- [ ] Refactor Notifications Actions
- [ ] Refactor Conversations Actions

### Phase 5: Finalization (📋 PLANNED)
- [ ] Update all Controllers to Thin Controllers
- [ ] Review và refactor Services
- [ ] Viết comprehensive tests
- [ ] Performance optimization
- [ ] Final code review

---

## 🚀 Quick Start Guide

### 1. Đọc Documentation

Bắt đầu với:
1. [ARCHITECTURE_ANALYSIS.md](./ARCHITECTURE_ANALYSIS.md) - Hiểu vấn đề
2. [ACTION_PATTERN_GUIDE.md](./ACTION_PATTERN_GUIDE.md) - Học pattern
3. [MIGRATION_EXAMPLE.md](./MIGRATION_EXAMPLE.md) - Xem ví dụ

### 2. Sử dụng Base Classes

```typescript
// Command example
import { BaseCommand } from '#actions/shared'

export default class RegisterUserCommand extends BaseCommand<RegisterUserDTO, User> {
  async handle(dto: RegisterUserDTO): Promise<User> {
    return await this.executeInTransaction(async (trx) => {
      // Your logic here
    })
  }
}

// Query example
import { BaseQuery, PaginatedResult } from '#actions/shared'

export default class GetUsersListQuery extends BaseQuery<GetUsersListDTO, PaginatedResult<User>> {
  async handle(dto: GetUsersListDTO): Promise<PaginatedResult<User>> {
    return await this.executeWithCache('users:list', 300, async () => {
      // Your logic here
    })
  }
}
```

### 3. Tạo DTOs

```typescript
import type { Command } from '#actions/shared'

export class RegisterUserDTO implements Command {
  constructor(
    public readonly firstName: string,
    public readonly email: string
  ) {
    this.validate()
  }

  private validate(): void {
    if (!this.email.includes('@')) {
      throw new Error('Invalid email')
    }
  }
}
```

### 4. Thin Controllers

```typescript
import { inject } from '@adonisjs/core'
import RegisterUserCommand from '#actions/users/commands/register_user_command'
import { RegisterUserDTO } from '#actions/users/dtos/register_user_dto'

export default class UsersController {
  @inject()
  async store({ request, response }: HttpContext, registerUser: RegisterUserCommand) {
    // 1. Build DTO
    const dto = new RegisterUserDTO(
      request.input('first_name'),
      request.input('email')
    )

    // 2. Execute command
    const user = await registerUser.handle(dto)

    // 3. Return response
    return response.json({ success: true, user })
  }
}
```

---

## 📝 Naming Conventions

### Commands (Write Operations)

❌ **Bad**:
- `CreateUserCommand`
- `UpdateUserCommand`
- `DeleteUserCommand`

✅ **Good**:
- `RegisterUserCommand` (reflects user intent)
- `UpdateUserProfileCommand` (specific action)
- `SuspendUserAccountCommand` (clear purpose)

### Queries (Read Operations)

✅ **Good**:
- `GetUserDetailQuery`
- `GetUsersListQuery`
- `SearchUsersByNameQuery`
- `FindUserByEmailQuery`

---

## 🧪 Testing

### Command Tests

```typescript
test('RegisterUserCommand should create user successfully', async ({ assert }) => {
  const dto = new RegisterUserDTO('John', 'john@example.com')
  const command = new RegisterUserCommand(mockContext)
  
  const user = await command.handle(dto)
  
  assert.exists(user.id)
  assert.equal(user.email, 'john@example.com')
})
```

### Query Tests

```typescript
test('GetUsersListQuery should return paginated results', async ({ assert }) => {
  const dto = new GetUsersListDTO(new PaginationDTO(1, 10), 1)
  const query = new GetUsersListQuery(mockContext)
  
  const result = await query.handle(dto)
  
  assert.isArray(result.data)
  assert.equal(result.meta.perPage, 10)
})
```

---

## 🔍 Code Review Checklist

Khi review code sau refactoring:

### Commands
- [ ] Tên có phản ánh user intent?
- [ ] Extend BaseCommand?
- [ ] Sử dụng DTO với validation?
- [ ] Sử dụng executeInTransaction cho multi-table ops?
- [ ] Có log audit cho operations quan trọng?
- [ ] Logic phức tạp đã tách thành private methods?
- [ ] Có tests đầy đủ?

### Queries
- [ ] Tên bắt đầu với Get/Search/Find?
- [ ] Extend BaseQuery?
- [ ] KHÔNG thay đổi state?
- [ ] Implement caching nếu cần?
- [ ] Query building logic tách thành private methods?
- [ ] Có tests đầy đủ?

### Controllers
- [ ] Controller thực sự mỏng?
- [ ] Không có business logic?
- [ ] Chỉ làm: extract data → call action → return response?
- [ ] Sử dụng private methods để build DTOs?

---

## 📊 Metrics & Goals

### Code Quality Targets

| Metric | Current | Target |
|--------|---------|--------|
| Actions với CQRS naming | 0% | 100% |
| Controllers < 50 LOC | 40% | 90% |
| Test coverage | 60% | 85%+ |
| Cyclomatic complexity | >10 | <5 |

### Timeline

- **Week 1-2**: Foundation + Users + Auth (High Priority)
- **Week 3-4**: Tasks + Organizations (Medium Priority)
- **Week 5**: Other modules (Low Priority)
- **Week 6**: Testing + Documentation + Review

---

## 🤝 Contributing Guidelines

Khi refactor một module mới:

1. **Đọc docs trước**: Đọc đầy đủ ACTION_PATTERN_GUIDE.md
2. **Tạo branch**: `refactor/module-name-cqrs`
3. **Follow structure**: Tạo đúng structure (commands/, queries/, dtos/)
4. **Follow naming**: Tuân thủ naming conventions
5. **Write tests**: Viết tests trước khi refactor (nếu chưa có)
6. **Update docs**: Update README nếu cần
7. **Code review**: Request review từ team

---

## 📚 Additional Resources

### External References
- [CQRS Pattern - Martin Fowler](https://martinfowler.com/bliki/CQRS.html)
- [Command Pattern - Refactoring Guru](https://refactoring.guru/design-patterns/command)
- [SOLID Principles](https://www.digitalocean.com/community/conceptual-articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design)

### Internal Docs
- [AdonisJS Documentation](https://docs.adonisjs.com)
- Project Wiki (coming soon)

---

## 💡 FAQ

### Q: Tại sao phải refactor?
A: Để code dễ maintain, test, và extend. Giảm technical debt.

### Q: Tốn bao nhiêu thời gian?
A: Khoảng 4-6 tuần (part-time) cho toàn bộ project.

### Q: Breaking changes không?
A: Không nếu làm đúng. Tests sẽ đảm bảo functionality giữ nguyên.

### Q: Có ảnh hưởng performance không?
A: Không, thậm chí còn tốt hơn nhờ caching ở Queries.

### Q: Phải refactor hết không?
A: Không bắt buộc. Có thể refactor dần từng module khi có time.

---

## 📞 Support

Nếu có câu hỏi hoặc cần hỗ trợ:
- Đọc docs trước
- Xem examples trong MIGRATION_EXAMPLE.md
- Hỏi team leads
- Tạo issue trên GitHub (nếu có)

---

**Last Updated**: 18/10/2025
**Version**: 1.0
**Status**: ✅ Foundation Complete | ⏳ Migration In Progress
