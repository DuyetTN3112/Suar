# Architecture Diagram Catalog

| Field | Value |
|---|---|
| Status | Active |
| Audience | Reader cần chọn đúng diagram nhanh: manager, developer, tester, DevOps, reviewer |
| Purpose | Chỉ người đọc tới đúng diagram theo đúng câu hỏi, thay vì bắt họ mở cả thư mục rồi tự đoán |
| Source of Truth | `docs/11-diagrams/**/*.mmd`, verified routes, models, runtime docs |
| Last Reviewed | 2026-07-10 |
| Review Cycle | Khi thêm diagram mới, đổi scope diagram cũ, hoặc capability map thay đổi |
| Owner | Engineering |
| Stale Risk | Cao |

## Why This Catalog Exists

Diagram tốt phải làm người đọc hiểu nhanh hơn. Diagram tệ làm người đọc tốn thêm thời gian.

Catalog này tồn tại để trả lời ba câu hỏi:

1. Tôi nên mở diagram nào trước?
2. Diagram đó trả lời câu hỏi gì?
3. Tôi có đang đọc nhầm level chi tiết không?

Catalog này không có mục tiêu bắt người đọc xem hết tất cả diagram. Nó tồn tại để người đọc mở ít file hơn nhưng hiểu đúng hơn.

File này cũng phải tự đủ để người đọc trả lời:

- nên mở diagram level nào trước
- family nào thường là overview, family nào thường là detail
- khi nào phải dừng ở level cao thay vì đào sâu tiếp

## Nếu Dùng Catalog Này Để Viết Report Bên Ngoài Repo

Catalog này đặc biệt hữu ích khi bạn cần:

- chọn đúng diagram cho chương kiến trúc hệ thống
- chọn đúng diagram cho chương workflow nghiệp vụ
- chọn đúng diagram cho chương database hoặc data flow
- tránh đưa diagram quá chi tiết vào phần mở đầu của report

Nguyên tắc dùng an toàn:

- chương tổng quan hệ thống: dùng `Architecture/*` và `Package/*`
- chương capability hoặc nghiệp vụ: dùng `Action/*_overview.mmd` trước
- chương flow chi tiết: dùng `Sequence/*` hoặc detail action diagrams đúng concern
- chương dữ liệu: dùng `ERD/*` đúng domain slice, không lấy một ERD để thay cho toàn bộ hệ thống

Nếu một diagram cần nhiều câu giải thích mới hiểu được nó đang ở level nào, đừng đưa ngay diagram đó vào report. Hãy lùi về level cao hơn trước.

## Nếu Chưa Biết Mở Gì

Đừng bắt đầu bằng class diagram, sequence detail, hay ERD.

Bắt đầu bằng:

1. `docs/11-diagrams/Architecture/arch_01_system.mmd`
2. `docs/11-diagrams/Architecture/arch_02_layer.mmd`
3. `docs/11-diagrams/Package/pkg_01_overview.mmd`

Sau đó mới chọn domain:

- task
- marketplace
- review
- organization/project
- profile/talent
- admin/platform support

Nếu vẫn chưa chắc, dùng rule này:

- chưa biết đang hỏi `hệ thống nào` hay `flow nào` -> mở level 1
- biết domain nhưng chưa biết concern cụ thể -> mở level 2
- chỉ khi đã biết đúng flow/state/data slice cần điều tra -> mới xuống level 3

## Fast Start Packs

### Pack A: Manager / hội đồng / external reader

Chỉ cần:

1. `docs/11-diagrams/Architecture/arch_01_system.mmd`
2. `docs/11-diagrams/Architecture/arch_02_layer.mmd`
3. `docs/11-diagrams/Package/pkg_01_overview.mmd`
4. một action overview đúng domain

Đây là pack an toàn nhất để:

- trình bày tổng quan
- mở đầu chapter architecture
- giải thích hệ thống mà không làm người nghe ngợp

### Pack B: Developer / tester

Đi theo:

1. package overview
2. action overview domain
3. sequence hoặc state đúng concern
4. ERD đúng slice nếu có data issue

### Pack C: DevOps / on-call

Đi theo:

