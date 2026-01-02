# Architecture Pack

| Field           | Value                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| Status          | Active                                                                                                     |
| Audience        | Developer, tester, DevOps, architect, tech lead, curious manager                                           |
| Purpose         | Chỉ ra hệ thống được chia khối ra sao, đọc file nào để hiểu đúng mức chi tiết, và khi nào cần diagram      |
| Source of Truth | `start/routes/*`, `app/modules/*`, `app/composition/*`, `config/*`, `database/schema.ts`, verified docs    |
| Review Cycle    | Khi module boundary, request flow, composition rule, runtime dependency, hoặc platform capability thay đổi |
| Owner           | Engineering                                                                                                |
| Stale Risk      | Cao                                                                                                        |

## Read In This Order

1. [Architecture Overview](./architecture-overview.md)
2. [Application Boundary](./application-boundary.md)
3. [Suar Module And Layer Architecture Contract](./suar-module-layer-contract.md)
4. [Architecture Diagram Catalog](./architecture-diagram-catalog.md)
5. [Development Guidelines](./development-guidelines.md)
6. [Module Layer And Boundary Audit](./module-layer-boundary-audit-2026-07-23.md) — detailed evidence ledger

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
- tại sao Command/Query là use-case owner, còn service chỉ là collaborator
- factory nào là inbound contract và factory nào thuộc composition
- `support`, `serializer`, `builder`, `utils` phải được phân loại về đâu
- module nào là business core
- Redis, PostgreSQL, session, health, notifications và Audit nằm ở đâu trong runtime
- vì sao Audit là evidence source canonical và personal activity chỉ là projection có policy
- `/work` đại diện cho personal assigned-work surface nào
- diagram nào phù hợp khi cần zoom in

## Safe External Summary

Nếu cần một câu mô tả an toàn cho report hoặc đồ án, có thể dùng:

`Suar là một modular monolith theo use-case/CQRS: controller hoặc listener chuyển một intent vào đúng một Command/Query; Command/Query điều phối workflow, domain giữ rule, outbound port mô tả dependency, adapter chạm công nghệ hoặc module khác, còn composition chỉ dựng object graph.`

Đây là mental model canonical dùng thống nhất trong code, docs, diagram và report. Service hoặc
facade không phải use-case entry point; generic activity tracking không phải runtime component.

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
