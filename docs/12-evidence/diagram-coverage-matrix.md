# Diagram Coverage Matrix

| Field | Value |
|---|---|
| Status | Active |
| Audience | Maintainer, reviewer, doc owner |
| Purpose | Kiểm riêng coverage của diagram artifacts theo taxonomy hiện tại và rule diagram English-only |
| Source of Truth | `docs/11-diagrams/**/*`, route/page evidence được trích dẫn |
| Last Reviewed | 2026-07-16 |
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

`Về mặt sơ đồ, bộ docs của Suar đã có đủ các họ diagram kỹ thuật chính như architecture, sequence, DFD, ERD, và user-flow; tuy vậy docs cũng ghi rõ các loại artifact chưa có bản độc lập, ví dụ wireframe/prototype gốc.`

## Coverage Matrix

| Artifact sơ đồ yêu cầu | Trạng thái | File / họ file hiện có | Ghi chú |
|---|---|---|---|
| Architecture Diagram | Có | `docs/11-diagrams/Architecture/*` | `arch_01_system`, `arch_02_layer`, `arch_02a_request_flow`, `arch_02b_runtime_support` |
| Use Case | Có | `docs/11-diagrams/Usecase/*` | Mermaid flowchart approximation cho actor/system-goal mapping |
| Flowchart | Có | `docs/11-diagrams/Action/*` | Overview + detail business flows |
| Sequence Diagram | Có | `docs/11-diagrams/Sequence/*` | Theo từng concern runtime |
| Data Flow Diagram | Có | `docs/11-diagrams/DFD/*` | Context + domain slices |
| ERD | Có | `docs/11-diagrams/ERD/*` | Current reading path dùng `logical_erd_*` và `physical_inventory_*`; file `erd_*` cũ không còn là entrypoint chính |
| User Flow | Có | `docs/11-diagrams/UserFlow/*` | Bổ sung trong pass audit hiện tại |
| Wireframe / Prototype | Chưa có artifact riêng | Không có thư mục/file diagram độc lập | Chỉ có implemented UI surfaces trong `inertia/apps/{user,org,admin}/*` và shared UI bones; không bịa wireframe nếu repo không có |
| Task Review Workflow State | Có | `docs/11-diagrams/State/state_02b_task_review_workflow.mmd` | Cover task review board lifecycle hiện tại |
| Sprint Reverse Review State | Có | `docs/11-diagrams/State/state_02c_sprint_reverse_review_workflow.mmd` | Cover sprint-close reverse review board lifecycle hiện tại |
| Project Sprint Planning ERD/Class | Có | `docs/11-diagrams/ERD/logical_erd_02_org_project.mmd`, `docs/11-diagrams/ERD/physical_inventory_02_org_project.mmd`, `docs/11-diagrams/Class/cls_01b_org_project_core.mmd` | Cover ProjectSprint/Sprint Goal as project workspace planning boundary |
| Project Sprint Review Gate State | Có | `docs/11-diagrams/State/state_08b_project_sprint_review.mmd` | Cover sprint close, review-open gate, next sprint creation |

## Diagram Pack Tối Thiểu Đủ Mang Ra Ngoài

Nếu chỉ được chọn rất ít diagram để gửi cho người ngoài repo, pack an toàn nhất hiện tại là:

1. `Architecture/arch_01_system.mmd`
2. `Architecture/arch_02_layer.mmd`
3. `Package/pkg_01_overview.mmd`
4. một `Action/*_overview.mmd` đúng domain
5. một `ERD/logical_erd_*` đúng domain slice

Lý do:

- đủ một hình tổng quan hệ thống
- đủ một hình layer/runtime
- đủ một hình module/capability landscape
- đủ một hình workflow business
- đủ một hình dữ liệu đúng chapter

Không nên thay pack này bằng:

- chỉ sequence diagrams
- chỉ class diagrams
- một ERD quá chi tiết rồi bắt người đọc tự suy luận phần còn lại

## Pack Đủ Dùng Cho Một Bài Report Hoàn Chỉnh

Nếu bạn đang chuẩn bị bộ docs để người khác viết report hoặc đồ án mà không được xem code, pack thực dụng hơn là:

