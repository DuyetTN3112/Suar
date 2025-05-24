# ShadcnAdmin - AI Coding Agent Instructions

## Architecture Overview

This is a full-stack admin panel built with **AdonisJS v6** (backend) and **React + Inertia.js** (frontend). The application uses **Hybrid CQRS with Manual Resolution** to avoid IoC container conflicts during hot reload.

### Core Technology Stack
- **Backend**: AdonisJS v6, Lucid ORM (MySQL), Redis, WebSocket (Transmit)
- **Frontend**: React, Inertia.js, Shadcn/ui, Tailwind CSS v4
- **Key Services**: Redis caching, OAuth (Google/GitHub), rate limiting

### Module Structure
```
app/actions/{module}/          # Business logic (CQRS pattern)
  ├── commands/                # Write operations (state changes)
  ├── queries/                 # Read operations (no state changes)
  └── dtos/                    # Data Transfer Objects
app/controllers/               # Thin controllers (orchestration only)
app/models/                    # Lucid ORM models
app/services/                  # Shared services (cache, logging, etc.)
inertia/                       # React frontend
  ├── pages/                   # Page components
  ├── components/              # Reusable UI components
  └── layouts/                 # Layout components
```

## Critical Pattern: Hybrid CQRS with Manual Resolution

**⚠️ NEVER use `@inject()` decorator on Action classes or controller parameters** - this causes IoC container conflicts during hot reload.

### Command Pattern (Write Operations)

Commands change system state. Name them with **user intent**, not CRUD operations:
- ✅ `RegisterUserCommand` (not `CreateUserCommand`)
- ✅ `UpdateUserProfileCommand` (not `UpdateUserCommand`)
- ✅ `AssignUserToOrganizationCommand`

```typescript
// app/actions/users/commands/register_user_command.ts
export default class RegisterUserCommand extends BaseCommand<RegisterUserDTO, User> {
  constructor(protected ctx: HttpContext) {}
  
  async handle(dto: RegisterUserDTO): Promise<User> {
    return await this.executeInTransaction(async (trx) => {
      const user = await User.create(dto, { client: trx })
      await this.logAudit('create', 'user', user.id, null, dto)
      return user
    })
  }
}
```

**Controller Usage** (manual instantiation):
```typescript
async store(ctx: HttpContext) {
  const { request, response } = ctx
  const dto = new RegisterUserDTO(request.all())
  const command = new RegisterUserCommand(ctx)  // Manual instantiation
  const user = await command.handle(dto)
  return response.redirect().toRoute('users.index')
}
```

### Query Pattern (Read Operations)

Queries NEVER change state. Use prefixes: `Get*`, `Search*`, `Find*`, `List*`

```typescript
// app/actions/users/queries/get_users_list_query.ts
export default class GetUsersListQuery extends BaseQuery<GetUsersListDTO, PaginatedResult<User>> {
  constructor(protected ctx: HttpContext) {}
  
  async handle(dto: GetUsersListDTO): Promise<PaginatedResult<User>> {
    const cacheKey = this.generateCacheKey('users:list', { ...dto })
    return await this.executeWithCache(cacheKey, 300, async () => {
      return await User.query()
        .where('organization_id', this.getCurrentOrganizationId())
        .paginate(dto.page, dto.limit)
    })
  }
}
```

### Base Classes Provide

**BaseCommand** (`app/actions/shared/base_command.ts`):
- `executeInTransaction(callback)` - Auto commit/rollback
- `logAudit(action, entityType, entityId, oldValues, newValues)` - Audit logging
- `getCurrentUser()` - Get authenticated user
- `getCurrentOrganizationId()` - Get current org from session

**BaseQuery** (`app/actions/shared/base_query.ts`):
- `executeWithCache(cacheKey, ttl, callback)` - Redis caching
- `generateCacheKey(prefix, params)` - Cache key generation
- `getCurrentUser()` - Optional auth user
- `getCurrentOrganizationId()` - Optional org ID

## Critical Controllers Pattern

Controllers MUST be **thin orchestrators** - no business logic:

```typescript
// ✅ CORRECT - Controller only orchestrates
async store(ctx: HttpContext) {
  const dto = new CreateTaskDTO(ctx.request.all())
  const command = new CreateTaskCommand(ctx)
  const task = await command.handle(dto)
  return ctx.response.redirect().toRoute('tasks.show', { id: task.id })
}

// ❌ WRONG - Business logic in controller
async store(ctx: HttpContext) {
  const user = ctx.auth.user
  const organization = await Organization.find(user.current_organization_id)
  if (!organization) throw new Error('Organization not found')
  const task = await Task.create({ ...ctx.request.all(), organization_id: organization.id })
  await AuditLog.create({ ... })  // Logic belongs in Command
  return ctx.response.redirect()
}
```

## Path Aliases & Imports

Use AdonisJS import aliases (defined in `package.json` imports):
```typescript
import User from '#models/user'
import CacheService from '#services/cache_service'
import { BaseCommand } from '#actions/shared/base_command'
```

Frontend uses TypeScript paths (configured in `tsconfig.json`):
```typescript
import { Button } from '@/components/ui/button'
import { useTheme } from '@/context/theme_context'
```

## Development Workflow