1. `Architecture/arch_02a_request_flow.mmd`
2. `Architecture/arch_02b_runtime_support.mmd`
3. action overview đúng domain lỗi
4. sequence detail đúng scenario nghi lỗi

### Pack D: Thesis / report writer

Đi theo:

1. architecture overview
2. package overview
3. action overview theo từng chapter nghiệp vụ
4. ERD đúng slice dữ liệu của chapter đó

Không nên:

- lấy class diagram để mở đầu chương kiến trúc
- lấy một sequence detail để thay cho toàn bộ story nghiệp vụ
- lấy một ERD slice để giả làm toàn bộ enterprise data model

## Read Diagrams By Level

### Level 1: System And Architecture Overview

Đọc khi bạn cần:

- bức tranh hệ thống
- boundary với external systems
- runtime core
- layer lớn của application

File chính:

- `docs/11-diagrams/Architecture/arch_01_system.mmd`
- `docs/11-diagrams/Architecture/arch_02_layer.mmd`
- `docs/11-diagrams/Architecture/arch_02a_request_flow.mmd`
- `docs/11-diagrams/Architecture/arch_02b_runtime_support.mmd`

### Level 2: Module And Capability Overview

Đọc khi bạn cần:

- module nào tồn tại
- capability group nào chịu trách nhiệm concern nào
- business slice nào liên quan đến vấn đề đang hỏi

File chính:

- `docs/11-diagrams/Package/pkg_01_overview.mmd`
- `docs/11-diagrams/Package/pkg_02_application_layer.mmd`
- `docs/11-diagrams/Package/pkg_02_presentation.mmd`
- `docs/11-diagrams/Action/act_01_task_management_overview.mmd`
- `docs/11-diagrams/Action/act_02_marketplace_overview.mmd`
- `docs/11-diagrams/Action/act_03_review_overview.mmd`
- `docs/11-diagrams/Action/act_05_org_management.mmd`
- `docs/11-diagrams/Action/act_06_user_lifecycle_overview.mmd`
- `docs/11-diagrams/Action/act_07_profile_skills_overview.mmd`
- `docs/11-diagrams/Action/act_08_platform_support_overview.mmd`

### Level 3: Focused Detail

Đọc khi bạn đã biết mình đang điều tra concern nào và cần chi tiết thao tác, trạng thái, hoặc dữ liệu.

Nhóm này bao gồm:

- detail action diagrams
- sequence diagrams
- state diagrams
- DFD detail diagrams
- ERD domain slice diagrams
- class or communication diagrams khi thật sự cần

Warning thực dụng:

- `Class/*` và `Communication/*` gần như luôn là level 3
- đa số người đọc ngoài team không cần mở chúng ở vòng đầu
- nếu report hoặc handover mở đầu bằng hai họ diagram này, rất dễ làm người đọc bị quá tải

Rule thực dụng:

- nếu bạn chưa nói được mình đang điều tra flow nào, chưa nên mở level 3
- nếu một detail diagram không còn đọc được trong một khung nhìn, xem đó là bug của diagram chứ không phải lỗi của người đọc

### Level Và Family Không Trùng Nhau 100%

Đây là chỗ người đọc rất hay hiểu sai:

- `family` là loại hình: Architecture, Action, Sequence, ERD, State...
- `level` là độ cao/thấp của mục tiêu giải thích

Vì vậy:

- `Action/act_03_review_overview.mmd` là level cao hơn `Action/act_03d_review_dispute_lifecycle.mmd`
- `Architecture/arch_02a_request_flow.mmd` vẫn là overview kỹ thuật, chưa phải deep detail tận repository/query
- `ERD/*` trong repo hiện tại thường nên đọc như focused data slice, không phải overview toàn enterprise

Nếu người đọc nhầm `family` thành `level`, họ sẽ rất dễ chọn sai hình cho report hoặc incident.

## Diagram Families And Their Jobs

### Architecture

Dùng để hiểu:

- client/server/data/external boundaries
- layer chính
- request path
- runtime support surfaces

### Package

Dùng để hiểu:

- module landscape
- presentation/application/domain/infra split
- cross-cutting concerns
- boundary tổ chức mã nguồn

### Action

Dùng để hiểu:

- capability ở ngôn ngữ business
- overview flow của từng business slice
- nhánh detail theo một concern rõ

### Sequence

