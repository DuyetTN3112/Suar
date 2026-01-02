# External Reader And Report Writing Guide

| Field | Value |
|---|---|
| Status | Active |
| Audience | Giảng viên, người viết report đồ án, reviewer bên ngoài, stakeholder không có quyền xem source code |
| Purpose | Giúp người ngoài dự án dùng riêng bộ `docs/` và `docs/11-diagrams/` để hiểu Suar, viết report, và trích dẫn đúng mà không cần mở code |
| Source of Truth | Các docs chính trong taxonomy `00-12`, diagram corpus trong `docs/11-diagrams/`, caveat/evidence docs trong `docs/12-evidence/` |
| Last Reviewed | 2026-07-16 |
| Review Cycle | Khi taxonomy, capability model, architecture core, hoặc boundary evidence đổi |
| Owner | Engineering + product |
| Stale Risk | Cao nếu docs chính đổi mà guide này không đổi theo |

## File Này Dùng Để Làm Gì

File này tồn tại cho tình huống rất cụ thể:

- người đọc không được xem source code
- nhưng vẫn cần hiểu hệ thống đủ sâu để viết report, đồ án, hoặc báo cáo kỹ thuật

Nếu bạn chỉ có file zip `docs/` và `docs/11-diagrams/`, đây là điểm bắt đầu an toàn nhất.

File này phải tự đủ để người ngoài repo biết:

- nên đọc theo lộ trình nào
- chapter nào nên lấy file nào làm source chính
- khi nào cần mở evidence docs để tăng độ chắc chắn
- khi nào không cần source code mà vẫn có thể viết report đủ sâu

## Điều Quan Trọng Nhất Phải Nhớ

Bạn có thể dùng bộ docs này như gói tri thức độc lập về:

- bài toán
- phạm vi sản phẩm
- capability
- actors và role boundary
- kiến trúc ở mức đủ sâu
- data model
- API families
- vận hành và incident boundary
- diagram mức cao và mức thấp

Nhưng bạn không nên biến mọi câu trong docs thành khẳng định tuyệt đối về từng dòng code hiện tại.

Rule ngắn:

- docs chính dùng để hiểu và mô tả hệ thống
- evidence docs dùng để biết claim nào đã được kiểm chứng mạnh tới đâu

Rule còn ngắn hơn cho external reader:

- muốn hiểu hệ thống: ưu tiên docs chính
- muốn chọn hình đúng: ưu tiên diagram guide + catalog
- muốn biết câu nào nên viết cứng, câu nào nên viết mềm: mở evidence docs

Đừng dùng handoff/plan/spec trong repo như tài liệu chính thức cho report public. Các file đó là raw working notes: có thể chứa phần đã làm xong, phần đã đổi hướng, hoặc intent cũ. Khi một ý từ raw note còn giá trị, nó phải được kiểm chứng lại và hấp thụ vào docs chính trước khi được trích như mô tả hệ thống hiện tại.

## Nếu Bạn Chỉ Có 30 Phút

Đọc đúng thứ tự này:

1. `docs/README.md`
2. `docs/00-overview/README.md`
3. `docs/01-business/brd-prd-scope.md`
4. `docs/01-business/capability-model-and-product-positioning.md`
5. `docs/03-architecture/architecture-overview.md`
6. `docs/06-data/database-design-erd-data-dictionary.md`
7. `docs/11-diagrams/README.md`

Sau 30 phút, bạn phải trả lời được:

- Suar giải bài toán gì
- Suar khác task board thường ở đâu
- các capability chính là gì
- hệ thống chia thành những khối kỹ thuật nào
- nên mở ERD/diagram nào trước

Nếu sau 30 phút mà bạn vẫn phải dò sang code mới hiểu khung chính, nghĩa là bạn đang đi sai lộ trình đọc chứ không phải vì docs bắt buộc phải phụ thuộc code.

## Nếu Bạn Cần Viết Report Đồ Án Hoặc Báo Cáo Kỹ Thuật

Đọc theo thứ tự này:

### 1. Bức tranh tổng quan

- `docs/README.md`
- `docs/00-overview/README.md`

Mục tiêu:

- biết nên tin file nào trước
- biết taxonomy docs được tổ chức ra sao
- biết lộ trình đọc theo vai trò

### 2. Bài toán, phạm vi, và định vị sản phẩm

- `docs/01-business/brd-prd-scope.md`
- `docs/01-business/capability-model-and-product-positioning.md`
- `docs/01-business/feature-specification.md`

Mục tiêu:

- mô tả được bài toán kinh doanh
- giải thích được vì sao task, review, dispute, profile, marketplace dính với nhau
- liệt kê được feature/capability đã có dấu vết thật trong hệ thống

### 3. Yêu cầu và business rules

- `docs/02-requirements/srs.md`
- `docs/02-requirements/user-story-use-case-business-rule.md`
- `docs/02-requirements/requirements-traceability-matrix.md`

Mục tiêu:

- viết được requirement section
- nối được business need với functional/non-functional requirements
- không nói quá tay ở các chỗ hệ thống chưa chứng minh đủ

Gợi ý rất thực dụng:

- `srs.md` là nơi chốt requirement hệ thống
- `user-story-use-case-business-rule.md` là nơi đổi requirement sang language gần người dùng hơn
- `requirements-traceability-matrix.md` là nơi chỉ đường khi bạn muốn biết file nào nên được trích trước

### 4. Kiến trúc và module

- `docs/03-architecture/architecture-overview.md`
- `docs/03-architecture/development-guidelines.md`

Mục tiêu:

- mô tả được Suar là modular monolith
- nêu được các layer chính
- nêu được runtime dependencies quan trọng
- giải thích được boundary giữa `user`, `org admin`, `system admin`

### 5. Data và API

- `docs/06-data/database-design-erd-data-dictionary.md`
- `docs/06-data/api-specification.md`
- `docs/05-api/api-landscape-and-governance.md`

Mục tiêu:

- viết được phần database design / ERD narrative
- mô tả được route families, canonical APIs, compatibility APIs
- giải thích được data groups chính

### 6. Diagram và hình minh họa

- `docs/11-diagrams/README.md`
- diagram high-level trong `docs/11-diagrams/Architecture/`
- diagram đúng concern trong `docs/11-diagrams/Action/`, `Sequence/`, `ERD/`, `State/`

Mục tiêu:

- chọn đúng hình cho đúng chương report
- không nhét low-level diagram vào phần tổng quan
- không dùng một diagram quá tải để giải thích mọi thứ

### 7. Kiểm thử, vận hành, và bằng chứng

- `docs/08-testing/test-case-matrix.md`
- `docs/09-operations/production-incident-first-response.md`
- `docs/09-operations/runbook-monitoring-maintenance.md`
- `docs/12-evidence/README.md`
- `docs/12-evidence/workstream-status-audit.md`

Mục tiêu:

- viết được phần test strategy / verification
- viết được phần deployment-operability / incident readiness
- biết claim nào là verified current, claim nào chỉ là historical context hoặc target state

## Cách Dùng Diagram Khi Viết Report

### Quota chọn hình an toàn cho mỗi chapter

Nếu bạn đang viết report/đồ án mà người đọc không có source code, hãy dùng quota rất thực dụng này:

- `1` diagram level cao để mở đầu chapter
- tối đa `2` diagrams level thấp để chứng minh flow hoặc data

Nếu một chapter cần hơn mức này chỉ để người đọc hiểu ý chính, thường là:

- bạn đang chọn sai level diagram
- bạn đang nhét quá nhiều concern vào cùng một chapter
- hoặc diagram low-level bạn chọn đang quá dày
### Khi viết phần tổng quan hệ thống

Ưu tiên:

- `Architecture/01-system-architecture/overview/arch_01_system.mmd`
- `Architecture/01-system-architecture/high-level/arch_02_layer.mmd`
- `Package/01-overview/overview/pkg_01_overview.mmd`

Không nên mở đầu bằng:

- ERD physical
- sequence quá chi tiết
- state diagram chỉ đúng cho một sub-flow nhỏ

### Khi viết phần deployment, security, hoặc external integration

Chọn đúng một high-level diagram rồi mới xuống một runtime concern:

- deployment hiện tại: `Architecture/01-system-architecture/high-level/arch_05_deployment_topology.mmd`
- trust boundary và request protection: `Architecture/01-system-architecture/high-level/arch_06_security_trust_boundaries.mmd`
- Clawagent dispute advisory: `Architecture/01-system-architecture/low-level/arch_07_ai_dispute_integration.mmd`
- attachment/file-storage gap: `Architecture/01-system-architecture/low-level/arch_08_file_attachment_storage_runtime.mmd`
- Redis session/token/cache separation: `Architecture/01-system-architecture/low-level/arch_09_redis_runtime_separation.mmd`

Không mô tả app-local Drive như durable production storage: Docker Compose hiện chưa khai báo named volume cho nó, và attachment command hiện mới lưu metadata/file path do caller cung cấp.

### Khi viết phần nghiệp vụ

Ưu tiên:

- action overview đúng domain
- user-flow hoặc sequence đúng scenario

Ví dụ:

- marketplace/profile: dùng profile pipeline + talent sourcing diagrams
- review/dispute: dùng action/sequence của review dispute lifecycle

### Khi viết phần cơ sở dữ liệu

Ưu tiên theo ba level:

1. conceptual: mô tả nhóm entity lớn bằng lời trước
2. logical: chọn đúng ERD theo domain slice
3. physical: dùng data dictionary để giải thích bảng/cột chính

Không nên:

- dán toàn bộ ERD rồi bắt người đọc tự đoán domain
- dùng một ERD duy nhất để thay cho toàn bộ giải thích bằng lời

### Dense diagram watchlist cho external reader

Một số file hiện vẫn đúng và hữu ích, nhưng khá dày. Không nên dùng chúng làm hình mở đầu chapter:

- `docs/11-diagrams/ERD/01-user-auth-skills/overview/logical_erd_01_user_auth_skills.mmd`
- `docs/11-diagrams/ERD/03-task-marketplace/overview/logical_erd_03_task_marketplace.mmd`
- `docs/11-diagrams/ERD/04-review-governance/README.md`
- `docs/11-diagrams/Action/01-task-management/high-level/act_01b_task_workflow.mmd`
- `docs/11-diagrams/Action/07-profile-skills/high-level/act_07b_skill_management.mmd`
- `docs/11-diagrams/Sequence/05-organization-membership/high-level/seq_10_org_join_request.mmd`

Rule dùng an toàn:

- chỉ mở các file này sau khi chapter đã có context bằng narrative hoặc high-level diagram
- nếu dùng trong report, nên có một câu mở đường giải thích trước người đọc đang nhìn low-level concern nào

Một rule rất quan trọng:

- không dùng tên family diagram để đoán level
- phải hỏi trước: chapter này cần overview hay cần chứng minh một flow/data slice cụ thể
- rồi mới chọn `Architecture/Package/Action overview` hay `Sequence/State/ERD`

## Cách Trích Dẫn An Toàn Từ Bộ Docs

Khi viết report, nên trích theo kiểu:

- “Theo `docs/03-architecture/architecture-overview.md`, hệ thống được tổ chức như một modular monolith…”
- “Theo `docs/06-data/database-design-erd-data-dictionary.md`, nhóm dữ liệu lõi gồm user/auth, organization/project, task/marketplace, review…”
- “Theo `docs/09-operations/runbook-monitoring-maintenance.md`, health endpoint có credential gate và search runtime được xem là dependency production riêng…”

Nếu cần nói mức độ chắc chắn, dùng thêm:

- `docs/12-evidence/source-register.md`
- `docs/12-evidence/workstream-status-audit.md`

Hai file này giúp bạn nói rõ:

- claim nào là verified current
- claim nào chỉ là intent / historical / partially stale

## Những Câu Không Nên Viết Quá Tay

Đừng tự động viết:

