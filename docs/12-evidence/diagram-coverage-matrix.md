# Diagram Coverage Matrix

| Field | Value |
|---|---|
| Status | Active |
| Audience | Maintainer, reviewer, doc owner |
| Purpose | Kiểm riêng coverage của diagram artifacts theo taxonomy hiện tại và rule diagram English-only |
| Source of Truth | `docs/11-diagrams/**/*`, route/page evidence được trích dẫn |
| Last Reviewed | 2026-07-28 |
| Review Cycle | Khi thêm diagram family mới hoặc đổi diagram policy |
| Owner | Engineering |
| Stale Risk | Cao |

## Mục đích

Tài liệu này kiểm riêng các artifact sơ đồ mà người dùng yêu cầu, đối chiếu với file thực trong `docs/11-diagrams/` và boundary hiện có trong hệ thống.

## Nếu Dùng File Này Để Viết Report Bên Ngoài Repo

Bạn có thể dùng file này để viết:

- phần inventory diagram artifacts
- phần giải thích bộ docs hiện có loại sơ đồ nào
- appendix hoặc methodology cho việc chọn diagram đúng chương

Đây là file phù hợp để trả lời:

- bộ docs hiện có architecture/use case/flow/sequence/DFD/ERD/user-flow diagrams hay chưa
- loại diagram nào còn thiếu artifact độc lập
- khi nào nên nói “implemented UI page” thay vì “wireframe/prototype”

Bạn không nên dùng riêng file này để kết luận:

- mọi diagram đều đã hoàn hảo về nội dung hoặc coverage
- hệ thống có prototype/wireframe gốc chỉ vì có implemented UI pages

Nếu cần rule đọc diagram và level detail, đọc thêm:

- `../11-diagrams/README.md`
- `../DOCUMENTATION_WRITING_STANDARD_FOR_AI.md`

## Safe External Summary

Nếu cần một câu tóm tắt an toàn cho report, có thể dùng:

`Về mặt sơ đồ, bộ docs của Suar đã có các họ kỹ thuật và nghiệp vụ chính phù hợp giai đoạn phát triển, gồm UML Activity/Component/Deployment/State/Sequence, BPMN, DMN, DFD, ERD và user-flow. Deployment chỉ là reference topology pre-production; bộ docs không tuyên bố đã đủ mọi loại UML hoặc đã có production runtime.`

## Kết Luận Audit Coverage

“Có family” không đồng nghĩa với “có một file mẫu”. Audit hiện tại dùng câu hỏi/viewpoint và core capability làm gate:

- Component có 17 source theo hierarchy: 4 entry maps và 13 detail views, mỗi detail chỉ giữ một contract/provider/seam cluster;
- BPMN có 3 collaboration cho các boundary participant vật chất;
- DMN có 2 model chứa tổng cộng 5 decision table bám rule runtime;
- các family đã trưởng thành không phải one-sample inventory: Architecture 20, Activity 74, State 21, Sequence 46, DFD 85, ERD 41, Class 49, Package 20, Use Case 16 và User Flow 20 source;
- Deployment chỉ có 1 file vì repository mới chứng minh được đúng một reference topology pre-production. Thêm “production topology” lúc này sẽ là bịa evidence, không phải nâng chuẩn công nghiệp;
- Mermaid `flowchart` là notation renderer dùng chéo nhiều family, nên không nhân bản hàng trăm Activity/DFD/User Flow chỉ để đổi nhãn thành Flowchart.

Số lượng không tự chứng minh chất lượng; nó chỉ giúp phát hiện undercoverage. Gate cuối vẫn là mỗi hình phải trả lời một câu hỏi khác biệt, trace được về source/rule thật và không lặp lại view đã có.

## Coverage Matrix