Dùng để hiểu:

- ai gọi ai trước
- request tương tác ra sao theo thời gian
- alternate branch trong một scenario

### State

Dùng để hiểu:

- trạng thái
- transition
- guard
- event

### ERD

Dùng để hiểu:

- bảng nào tồn tại
- cột nào quan trọng
- domain slice nào đang được lưu trữ

Nên đọc theo ba mức:

- conceptual nếu chỉ cần mental model domain
- logical nếu cần hiểu cấu trúc và quan hệ chính
- physical nếu đang debug schema, query, mapping, hoặc data issue

Code/docs reality note:

- corpus hiện tại thiên về logical-to-physical slice hơn là conceptual ERD toàn domain
- vì vậy khi cần nói chuyện với manager hoặc external reader, đừng mở ERD làm hình đầu tiên

### DFD

Dùng để hiểu:

- external entity
- process
- data store
- data flow

### Use Case And Communication

Dùng để hiểu:

- actor và goal
- message exchange ở mức khái niệm

## Fast Mapping From Question To Diagram

| Your Question | Read First |
|---|---|
| Hệ thống này gồm những khối nào | `Architecture/arch_01_system.mmd` |
| Request đi qua các layer nào | `Architecture/arch_02a_request_flow.mmd` |
| Module nào chịu trách nhiệm chính | `Package/pkg_01_overview.mmd` |
| OAuth login/onboarding chạy ra sao | `Sequence/seq_01_auth.mmd` |
| Social login resolve linked-user / existing-email / new-user ra sao | `Action/act_06c_social_login_account_resolution.mmd` |
| Dev/test token-session bridge chạy ra sao | `Sequence/seq_01b_testing_auth_context_bridge.mmd` |
| Review session được mở từ task delivery path như thế nào | `Action/act_03a_review_submit.mmd` |
| Logout/session teardown chạy ra sao | `Action/act_06b_logout_session_teardown.mmd` |
| Task management hoạt động tổng thể ra sao | `Action/act_01_task_management_overview.mmd` |
| Marketplace apply flow thế nào | `Action/act_02b_marketplace_apply.mmd` hoặc `Sequence/seq_03_marketplace_apply.mmd` |
| Review dispute chạy qua đâu | `Action/act_03_review_overview.mmd` rồi tới review detail diagrams |
| Dữ liệu task và marketplace nằm đâu | `ERD/logical_erd_03_task_marketplace.mmd` |
| State machine task hoặc review | `State/state_01_task.mmd` hoặc `State/state_02_review_session.mmd` |
| Tôi chỉ có 1 hình để giải thích hệ thống cho người ngoài | `Architecture/arch_01_system.mmd` |
| Tôi cần 1 hình để giải thích codebase chia module ra sao | `Package/pkg_01_overview.mmd` |
| Tôi cần 1 hình để giải thích workflow nghiệp vụ của một domain | action overview của domain đó |

Rule đọc an toàn:

- nếu câu hỏi của bạn có dính actor boundary hoặc quyền truy cập, đừng chỉ dựa vào tên diagram hoặc prefix route trong hình
- hãy đọc thêm caveat runtime trong diagram/file guide liên quan trước khi kết luận

## Fast Mapping From Report Chapter To Diagram

| Report Need | Read First |
|---|---|
| Chương kiến trúc tổng quan | `Architecture/arch_01_system.mmd` |
| Chương layer xử lý request | `Architecture/arch_02_layer.mmd` và `Architecture/arch_02a_request_flow.mmd` |
| Chương capability/module landscape | `Package/pkg_01_overview.mmd` |
| Chương task workflow | `Action/act_01_task_management_overview.mmd` rồi tới task detail diagrams |
| Chương marketplace và matching | `Action/act_02_marketplace_overview.mmd` rồi tới apply/ranking detail |
| Chương review/dispute/governance | `Action/act_03_review_overview.mmd` rồi tới dispute detail |
| Chương organization/project workspace | `Action/act_05_org_management.mmd` rồi tới membership/project sequences |
| Chương profile/talent | `Action/act_07_profile_skills_overview.mmd` |
| Chương database theo domain | `ERD/logical_erd_01_*`, `logical_erd_02_*`, `logical_erd_03_*`, `logical_erd_04_*` đúng slice |

