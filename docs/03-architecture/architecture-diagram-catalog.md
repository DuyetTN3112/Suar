# Architecture Diagram Catalog

| Field           | Value                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------ |
| Status          | Active                                                                                     |
| Audience        | Reader cần chọn đúng diagram nhanh: manager, developer, tester, DevOps, reviewer           |
| Purpose         | Chỉ người đọc tới đúng diagram theo đúng câu hỏi, thay vì bắt họ mở cả thư mục rồi tự đoán |
| Source of Truth | `docs/11-diagrams/**/*.{mmd,puml,bpmn,dmn}`, verified routes, models, runtime docs         |
| Review Cycle    | Khi thêm diagram mới, đổi scope diagram cũ, module boundary, hoặc capability map thay đổi  |
| Owner           | Engineering                                                                                |
| Stale Risk      | Cao                                                                                        |

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

- chương tổng quan hệ thống: dùng `Architecture/*/{overview,high-level,low-level}/*` và `Package/*/{overview,high-level,low-level}/*`
- chương capability hoặc nghiệp vụ: dùng `Action/*/overview/*_overview.mmd` trước
- chương flow chi tiết: dùng `Sequence/*/{overview,high-level,low-level}/*` hoặc detail action diagrams đúng concern
- chương dữ liệu: dùng `ERD/*/{overview,high-level,low-level}/*` đúng domain slice, không lấy một ERD để thay cho toàn bộ hệ thống

Nếu một diagram cần nhiều câu giải thích mới hiểu được nó đang ở level nào, đừng đưa ngay diagram đó vào report. Hãy lùi về level cao hơn trước.

## Nếu Chưa Biết Mở Gì

Đừng bắt đầu bằng class diagram, sequence detail, hay ERD.

Bắt đầu bằng:

1. `docs/11-diagrams/Architecture/01-system-architecture/overview/arch_01_system.mmd`
2. `docs/11-diagrams/Architecture/01-system-architecture/high-level/arch_02_layer.mmd`
3. `docs/11-diagrams/Package/01-overview/overview/pkg_01_overview.mmd`

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

1. `docs/11-diagrams/Architecture/01-system-architecture/overview/arch_01_system.mmd`
2. `docs/11-diagrams/Architecture/01-system-architecture/high-level/arch_02_layer.mmd`
3. `docs/11-diagrams/Package/01-overview/overview/pkg_01_overview.mmd`
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

1. `Architecture/01-system-architecture/low-level/arch_02a_request_flow.mmd`
2. `Architecture/01-system-architecture/README.md`
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

- `docs/11-diagrams/Architecture/01-system-architecture/overview/arch_01_system.mmd`
- `docs/11-diagrams/Architecture/01-system-architecture/high-level/arch_02_layer.mmd`
- `docs/11-diagrams/Architecture/01-system-architecture/low-level/arch_02a_request_flow.mmd`
- `docs/11-diagrams/Architecture/01-system-architecture/README.md`

### Level 2: Module And Capability Overview

Đọc khi bạn cần:

- module nào tồn tại
- capability group nào chịu trách nhiệm concern nào
- business slice nào liên quan đến vấn đề đang hỏi

File chính:

- `docs/11-diagrams/Package/01-overview/overview/pkg_01_overview.mmd`
- `docs/11-diagrams/Package/02-presentation-application/overview/pkg_02_application_layer.mmd`
- `docs/11-diagrams/Package/02-presentation-application/README.md`
- `docs/11-diagrams/Action/01-task-management/README.md`
- `docs/11-diagrams/Action/02-marketplace/README.md`
- `docs/11-diagrams/Action/03-review/README.md`
- `docs/11-diagrams/Action/05-organization/overview/act_05_org_management.mmd`
- `docs/11-diagrams/Action/06-user-lifecycle/README.md`
- `docs/11-diagrams/Action/07-profile-skills/README.md`
- `docs/11-diagrams/Action/08-platform-support/README.md`

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

- `Class/*/{overview,high-level,low-level}/*` và `Communication/*/{overview,high-level,low-level}/*` gần như luôn là level 3
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

- `Action/03-review/README.md` là level cao hơn `Action/03-review/high-level/act_03d_review_dispute_lifecycle.mmd`
- `Architecture/01-system-architecture/low-level/arch_02a_request_flow.mmd` vẫn là overview kỹ thuật, chưa phải deep detail tận repository/query
- `ERD/*/{overview,high-level,low-level}/*` trong repo hiện tại thường nên đọc như focused data slice, không phải overview toàn enterprise

