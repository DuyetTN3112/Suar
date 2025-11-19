# Product Roadmap Artifact

## Mục đích

Tài liệu này tách riêng concern `Product Roadmap` ra khỏi file omnibus của project governance.

Bộ tài liệu hiện chưa có roadmap board export, release board, milestone board, hay planning artifact chính thức dạng độc lập. Vì vậy file này chỉ ghi:

- roadmap signals có thật trong hệ thống
- trình tự phát triển suy ra từ migration, routes, runtime files, và capability docs hiện hành
- boundary những gì chưa thể khẳng định

## Evidence Sources

- `docs/01-business/capability-model-and-product-positioning.md`
- `start/routes/tasks.ts`
- `start/routes/reviews.ts`
- `start/routes/users.ts`
- `start/routes/admin.ts`
- `schema/migration evidence`
- `database/migrations/*`
- `app/modules/tasks/actions/commands/create_task_command.ts`
- `app/modules/reviews/actions/commands/resolve_review_dispute_command.ts`
- `app/modules/users/actions/commands/publish_user_profile_snapshot_command.ts`
- `app/modules/admin/controllers/dashboard_controller.ts`
- `docs/11-diagrams/*`

## Roadmap Signals Observed In The System

### Phase Signal 1: Organization, Project, Task foundation

Evidence visible in runtime:

- organization creation, join, switch
- project list/create/show/delete/member management
- task list/create/show/update/delete
- task status board and workflow routes

This is the foundational work-management layer.

## Phase Signal 2: Marketplace staffing and applications

Evidence visible in runtime:

- `/marketplace/tasks`
- apply routes
- my-applications page
- application process/withdraw
- ranking and match-score APIs
- talent bookmark surfaces

This indicates a second major layer: external talent sourcing and staffing flow.

## Phase Signal 3: Review governance and evidence engine

Evidence visible in runtime:

- mandatory review session model
- review submit/confirm
- reverse review
- dispute creation
- dispute comments/evidences
- case files
- AI dispute callback endpoints

This aligns directly with the current docs repositioning toward competency evidence and dispute-aware capability assessment.

## Phase Signal 4: Verified profile intelligence

Evidence visible in runtime:

- user skills
- profile spider chart
- delivery metrics
- featured reviews
- profile snapshots current/history/publish/access/rotate-link
- public snapshot route `/profiles/:slug`

This phase turns completed work and reviewed evidence into reusable talent profile signals.

## Phase Signal 5: Platform support and governance visibility

Evidence visible in runtime:

- notifications center
- settings persistence
- admin dashboards
- audit logs
- permission matrix
- flagged review queue
- dispute moderation queue
- package/subscription management

This phase indicates system-hardening and operations maturity work.

## Current Roadmap Interpretation

Based on committed evidence, the likely progression is:

1. org/project/task foundation
2. marketplace application flow
3. review governance and trust model
4. profile intelligence and public evidence sharing
5. admin, observability, support, and platform operations

This is an evidence-backed interpretation of the current system state. It is not a promised future roadmap.

## What Is Not Claimed

This file does not claim:

- delivery dates for future features
- approved milestone commitments
- stakeholder sign-off
- release calendar
- sprint ownership or sprint velocity

No such standalone source artifact is currently present in the documentation set.

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. trình tự tiến hóa chính của hệ thống đang được hiểu ra sao từ evidence hiện có
2. phần nào là roadmap signal có thể nói an toàn và phần nào không nên hứa thay team
3. có cần quay sang governance pack, change register, hay feature docs để đọc sâu hơn hay không
