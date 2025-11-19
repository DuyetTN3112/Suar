# Architecture Pack

| Field | Value |
|---|---|
| Status | Active |
| Audience | Developer, tester, DevOps, architect, tech lead, curious manager |
| Purpose | Chỉ ra hệ thống được chia khối ra sao, đọc file nào để hiểu đúng mức chi tiết, và khi nào cần diagram |
| Source of Truth | `start/routes/*`, `app/modules/*`, `config/*`, `database/schema.ts`, verified docs |
| Last Reviewed | 2026-07-10 |
| Review Cycle | Khi module boundary, request flow, runtime dependency, hoặc support services đổi |
| Owner | Engineering |
| Stale Risk | Cao |

## Read In This Order

1. [Architecture Overview](./architecture-overview.md)
2. [Architecture Diagram Catalog](./architecture-diagram-catalog.md)
3. [Development Guidelines](./development-guidelines.md)

## Fast Start By Situation

### Nếu bạn là người ngoài repo hoặc đang viết report

Đọc:

1. [Architecture Overview](./architecture-overview.md)
2. [Architecture Diagram Catalog](./architecture-diagram-catalog.md)
3. [Diagram Guide](../11-diagrams/README.md)

### Nếu bạn đang debug hoặc support incident

Đọc:

1. [Architecture Overview](./architecture-overview.md)
2. [Runbook, Monitoring, Maintenance](../09-operations/runbook-monitoring-maintenance.md)
3. [Architecture Diagram Catalog](./architecture-diagram-catalog.md)

### Nếu bạn là dev mới vào module

Đọc:

1. [Architecture Overview](./architecture-overview.md)
2. [API Landscape And Governance](../05-api/api-landscape-and-governance.md)
3. [Database Design, ERD, Data Dictionary](../06-data/database-design-erd-data-dictionary.md)

## Nếu Bạn Đang Mang Bộ Docs Ra Ngoài Repo

Đọc theo thứ tự:

1. [Architecture Overview](./architecture-overview.md)
2. [Architecture Diagram Catalog](./architecture-diagram-catalog.md)
3. [Diagram Guide](../11-diagrams/README.md)
4. [Database Design, ERD, Data Dictionary](../06-data/database-design-erd-data-dictionary.md)

Mục tiêu của lộ trình này:

- dựng được mental model kiến trúc mà không cần xem code
- biết nên dùng diagram bậc cao hay bậc thấp cho từng chương report
- biết runtime dependency nào là production-critical
- tránh dùng nhầm diagram detail để kể câu chuyện tổng quan

## What This Pack Answers

- Suar là monolith hay microservices
- request đi từ route tới domain và infra như thế nào
- module nào là business core
- Redis, PostgreSQL, session, health, notifications, audit nằm ở đâu trong runtime
- diagram nào phù hợp khi cần zoom in

## Safe External Summary

Nếu cần một câu mô tả an toàn cho report hoặc đồ án, có thể dùng:

`Architecture pack của Suar mô tả hệ thống như một modular monolith, trong đó lớp route/middleware/controller tiếp nhận request, action/domain xử lý nghiệp vụ, và infrastructure kết nối với PostgreSQL, Redis, cùng các runtime support services; phần diagram đi kèm giúp chọn đúng mức chi tiết thay vì buộc người đọc suy luận từ source code.`

## Nếu Bạn Chỉ Có Folder Docs Trong Tay

Pack này phải đủ để người đọc bên ngoài repo hiểu:

1. hệ thống được chia thành những khối nào
2. luồng request và runtime dependencies được tổ chức ra sao
3. lúc nào cần diagram mức cao, lúc nào cần xuống detail

Người đọc không nên phải mở code chỉ để trả lời câu hỏi kiến trúc mức nền.

## What This Pack Does Not Try To Do

- không thay thế API reference
- không thay thế data dictionary
- không thay thế detailed runbook
- không liệt kê toàn bộ class, function, hoặc query

## When To Open Diagrams

Chỉ mở diagram khi bạn đã biết mình đang hỏi gì:

- cần bức tranh tổng thể: mở architecture overview diagram
- cần luồng request: mở request-flow diagram
- cần capability business: mở action diagrams
- cần data/state cụ thể: mở ERD, DFD, state diagrams

Nếu chưa rõ câu hỏi, đọc lại [Architecture Overview](./architecture-overview.md) trước.

## What Not To Do

- không mở class diagram làm điểm vào đầu tiên
- không dùng sequence detail để kể chuyện tổng quan của cả hệ thống
- không lấy một ERD slice rồi giả như đã giải thích hết data model

## When To Stop Here

Dừng ở pack này khi bạn đã biết:

1. concern của mình nằm ở module boundary, request flow, hay runtime dependency
2. có cần sang API/data/operations docs hay không
3. nếu cần diagram thì cần diagram level cao hay level thấp
