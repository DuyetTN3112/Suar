# User Story, Use Case, Business Rule

| Field | Value |
|---|---|
| Status | Active |
| Audience | Product, developer, tester, reviewer, new joiner cần hiểu hành vi sản phẩm theo người dùng |
| Purpose | Chuyển requirement kỹ thuật thành câu chuyện người dùng, use case chính, và business rule đủ gần người để đọc nhanh |
| Source of Truth | route, model, command/query, diagram, config evidence hiện tại |
| Last Reviewed | 2026-07-10 |
| Review Cycle | Khi flow người dùng, role boundary, hoặc business constraints đổi |
| Owner | Product + engineering |
| Stale Risk | Cao |

## File Này Dùng Để Làm Gì

File này là cầu nối giữa:

- business intent
- user flow
- route/runtime behavior

Nếu SRS nói “hệ thống phải làm gì”, thì file này nói gần người hơn:

- ai đang cần gì
- flow chính họ đi qua là gì
- rule nào đang chặn hoặc định hình hành vi đó

Nếu bạn đang:

- mới vào dự án: đọc `User Stories` trước
- QA/tester: đọc `Use Cases Chính` rồi `Business Rules Reader Cần Nhớ`
- dev: đọc `Business Rules Reader Cần Nhớ` rồi mở tiếp evidence pointers khi cần

## Nếu Dùng File Này Để Viết Report Bên Ngoài Repo

Bạn có thể dùng file này để viết:

- phần user stories
- phần use case chính
- phần business rules ở mức gần người dùng

Đây là file phù hợp để trả lời:

- actor nào đang muốn gì
- flow điển hình của họ qua hệ thống ra sao
- rule nào làm cho behavior không đi thẳng như mô tả happy path

Bạn không nên dùng riêng file này để kết luận:

- exact API/data contract của từng bước
- mọi edge case kỹ thuật đã được mô tả đầy đủ
- mọi target flow tương lai đã là runtime hiện tại

Nếu cần các phần đó, đọc thêm:

- `./srs.md`
- `../01-business/feature-specification.md`
- `../05-api/api-landscape-and-governance.md`

Nhưng file này vẫn phải tự đủ để người đọc không có code hiểu:

- actor nào đang làm gì
- happy path thật hiện tại trông ra sao
- rule nào khiến flow không đi thẳng như mô tả đơn giản

## Safe External Summary

Nếu cần một câu tóm tắt an toàn cho report, có thể dùng:

`Ở mức người dùng, Suar kết nối các flow giao việc, gửi đề xuất tham gia task công khai, review/dispute, và profile evidence thành một chuỗi hành vi liên tục; business rules tồn tại để bảo vệ độ tin cậy của chuỗi này chứ không chỉ để chặn truy cập đơn thuần.`

## User Stories

Một cách đọc nhanh:

- stories cho biết người dùng đang cố làm gì
- use cases cho biết hệ thống xử lý ra sao
- business rules cho biết vì sao flow không phải lúc nào cũng đi thẳng

### Authentication And Onboarding

- Là một người dùng mới, tôi muốn đăng nhập bằng Google hoặc GitHub để không phải tạo mật khẩu riêng.
- Là một người dùng đã đăng nhập, tôi muốn hệ thống gắn đúng context organization hiện tại để có thể vào thẳng task, project, và review.

### Organization Membership

- Là một user, tôi muốn tìm organization và gửi join request để bắt đầu tham gia hệ sinh thái.
- Là organization owner/admin, tôi muốn duyệt join request hoặc quản lý invitation để kiểm soát membership.

### Project And Task Execution

- Là project owner hoặc manager, tôi muốn tạo project, thêm thành viên, và tạo task để phân phối công việc.
- Là assignee, tôi muốn nộp submission package gồm evidence, comments, attachments để chứng minh kết quả làm việc.

### Marketplace

- Là contributor bên ngoài hoặc người ngoài tổ chức, tôi muốn duyệt public tasks và gửi đề xuất tham gia task phù hợp.
- Là người đăng task, tôi muốn xem ranking và match score để chọn người tham gia phù hợp.

### Review And Reputation

- Là reviewee, tôi muốn review của mình có thể được confirm hoặc dispute nếu không chính xác.
- Là admin, tôi muốn có dispute detail, case files, AI evaluations, và flagged review surfaces để điều phối xử lý.

### Talent And Profile

- Là user, tôi muốn profile của mình phản ánh năng lực đã được xác thực chứ không chỉ tự khai báo.
- Là manager, tôi muốn bookmark talent và xem profile snapshot để đánh giá người phù hợp.

## Use Cases Chính

### UC-01 OAuth Sign-In

Primary actor:

- User

Main flow:

1. User gọi `/auth/:provider/redirect`.
2. Hệ thống áp login throttling.
3. Social provider redirect user.
4. Provider callback về `/auth/:provider/callback`.
5. Hệ thống xử lý callback và tạo session.

### UC-02 Create Organization And Establish Work Context

Primary actor:

- Authenticated user

Main flow:

1. User mở `/organizations/create`.
2. User submit `/organizations`.
3. Hệ thống tạo organization.
4. User switch sang organization mới để làm việc.

### UC-03 Create Project

Primary actor:

- Organization owner/admin theo policy hiện hành

Main flow:

1. User mở `/projects/create`.
2. User submit `/projects`.
3. Hệ thống tạo project trong organization hiện tại.
4. Project detail mở ở `/projects/:id`.