Rule thêm cho report:

- mỗi chapter nên có tối đa một diagram level cao mở đầu
- diagram level thấp chỉ nên đi sau khi chapter đã giải thích đủ context
- nếu một hình cần giải thích quá dài trong caption, thường là bạn đang chọn sai level
- riêng chapter organization/project workspace, đừng kể `/org/tasks` như org-wide board tuyệt đối nếu chưa nói rõ current runtime còn có project-context filter qua `current_project_id`
- nếu một chapter cần hơn `3` diagram chỉ để người đọc hiểu khung chính, thường bạn đang nhét quá nhiều concern vào cùng chapter hoặc đang chọn sai level

## Read By Role

### Manager

Ưu tiên:

- architecture
- package overview
- action overview

Không cần đi thẳng vào state/class/ERD trừ khi đang bàn đúng risk kỹ thuật cụ thể.

### Developer

Ưu tiên:

- package overview
- action overview của domain
- sequence/state/ERD detail theo flow đang sửa

### QA

Ưu tiên:

- action overview để hiểu flow nghiệp vụ
- sequence để hiểu request/response/step order
- state để hiểu transition và guard

### DevOps Or On-Call

Ưu tiên:

- architecture
- request flow
- runtime support
- sequence đúng concern đang lỗi

Rule:

- không mở detail diagram ngẫu nhiên
- luôn đi từ overview sang detail
- chỉ mở ERD khi đã biết domain dữ liệu nghi ngờ

### External Reader / Thesis Writer

Ưu tiên:

- architecture overview diagrams
- package overview
- action overview đúng domain
- ERD đúng chapter đang viết

Tránh:

- lấy sequence quá chi tiết để kể câu chuyện tổng quan
- trộn nhiều concern khác nhau vào cùng một hình minh họa cho report
- xem mọi physical table trong ERD là source-of-truth business flow nếu diagram/runtime note đã nói có legacy caveat
- mở đầu bằng class diagram hoặc communication diagram khi người đọc còn chưa có mental model hệ thống

## Capability To Diagram Map

### Task Authoring, Workflow, Submission

- `docs/11-diagrams/Action/act_01_task_management_overview.mmd`
- `docs/11-diagrams/Action/act_01a_task_crud.mmd`
- `docs/11-diagrams/Action/act_01b_task_workflow.mmd`
- `docs/11-diagrams/Action/act_01c_task_assignment_rules.mmd`
- `docs/11-diagrams/Sequence/seq_02_task_crud.mmd`
- `docs/11-diagrams/DFD/dfd_02c_task_completion_package.mmd`
- `docs/11-diagrams/State/state_01_task.mmd`

### Marketplace Browse, Apply, Withdraw, Ranking

- `docs/11-diagrams/Action/act_02_marketplace_overview.mmd`
- `docs/11-diagrams/Action/act_02a_marketplace_browse.mmd`
- `docs/11-diagrams/Action/act_02b_marketplace_apply.mmd`
- `docs/11-diagrams/Action/act_02c_marketplace_withdraw.mmd`
- `docs/11-diagrams/Action/act_02d_marketplace_triage_ranking.mmd`
- `docs/11-diagrams/Action/act_02e_marketplace_application_exceptions.mmd`
- `docs/11-diagrams/Sequence/seq_03_marketplace_apply.mmd`
- `docs/11-diagrams/Sequence/seq_03d_marketplace_application_permissions.mmd`

### Review, Dispute, Moderation

- `docs/11-diagrams/Action/act_03_review_overview.mmd`
- `docs/11-diagrams/Action/act_03a_review_submit.mmd`
- `docs/11-diagrams/Action/act_03b_review_confirm.mmd`
- `docs/11-diagrams/Action/act_03c_review_score.mmd`
- `docs/11-diagrams/Action/act_03d_review_dispute_lifecycle.mmd`
- `docs/11-diagrams/State/state_02_review_session.mmd`
- `docs/11-diagrams/State/state_02b_task_review_workflow.mmd`
- `docs/11-diagrams/State/state_02c_sprint_reverse_review_workflow.mmd`
- `docs/11-diagrams/State/state_08b_project_sprint_review.mmd`
- `docs/11-diagrams/State/state_06_flagged_review.mmd`
- `docs/11-diagrams/ERD/logical_erd_04_review_messaging.mmd`

