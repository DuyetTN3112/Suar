# Suar Documentation Portal

| Field | Value |
|---|---|
| Status | Active |
| Audience | New joiner, executive, product, developer, tester, DevOps, on-call responder |
| Purpose | Cổng vào duy nhất cho toàn bộ `docs/` để người đọc biết đọc gì trước, tin gì, và hành động gì khi cần nhanh |
| Source of Truth | Hệ thống hiện tại: code, routes, tests, config, schema, và verified docs trong `docs/` |
| Last Reviewed | 2026-07-19 |
| Review Cycle | Mỗi thay đổi lớn về feature, architecture, data model, deploy, incident flow |
| Owner | Engineering team |
| Stale Risk | Cao nếu taxonomy, route, data model, hoặc operational flow đổi mà không cập nhật portal |

## Why This Portal Exists

`docs/` phải là nơi người đọc có thể tin ngay, kể cả khi:

- mới vào dự án
- đến từ role khác
- đang phải xử lý production incident
- cần hiểu hệ thống mà chưa thể đào code

Portal này không cố nhồi toàn bộ chi tiết vào một file. Mục tiêu là:

1. Chỉ đúng điểm bắt đầu theo tình huống.
2. Giải thích trước khi điều hướng sang file khác.
3. Giảm tối đa việc phải dò ngược code, diagram, rồi lại quay lại docs.

File này phải tự đủ để người đọc trả lời ngay:

- mình đang ở tình huống nào
- nên mở pack nào trước
- file nào là nguồn chính cho câu hỏi của mình
- khi nào cần sang evidence docs để tăng độ chắc chắn

## First Rule Of This Folder

Người đọc không được buộc phải:

- mở 4-5 file chỉ để hiểu một ý chính
- đọc diagram trước khi hiểu ngữ cảnh
- mở code chỉ để giải mã khái niệm cơ bản

Nếu một file chưa tự đứng độc lập được, file đó chưa đạt chuẩn.

## Current Runtime Notes

Các điểm mới nhất cần nhớ trước khi đọc sâu:

- skill taxonomy canonical hiện là `technology`, `engineering`, `soft_skill`, `delivery`; `technical` cũ chỉ là legacy input trong migration/spec cũ
- audit runtime đã có enterprise metadata, `audit_event_scopes`, redaction helper, và hash helper; đọc security/data docs trước khi viết claim về audit
- `docs/superpowers/*`, handoff, và root scratch docs vẫn là working inputs; claim chỉ thành truth khi đã được promote vào docs chính và đối chiếu code/schema/test

## External Package Promise

Folder `docs/` phải đủ mạnh để có thể:

- zip riêng và gửi cho người ngoài team
- dùng làm nguồn chính để viết report, luận văn, hoặc tài liệu đồ án
- giải thích hệ thống cho người không được xem code

Điều này không có nghĩa docs phải copy toàn bộ code.

Nó có nghĩa:

- docs phải mang đủ kiến thức để hiểu hệ thống một cách độc lập
- docs phải nói rõ runtime boundary, data boundary, role boundary, và caveat quan trọng
- diagram phải giúp người ngoài nhìn phát hiểu mental model thay vì bắt họ đoán từ code không được phép xem
- nếu một claim chỉ đúng khi có code bên cạnh để giải mã, claim đó chưa được viết đủ tốt

## Language Policy

- toàn bộ docs narrative chính trong `docs/` dùng tiếng Việt
- technical terms có thể giữ English khi đó là cách gọi chính xác nhất
- diagram source trong `docs/11-diagrams/` giữ English theo chuẩn kỹ thuật thông dụng
- taxonomy hiện tại không duy trì nhánh narrative English riêng

## Start Here By Situation

### Production Incident Or Service Outage

Đọc theo thứ tự:

1. [Production Incident First Response](./09-operations/production-incident-first-response.md)
2. [Runbook, Monitoring, Maintenance](./09-operations/runbook-monitoring-maintenance.md)
3. [Architecture Overview](./03-architecture/architecture-overview.md)
4. [Diagram Guide](./11-diagrams/README.md)

Khi production lỗi, mục tiêu đầu tiên không phải là “hiểu hết hệ thống”. Mục tiêu là:

- biết hệ thống gồm những khối nào
- biết chỗ nào dễ hỏng
- biết kiểm tra theo thứ tự nào
- biết khi nào cần đào sâu hơn

### New Joiner Or Cross-Role Reader

Đọc theo thứ tự:

1. [Overview Pack](./00-overview/README.md)
2. [Business Folder Guide](./01-business/README.md)
3. [Capability Model And Product Positioning](./01-business/capability-model-and-product-positioning.md)
4. [Architecture Overview](./03-architecture/architecture-overview.md)
5. [Business And Product Pack](./01-business/brd-prd-scope.md)
6. [Requirements Pack](./02-requirements/README.md)
7. [Diagram Guide](./11-diagrams/README.md)

