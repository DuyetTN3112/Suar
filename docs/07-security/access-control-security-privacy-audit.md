# Access Control, Security, Privacy, And Audit Context

| Field | Value |
|---|---|
| Status | Active |
| Audience | Dev, QA, reviewer, DevOps, incident responder |
| Purpose | Tóm tắt các security boundary kỹ thuật quan trọng đã được code/config/schema xác nhận |
| Source of Truth | `start/routes/*.ts`, `config/*`, security-related command/middleware, schema/SQL evidence |
| Last Reviewed | 2026-07-19 |
| Review Cycle | Khi auth, middleware, limiter, health check, callback security, hoặc audit storage đổi |
| Owner | Engineering |
| Stale Risk | Cao |

## File Này Phải Giúp Bạn Làm Gì

Sau khi đọc xong file này, người đọc phải hiểu nhanh:

- hệ thống chặn truy cập ở những lớp nào
- route nào public thật, route nào chỉ “có vẻ public”
- callback và health check đang được bảo vệ ra sao
- audit/security data hiện được ghi ở đâu

Nếu bạn chỉ có ít phút:

1. đọc `Mental Model`
2. đọc `Access Control Boundaries`
3. đọc `Health Endpoint Protection` hoặc `AI Callback Protection` nếu incident nằm ở đó

## Nếu Dùng File Này Để Viết Report Bên Ngoài Repo

Bạn có thể dùng file này để viết:

- chương security architecture ở mức kỹ thuật
- phần access control boundaries
- phần callback/health endpoint protection
- phần audit/security evidence context

Đây là file phù hợp để trả lời:

- hệ thống đang chặn truy cập ở những lớp nào
- public surface nào thực sự public và đang được bảo vệ ra sao
- security trong Suar là multi-layer chứ không chỉ một middleware gate

Bạn không nên dùng riêng file này để kết luận:

- hệ thống đã có full security program hoặc compliance pack
- privacy/legal posture đã hoàn chỉnh chỉ vì có security boundaries trong hệ thống

Nếu cần nói sâu hơn về vận hành hoặc bằng chứng, đọc thêm:

- `../09-operations/runbook-monitoring-maintenance.md`
- `../12-evidence/source-register.md`

## Safe External Summary

Nếu cần một câu tóm tắt an toàn cho report, có thể dùng:

`Security của Suar hiện được thể hiện như một hệ nhiều lớp gồm route middleware, context guards, limiter, callback verification, credential protection, và enterprise audit/event storage có scope, redaction, trace metadata, và hash chaining, thay vì phụ thuộc vào một cổng chặn duy nhất.`

## Nếu Bạn Chỉ Có 3 Phút

Chỉ cần nhớ bốn ý:

1. Security của Suar là nhiều lớp: middleware, command/query guard, config, limiter, DB/runtime permission function.
2. `org admin` và `system admin` là hai boundary khác nhau.
3. `/health` không public; nó đi qua credential middleware.
4. AI callback là public integration surface nhưng có credential, freshness check, và request authenticity guard.

Thêm hai bẫy rất hay làm support/QA/devops mất thời gian:

- `pending membership` không đồng nghĩa `approved membership`, nên có thể “đã có join request” nhưng vẫn chưa có org context hợp lệ.
- có route auth dưới `/api/v1/*` nhưng vẫn dùng `session-only`; đừng nhìn prefix rồi đoán bearer flow.
- repo còn có test/support auth surfaces dưới `/api/testing/*`, nhưng chúng chỉ được mount ở `development|test`; đừng nhầm chúng với production backdoor hoặc public auth API

## Mental Model

Security trong Suar không nằm ở một chỗ.

Nó đang được neo ở nhiều lớp:

- route middleware
- controller/command/query guard
- config bảo vệ request
- limiter
- SQL/runtime permission function
- audit/event storage

Nếu chỉ đọc middleware mà kết luận xong về phân quyền, rất dễ sai.

Một câu nhớ ngắn:

`Security của Suar là nhiều lớp chồng nhau, không phải một cái gate duy nhất.`

Code audit note:

- ngoài middleware auth/context thông thường, route JSON hiện còn gắn `api auth contract`
- hai contract chính đang dùng là:
  - `session-or-bearer`
  - `bearer-or-session`
- ngoài ra auth surfaces còn có nhánh `session-only` cho token issue path như `/api/v1/auth/token`
- test/support auth surfaces như `/api/testing/token-login` và `/api/testing/session/bootstrap` đi theo `api-ops-internal`, giúp bắc cầu giữa token pair và web session trong môi trường test/dev, không phải production feature surface
- khác biệt này quan trọng khi debug token/session behavior vì nó phản ánh thứ tự ưu tiên transport auth ở từng route family

## Access Control Boundaries

### Authentication Gate

Thực tế runtime:

- anonymous chỉ đi được một số surface public được carve-out rõ
- đa số feature route cần `middleware.auth()`

Ví dụ public carve-out:

- public snapshot route
- AI callback route

Nguồn:

- `start/routes/auth.ts`
- `start/routes/reviews.ts`
- `start/routes/users.ts`
- `app/modules/auth/middleware/auth_middleware.ts`

Code audit note:

- không phải mọi API authenticated route đều dùng cùng một auth contract
- nhiều compat routes ưu tiên `session-or-bearer`
- nhiều canonical routes ưu tiên `bearer-or-session`
- vì vậy incident kiểu “browser được nhưng token client lỗi” hoặc ngược lại cần soi đúng contract đang bind trên route group

### Organization Context Gate

Các nhóm route chính cần `middleware.requireOrg()`:

- tasks
- projects
- reviews org-scoped routes
- users/profile/talent/bookmark workspace
- nhiều nhóm `/api/v1/*` cần org context

Điều này rất quan trọng khi debug bug “vào được trang nhưng data rỗng” hoặc “API trả unauthorized/forbidden”.

Đây là một trong những chỗ dễ gây hiểu lầm nhất cho người mới. Vào được page shell không tự động nghĩa là org context đã đúng hoặc quyền đọc data đã đủ.

Nguồn:

- `start/routes/tasks.ts`
- `start/routes/projects.ts`
- `start/routes/reviews.ts`
- `start/routes/users.ts`
- `start/routes/api_v1.ts`

Code audit note rất quan trọng:

- `RequireOrganizationMiddleware` không phải logic “chọn org hiện hành”
- nó chỉ enforce kết quả sau khi `OrganizationResolverMiddleware` đã chạy
- resolver hiện có thể:
  - sync `current_organization_id` giữa session và DB
  - tự chọn approved membership đầu tiên khi user chưa có org nào
  - clear org hiện tại nếu membership không còn hợp lệ
  - để yên một số exempt paths như `/admin`, `/api/admin`, `/organizations`, `/auth`, `/health`

Ý nghĩa khi debug:

- lỗi current-org không phải lúc nào cũng nằm ở route group đang fail
- có thể nằm ở resolver sync, membership validity, hoặc exempt-path behavior trước đó
- join request đã tồn tại cũng chưa đủ để kết luận user đã có quyền org workspace; evidence test hiện cho thấy `pending` là membership tồn tại nhưng chưa phải `approved`

### Admin Gates

Có ít nhất hai lớp admin khác nhau:

- org admin
- system admin

Ví dụ:

- task status mutation và workflow mutation dùng `middleware.requireOrgAdmin()`
- system admin pages/API dùng `middleware.requireSystemAdmin()` và `middleware.systemAdminContext()`

Điều này có nghĩa:

- admin của organization không tự động là system admin
- `/admin/*` là vùng nhạy cảm cần phân biệt rõ với workspace org

Nếu đọc sai chỗ này, rất dễ viết sai docs, test, hoặc permission expectation.

Nguồn:

- `start/routes/tasks.ts`
- `start/routes/admin.ts`
- `start/routes/reviews.ts`

Code audit note:

- `api-admin-internal` là transport kind riêng cho admin JSON surfaces
- admin dispute APIs trong reviews đang đi theo `requireSystemAdmin()` chứ không phụ thuộc org context

### Role Context Đã Xác Nhận

Role groups đọc được từ constants hiện tại:

- organization roles: owner, admin, member
- project roles: owner, manager, member, viewer
- system roles: superadmin, system_admin, registered_user

Nguồn:

- `app/modules/organizations/constants/organization_constants.ts`
- `app/modules/projects/constants/project_constants.ts`
- `app/modules/users/constants/user_constants.ts`

## Request Protection

Từ `config/shield.ts`, hệ thống hiện có:

- CSP enabled
- CSRF enabled trừ explicit callback/test routes
- frame protection
- HSTS enabled
- content-type sniffing protection

Điều này không chứng minh toàn bộ app an toàn, nhưng là lớp bảo vệ request/browser rõ ràng đang được bật.

Nguồn:

- `config/shield.ts`

## Rate Limiting

Limiter hiện có:

- global throttle `120/minute`
- API throttle `60/minute`
- login throttle production `30/minute`

Khi production lỗi kiểu spam, callback flood, hoặc user bị rate limited bất thường, đây là một trong những điểm phải kiểm tra sớm.

Nguồn:

- `start/limiter.ts`

## Health Endpoint Protection

`/health` không phải anonymous endpoint.

Hiện tại:

- route đi qua credential middleware
- health-check credential là guard chính cho endpoint này
- nếu credential chưa cấu hình, middleware trả lỗi sớm thay vì mở endpoint ra ngoài

Điều này rất quan trọng vì nhiều team dễ mặc định health endpoint là public.

Nguồn:

- `start/routes/index.ts`
- `start/env.ts`

## AI Callback Protection

Callback AI là public integration surface nhưng không phải “public business action”.

`ProcessAiDisputeCallbackCommand` hiện xác nhận:

- callback credential đã cấu hình
- request còn trong freshness window
- request authenticity check hợp lệ
- trạng thái evaluation còn được phép xử lý

Routes liên quan:

- `/api/public/ai-disputes/callback`
- `/api/public/ai/dispute-evaluations/callback`

Nếu callback production có vấn đề, đây là lớp cần đọc đầu tiên.

Nguồn:

- `app/modules/reviews/actions/commands/process_ai_dispute_callback_command.ts`
- `start/routes/reviews.ts`

Điểm cần nhớ thêm:

- callback route nhìn bề ngoài là public
- nhưng command hiện vẫn chặn thật bằng credential, freshness, authenticity, và state guard
- vì vậy lỗi callback thường nằm ở cấu hình tích hợp hoặc lệch thời gian trước khi là business workflow problem

## Deprecated Alias Boundary

Code audit hiện xác nhận deprecated route families đang được cô lập riêng trong:

- `start/routes/deprecated/api_context_aliases.ts`
- `start/routes/deprecated/api_org_compat_aliases.ts`
- `start/routes/deprecated/api_v1_org_aliases.ts`
- `start/routes/deprecated/task_surface_aliases.ts`

Ý nghĩa bảo mật và audit:

- alias cũ không chỉ “vẫn còn route”
- chúng còn có middleware đánh dấu deprecated rõ ràng
- vì vậy khi thấy client vẫn gọi route cũ, không nên hiểu đó là canonical secure surface mặc định

Trong incident review hoặc access audit:

1. xác định request đang đi route canonical hay alias deprecated
2. nhìn `bindApiAuthContract(...)`
3. nhìn tiếp context/admin guards
4. rồi mới kết luận access bug nằm ở auth, permission, hay client migration

## Database And Runtime Permission Layer

`schema/migration evidence` hiện cho thấy các hàm permission quan trọng như:

- `can_user_update_task(uuid, uuid)`
- `can_user_view_task(uuid, uuid)`
- `check_organization_permission(uuid, uuid, character varying)`
- `check_project_permission(uuid, uuid, character varying)`
- `check_system_permission(uuid, character varying)`

Ý nghĩa:

- access control không chỉ nằm ở middleware và controller
- database/runtime function cũng đang giữ vai trò xác nhận quyền

Các quyết định quyền hiện có dấu hiệu dựa trên:

- `system_role`
- `org_role`
- `project_role`
- ownership
- assignment
- organization membership đã `approved`
- task visibility
- custom roles JSONB