Nếu người đọc nhầm `family` thành `level`, họ sẽ rất dễ chọn sai hình cho report hoặc incident.

## Diagram Families And Their Jobs

### Architecture

Dùng để hiểu:

- client/server/data/external boundaries
- layer chính
- request path
- runtime support surfaces
- repository-defined Docker reference topology (chưa phải production deployment)
- security/trust boundaries
- Elasticsearch, Clawagent, file-storage, và Redis runtime concerns

### Package

Dùng để hiểu:

- module landscape
- presentation/application/domain/infra split
- cross-cutting concerns
- boundary tổ chức mã nguồn
- marketplace, auth/session, review governance, profile/skill, search projection internals

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
- một scenario hợp tác object với message numbering và execution order

## Fast Mapping From Question To Diagram

| Your Question                                                                                 | Read First                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hệ thống này gồm những khối nào                                                               | `Architecture/01-system-architecture/overview/arch_01_system.mmd`                                                                                                                                                                                                         |
| Ranh giới UML component và dependency giữa các module nằm đâu                                 | `Component/01-system-structure/overview/component_01_modular_monolith.puml`                                                                                                                                                                                               |
| Core capability yêu cầu public contract nào                                                   | mở `Component/01-system-structure/high-level/component_02_core_domain_dependencies.puml`, rồi chọn đúng `component_02a` Project/Sprint, `02b` Task, `02c` Marketplace hoặc `02d` Review                                                                                   |
| Platform capability cung cấp interface nào và domain event phản ứng ra sao                    | mở `Component/01-system-structure/high-level/component_03_platform_services.puml`; với event, mở `03a` rồi chọn `03a1` publisher hoặc `03a2` consumer; các slice còn lại là `03b` accountability, `03c` query/cache và `03d` operations                                   |
| Consumer port, public contract và composition factory khác nhau thế nào                       | mở `Component/01-system-structure/low-level/component_04_integration_seams.puml`, rồi chọn `04a` port/adapter, `04b` contract/event hoặc `04c_composition_factory_boundary`                                                                                               |
| Controller, Command/Query, domain, service, port và adapter ai sở hữu việc gì                 | `Architecture/01-system-architecture/high-level/arch_02_layer.mmd`                                                                                                                                                                                                        |
| Request đi qua các layer nào                                                                  | `Architecture/01-system-architecture/low-level/arch_02a_request_flow.mmd`                                                                                                                                                                                                 |
| Vì sao factory trong Actions khác factory trong composition                                   | `Architecture/01-system-architecture/low-level/arch_02b_composition_boundary.mmd`; UML view: `Component/01-system-structure/low-level/component_04c_composition_factory_boundary.puml`                                                                                    |
| Listener/event consumer phải điều phối qua đâu                                                | `Architecture/01-system-architecture/low-level/arch_02c_event_side_effects.mmd`                                                                                                                                                                                           |
| Docker app, PostgreSQL, Redis và external service được bố trí trong reference topology ra sao | `Deployment/01-reference-topology/overview/deployment_01_reference_topology.puml`; container-oriented view: `Architecture/01-system-architecture/high-level/arch_05_deployment_topology.mmd`                                                                              |
| Trust boundary, session/bearer, callback và admin guard nằm đâu                               | `Architecture/01-system-architecture/high-level/arch_06_security_trust_boundaries.mmd`                                                                                                                                                                                    |
| AI dispute trigger/callback/human decision chạy qua đâu                                       | `Architecture/01-system-architecture/low-level/arch_07_ai_dispute_integration.mmd`                                                                                                                                                                                        |
| Attachment metadata và binary storage đang nối tới đâu                                        | `Architecture/01-system-architecture/low-level/arch_08_file_attachment_storage_runtime.mmd`                                                                                                                                                                               |
| Redis DB0/DB1 chia session/token/cache thế nào                                                | `Architecture/01-system-architecture/low-level/arch_09_redis_runtime_separation.mmd`                                                                                                                                                                                      |
| Module nào chịu trách nhiệm chính                                                             | `Package/01-overview/overview/pkg_01_overview.mmd`                                                                                                                                                                                                                        |
| Marketplace module chia controller/action/port/adapter thế nào                                | `Package/02-presentation-application/high-level/pkg_02g_marketplace_module.mmd`                                                                                                                                                                                           |
| Authentication kết thúc và authorization bắt đầu ở đâu                                        | `Package/02-presentation-application/low-level/pkg_02h_auth_authorization_session.mmd`                                                                                                                                                                                    |
| Review dispute/AI/sprint governance nằm trong package nào                                     | `Package/02-presentation-application/low-level/pkg_02i_review_governance.mmd`                                                                                                                                                                                             |
| OAuth login/onboarding chạy ra sao                                                            | `Sequence/01-auth-user-lifecycle/high-level/seq_01_auth.mmd`                                                                                                                                                                                                              |
| Auth login/logout trở thành canonical Audit evidence ra sao                                   | `Architecture/01-system-architecture/low-level/arch_04c_auth_audit_evidence.mmd`; interaction detail: `Sequence/01-auth-user-lifecycle/low-level/seq_01c_auth_session_evidence.mmd`; data: `ERD/05-platform-support/high-level/logical_erd_05b_durable_observability.mmd` |
| Social login resolve linked-user / existing-email / new-user ra sao                           | `Action/06-user-lifecycle/low-level/act_06c_social_login_account_resolution.mmd`                                                                                                                                                                                          |
| Dev/test token-session bridge chạy ra sao                                                     | `Sequence/01-auth-user-lifecycle/low-level/seq_01b_testing_auth_context_bridge.mmd`                                                                                                                                                                                       |
| Review session được mở từ task delivery path và phối hợp reviewer như thế nào                 | `BPMN/02-task-delivery-review/high-level/bpmn_02_task_delivery_review.bpmn`; implementation interaction: `Sequence/02-task-management/high-level/seq_02e_task_submission_review_handoff.mmd`                                                                              |
| Logout/session teardown chạy ra sao                                                           | `Action/06-user-lifecycle/low-level/act_06b_logout_session_teardown.mmd`                                                                                                                                                                                                  |
| Task management hoạt động tổng thể ra sao                                                     | `Action/01-task-management/README.md`, rồi bốn atomic overview theo thứ tự definition → assignment → operation → cancellation                                                                                                                                             |
| Transition sang DONE hoàn tất assignment/review/outbox theo thứ tự nào                        | `Sequence/02-task-management/high-level/seq_02b_task_status_assignment.mmd`, rồi `low-level/seq_02b1_done_completion_orchestration.mmd`; data view: `DFD/02-task/low-level/dfd_02b2c_done_completion_transition.mmd`                                                      |
| `/work` là page gì và khác Organization board/activity feed thế nào                           | `UserFlow/04-task-delivery/low-level/uf_04b_my_work_queue.mmd`                                                                                                                                                                                                            |
| Marketplace apply flow thế nào                                                                | `Action/02-marketplace/high-level/act_02b_marketplace_apply.mmd` hoặc `Sequence/03-marketplace/high-level/seq_03_marketplace_apply.mmd`                                                                                                                                   |
| Marketplace proposal eligibility/processing dựa trên decision rule nào                        | `DMN/01-marketplace/high-level/dmn_01_marketplace_application_decisions.dmn`                                                                                                                                                                                              |
| Review confirmation/dispute permission dựa trên rule nào                                      | `DMN/02-review-governance/high-level/dmn_02_review_governance_decisions.dmn`                                                                                                                                                                                              |
| Review dispute phối hợp reviewee, platform, optional AI và admin ra sao                       | `BPMN/03-review-dispute/high-level/bpmn_03_review_dispute_resolution.bpmn`; implementation detail: `Action/03-review/README.md`                                                                                                                                           |
| Dữ liệu task và marketplace nằm đâu                                                           | `ERD/03-task-marketplace/overview/logical_erd_03_task_marketplace.mmd`                                                                                                                                                                                                    |
| State machine task hoặc review                                                                | `State/01-task/overview/state_01_task.mmd` hoặc `State/02-review/overview/state_02_review_session.mmd`                                                                                                                                                                    |
| Tôi chỉ có 1 hình để giải thích hệ thống cho người ngoài                                      | `Architecture/01-system-architecture/overview/arch_01_system.mmd`                                                                                                                                                                                                         |
| Tôi cần 1 hình để giải thích codebase chia module ra sao                                      | `Package/01-overview/overview/pkg_01_overview.mmd`                                                                                                                                                                                                                        |
| Tôi cần 1 hình để giải thích workflow nghiệp vụ của một domain                                | action overview của domain đó                                                                                                                                                                                                                                             |