| Artifact sơ đồ yêu cầu | Trạng thái | File / họ file hiện có | Ghi chú |
|---|---|---|---|
| Architecture Diagram | Có | `docs/11-diagrams/Architecture/*/{overview,high-level,low-level}/*` | System/layer/request views plus realm/workspace/five-board topology, event, telemetry, search, health, and observability |
| UML Component Diagram | Có — 17 hierarchical views | `docs/11-diagrams/Component/01-system-structure/{overview,high-level,low-level}/*.puml` | 4 entry maps + 13 bounded details cho core contracts, platform support, event publisher/consumer, runtime và integration seams; không dùng dependency mega-graph |
| UML Deployment Diagram | Có — Partial | `docs/11-diagrams/Deployment/01-reference-topology/overview/deployment_01_reference_topology.puml` | Repository-defined pre-production reference; chưa có production deployment hoặc real-user traffic |
| Use Case | Có | `docs/11-diagrams/Usecase/*/{overview,high-level,low-level}/*` | Mermaid flowchart approximation cho actor/system-goal mapping |
| UML Activity Diagram | Có | `docs/11-diagrams/Action/*/{overview,high-level,low-level}/*.mmd` | `Action/` là compatibility path; semantic family chính thức là Activity |
| Generic Flowchart notation | Có | `docs/11-diagrams/Flowchart/README.md` | Mermaid `flowchart` là renderer dùng chéo family, không phải bản sao semantic riêng |
| BPMN | Có — 3 collaborations | `docs/11-diagrams/BPMN/*/high-level/*.bpmn` | Marketplace assignment, task-delivery/review-quorum, và dispute/optional-advisory/human-resolution participant boundaries |
| DMN | Có — 2 models / 5 decisions | `docs/11-diagrams/DMN/*/high-level/*.dmn` | DMN 1.5 DRD + FIRST-hit tables cho marketplace và review governance; descriptive model, runtime vẫn là TypeScript policy |
| Sequence Diagram | Có | `docs/11-diagrams/Sequence/*/{overview,high-level,low-level}/*` | Theo từng concern runtime |
| UML State Machine | Có | `docs/11-diagrams/State/*/{overview,high-level,low-level}/*` | Stable lifecycle state, event, guard và transition |
| Data Flow Diagram | Có | `docs/11-diagrams/DFD/*/{overview,high-level,low-level}/*` | Context + domain slices |
| ERD | Có | `docs/11-diagrams/ERD/*/{overview,high-level,low-level}/*` | Current reading path dùng `logical_erd_*` và `physical_inventory_*`; `logical_erd_01d_target_realm_identity_split` là target migration view, không phải current schema; file `erd_*` cũ không còn là entrypoint chính |
| User Flow | Có | `docs/11-diagrams/UserFlow/*/{overview,high-level,low-level}/*` | Bổ sung trong pass audit hiện tại |
| Wireframe / Prototype | Chưa có artifact riêng | Không có thư mục/file diagram độc lập | Chỉ có implemented UI surfaces trong `inertia/apps/{user,org,admin}/*` và shared UI bones; không bịa wireframe nếu repo không có |
| Realm / Workspace / Five-board Topology | Có — Partial physical separation | `docs/11-diagrams/Architecture/01-system-architecture/high-level/arch_10_realm_workspace_board_topology.mmd` | Target model: System Admin và User là hai principal/realm; Organization Management không có delivery board; bốn Project board cộng một System board. Current debt: shared `auth.user`/`users.system_role` transport. |
| Task Review Workflow State | Có | `docs/11-diagrams/State/02-review/high-level/state_02b_task_review_workflow.mmd` | Cover task review board lifecycle hiện tại |
| Sprint Reverse Review State | Có | `docs/11-diagrams/State/02-review/high-level/state_02c_sprint_reverse_review_workflow.mmd` | Cover sprint-close reverse review board lifecycle hiện tại |
| Project Sprint Planning ERD/Class | Có | `docs/11-diagrams/ERD/02-organization-project/overview/logical_erd_02_org_project.mmd`, `docs/11-diagrams/ERD/02-organization-project/README.md`, `docs/11-diagrams/Class/01-core/high-level/cls_01b_org_project_core.mmd` | Cover ProjectSprint/Sprint Goal as project workspace planning boundary |
| Project Sprint Review Gate State | Có | `docs/11-diagrams/State/08-project/high-level/state_08b_project_sprint_review.mmd` | Cover sprint close, review-open gate, next sprint creation |