Nguồn:

- `schema/migration evidence`

## Privacy-Relevant Runtime Context

Hệ thống hiện đang giữ và xử lý các nhóm dữ liệu nhạy cảm hoặc operational như:

- account data
- profile/talent data
- trust/performance metadata
- bookmark notes
- notification payload
- audit/event metadata
- IP address
- user agent

Điều này là context kỹ thuật, không phải văn bản privacy policy pháp lý.

Muốn đọc chi tiết theo nhóm dữ liệu và exposure surface:

- `./privacy-data-handling-context.md`

## Audit Log Context

Audit runtime hiện ghi/đọc từ PostgreSQL.

Evidence đã xác nhận:

- `audit_repository_provider.ts` khởi tạo `PostgresAuditLogRepository`
- repository này ghi/đọc bảng `audit_events`
- schema evidence đều có `audit_events` và `error_events`
- migration `20260719090000_add_enterprise_audit_events.ts` thêm enterprise metadata columns cho event name/family/module/workflow/stage/severity/outcome/actor/target/request/trace/correlation/retention
- `audit_event_scopes` tách visibility projection theo `system`, `user`, `organization`
- `redactAuditValue` redacts sensitive field names before persistence
- `computeAuditEventHash` tạo SHA-256 hash từ canonical event content cộng `prev_hash`

Điều này có nghĩa khi incident cần điều tra:

- audit trail có điểm neo trong DB
- audit event có thể được đọc theo scope surface thay vì quét log text rời rạc
- trace/correlation metadata giúp nối audit với request hoặc workflow cụ thể
- hash fields giúp phát hiện chuỗi event bị thay đổi nếu chain được duy trì đúng

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. flow hoặc route mình đang hỏi bị chặn ở lớp nào
2. incident đó đáng nghi ở auth/org-context/admin gate, health protection, hay callback protection
3. cần đọc tiếp privacy detail hay route/config cụ thể nào

Nếu bạn đang cần map dữ liệu nhạy cảm hoặc exposure surface sâu hơn, đọc tiếp `./privacy-data-handling-context.md`.

Nguồn:

- `app/modules/audit/infra/repositories/audit_repository_provider.ts`
- `app/modules/audit/infra/repositories/postgres_audit_log_repository.ts`
- `app/modules/audit/infra/models/audit_log.ts`
- `app/modules/audit/domain/audit_event_scope.ts`
- `app/modules/audit/domain/audit_event_redaction.ts`
- `app/modules/audit/domain/audit_event_hash.ts`
- `database/migrations/20260719090000_add_enterprise_audit_events.ts`
- `schema/migration evidence`
- `database/schema.ts`

## Điều File Này Không Chứng Minh

File này không tự động chứng minh:

- repo đã qua pentest
- policy pháp lý/privacy policy đã đầy đủ
- toàn bộ mọi permission path đã được test end-to-end

File này chỉ ghi những gì current code/config/schema đang chứng minh được.

Nói ngắn:

- file này giúp bạn không nói quá tay về security
- nhưng cũng không được dùng nó để kết luận “hệ thống đã security-hardening đầy đủ”

## Khi Incident Security Xảy Ra

1. Xác định sự cố thuộc auth, org context, system admin, callback, hay data exposure.
2. Kiểm tra route file và middleware chain trước.
3. Kiểm tra tiếp config bảo vệ tương ứng: `shield`, `limiter`, config guard.
4. Nếu cần deeper proof, kiểm tra command/SQL permission layer và audit storage.

## What Not To Do

- Đừng nhìn `/api/v1/*` rồi mặc định flow auth ở đó chắc chắn là bearer-first hoặc bearer-only.
- Đừng thấy user có join request hay membership row rồi kết luận họ đã có org context hợp lệ; phải phân biệt `pending` với `approved`.
- Đừng nhìn route public callback rồi kết luận mutation đó “mở”; với AI callback, credential/freshness/authenticity mới là gate thật.
- Đừng dừng ở middleware khi điều tra access bug; resolver, command/query guard, và permission layer dưới nữa vẫn có thể là lớp chặn thật.