Rule đọc an toàn:

- nếu câu hỏi của bạn có dính actor boundary hoặc quyền truy cập, đừng chỉ dựa vào tên diagram hoặc prefix route trong hình
- hãy đọc thêm caveat runtime trong diagram/file guide liên quan trước khi kết luận

## Fast Mapping From Report Chapter To Diagram

| Report Need                             | Read First                                                                                                                                                                                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chương kiến trúc tổng quan              | `Architecture/01-system-architecture/overview/arch_01_system.mmd`                                                                                                                                                                                           |
| Chương component/module boundary        | mở bằng `Component/01-system-structure/overview/component_01_modular_monolith.puml`, sau đó chọn đúng một view core/platform/event/seam trong cùng folder                                                                                                   |
| Chương layer xử lý request              | `Architecture/01-system-architecture/high-level/arch_02_layer.mmd` và `Architecture/01-system-architecture/low-level/arch_02a_request_flow.mmd`                                                                                                             |
| Chương deployment và runtime dependency | `Deployment/01-reference-topology/overview/deployment_01_reference_topology.puml`, `Architecture/01-system-architecture/high-level/arch_05_deployment_topology.mmd` và `Architecture/01-system-architecture/low-level/arch_09_redis_runtime_separation.mmd` |
| Chương security và external integration | `Architecture/01-system-architecture/high-level/arch_06_security_trust_boundaries.mmd` và `Architecture/01-system-architecture/low-level/arch_07_ai_dispute_integration.mmd`                                                                                |
| Chương capability/module landscape      | `Package/01-overview/overview/pkg_01_overview.mmd`                                                                                                                                                                                                          |
| Chương task workflow                    | hai file trong `Action/01-task-management/overview/` rồi tới task detail diagrams                                                                                                                                                                           |
| Chương marketplace và matching          | `Action/02-marketplace/README.md` rồi tới apply/ranking detail                                                                                                                                                                                              |
| Chương business decision marketplace    | `DMN/01-marketplace/high-level/dmn_01_marketplace_application_decisions.dmn`                                                                                                                                                                                |
| Chương task delivery → review           | `BPMN/02-task-delivery-review/high-level/bpmn_02_task_delivery_review.bpmn` rồi tới sequence handoff/quorum detail                                                                                                                                          |
| Chương review/dispute/governance        | `BPMN/03-review-dispute/high-level/bpmn_03_review_dispute_resolution.bpmn`, `DMN/02-review-governance/high-level/dmn_02_review_governance_decisions.dmn`, rồi tới `Action/03-review/README.md`                                                              |
| Chương realm/workspace/board topology   | `Architecture/01-system-architecture/high-level/arch_10_realm_workspace_board_topology.mmd`                                                                                                                                                                 |
| Chương organization/project workspace   | `Action/05-organization/overview/act_05_org_management.mmd` rồi tới `Action/04-project-delivery/overview/act_04_project_delivery_review_overview.mmd`                                                                                                       |
| Chương profile/talent                   | `Action/07-profile-skills/README.md`                                                                                                                                                                                                                        |
| Chương database theo domain             | `ERD/01-user-auth-skills/logical_erd_01_*`, `ERD/02-organization-project/logical_erd_02_*`, `ERD/03-task-marketplace/logical_erd_03_*`, `ERD/04-review-governance/logical_erd_04_*` đúng slice                                                              |