## Diagram Pack Tối Thiểu Đủ Mang Ra Ngoài

Nếu chỉ được chọn rất ít diagram để gửi cho người ngoài repo, pack an toàn nhất hiện tại là:

1. `Architecture/01-system-architecture/overview/arch_01_system.mmd`
2. `Architecture/01-system-architecture/high-level/arch_10_realm_workspace_board_topology.mmd`
3. `Component/01-system-structure/overview/component_01_modular_monolith.puml`
4. `Architecture/01-system-architecture/high-level/arch_02_layer.mmd`
5. một `Action/*/overview/*_overview.mmd` đúng domain
6. một `ERD/*/logical_erd_*` đúng domain slice

Lý do:

- đủ một hình tổng quan hệ thống
- đủ một hình layer/runtime
- đủ một hình component/module dependency
- đủ một hình workflow business
- đủ một hình dữ liệu đúng chapter

Không nên thay pack này bằng:

- chỉ sequence diagrams
- chỉ class diagrams
- một ERD quá chi tiết rồi bắt người đọc tự suy luận phần còn lại

## Pack Đủ Dùng Cho Một Bài Report Hoàn Chỉnh

Nếu bạn đang chuẩn bị bộ docs để người khác viết report hoặc đồ án mà không được xem code, pack thực dụng hơn là:

1. `Architecture/01-system-architecture/overview/arch_01_system.mmd`
2. `Architecture/01-system-architecture/high-level/arch_10_realm_workspace_board_topology.mmd`
3. `Architecture/01-system-architecture/high-level/arch_02_layer.mmd`
4. `Package/01-overview/overview/pkg_01_overview.mmd`
5. `Action/01-task-management/overview/act_01_task_definition_overview.mmd`
6. `Action/01-task-management/overview/act_01_task_assignment_path_overview.mmd`
7. `Action/01-task-management/overview/act_01_task_operation_outcome_overview.mmd`
8. `Action/01-task-management/overview/act_01_task_cancellation_followup_overview.mmd`
9. `Action/02-marketplace/README.md`
10. `Action/03-review/README.md`
11. `Action/05-organization/overview/act_05_org_management.mmd`
12. `Action/07-profile-skills/README.md`
13. `ERD/01-user-auth-skills/overview/logical_erd_01_user_auth_skills.mmd`
14. `ERD/02-organization-project/overview/logical_erd_02_org_project.mmd`
15. `ERD/03-task-marketplace/overview/logical_erd_03_task_marketplace.mmd`
16. `ERD/04-review-governance/README.md`
17. `ERD/05-platform-support/README.md`
18. khi chapter đụng review governance mới: `State/02-review/high-level/state_02b_task_review_workflow.mmd`, `State/08-project/high-level/state_08b_project_sprint_review.mmd`, hoặc `State/02-review/high-level/state_02c_sprint_reverse_review_workflow.mmd`

Lý do pack này đáng tin hơn:

- đủ high-level architecture
- đủ capability landscape
- đủ 4 business slices lớn
- đủ 5 ERD slices để thay cho một mega ERD

Nếu cần cắt xuống ngắn hơn, bỏ bớt detail trước, không bỏ architecture/package overview trước.

## User Flow Files Added

- `docs/11-diagrams/UserFlow/01-onboarding/overview/uf_01_onboarding_org_context.mmd`
- `docs/11-diagrams/UserFlow/02-marketplace/overview/uf_02_marketplace_task_application_journey.mmd`
- `docs/11-diagrams/UserFlow/03-profile/overview/uf_03_profile_snapshot_journey.mmd`

## Review Governance State Files Added

- `docs/11-diagrams/State/02-review/high-level/state_02b_task_review_workflow.mmd`
- `docs/11-diagrams/State/02-review/high-level/state_02c_sprint_reverse_review_workflow.mmd`
- `docs/11-diagrams/State/08-project/high-level/state_08b_project_sprint_review.mmd`