1. `Architecture/arch_01_system.mmd`
2. `Architecture/arch_02_layer.mmd`
3. `Package/pkg_01_overview.mmd`
4. `Action/act_01_task_management_overview.mmd`
5. `Action/act_02_marketplace_overview.mmd`
6. `Action/act_03_review_overview.mmd`
7. `Action/act_05_org_management.mmd`
8. `Action/act_07_profile_skills_overview.mmd`
9. `ERD/logical_erd_01_user_auth_skills.mmd`
10. `ERD/logical_erd_02_org_project.mmd`
11. `ERD/logical_erd_03_task_marketplace.mmd`
12. `ERD/logical_erd_04_review_messaging.mmd`
13. khi chapter đụng review governance mới: `State/state_02b_task_review_workflow.mmd`, `State/state_08b_project_sprint_review.mmd`, hoặc `State/state_02c_sprint_reverse_review_workflow.mmd`

Lý do pack này đáng tin hơn:

- đủ high-level architecture
- đủ capability landscape
- đủ 4 business slices lớn
- đủ 4 ERD slices để thay cho một mega ERD

Nếu cần cắt xuống ngắn hơn, bỏ bớt detail trước, không bỏ architecture/package overview trước.

## User Flow Files Added

- `docs/11-diagrams/UserFlow/uf_01_onboarding_org_context.mmd`
- `docs/11-diagrams/UserFlow/uf_02_marketplace_task_application_journey.mmd`
- `docs/11-diagrams/UserFlow/uf_03_profile_snapshot_bookmark_journey.mmd`

## Review Governance State Files Added

- `docs/11-diagrams/State/state_02b_task_review_workflow.mmd`
- `docs/11-diagrams/State/state_02c_sprint_reverse_review_workflow.mmd`
- `docs/11-diagrams/State/state_08b_project_sprint_review.mmd`

Rule đọc:

- `state_02_review_session.mmd` vẫn hữu ích cho review-session model cũ.
- task review board hiện phải đọc thêm `state_02b_task_review_workflow.mmd`.
- sprint close/review-open gate hiện phải đọc thêm `state_08b_project_sprint_review.mmd`.
- sprint reverse board hiện phải đọc thêm `state_02c_sprint_reverse_review_workflow.mmd`.
- data slice chính là `ERD/logical_erd_04_review_messaging.mmd`, với physical inventory tương ứng nếu cần column inventory.

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

- `docs/11-diagrams/ERD/logical_erd_01_user_auth_skills.mmd`
- `docs/11-diagrams/ERD/logical_erd_03_task_marketplace.mmd`
- `docs/11-diagrams/ERD/logical_erd_04_review_messaging.mmd`
- `docs/11-diagrams/State/state_02b_task_review_workflow.mmd`
- `docs/11-diagrams/State/state_02c_sprint_reverse_review_workflow.mmd`
- `docs/11-diagrams/State/state_08b_project_sprint_review.mmd`
- `docs/11-diagrams/Action/act_01b_task_workflow.mmd`
- `docs/11-diagrams/Action/act_07b_skill_management.mmd`
- `docs/11-diagrams/Sequence/seq_10_org_join_request.mmd`

Lý do:

- line count cao hơn mặt bằng chung
- nhiều decision/data/state note trong cùng một file
- vẫn hữu ích cho debug/report chi tiết, nhưng dễ gây ngợp nếu mở quá sớm
- riêng `act_01b_task_workflow.mmd` đã được tách bớt assignment concern khỏi file, nhưng vẫn nên đọc sau overview task domain

## Evidence Sources

- `docs/11-diagrams/Architecture/arch_01_system.mmd`
- `docs/11-diagrams/Action/act_01_task_management_overview.mmd`
- `docs/11-diagrams/Usecase/uc_02_task_project.mmd`
- `docs/11-diagrams/sequence-flow-data-user-flows.md`
- `inertia/apps/{user,org,admin}/*`
- `inertia/bones/*`
- `start/routes/*.ts`

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. loại diagram concern của mình đã có artifact chính thức hay chưa
2. file hoặc họ file nào đang là evidence sơ đồ chính
3. có cần quay lại diagram guide hoặc document coverage matrix để đọc tiếp hay không
