# Operations Pack

| Field | Value |
|---|---|
| Status | Active |
| Audience | DevOps, on-call, backend dev, QA, tech lead, manager cần nắm risk vận hành |
| Purpose | Tập hợp điểm vào khi cần xác minh tình trạng hệ thống, xử lý production issue, hoặc kiểm tra khả năng vận hành |
| Source of Truth | `start/health.ts`, `start/routes/*`, `config/*`, `package.json`, verified runtime docs |
| Last Reviewed | 2026-07-10 |
| Review Cycle | Khi health checks, runtime dependencies, test gates, hoặc incident flow đổi |
| Owner | Engineering / platform |
| Stale Risk | Rất cao |

## Read In This Order

1. [Production Incident First Response](./production-incident-first-response.md)
2. [Runbook, Monitoring, Maintenance](./runbook-monitoring-maintenance.md)
3. [User Manual, Admin Guide, FAQ, Training](./user-manual-admin-guide-faq-training.md)

## Fast Start By Situation

### Nếu production đang lỗi ngay lúc này

Đọc:

1. [Production Incident First Response](./production-incident-first-response.md)
2. [Runbook, Monitoring, Maintenance](./runbook-monitoring-maintenance.md)

### Nếu đang viết phần operations cho report

Đọc:

1. [Runbook, Monitoring, Maintenance](./runbook-monitoring-maintenance.md)
2. [Production Incident First Response](./production-incident-first-response.md)
3. [Architecture Overview](../03-architecture/architecture-overview.md)

### Nếu đang train người mới trực incident

Đọc:

1. [Production Incident First Response](./production-incident-first-response.md)
2. [User Manual, Admin Guide, FAQ, Training](./user-manual-admin-guide-faq-training.md)

## What This Pack Must Deliver

Người trực sự cố phải đọc và hành động được nhanh. Vì vậy nhóm operations phải luôn trả lời được:

- hệ thống đang sống hay chết
- check gì trước
- bề mặt nào quan trọng nhất
- phần nào có evidence thật trong hệ thống
- phần nào hiện chưa có playbook chính thức

## Nếu Bạn Chỉ Có Folder Docs Trong Tay

Hãy coi folder này là điểm vào vận hành đầu tiên.

Người trực production hoặc người viết report bên ngoài không nên phải:

- mở code để đoán health endpoint ở đâu
- lục nhiều file mới hiểu thứ tự triage
- nhìn diagram trước rồi mới biết cần kiểm tra gì

Folder này phải đủ để giúp người đọc:

1. biết check gì trước khi hệ thống lỗi
2. biết giới hạn hiện tại của operations pack
3. biết lúc nào cần chuyển sang architecture, security, hay test docs

## Promise To The Reader

Nếu production đang lỗi, người đọc không nên bị bắt:

- đào diagram phức tạp trước
- dò nhiều route file chỉ để biết health check ở đâu
- tự đoán monitoring surface từ code

Tài liệu operations phải giúp người đọc bình tĩnh lại, không làm họ hoảng hơn.

## What Not To Do

- không bắt đầu bằng diagram nếu người đọc còn chưa biết check kỹ thuật đầu tiên là gì
- không suy luận health/monitoring surface chỉ từ tên route
- không nói quá tay như thể bộ operations pack đã có full enterprise playbook nếu evidence chưa có

## Khi Nào Dừng Ở Folder Này

Dừng ở folder này khi bạn đã biết:

1. file nào là điểm vào đúng nhất cho sự cố hoặc concern vận hành của mình
2. có đang ở mức incident-first response, runbook, hay user/admin operation
3. lúc nào cần sang architecture, security, testing, hay diagrams để đào sâu hơn
