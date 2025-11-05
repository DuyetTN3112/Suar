# Project Plan, Roadmap Signals, Meeting-Minutes Status, Risk, And Change Context

| Field | Value |
|---|---|
| Status | Active |
| Audience | Lead, manager, reviewer, maintainer, cross-role reader cần hiểu hệ thống đang ở đâu về mặt delivery/governance |
| Purpose | Nói rõ hệ thống hiện có những dấu vết quản trị nào là thật và những artifact PM truyền thống nào vẫn chưa có nguồn độc lập trong bộ tài liệu |
| Source of Truth | repository structure, tests, capability docs hiện hành, config/schema/runtime evidence hiện tại |
| Last Reviewed | 2026-07-10 |
| Review Cycle | Khi roadmap signal, major capability, runtime support, hoặc risk surface đổi |
| Owner | Engineering |
| Stale Risk | Cao |

## File Này Dùng Để Làm Gì

File này không phải project charter hoàn chỉnh.

Nó giúp người đọc trả lời nhanh:

- hệ thống hiện cho thấy dự án đang đi theo hướng nào
- có artifact quản trị dự án gốc hay mới chỉ có technical signals
- risk nào là risk thật có thể chứng minh từ code/config/schema

Nếu bạn chỉ cần dùng nhanh:

- muốn biết hệ thống đang đi theo hướng nào: đọc `Hệ Thống Đang Tự Kể Câu Chuyện Gì`
- muốn biết roadmap signal có thật tới đâu: đọc `Roadmap Signals Có Thật`
- muốn biết risk surface chính: đọc `Risk Surfaces Đã Có Bằng Chứng`

## Điều Quan Trọng Phải Nói Rõ

Bộ tài liệu hiện chưa chứa trọn bộ artifact quản trị truyền thống kiểu:

- charter
- roadmap board độc lập
- release plan độc lập
- meeting minutes chuẩn PM

Vì vậy file này chỉ được phép nói:

- dấu vết kế hoạch có thật trong hệ thống
- tín hiệu tiến hóa có thể kiểm chứng
- risk surface có bằng chứng thật

Không được biến technical signals thành lịch roadmap tưởng tượng.

## Hệ Thống Đang Tự Kể Câu Chuyện Gì

Nếu đọc hệ thống như một nguồn sự thật, nó đang kể câu chuyện này:

1. Hệ thống không còn là task CRUD đơn thuần.
2. Nó đã mở rộng sang marketplace, review governance, dispute, profile intelligence, trust/performance.
3. Nó đang tiến dần về một competency-evidence platform chứ không chỉ là board quản lý công việc.

Đây không phải suy đoán vô căn cứ. Nó bám vào:

- module structure
- route surface
- test coverage
- capability docs hiện hành
- data model

Một câu nhớ ngắn:

`Hệ thống này đang kể câu chuyện đi từ work management sang competency-evidence platform.`

## Project Plan Signals Có Thật

### 1. Work breakdown đã hiện ra trong hệ thống

Backend/domain breakdown hiện có:

- `auth`
- `organizations`
- `projects`
- `tasks`
- `reviews`
- `users`
- `notifications`
- `audit`
- `user_activity`
- `admin`
- `settings`

Frontend/workspace breakdown hiện có:

- root user workspace
- `/org/*` organization admin shell
- `/admin/*` system admin shell

Verification breakdown hiện có:

- backend module tests: `app/modules/*/tests/backend/{unit,integration,contract,architecture}`
- frontend component/shared/storybook tests: `inertia/apps/{user,org,admin}/tests/{modules,shared,storybook}`
- frontend browser journeys: `inertia/apps/{user,org,admin}/tests/e2e`
- root support tests/helpers: `tests/helpers`, `tests/frontend`, `tests/shared`
- runnable inventory docs: `docs/test/generated/runnable_inventory.md`, `docs/test/generated/module_suite_matrix.md`

Ý nghĩa:

- dù không có WBS theo mẫu PM truyền thống, hệ thống đã tự lộ khá rõ cách dự án được chia thành domain, shell, và verification lanes

Điểm hữu ích cho manager/lead:

- dù thiếu paperwork chuẩn, vẫn có thể nhìn hệ thống để thấy delivery structure đang tồn tại thật

### 2. Product direction signal từ capability docs hiện hành

`docs/01-business/capability-model-and-product-positioning.md` cho thấy dự án đang được nghĩ theo sáu lớp:

1. Competency Framework Layer
2. Work Evidence Layer
3. Assessment Layer
4. Governance Layer
5. Profile Intelligence Layer
6. Matching and Recommendation Layer

Điều này phản chiếu khá sát với runtime hiện tại:

- task/project/submission tương ứng work evidence
- review/reverse review/dispute tương ứng assessment + governance
- profile snapshot/trust/performance tương ứng profile intelligence
- marketplace ranking/talent sourcing tương ứng matching and recommendation

### 3. Execution assets có thật

Hệ thống hiện có các asset giúp hiểu cách delivery đã diễn ra:

- GitNexus metadata trong `.gitnexus/meta.json`
- full diagram corpus trong `docs/11-diagrams/`
- runtime surfaces trong `app/modules/*`, `start/routes/*`, `inertia/apps/{user,org,admin}/*`
- test command matrix trong `package.json`
- capability docs trong `docs/01-business/`
- DB snapshot trong `schema/migration evidence`

