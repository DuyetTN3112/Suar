# Overview Pack

| Field | Value |
|---|---|
| Status | Active |
| Audience | Người mới, manager, developer, tester, DevOps |
| Purpose | Tạo shared mental model trước khi người đọc đi vào business, architecture, data, hoặc operations |
| Source of Truth | `docs/README.md`, business docs, architecture docs, và cấu trúc hệ thống đã được xác nhận |
| Last Reviewed | 2026-07-10 |
| Review Cycle | Khi product scope, module boundary, hoặc core workflows đổi |
| Owner | Engineering + product |
| Stale Risk | Trung bình đến cao |

## What This Pack Must Achieve

Sau khi đọc xong nhóm overview, một người chưa biết Suar vẫn phải trả lời được:

- Suar là hệ thống gì
- ai dùng hệ thống
- đâu là capability chính
- hệ thống chia mảng trách nhiệm thế nào
- nếu cần đọc tiếp thì nên đọc file nào trước

Và nếu người đó không được xem code, họ vẫn phải có đủ context để:

- mô tả Suar trong report bên ngoài repo
- giải thích capability chính, actors, và boundary quan trọng
- biết nên dùng docs và diagram nào làm evidence tiếp theo

## Read This Pack In Order

1. [Documentation Portal](../README.md)
2. [External Reader And Report Writing Guide](./external-reader-report-writing-guide.md)
3. [Capability Model And Product Positioning](../01-business/capability-model-and-product-positioning.md)
4. [Business Scope And Product Story](../01-business/brd-prd-scope.md)
5. [Architecture Overview](../03-architecture/architecture-overview.md)
6. [Production Incident First Response](../09-operations/production-incident-first-response.md)

Rule thực dụng:

- không cần đọc hết cả 6 file để bắt đầu hiểu Suar
- nhưng cũng không nên nhảy thẳng vào diagram hoặc API/data docs nếu chưa qua ít nhất `Business Scope And Product Story` và `Architecture Overview`

## What Readers Usually Need

### If You Are New

Đọc:

1. [Capability Model And Product Positioning](../01-business/capability-model-and-product-positioning.md)
2. [Business Scope And Product Story](../01-business/brd-prd-scope.md)
3. [Architecture Overview](../03-architecture/architecture-overview.md)
4. [Diagram Guide](../11-diagrams/README.md)

### If You Are Writing A Report Without Code Access

Đọc:

1. [External Reader And Report Writing Guide](./external-reader-report-writing-guide.md)
2. [Capability Model And Product Positioning](../01-business/capability-model-and-product-positioning.md)
3. [Business Scope And Product Story](../01-business/brd-prd-scope.md)
4. [Feature Specification](../01-business/feature-specification.md)
5. [Architecture Overview](../03-architecture/architecture-overview.md)
6. [Database Design, ERD, Data Dictionary](../06-data/database-design-erd-data-dictionary.md)
7. [Diagram Guide](../11-diagrams/README.md)

Đủ để viết tốt những phần sau:

- bài toán và scope
- capability chính
- kiến trúc tổng thể
- flow nghiệp vụ chính
- data model theo domain

Chưa nên dùng riêng pack overview để kết luận:

- mọi business rule chi tiết
- mọi API contract field-level
- mọi runtime edge case production

### If You Need Fast System Orientation

Đọc:

1. [Architecture Overview](../03-architecture/architecture-overview.md)
2. [Runbook, Monitoring, Maintenance](../09-operations/runbook-monitoring-maintenance.md)

Khi nào dùng lộ trình này:

- bạn đã biết Suar là gì ở mức rất cơ bản
- bạn cần đi nhanh vào khối kỹ thuật hoặc production boundary
- bạn không cần đọc lại toàn bộ câu chuyện business trước

### If You Need Requirement-Level Detail

Đọc:

1. [SRS](../02-requirements/srs.md)
2. [Requirements Traceability Matrix](../02-requirements/requirements-traceability-matrix.md)

## Navigation Promise

Nhóm overview không được biến thành thư mục “giới thiệu chung chung”. Mỗi file trong đây phải:

- giúp người đọc ra quyết định đọc tiếp
- tóm tắt đúng nhưng không làm quá đơn giản
- không đẩy người đọc sang diagram hoặc code chỉ để hiểu ý cơ bản

Nếu một người ngoài dự án chỉ có file zip `docs/` mà vẫn không dựng được mental model đúng về hệ thống sau khi đọc nhóm overview, thì overview chưa đạt.

Nếu overview không giúp người đọc định hướng nhanh hơn, overview thất bại.

Một dấu hiệu overview đang làm đúng việc:

- người đọc biết `nên dừng ở level nào`
- biết `chưa cần mở gì`
- và biết `vì sao chưa cần mở`

## Khi Nào Dừng Ở Pack Này

Dừng ở pack này khi bạn đã biết:

1. Suar là hệ thống gì ở mức mental model chung
2. file nào là điểm đọc tiếp theo đúng nhất cho vai trò hoặc câu hỏi của mình
3. có cần sang business, architecture, operations, requirements, hay diagrams để đọc sâu hơn hay không
