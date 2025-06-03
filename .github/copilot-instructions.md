```
┌─────────────────────────────────────────────────────────────────────────┐
│  SUAR Platform — Clean Architecture + DDD + CQRS                        │
│  AdonisJS 7 / TypeScript / Svelte 5 + Inertia                          │
└─────────────────────────────────────────────────────────────────────────┘

╔═════════════════════════════════════════════════════════════════════════╗
║  📨 DTO Layer — app/actions/{module}/dtos/                              ║
║  ┌─────────────────────┐  ┌──────────────────────┐                      ║
║  │  request/            │  │  response/            │                     ║
║  │  → Input validation  │  │  → API output shape   │                     ║
║  │  → implements Command│  │  → Chỉ chứa data cần │                     ║
║  │    hoặc Query        │  │    trả cho client      │                    ║
║  └─────────────────────┘  └──────────────────────┘                      ║
╚═════════════════════════════════════════════════════════════════════════╝

╔═════════════════════════════════════════════════════════════════════════╗
║  🎮 Controller (Adapter - THIN) — app/controllers/                      ║
║  → Chỉ nhận HTTP request, parse params, tạo DTO                        ║
║  → Gọi Command/Query, trả response (inertia.render hoặc JSON)          ║
║  → KHÔNG chứa business logic, KHÔNG truy cập DB trực tiếp              ║
╚═════════════════════════════════════════════════════════════════════════╝

╔═════════════════════════════════════════════════════════════════════════╗
║  📋 Application Layer — app/actions/{module}/                           ║
║  ┌──────────────────┐ ┌──────────────────┐ ┌───────────────────────┐   ║
║  │ commands/         │ │ queries/         │ │ mapper/               │   ║
║  │ (Write - CQRS)   │ │ (Read - CQRS)   │ │ application_mapper.ts │   ║
║  │                   │ │                  │ │                       │   ║
║  │ Fetch → Decide   │ │ Fetch → Transform│ │ Request DTO           │   ║
║  │  → Persist       │ │  → Return        │ │  ↔ Domain Entity      │   ║
║  │                   │ │                  │ │  ↔ Response DTO       │   ║
║  │ Gọi Domain Rules │ │ Gọi Repository   │ │                       │   ║
║  │ Gọi Repository   │ │ Return Response  │ │                       │   ║
║  └──────────────────┘ └──────────────────┘ └───────────────────────┘   ║
╚═════════════════════════════════════════════════════════════════════════╝

╔═════════════════════════════════════════════════════════════════════════╗
║  🧠 Domain Layer — app/domain/{module}/  (CORE - 100% PURE)            ║
║  ┌──────────────────┐ ┌──────────────────┐ ┌───────────────────────┐   ║
║  │ entities/         │ │ repositories/    │ │ mapper/               │   ║
║  │ domain_entity.ts  │ │ interface.ts     │ │ domain_mapper.ts      │   ║
║  │                   │ │                  │ │                       │   ║
║  │ Business logic lõi│ │ Data access      │ │ EntityProps ↔ Entity  │   ║
║  │ State queries     │ │ CONTRACT (chỉ   │ │ Thuần domain, không   │   ║
║  │ Permission checks │ │ interface, KHÔNG │ │ import DB/ORM         │   ║
║  │ Domain rules      │ │ implement)       │ │                       │   ║
║  └──────────────────┘ └──────────────────┘ └───────────────────────┘   ║
║                                                                         ║
║  + *_types.ts (plain interfaces)  + *_rules.ts (pure functions)         ║
║  + *_policy.ts (PolicyResult)     + *_state_machine.ts                  ║
║                                                                         ║
║  ⚠️ KHÔNG import: framework, ORM, database, external libs              ║
║  ✅ CHỈ import: types thuần, PolicyResult, constants                    ║
╚═════════════════════════════════════════════════════════════════════════╝

╔═════════════════════════════════════════════════════════════════════════╗
║  🔌 Infrastructure Layer — app/infra/{module}/                          ║
║  ┌──────────────────┐ ┌──────────────────┐ ┌───────────────────────┐   ║
║  │ orm/              │ │ repositories/    │ │ mapper/               │   ║
║  │ orm_entity.ts     │ │ repo_impl.ts     │ │ infra_mapper.ts       │   ║
║  │                   │ │                  │ │                       │   ║
║  │ Re-export Lucid   │ │ Implement domain │ │ ORM Model (Lucid)     │   ║
║  │ Model as ORM      │ │ repository       │ │  ↔ Domain Entity      │   ║
║  │ entity reference  │ │ interface        │ │                       │   ║
║  │                   │ │ Biết Lucid/Mongo │ │ Dùng .toJSDate() cho │   ║
║  │                   │ │                  │ │ DateTime → Date       │   ║
║  └──────────────────┘ └──────────────────┘ └───────────────────────┘   ║
╚═════════════════════════════════════════════════════════════════════════╝

╔═════════════════════════════════════════════════════════════════════════╗
║  🗄️ Model (ORM Entity) — app/models/                                   ║
║  → Column definitions, relationships, hooks, decorators                 ║
║  → KHÔNG có business logic, KHÔNG có static query methods               ║
║  → Được reference từ app/infra/{module}/orm/                           ║
╚═════════════════════════════════════════════════════════════════════════╝

╔═════════════════════════════════════════════════════════════════════════╗
║  📦 Repository (Legacy) — app/repositories/                             ║
║  → Static methods cho data access (đang tồn tại song song)             ║
║  → Dần migrate sang app/infra/{module}/repositories/                   ║
║  → Biết Lucid ORM / Mongoose                                           ║
╚═════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────┐
│  🗺️ MAPPER FLOW                                                         │
│                                                                          │
│  WRITE (Command):                                                        │
│  Request DTO → (App Mapper) → Domain Entity → (Infra Mapper) → ORM      │
│                                                                          │
│  READ (Query):                                                           │
│  ORM → (Infra Mapper) → Domain Entity → (App Mapper) → Response DTO     │
│                                                                          │
│  COMMAND PATTERN: Fetch → Decide → Persist                               │
│  QUERY PATTERN:   Fetch → Transform → Return                            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  📁 CẤU TRÚC THƯ MỤC MỖI MODULE (vd: users)                           │
│                                                                          │
│  app/actions/users/                                                      │
│    dtos/request/          ← Input DTOs (validation)                      │
│    dtos/response/         ← Output DTOs (API shape)                      │
│    commands/              ← Write operations (CQRS)                      │
│    queries/               ← Read operations (CQRS)                       │
│    mapper/                ← Application Mapper (DTO ↔ Domain Entity)     │
│                                                                          │
│  app/domain/users/                                                       │
│    entities/              ← Domain Entity (pure business logic)          │
│    repositories/          ← Repository Interface (contract only)         │
│    mapper/                ← Domain Mapper (Props ↔ Entity)               │
│    user_types.ts          ← Plain interfaces cho rules                   │
│    user_management_rules.ts ← Pure business rule functions               │
│                                                                          │
│  app/infra/users/                                                        │
│    orm/                   ← ORM Entity reference (→ models/)             │
│    repositories/          ← Repository Implementation (Lucid/Mongo)      │
│    mapper/                ← Infra Mapper (ORM Model ↔ Domain Entity)     │
│                                                                          │
│  app/models/user.ts       ← Lucid Model (column defs, relations)        │
│  app/repositories/user_repository.ts ← Legacy repository (static)       │
│  app/controllers/users/   ← HTTP Adapters (thin)                        │
└─────────────────────────────────────────────────────────────────────────┘
```