- “mọi feature trong plan đều đã triển khai xong”
- “mọi flow đã được chứng minh end-to-end”
- “docs/superpowers/specs là runtime hiện tại”
- “handoff chứng minh hệ thống đã hoàn tất”
- “spec/plan là tài liệu chính thức của hệ thống”

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. lộ trình đọc nào phù hợp cho bài report hoặc đồ án của mình
2. file nào dùng để mô tả business, architecture, data, API, testing, operations, và diagrams
3. claim nào cần quay sang evidence docs để tăng độ chắc chắn trước khi trích dẫn

Thay vào đó, viết theo boundary an toàn hơn:

- “repository hiện cho thấy…”
- “docs chính hiện xác nhận…”
- “evidence hiện tại đủ mạnh để kết luận…”
- “một số workstream vẫn được đánh dấu partially stale trong evidence docs…”

## Bộ Docs Này Có Thể Thay Code Tới Mức Nào

Thực tế:

- nó đủ để hiểu hệ thống ở mức report, audit, design, scope, capability, API family, data model, và operations boundary
- nó không nên được dùng để bịa thêm implementation detail không có trong docs

Một cách nói chuẩn hơn:

`Bộ docs này không phải source code, nhưng phải đủ giàu thông tin để đóng vai trò mô hình hóa độc lập của hệ thống cho người không có quyền xem code.`

## Nếu Bạn Cần Một Bộ Reading Pack Rất Ngắn Để Mang Đi

Nếu chỉ được mang 10 file ra ngoài, ưu tiên:

1. `docs/README.md`
2. `docs/00-overview/README.md`
3. `docs/01-business/brd-prd-scope.md`
4. `docs/01-business/capability-model-and-product-positioning.md`
5. `docs/01-business/feature-specification.md`
6. `docs/03-architecture/architecture-overview.md`
7. `docs/06-data/database-design-erd-data-dictionary.md`
8. `docs/06-data/api-specification.md`
9. `docs/11-diagrams/README.md`
10. `docs/12-evidence/workstream-status-audit.md`

Nếu được mang thêm đúng `8` diagram source, ưu tiên:

1. `docs/11-diagrams/Architecture/01-system-architecture/overview/arch_01_system.mmd`
2. `docs/11-diagrams/Architecture/01-system-architecture/high-level/arch_02_layer.mmd`
3. `docs/11-diagrams/Package/01-overview/overview/pkg_01_overview.mmd`
4. `docs/11-diagrams/Action/01-task-management/overview/act_01_task_definition_overview.mmd`
5. `docs/11-diagrams/Action/01-task-management/overview/act_01_task_assignment_path_overview.mmd`
6. `docs/11-diagrams/Action/01-task-management/overview/act_01_task_operation_outcome_overview.mmd`
7. `docs/11-diagrams/Action/01-task-management/overview/act_01_task_cancellation_followup_overview.mmd`
8. `docs/11-diagrams/ERD/03-task-marketplace/overview/logical_erd_03_task_marketplace.mmd`

Lý do chọn pack này:

- đủ để kể bức tranh hệ thống
- đủ để kể codebase/module landscape
- đủ để kể một capability delivery core
- đủ để minh họa một data slice trung tâm

Nếu chapter của bạn tập trung vào review/dispute hoặc profile/talent, thay file `Action` và `ERD` tương ứng bằng slice đúng domain đó.

Nếu bạn được mang nhiều hơn `5` diagram nhưng vẫn muốn giữ bộ gọn, ưu tiên tăng theo thứ tự:

1. `docs/11-diagrams/Action/03-review/README.md`
2. `docs/11-diagrams/Action/07-profile-skills/README.md`
3. `docs/11-diagrams/ERD/04-review-governance/README.md`
4. `docs/11-diagrams/ERD/01-user-auth-skills/overview/logical_erd_01_user_auth_skills.mmd`

Không nên tăng bộ mang đi bằng cách:

- thêm class diagrams trước
- thêm nhiều sequence detail liên tiếp
- thêm một mega data chapter toàn low-level ERD

## Reader Promise

Nếu một người ngoài dự án đọc theo guide này mà vẫn:

- không hiểu Suar là gì
- không biết bắt đầu từ diagram nào
- không phân biệt được fact với target state
- phải hỏi xin code chỉ để hiểu phần narrative chính

thì bộ docs hiện tại vẫn chưa đạt mục tiêu độc lập.