Rule thêm cho report:

- mỗi chapter nên có tối đa một diagram level cao mở đầu
- diagram level thấp chỉ nên đi sau khi chapter đã giải thích đủ context
- nếu một hình cần giải thích quá dài trong caption, thường là bạn đang chọn sai level
- riêng chapter organization/project workspace, `/org/tasks*` chỉ được kể như compatibility redirect; bốn delivery/review board thuộc `/projects/:projectId/*`
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

- `docs/11-diagrams/Action/01-task-management/README.md`
- `docs/11-diagrams/Action/01-task-management/high-level/act_01a_task_crud.mmd`
- `docs/11-diagrams/Action/01-task-management/high-level/act_01b_task_workflow.mmd`
- `docs/11-diagrams/Action/01-task-management/high-level/act_01c_task_assignment_rules.mmd`
- `docs/11-diagrams/Sequence/02-task-management/high-level/seq_02_task_crud.mmd`
- `docs/11-diagrams/DFD/02-task/high-level/dfd_02c_task_completion_package.mmd`
- `docs/11-diagrams/State/01-task/overview/state_01_task.mmd`

### Marketplace Browse, Apply, Withdraw, Ranking

- `docs/11-diagrams/Action/02-marketplace/README.md`
- `docs/11-diagrams/Action/02-marketplace/high-level/act_02a_marketplace_browse.mmd`
- `docs/11-diagrams/Action/02-marketplace/high-level/act_02b_marketplace_apply.mmd`
- `docs/11-diagrams/Action/02-marketplace/high-level/act_02c_marketplace_withdraw.mmd`
- `docs/11-diagrams/Action/02-marketplace/high-level/act_02d_marketplace_triage_ranking.mmd`
- `docs/11-diagrams/Action/02-marketplace/low-level/act_02e_marketplace_application_exceptions.mmd`
- `docs/11-diagrams/Sequence/03-marketplace/high-level/seq_03_marketplace_apply.mmd`
- `docs/11-diagrams/Sequence/03-marketplace/low-level/seq_03d_marketplace_application_permissions.mmd`

