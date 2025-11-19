# Security Folder Guide

| Field | Value |
|---|---|
| Status | Active |
| Audience | Dev, QA, reviewer, security reviewer, DevOps, on-call |
| Purpose | Làm điểm vào rõ ràng cho security docs để khi cần điều tra nhanh không phải đoán mở file nào |
| Source of Truth | `docs/07-security/*`, route/config/runtime evidence liên quan |
| Last Reviewed | 2026-07-19 |
| Review Cycle | Khi auth, middleware, privacy handling, callback security, hoặc audit logging đổi |
| Owner | Engineering |
| Stale Risk | Cao |

## Mở File Nào Khi Nào

Nếu bạn đang gấp:

- muốn biết request nào public, route nào bị khóa, callback nào nhạy cảm: mở `access-control-security-privacy-audit.md`
- muốn biết dữ liệu nào dễ lộ hoặc cần cẩn thận hơn: mở `privacy-data-handling-context.md`

### Cần hiểu phân quyền, auth gate, callback protection, audit log

Mở:

- `./access-control-security-privacy-audit.md`

### Cần hiểu hệ thống đang giữ loại dữ liệu nào và lộ ra ở đâu

Mở:

- `./privacy-data-handling-context.md`

## Fast Start By Situation

### Nếu bạn đang debug access bug hoặc callback security

Đọc:

1. `./access-control-security-privacy-audit.md`
2. `../05-api/api-landscape-and-governance.md`
3. `../09-operations/production-incident-first-response.md`

### Nếu bạn đang viết report phần security/privacy

Đọc:

1. `./access-control-security-privacy-audit.md`
2. `./privacy-data-handling-context.md`
3. `../12-evidence/source-register.md`

### Nếu bạn là on-call hoặc reviewer

Đọc:

1. `./access-control-security-privacy-audit.md`
2. `../09-operations/runbook-monitoring-maintenance.md`

## Người Đọc Cần Biết Ngay

Folder này không phải legal policy folder.

Nó là technical security folder, dùng để trả lời nhanh:

- route nào public, route nào bị khóa
- quyền được chặn ở middleware nào
- callback nào đang mở ra ngoài
- hệ thống đang cầm loại dữ liệu nào
- audit/security evidence hiện nằm ở đâu

Một câu nhớ ngắn:

`Folder này nói về security kỹ thuật đang thấy trong hệ thống, không phải compliance story hoàn chỉnh.`

## Nếu Bạn Chỉ Có Folder Docs Trong Tay

Hãy dùng folder này để trả lời nhanh ba câu:

1. route hay callback nào là điểm nhạy cảm
2. hệ thống đang chặn truy cập ở những lớp nào
3. dữ liệu nào đang cần cẩn thận khi đọc, test, support, hoặc viết report

Người ngoài dự án không nên phải mở code trước rồi mới hiểu `/health`, AI callback, admin gate, hay profile sharing đang được bảo vệ ra sao.

## Điều Không Được Hiểu Sai

- có tài liệu ở đây không có nghĩa hệ thống đã được security review đầy đủ theo chuẩn compliance
- có context privacy ở đây không có nghĩa đã có privacy policy pháp lý hoàn chỉnh
- mọi claim mạnh về security đều phải bám vào config, route, middleware, command, schema, test hiện tại

## What Not To Do

- không dùng folder này như legal/compliance pack hoàn chỉnh nếu evidence hiện tại chưa chứng minh điều đó
- không suy access rule chỉ từ tên URL mà bỏ qua middleware/policy/runtime caveat
- không thấy callback là public rồi tự kết luận nó không có guard kỹ thuật

## Điểm Đọc Tiếp Theo

- `docs/05-api/api-landscape-and-governance.md`
- `docs/09-operations/production-incident-first-response.md`
- `docs/12-evidence/source-register.md`

## Khi Nào Dừng Ở Folder Này

Dừng ở folder này khi bạn đã biết:

1. concern của mình nằm ở access control, callback protection, hay privacy data context
2. file nào đang giữ phần giải thích chính
3. có cần sang operations, API, hay evidence docs để xác nhận sâu hơn hay không