### Running the App
```bash
npm run dev              # Start dev server with HMR (port 3333)
node ace serve --hmr     # Alternative dev command
npm run build            # Build for production
npm start                # Run production build
```

### Database Operations
```bash
node ace migration:run   # Run pending migrations
node ace migration:fresh # Fresh migrations (drops all tables)
node ace db:seed         # Seed database with test data
```

### Testing
```bash
npm test                 # Run test suite (Japa)
npm run test:watch       # Watch mode
```

**Test files**: `app/**/*.spec.ts` (e.g., `single_flight_service.spec.ts`)

## Authentication & Authorization

- **Auth methods**: Email/password, Google OAuth, GitHub OAuth
- **Middleware**: `auth` middleware loads user with roles and organization relationships
- **Session-based**: Uses `@adonisjs/session` with remember me tokens
- **Shared to Inertia**: User object automatically shared to React via `ctx.inertia.share()`

```typescript
// In middleware, user is enriched with:
ctx.inertia.share({
  auth: {
    user: {
      ...user.serialize(),
      role: user.role,
      isAdmin: [1, 2].includes(user.role_id),
      current_organization_id: ctx.session.get('current_organization_id'),
      organizations: user.organizations
    }
  }
})
```

## Redis Caching Patterns

Use `CacheService` for consistent caching:

```typescript
// Set cache
await CacheService.set('key', data, 3600)

// Get cache
const data = await CacheService.get<MyType>('key', defaultValue)

// Delete by pattern
await CacheService.deleteByPattern('users:*')

// Single-flight pattern (prevents cache stampede)
import SingleFlightService from '#services/single_flight_service'
const result = await SingleFlightService.execute('expensive-key', async () => {
  return await expensiveOperation()
})
```

## Frontend: React + Inertia.js

### Inertia Page Components
Located in `inertia/pages/{module}/`. Inertia automatically handles:
- Client-side routing (no full page reloads)
- Props passing from controllers via `ctx.inertia.render()`
- Shared data (auth, flash messages) available in `usePage()`

```typescript
// Backend controller
return ctx.inertia.render('users/index', { users, filters })

// Frontend page (inertia/pages/users/index.tsx)
export default function UsersIndex({ users, filters }: Props) {
  const { auth } = usePage().props  // Shared auth data
  return <div>...</div>
}
```

### Shadcn/ui Components
Use prebuilt Shadcn components from `@/components/ui/`:
- `Button`, `Input`, `Card`, `Dialog`, `Pagination`, etc.
- Styled with Tailwind CSS v4
- Theme switching via `ThemeProvider` context

### Form Handling
Use Inertia's `useForm` hook for forms with automatic CSRF:
```typescript
import { useForm } from '@inertiajs/react'

const { data, setData, post, errors } = useForm({
  email: '',
  password: ''
})

const handleSubmit = (e) => {
  e.preventDefault()
  post('/login')  // Automatic CSRF token
}
```

## Real-time Features (WebSocket)

Uses `@adonisjs/transmit` for WebSocket. Configured in `config/transmit.ts`:
```typescript
// Backend: Broadcasting
transmit.broadcast(`conversation:${conversationId}`, { type: 'new_message', data })

// Frontend: Subscribe
const channel = transmit.subscription(`conversation:${id}`)
channel.onMessage((message) => handleNewMessage(message))
```

## Important Conventions

1. **Never mix state changes in queries** - Queries are read-only
2. **Use DTOs for input validation** - Located in `app/actions/{module}/dtos/`
3. **Transaction for multi-step writes** - Use `executeInTransaction()` in Commands
4. **Audit critical operations** - Use `logAudit()` for user actions
5. **Cache query results** - Use `executeWithCache()` for expensive queries
6. **No `@inject()` in Actions** - Manual instantiation only to avoid hot reload issues

## Module Reference

- **Auth**: Registration, login, OAuth, password reset (`app/actions/auth/`)
- **Users**: User management, approval workflow, role changes (`app/actions/users/`)
- **Organizations**: Multi-tenant organization management (`app/actions/organizations/`)
- **Projects**: Project management within organizations (`app/actions/projects/`)
- **Tasks**: Task tracking with audit logs, soft deletes (`app/actions/tasks/`)
- **Conversations**: Real-time messaging with WebSocket (`app/actions/conversations/`)
- **Notifications**: System notifications (`app/actions/notifications/`)
- **Settings**: User preferences and themes (`app/actions/settings/`)

## Documentation

Comprehensive guides in `docs/`:
- `ACTION_PATTERN_GUIDE.md` - Detailed CQRS/Action pattern guide (Vietnamese)
- `CQRS_PATTERN.md` - Manual resolution pattern explanation
- `ARCHITECTURE_ANALYSIS.md` - System architecture overview
- `{MODULE}_SUMMARY.md` - Per-module implementation summaries

## Common Pitfalls

❌ **Using `@inject()` decorator** → Causes hot reload failures
❌ **Business logic in controllers** → Violates separation of concerns
❌ **Generic command names** like `CreateUser` → Should be `RegisterUser`
❌ **State changes in queries** → Breaks CQRS principles
❌ **Missing transactions** → Data inconsistency risk
❌ **Forgetting audit logs** → Lost compliance trail