### UC-04 Create And Execute Task

Primary actor:

- Task creator
- Assignee

Main flow:

1. Creator mở `/tasks/create`.
2. Creator submit `/tasks`.
3. Assignee mở `/tasks/:id`.
4. Assignee ghi draft submission.
5. Assignee submit package.
6. Task status được cập nhật theo workflow.

### UC-05 Marketplace Apply And Triage

Primary actor:

- Applicant
- Task owner/manager

Main flow:

1. Applicant mở `/marketplace/tasks`.
2. Applicant apply qua web route hoặc API route.
3. Owner/manager mở application surface.
4. Owner/manager xem ranking và match score.
5. Owner/manager process application.

### UC-06 Review Completion And Dispute

Primary actor:

- Reviewer
- Reviewee
- Admin

Main flow:

1. Review session được mở cho completed work.
2. Task review workflow board theo dõi reviewer quorum, reviewee response, dispute/report, và `done`.
3. Reviewer submit review.
4. Reviewee accept, respond/dispute, hoặc report theo workflow state.
5. Admin xem dispute detail, case file, AI evaluation nếu vụ việc được escalation.
6. Admin resolve dispute.

Đây là use case rất quan trọng cho mental model của Suar. Nếu bỏ qua nó, người đọc rất dễ hiểu nhầm review chỉ là bước “chấm điểm cho xong”.

Nuance runtime cần nhớ:

- review session không chỉ xuất hiện sau khi task đã `DONE`
- current runtime ưu tiên mở session ngay khi assignee submit completion package hợp lệ
- done-path hiện là lớp backstop để không bỏ sót review session nếu flow completion đi qua nhánh khác
- sprint-close flow hiện tạo sprint review packages và sprint reverse review board, thay cho task-level reverse review create-flow mới

## Business Rules Reader Cần Nhớ

Nếu chỉ cần nhớ vài rule dễ gây hiểu nhầm nhất, ưu tiên ba rule này:

1. `BR-02 Organization Context Rule`
2. `BR-03 Project Scope Rule`
3. `BR-04 Task Workflow Rule`

### BR-01 Authentication Rule

- Luồng login runtime hiện tại là OAuth Google/GitHub.
- Chưa có bằng chứng mạnh cho email/password flow độc lập.

### BR-02 Organization Context Rule

- Phần lớn workspace routes quan trọng yêu cầu auth + current organization context.

Nhưng context này không chỉ được đọc thụ động từ session.

Current runtime còn có organization resolver:

- tự sync `current_organization_id` giữa session và DB
- tự fallback sang approved membership đầu tiên nếu user chưa có org context
- tự clear org invalid rồi thử chọn org hợp lệ khác

Điều này ảnh hưởng trực tiếp tới:

- incident kiểu “tự nhiên đổi org”
- case login ổn nhưng data org-scoped rỗng hoặc lệch
- report mô tả context switching và access boundary

Các domain chịu ảnh hưởng trực tiếp:

- task
- project
- review
- nhiều user workspace surfaces

### BR-03 Project Scope Rule

- Product flow đang xử lý task như project-scoped.
- Nhưng snapshot SQL vẫn cho thấy `tasks.project_id` còn nullable.

Điều này có nghĩa:

- product intent và DB compatibility vẫn đang cùng tồn tại

### BR-04 Task Workflow Rule

- `task_status_id` là workflow truth mới.
- `status` giữ vai trò compatibility.

### BR-05 Marketplace Visibility Rule

- marketplace behavior dựa trên `task_visibility`
- application có các status `pending`, `approved`, `rejected`, `withdrawn`
- application source gồm `public_listing`, `invitation`, `referral`

### BR-06 Review Session Rule

- review session có lifecycle rõ
- có deadline
- có thể đi tới `disputed`, không chỉ `completed`
- reviewer assignments ban đầu không được seed ngẫu nhiên
- creator reviewer, manager quota, và peer quota hiện được điều phối theo governance rules

Điều này có nghĩa:

- review không phải comment tự do đơn lẻ
- reviewer list “khác trực giác” nhiều khi là hành vi đúng theo seed rules, không phải bug UI

### BR-07 Snapshot Sharing Rule

- profile snapshot có `is_current`
- có `is_public`
- có `shareable_slug`
- có `shareable_token`

### BR-08 Runtime Storage Rule

- audit, notification, user activity runtime hiện đang neo ở PostgreSQL
- docs không nên nói theo hướng hệ thống đang dùng storage khác nếu repo không chứng minh

## Evidence Pointers

- `start/routes/auth.ts`
- `start/routes/organizations.ts`
- `start/routes/organizations_current.ts`
- `start/routes/projects.ts`
- `start/routes/tasks.ts`
- `start/routes/reviews.ts`
- `start/routes/users.ts`
- `app/modules/tasks/infra/models/task.ts`
- `app/modules/tasks/infra/models/task_application.ts`
- `app/modules/reviews/infra/models/review_session.ts`
- `app/modules/users/infra/models/user_profile_snapshot.ts`
- `docs/11-diagrams/Sequence/seq_03_marketplace_apply.mmd`

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. actor của concern mình đang hỏi là ai
2. flow chính của actor đó đi qua use case nào
3. rule nào đang chặn hoặc bẻ nhánh hành vi và lúc nào cần sang SRS, API, hay feature spec để đọc sâu hơn