Rule đọc:

- `state_02_review_session.mmd` vẫn hữu ích cho review-session model cũ.
- task review board hiện phải đọc thêm `state_02b_task_review_workflow.mmd`.
- sprint close/review-open gate hiện phải đọc thêm `state_08b_project_sprint_review.mmd`.
- sprint reverse board hiện phải đọc thêm `state_02c_sprint_reverse_review_workflow.mmd`.
- data slice chính là `ERD/04-review-governance/README.md`, với physical inventory tương ứng nếu cần column inventory.

## Verified Missing Standalone Diagram Artifact

Sau khi quét `docs/11-diagrams/`, `docs/`, và implemented UI pages, chưa thấy:

- low-fidelity wireframe board
- prototype export riêng
- interactive prototype artifact độc lập trong bộ tài liệu

Điều này nghĩa là concern `Wireframe / Prototype` hiện chỉ được cover ở mức:

- implemented page surfaces
- flow/user-flow docs
- không có standalone design artifact gốc

Vì vậy khi viết report, nên dùng wording an toàn:

- `implemented UI surface`
- `user-flow diagram`
- `runtime page flow`

Không nên tự động viết:

- `prototype đã được phát hành`
- `wireframe gốc đã có artifact độc lập`

## What Not To Do

- Đừng nói “đã có đủ diagram” rồi ngầm hiểu mọi loại diagram đều nên được đưa ra ngoài cùng lúc.
- Đừng thay toàn bộ narrative data chapter bằng một ERD physical dày đặc.
- Đừng bịa wireframe/prototype artifact nếu repo hiện chỉ có implemented UI pages và user-flow diagrams.

## Dense File Watchlist

Trong lần rà này, một số file được đánh dấu là `dense low-level` và nên mở sau overview thay vì dùng làm điểm vào đầu tiên:

- `docs/11-diagrams/ERD/01-user-auth-skills/overview/logical_erd_01_user_auth_skills.mmd`
- `docs/11-diagrams/ERD/03-task-marketplace/overview/logical_erd_03_task_marketplace.mmd`
- `docs/11-diagrams/ERD/04-review-governance/README.md`
- `docs/11-diagrams/State/02-review/high-level/state_02b_task_review_workflow.mmd`
- `docs/11-diagrams/State/02-review/high-level/state_02c_sprint_reverse_review_workflow.mmd`
- `docs/11-diagrams/State/08-project/high-level/state_08b_project_sprint_review.mmd`
- `docs/11-diagrams/Action/01-task-management/high-level/act_01b_task_workflow.mmd`
- `docs/11-diagrams/Action/07-profile-skills/high-level/act_07b_skill_management.mmd`
- `docs/11-diagrams/Sequence/05-organization-membership/high-level/seq_10_org_join_request.mmd`

Lý do:

- line count cao hơn mặt bằng chung
- nhiều decision/data/state note trong cùng một file
- vẫn hữu ích cho debug/report chi tiết, nhưng dễ gây ngợp nếu mở quá sớm
- riêng `act_01b_task_workflow.mmd` đã được tách bớt assignment concern khỏi file, nhưng vẫn nên đọc sau overview task domain

## Evidence Sources

- `docs/11-diagrams/Architecture/01-system-architecture/overview/arch_01_system.mmd`
- `docs/11-diagrams/Architecture/01-system-architecture/high-level/arch_10_realm_workspace_board_topology.mmd`
- `docs/11-diagrams/Action/01-task-management/README.md`
- `docs/11-diagrams/Usecase/02-task-project/overview/uc_02_task_project.mmd`
- `docs/11-diagrams/README.md`
- `inertia/apps/{user,org,admin}/*`
- `inertia/bones/*`
- `start/routes/*.ts`

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. loại diagram concern của mình đã có artifact chính thức hay chưa
2. file hoặc họ file nào đang là evidence sơ đồ chính
3. có cần quay lại diagram guide hoặc document coverage matrix để đọc tiếp hay không