### Profile, Skills, Talent Sourcing

- `docs/11-diagrams/Action/act_07_profile_skills_overview.mmd`
- `docs/11-diagrams/Action/act_07a_profile_management.mmd`
- `docs/11-diagrams/Action/act_07b_skill_management.mmd`
- `docs/11-diagrams/Action/act_07c_reviewed_skill_recalculation.mmd`
- `docs/11-diagrams/Sequence/seq_09_skill_profile.mmd`
- `docs/11-diagrams/ERD/logical_erd_01_user_auth_skills.mmd`

### Notifications, Settings, Admin Support

- `docs/11-diagrams/Action/act_08_platform_support_overview.mmd`
- `docs/11-diagrams/Action/act_08a_notification_center.mmd`
- `docs/11-diagrams/Action/act_08b_user_settings.mmd`
- `docs/11-diagrams/Action/act_08c_system_admin_console.mmd`
- `docs/11-diagrams/Sequence/seq_11_platform_support_overview.mmd`

## Read Order Recommendation

Không nên nhảy thẳng vào detail diagram nếu chưa biết context.

Đọc theo thứ tự:

1. architecture overview
2. package or action overview
3. detail sequence/state/ERD đúng concern
4. nếu một diagram nhìn phát chưa hiểu phạm vi của nó, file đó cần refactor

Nếu sau bước 2 bạn đã có đủ câu trả lời cho vấn đề đang hỏi, dừng ở đó. Không phải mọi câu hỏi đều cần đọc detail.

## Diagram Constraints

Các constraint hiện hành phải giữ:

- overview diagram chỉ nên gom `3-5` capability groups
- detail diagram chỉ nên mô tả `1` flow hoặc `1` concern
- ERD theo policy `table/column first`
- use case dùng Mermaid flowchart approximation

Nếu một sơ đồ bắt đầu đòi người đọc zoom, cuộn, và suy luận quá nhiều, phải tách file mới.

## Diagram Quota For External Report

Khi chọn hình cho bài đồ án, báo cáo, hoặc file zip gửi người ngoài repo, dùng quota an toàn này:

- mỗi chapter: `1` diagram level cao
- mỗi chapter: tối đa `2` diagrams level thấp
- toàn bộ report: ưu tiên lặp lại cùng một mental model level cao thay vì thay đổi style diagram liên tục

Ví dụ practical:

- chapter tổng quan hệ thống: `arch_01_system`
- chapter workflow nghiệp vụ: `act_*_overview` + `seq_*` tiêu biểu
- chapter dữ liệu: `ERD` đúng slice + data dictionary narrative

Không nên:

- nhét `5-6` detail diagrams liền nhau trong một chapter
- thay một action overview bằng nhiều sequence nhỏ chỉ vì “nó chi tiết hơn”
- dùng nhiều ERD low-level liên tiếp mà không có một câu mở đầu mô tả domain slice đang nói gì

## What Not To Do

- Đừng chọn diagram theo cảm giác “nhiều shape hơn thì chuyên nghiệp hơn”.
- Đừng dùng class/communication diagrams làm hình đầu tiên cho external reader.
- Đừng lấy một ERD slice để đại diện toàn bộ dữ liệu doanh nghiệp.
- Đừng giữ một diagram quá tải chỉ vì “nó đã tồn tại từ trước”; nếu quá tải, đó là bug cần refactor.

## Khi Nào Dừng Ở File Này

Bạn có thể dừng ở file này nếu mục tiêu của bạn là:

- biết nên mở diagram nào trước cho đúng câu hỏi
- phân biệt đủ rõ giữa diagram bậc cao và diagram bậc thấp
- lập danh sách diagram cần dùng cho report, audit, onboarding, hoặc incident response
- tránh tình trạng mở nhầm sơ đồ quá chi tiết khi mới chỉ cần bức tranh lớn

Bạn chỉ cần đi tiếp sang file diagram cụ thể khi đã biết rõ:

- domain nào đang quan trọng nhất
- bạn cần overview hay detail
- câu hỏi của bạn là về flow, state, data, hay boundary kiến trúc