Nếu chỉ đọc được `3` file đầu trong luồng này mà vẫn chưa dựng được mental model chung, ưu tiên đọc kỹ lại `Overview Pack` và `Business And Product Pack` trước khi nhảy sang diagram hoặc code.

### External Reader / Thesis Report Writer

Nếu người đọc không có quyền mở repo code, đọc theo thứ tự:

1. [External Reader And Report Writing Guide](./00-overview/external-reader-report-writing-guide.md)
2. [Overview Pack](./00-overview/README.md)
3. [Business Scope And Product Direction](./01-business/brd-prd-scope.md)
4. [Capability Model And Product Positioning](./01-business/capability-model-and-product-positioning.md)
5. [Feature Specification](./01-business/feature-specification.md)
6. [Architecture Overview](./03-architecture/architecture-overview.md)
7. [Database Design, ERD, Data Dictionary](./06-data/database-design-erd-data-dictionary.md)
8. [API Specification](./06-data/api-specification.md)
9. [Diagram Guide](./11-diagrams/README.md)
10. [Architecture Diagram Catalog](./03-architecture/architecture-diagram-catalog.md)

Mục tiêu của luồng đọc này:

- hiểu bài toán và phạm vi sản phẩm
- hiểu capability, flow, và kiến trúc chính
- hiểu data model và API surface mà không cần xem code
- đủ chất liệu để viết report bên ngoài repo

Nếu chỉ được mang một “diagram pack” tối thiểu ra ngoài cùng bộ docs, ưu tiên:

1. `docs/11-diagrams/Architecture/01-system-architecture/overview/arch_01_system.mmd`
2. `docs/11-diagrams/Architecture/01-system-architecture/high-level/arch_02_layer.mmd`
3. `docs/11-diagrams/Package/01-overview/overview/pkg_01_overview.mmd`
4. một `Action/*/overview/*_overview.mmd` đúng domain chapter đang viết
5. một `ERD/*/{overview,high-level,low-level}/*` đúng domain slice chapter đang viết

### Executive, Lead, Or Manager

Đọc theo thứ tự:

1. [Overview Pack](./00-overview/README.md)
2. [Capability Model And Product Positioning](./01-business/capability-model-and-product-positioning.md)
3. [Business Scope And Product Direction](./01-business/brd-prd-scope.md)
4. [Governance And Delivery Pack](./10-project-management/governance-and-delivery-pack.md)
5. [Risk Log](./10-project-management/risk-log.md)

### Developer

Đọc theo thứ tự:

1. [Architecture Overview](./03-architecture/architecture-overview.md)
2. [API Landscape And Governance](./05-api/api-landscape-and-governance.md)
3. [Database Design, ERD, Data Dictionary](./06-data/database-design-erd-data-dictionary.md)
4. [Development Guidelines](./03-architecture/development-guidelines.md)
5. [Diagram Guide](./11-diagrams/README.md)

### Tester / QA

Đọc theo thứ tự:

1. [Feature Specification](./01-business/feature-specification.md)
2. [SRS](./02-requirements/srs.md)
3. [Requirements Traceability Matrix](./02-requirements/requirements-traceability-matrix.md)
4. [Testing Folder Guide](./08-testing/README.md)
5. [Test Case Matrix](./08-testing/test-case-matrix.md)
6. [Runbook, Monitoring, Maintenance](./09-operations/runbook-monitoring-maintenance.md)

Điểm rất quan trọng:

- `Test Case Matrix` là bản đồ evidence kiểm thử, không phải báo cáo một lần chạy test cụ thể
- nếu cần kết luận “đang green” hay “đã verify lại”, phải quay sang execution evidence hoặc tự chạy command phù hợp

### DevOps / Platform / On-Call

Đọc theo thứ tự:

1. [Production Incident First Response](./09-operations/production-incident-first-response.md)
2. [Runbook, Monitoring, Maintenance](./09-operations/runbook-monitoring-maintenance.md)
3. [Architecture Overview](./03-architecture/architecture-overview.md)
4. [Security, Access, Privacy, Audit](./07-security/access-control-security-privacy-audit.md)
5. [Diagram Guide](./11-diagrams/README.md)

## What Each Section Owns

### Root-level governance files

Trả lời:

- AI agent phải viết/sửa docs theo chuẩn nào
- docs nào là writing standard, không phải product/runtime evidence
- khi nào phải ưu tiên clarity, evidence, lifecycle, và external-reader readability

File chính:

- `DOCUMENTATION_WRITING_STANDARD_FOR_AI.md`

Rule:

- đọc file này trước khi giao hoặc nhận việc viết/sửa/audit docs
- không dùng file này để chứng minh hệ thống có một feature runtime nào
- nếu conflict giữa style guidance và runtime evidence, runtime evidence quyết định fact; writing standard quyết định cách viết fact đó