### Review, Dispute, Moderation

- `docs/11-diagrams/Action/03-review/README.md`
- `docs/11-diagrams/Action/03-review/high-level/act_03a_review_submit.mmd`
- `docs/11-diagrams/Action/03-review/high-level/act_03b_review_confirm.mmd`
- `docs/11-diagrams/Action/03-review/high-level/act_03c_review_score.mmd`
- `docs/11-diagrams/Action/03-review/high-level/act_03d_review_dispute_lifecycle.mmd`
- `docs/11-diagrams/State/02-review/overview/state_02_review_session.mmd`
- `docs/11-diagrams/State/02-review/high-level/state_02b_task_review_workflow.mmd`
- `docs/11-diagrams/State/02-review/high-level/state_02c_sprint_reverse_review_workflow.mmd`
- `docs/11-diagrams/State/08-project/high-level/state_08b_project_sprint_review.mmd`
- `docs/11-diagrams/State/02-review/high-level/state_06_flagged_review.mmd`
- `docs/11-diagrams/ERD/04-review-governance/README.md`

### Profile, Skills, Talent Sourcing

- `docs/11-diagrams/Action/07-profile-skills/README.md`
- `docs/11-diagrams/Action/07-profile-skills/high-level/act_07a_profile_management.mmd`
- `docs/11-diagrams/Action/07-profile-skills/high-level/act_07b_skill_management.mmd`
- `docs/11-diagrams/Action/07-profile-skills/high-level/act_07c_reviewed_skill_recalculation.mmd`
- `docs/11-diagrams/Sequence/09-profile-skills/high-level/seq_09_skill_profile.mmd`
- `docs/11-diagrams/ERD/01-user-auth-skills/overview/logical_erd_01_user_auth_skills.mmd`

### Notifications, Settings, Admin Support

- `docs/11-diagrams/Architecture/01-system-architecture/low-level/arch_04c_auth_audit_evidence.mmd`
- `docs/11-diagrams/Sequence/01-auth-user-lifecycle/low-level/seq_01c_auth_session_evidence.mmd`
- `docs/11-diagrams/ERD/05-platform-support/high-level/logical_erd_05b_durable_observability.mmd`
- `docs/11-diagrams/Class/04-platform-support/low-level/cls_04e_audit_activity_records.mmd`
- `docs/11-diagrams/Action/08-platform-support/README.md`
- `docs/11-diagrams/Action/08-platform-support/high-level/act_08a_notification_center.mmd`
- `docs/11-diagrams/Action/08-platform-support/high-level/act_08b_user_settings.mmd`
- `docs/11-diagrams/Action/08-platform-support/high-level/act_08c_system_admin_console.mmd`
- `docs/11-diagrams/Action/08-platform-support/low-level/act_08c1_admin_session_entry.mmd`
- `docs/11-diagrams/Action/08-platform-support/low-level/act_08c2_governed_admin_action.mmd`
- `docs/11-diagrams/Sequence/11-platform-support/high-level/seq_11_platform_support_overview.mmd`

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
