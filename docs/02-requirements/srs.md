# Software Requirements Specification

| Field | Value |
|---|---|
| Status | Active |
| Audience | Product, developer, tester, reviewer, maintainer |
| Purpose | Ghi lại requirement mức hệ thống theo cách đủ chặt cho traceability nhưng vẫn dễ quét và dễ hiểu |
| Source of Truth | route, config, model, command/query, runtime boundary evidence hiện tại |
| Last Reviewed | 2026-07-10 |
| Review Cycle | Khi route surface, non-functional guardrail, hoặc architecture/runtime boundary đổi |
| Owner | Product + engineering |
| Stale Risk | Cao |

## File Này Dùng Để Làm Gì

File này trả lời câu hỏi:

- hệ thống hiện bắt buộc phải làm được gì
- những non-functional guardrail nào đang là thật
- ràng buộc kỹ thuật nào người đọc phải nhớ trước khi sửa hệ thống

Nếu bạn thấy feature-specification nói “sản phẩm có gì”, thì file này nói:

- hệ thống bắt buộc phải support gì
- boundary nào không được giả vờ là đã có khi repo chưa chứng minh

## Nếu Bạn Chỉ Có 5 Phút

Chỉ cần nhớ bốn ý:

1. File này nói về requirement hệ thống bắt buộc phải có, không phải wishlist.
2. `FR-TASK`, `FR-REVIEW`, `FR-USER-PROFILE`, và `NFR-Availability And Operations` là các cụm nên đọc trước nếu muốn hiểu lõi Suar.
3. Các constraint như `task_status_id` truth, realtime chưa active, và search là production dependency riêng rất dễ làm người đọc hoặc người sửa code hiểu sai.
4. Nếu một claim không có boundary rõ trong file này, chưa nên dùng nó như technical commitment cứng.

## Nếu Dùng File Này Để Viết Report Bên Ngoài Repo

Bạn có thể dùng file này để viết:

- chương yêu cầu hệ thống
- phần functional requirements
- phần non-functional requirements
- phần technical constraints và guardrails

Đây là file phù hợp để trả lời:

- hệ thống bắt buộc phải làm được gì
- những ràng buộc kỹ thuật nào đang là thật
- những boundary nào chưa được quyền khẳng định quá tay

Bạn không nên dùng riêng file này để kết luận:

- chi tiết UI/UX behavior của từng màn
- mọi route contract chi tiết đến từng field
- mức độ hoàn thiện tuyệt đối của từng workstream

Nếu cần các phần đó, đọc thêm:

- `../01-business/feature-specification.md`
- `../05-api/api-landscape-and-governance.md`
- `../08-testing/test-case-matrix.md`
- `../12-evidence/workstream-status-audit.md`

Nhưng file này vẫn phải tự đủ để người đọc trả lời:

- requirement hệ thống nào đang là current truth
- guardrail kỹ thuật nào không được quên khi debug hoặc mô tả hệ thống
- chỗ nào repo mới chứng minh được đến mức compatibility chứ chưa nên kể như fully-active capability

## What Not To Do

- không dùng file này để kể chi tiết UI/UX hoặc field-level API contract
- không viết requirement mạnh hơn evidence mà file này đang cho phép
- không quên các constraint đã nêu rồi đi debug hoặc mô tả hệ thống như một task-only app đơn giản

## Safe External Summary

Nếu cần một câu tóm tắt an toàn cho report, có thể dùng:

`Ở mức requirement hệ thống, Suar không chỉ phải hỗ trợ quản lý công việc mà còn phải hỗ trợ marketplace, review/dispute governance, profile evidence, và các guardrail vận hành đi kèm cho một nền tảng dựa trên bằng chứng công việc thực.`

## 1. System Context

Suar hiện là:

- hệ thống quản lý task
- marketplace cho task công khai và application flow
- review 360 độ
- hồ sơ năng lực có xác thực

Runtime hiện tại:

- client: browser + Svelte + Inertia
- server: AdonisJS modular monolith
- data: PostgreSQL + Redis

Điểm reader nên nhớ:

- đây không còn là một ứng dụng task-only đơn giản
- nhiều requirement ở dưới tồn tại vì hệ thống đã đi sang review, trust, marketplace, profile intelligence

Một câu tóm tắt dễ nhớ:

`Suar vừa là work system, vừa là evidence system.`

## 2. Functional Requirements

### FR-AUTH

Hệ thống phải:

- hỗ trợ social authentication qua Google và GitHub
- hỗ trợ session-based authentication qua guard `web`
- hỗ trợ logout qua `POST /logout` và `GET /logout`
- áp login rate limiting cho redirect và callback OAuth

### FR-ORG

Hệ thống phải:

- cho phép user xem organization surface liên quan
- cho phép tạo organization mới
- cho phép join organization qua `GET/POST /organizations/:id/join`
- cho phép switch current organization
- giữ tách biệt discovery surface `/organizations` với org-admin surface `/org/*`

### FR-PROJECT

Hệ thống phải:

- cho phép list, create, show, delete project trong organization context hiện tại
- cho phép add/update/remove project member
- có project detail surface ở cả user shell và org shell
- hỗ trợ `allow_external_contributors`

### FR-TASK

Hệ thống phải:

- cho phép list, create, show, edit, delete task
- cho phép cập nhật task status, time, sort order, batch status
- hỗ trợ board view, grouped view, timeline view
- lưu submission package gồm draft, submit, lock, evidence, comments, attachments
- hỗ trợ required skill và versioned requirement

Caveat reader nên nhớ:

- create-task flow hiện yêu cầu `project_id`
- nhưng SQL snapshot vẫn để cột này nullable

Điều này có nghĩa:

- behavior hiện hành và DB shape lịch sử chưa hoàn toàn trùng nhau
- khi sửa task flow, phải kiểm tra cả route/controller lẫn data assumptions

### FR-MARKETPLACE

Hệ thống phải:

- cho phép list public task
- cho phép authenticated user apply vào task public
- cho phép owner/manager xem applications, match score, ranking
- cho phép applicant withdraw application
- cho phép user xem own applications

### FR-REVIEW

Hệ thống phải:

- có khả năng tạo review session sau khi assignment hoàn thành
- có task review workflow board tách review debt khỏi task delivery status
- cho phép submit skill review
- cho phép reviewee confirm hoặc dispute review
- cho phép reviewee accept/respond/report trong task review workflow khi đủ điều kiện
- duy trì reverse-review reading surfaces cho dữ liệu hiện có
- có sprint review packages khi project sprint mở review
- có sprint-close reverse review board cho người giao task và môi trường
- cho phép attach review evidence và self-assessment
- có admin dispute handling và flagged-review handling
- có callback endpoint cho AI dispute evaluation

Đây là requirement family rất dễ bị đọc thiếu. Review trong Suar không chỉ là chấm điểm; nó gắn trực tiếp với dispute, profile, trust, và governance.

Code audit nuance rất quan trọng:

- review session hiện có hai đường sinh runtime:
  - đường ưu tiên khi assignee submit completion package và task được đưa sang `in_review`
  - đường backstop sau khi task thật sự đi vào category `done`
- task-level reverse review create-flow hiện không nên bị kể như capability active đầy đủ; current runtime chỉ giữ reading surfaces và chặn create path theo product direction mới
- sprint-close reverse review hiện là flow thay thế đang có route/domain/migration evidence
- workflow rule mới chủ yếu nằm ở application command/query layer; docs không nên claim DB constraint là rule source cuối

### FR-USER-PROFILE

Hệ thống phải:

- cho phép xem và sửa hồ sơ cá nhân
- hỗ trợ skill CRUD trên profile
- hỗ trợ publish/current/history/access/rotate link cho profile snapshot
- có public snapshot route không cần auth
- hỗ trợ talent directory và talent bookmarks CRUD

### FR-NOTIFICATION-AUDIT-ACTIVITY

Hệ thống phải:

- có notification listing, mark-read, delete behavior
- ghi audit events và error events
- ghi user activity events

## 3. Non-Functional Requirements

### NFR-Security

Hệ thống phải:

- bật CSP
- bật CSRF trừ explicit callback/test routes được carve-out rõ
- dùng frame protection deny
- bật HSTS

### NFR-Availability And Operations

Hệ thống phải:

- có health checks cho disk, heap, RSS, DB, Redis, application, search
- bảo vệ `/health` bằng credential middleware

### NFR-Rate Limiting

Hệ thống hiện có:

- global throttle `120 req/min`
- API throttle `60 req/min`
- login throttle production `30 req/min`

### NFR-Data

Hệ thống hiện dùng:

- PostgreSQL làm primary relational store
- Redis với ít nhất hai logical connections
- Redis làm session backend mặc định
- search runtime có thể được bật/tắt theo config và cần được đọc như dependency production riêng khi flow liên quan talent/search bị lỗi

## 4. Interface Requirements

### External Interfaces

Các interface ngoài hệ thống đã thấy rõ:

- OAuth provider: Google, GitHub
- browser client
- public AI dispute callback API

### Internal Interfaces

Các interface nội bộ reader nên nhớ:

- cross-module access qua `app/modules/*/actions/public_api.ts`
- task module bootstrap dựa trên `Monolith*` adapter pattern cho org/project/user/review/skill/permission readers

## 5. Constraints

Các constraint reader rất nên nhớ trước khi suy luận quá tay:

- `config/transmit.ts` đang để `transport: null`, nên realtime transport chưa active
- `task_status_id` là truth mới, `status` còn cho compatibility
- create-task flow yêu cầu `project_id`, nhưng SQL snapshot vẫn cho phép nullable

Nếu quên ba constraint này, người đọc rất dễ viết docs sai hoặc debug sai hướng.

## 6. Requirements Without Verified Artifact

Những phần sau thường xuất hiện trong SRS đầy đủ nhưng bộ tài liệu hiện chưa có artifact độc lập đủ mạnh:

- formal acceptance baseline theo release
- separate SLA/SLO document
- separate legal compliance appendix

File này giữ nguyên ranh giới đó, không tự bù bằng nội dung giả định.

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã trả lời được:

1. hệ thống bắt buộc phải support behavior nào
2. guardrail kỹ thuật nào đang là thật trong runtime hiện tại
3. boundary nào chưa được hệ thống chứng minh đủ để viết thành fact

Nếu bạn cần nhìn hành vi theo người dùng thay vì theo requirement family, đọc tiếp `./user-story-use-case-business-rule.md`.