### `00-overview`

Trả lời:

- Suar là gì
- hệ thống giải bài toán gì
- người mới nên hiểu mental model nào trước

### `01-business`

Trả lời:

- nên mở business docs nào trước
- Suar thực chất là loại hệ thống gì
- capability model nên được hiểu ra sao
- phạm vi sản phẩm
- bài toán nghiệp vụ
- feature nào tồn tại
- giá trị cho người dùng và tổ chức

### `02-requirements`

Trả lời:

- hệ thống phải làm gì
- business rule nào ràng buộc hành vi
- test và design trace về requirement nào

### `03-architecture`

Trả lời:

- hệ thống chia khối ra sao
- request chạy qua những lớp nào
- module nào chịu trách nhiệm phần nào

### `04-design`

Trả lời:

- thiết kế UI, design system, wireframe, prototype inventory

### `05-api`

Trả lời:

- bề mặt API nào tồn tại
- governance, versioning, contract boundary ra sao

### `06-data`

Trả lời:

- dữ liệu nào đang được lưu
- entity nào là lõi
- người đọc nên dùng ERD level nào

### `07-security`

Trả lời:

- phân quyền
- privacy boundary
- audit surface
- các lưu ý bảo mật chính

### `08-testing`

Trả lời:

- nên mở test docs nào trước
- test coverage đang map với requirement nào
- test case nào đang đại diện cho feature nào
- file test nào là bằng chứng mạnh, file nào chỉ là bằng chứng trung bình

### `09-operations`

Trả lời:

- production có vấn đề thì kiểm tra gì trước
- health, monitoring, maintenance surface nào có thật trong hệ thống
- đội vận hành có thể tin file nào trước

### `10-project-management`

Trả lời:

- roadmap
- risk
- change
- meeting
- governance delivery

### `11-diagrams`

Trả lời:

- nên mở diagram nào theo câu hỏi nào
- diagram level cao và level thấp khác nhau ra sao
- khi nào phải tách diagram mới
- diagram pack nào đủ an toàn để mang ra ngoài repo mà vẫn dễ hiểu

### `12-evidence`

Trả lời:

- nên mở evidence/audit docs nào trước
- docs này đang dựa vào nguồn nào
- độ phủ documentation tới đâu
- chỗ nào còn thiếu hoặc chưa verify

Lưu ý:

- `12-evidence` là official audit/control layer, không thay thế business, architecture, API, testing, hoặc operations docs.
- raw draft, handoff, demo audit, plan, và spec chỉ được dùng làm input sau khi đi qua `12-evidence/working-document-promotion-policy.md`.
- scratch draft ở root repo không được cite; nếu còn ý đúng thì phải promote vào docs chính rồi có thể xóa draft.
- legacy narrative ở root repo phải đi qua `12-evidence/legacy-source-retirement-audit.md`; sau khi hấp thụ xong, file gốc có thể xóa mà không làm mất source of truth.

## Reading Rules

1. Đọc file gần với câu hỏi nhất trước.
2. Chỉ mở diagram sau khi đã hiểu câu hỏi cần nó trả lời.
3. Chỉ mở code khi docs đã chỉ rõ code dùng để verify chi tiết nào.
4. Nếu phải nhảy hơn 2 file để hiểu một ý chính, xem đó là bug của docs.
5. Nếu một external reader không có code vẫn chưa hiểu được ý chính, xem đó là bug của docs chứ không phải lỗi của reader.

## When To Stop Here

Dừng ở portal này khi bạn đã biết:

1. mình đang đọc theo vai trò hoặc tình huống nào
2. file nào là điểm vào đúng nhất cho câu hỏi hiện tại
3. có cần sang diagram, operations, data, hay evidence hay không

Nếu vẫn chưa biết nên mở file nào sau khi đọc portal này, đó là lỗi điều hướng của bộ docs.

## Current Documentation Priorities

Bộ docs hiện đang ưu tiên làm tốt ba việc trước:

1. Làm cổng vào rõ cho từng role và từng tình huống.
2. Làm cho architecture, operations, và diagrams đủ độc lập để đọc riêng.
3. Giảm mismatch giữa tên thư mục hiện tại `00..12` và các đường dẫn cũ trong nội dung.

## Known Gaps

Các artifact sau vẫn cần tiếp tục làm rõ hoặc tách riêng hơn nữa:

- backup/restore playbook riêng
- deploy/rollback checklist riêng
- on-call escalation policy riêng
- ownership matrix chi tiết theo từng file docs

## How To Keep This Folder Alive

Mỗi khi thay đổi một trong các phần sau, phải rà lại `docs/`:

- route surface
- data model
- incident handling flow
- deployment/runtime dependency
- permission rule
- feature lifecycle
- diagram scope

Nếu code đã đổi mà docs chưa đổi, repo mất source of truth. File này tồn tại để ngăn điều đó.