## Roadmap Signals Có Thật

### Time markers đã thấy

- business docs review date: `2026-07-09`
- GitNexus index timestamp: `2026-06-25T11:22:20.394Z`
- subscription package migration date: `2026-06-23`
- competency evidence migration date: `2026-06-24`
- docs verification boundary đã ghi trong docs portal
- diagram header refresh target: `2026-06-26`

### Hướng tiến hóa đọc ra từ hệ thống

Technical signals hiện cho thấy dự án đã đi theo chuỗi sau:

- task/project CRUD cơ bản
- marketplace và applicant ranking
- review governance, reverse review, dispute, AI callback
- verified profile snapshot, trust metrics, talent discovery
- admin dashboards, notifications, settings, monitoring support

Điều này là kết luận từ artifact đã có, không phải roadmap dự báo tương lai.

Vì vậy file này nên được đọc như:

- `what the system has already become`

không phải:

- `what the team has officially promised next`

### Điều Chưa Có

Chưa thấy file roadmap độc lập đúng nghĩa dưới các tên như:

- `roadmap`
- `timeline`
- `milestone`
- `release-plan`

Vì vậy phần này chỉ nên hiểu là roadmap signals, không phải roadmap board chính thức.

## Meeting-Minutes Status

Kết quả rà soát bộ tài liệu và code hiện hành:

- chưa thấy artifact meeting minutes riêng đủ mạnh để coi là source of truth

Vì vậy file này không:

- bịa attendees
- bịa quyết định cuộc họp
- bịa timestamp họp

Nó chỉ ghi rõ hiện trạng thiếu artifact đó.

## Risk Surfaces Đã Có Bằng Chứng

### 1. Social Auth Dependency

Risk:

- Google/GitHub OAuth gặp sự cố hoặc config lệch sẽ ảnh hưởng onboarding/sign-in trực tiếp

Nguồn:

- `start/routes/auth.ts`
- `config/auth.ts`
- `app/modules/auth/infra/models/user_oauth_provider.ts`
- `schema/migration evidence`

### 2. Workflow Migration Drift

Risk:

- `task_status_id` là runtime truth mới nhưng `status` cũ vẫn còn cho compatibility
- nếu query/logic đọc lệch giữa hai lớp này, hành vi workflow có thể sai

Nguồn:

- `app/modules/tasks/infra/models/task.ts`
- `app/modules/tasks/constants/task_constants.ts`
- `schema/migration evidence`

### 3. Public Callback Surface

Risk:

- AI dispute callback là public integration surface
- nếu credential/signature/timestamp/replay handling có vấn đề, dispute automation sẽ bị ảnh hưởng

Nguồn:

- `start/routes/reviews.ts`
- `config/shield.ts`
- `app/modules/reviews/actions/commands/process_ai_dispute_callback_command.ts`

### 4. Realtime Inactive Expectation Gap

Risk:

- `config/transmit.ts` đang để `transport: null`
- stakeholder có thể kỳ vọng realtime trong khi runtime hiện tại chưa xác nhận điều đó

Nguồn:

- `config/transmit.ts`
- `docs/11-diagrams/Architecture/arch_02b_runtime_support.mmd`

### 5. Health Endpoint Credential Provisioning

Risk:

- `/health` phụ thuộc `health-check credential`
- nếu provisioning lệch giữa môi trường, monitoring ngoài hệ thống có thể mất visibility

Nguồn:

- `start/routes/index.ts`
- `start/env.ts`
- `app/modules/http/middleware/api_key_middleware.ts`

### 6. Database Permission Logic Drift

Risk:

- permission logic còn neo một phần ở DB/runtime functions
- nếu app constants và DB function lệch nhau, access behavior có thể sai

Nguồn:

- `schema/migration evidence`

### 7. Observability Data Growth

Risk:

- `audit_events`, `error_events`, `notifications` là dòng dữ liệu tăng trưởng liên tục
- nếu retention/query/index strategy không theo kịp, load vận hành có thể tăng

Nguồn:

- `schema/migration evidence`
- `app/modules/audit/infra/repositories/audit_repository_provider.ts`
- `app/modules/notifications/infra/repositories/notification_repository_provider.ts`
- `app/modules/user_activity/infra/repositories/user_activity_repository_provider.ts`

### 8. Capability-Model Misinterpretation

Risk:

- stakeholder có thể hiểu nhầm profile score như chứng chỉ tuyệt đối
- trong khi capability docs hiện hành nhấn mạnh đây là evidence-supported conclusion, không phải truth tuyệt đối

Nguồn:

- `docs/01-business/capability-model-and-product-positioning.md`

## Change Context

Hệ thống hiện cho thấy thay đổi đang diễn ra qua:

- migrations
- route evolution
- test expansion
- docs refactor
- handoff/plan/spec audit trails trong `docs/handovers` và `docs/superpowers`

Điều này hữu ích để hiểu change pressure, nhưng không thay cho change-request system độc lập.

Nếu cần change register cụ thể, đọc thêm:

- `docs/10-project-management/change-request-register.md`

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. delivery/governance signal chính của hệ thống đang là gì
2. concern của mình nghiêng về roadmap, risk surface, hay change context
3. có cần sang risk log, governance pack, hay evidence docs để đọc sâu hơn hay không
