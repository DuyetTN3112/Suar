# API Folder Guide

| Field | Value |
|---|---|
| Status | Active |
| Audience | Backend dev, frontend dev, QA, integrator, reviewer |
| Purpose | Chỉ người đọc đến đúng file khi cần hiểu API surface, API governance, security context, và flow liên quan |
| Source of Truth | `docs/05-api/*`, `docs/06-data/api-specification.md`, cited route files |
| Last Reviewed | 2026-07-10 |
| Review Cycle | Khi route surface, API boundary, hoặc API governance đổi |
| Owner | Engineering |
| Stale Risk | Cao |

## Mục đích

Thư mục này dùng làm điểm vào nhanh cho các tài liệu liên quan API trong `docs/`.

Nếu bạn đang cần:

- biết API nào tồn tại thật: mở `API Specification`
- biết API nên được hiểu theo boundary/gia đình nào: mở `API Landscape And Governance`
- biết security/access/audit nào ảnh hưởng API: mở `Security / Access / Audit context`

## Nếu Bạn Chỉ Có Folder Docs Trong Tay

Folder này phải đủ để người đọc bên ngoài code trả lời nhanh:

1. API surface nào đang tồn tại thật
2. nên đọc API theo route/spec hay theo governance
3. chỗ nào liên quan security, access control, hay audit boundary

Người đọc không nên phải mở route files trước chỉ để biết API family nào đáng tin hoặc đáng đọc.

## Tài liệu liên quan hiện có

- API Landscape And Governance: `./api-landscape-and-governance.md`
- API Specification: `../06-data/api-specification.md`
- Security / Access / Audit context cho API: `../07-security/access-control-security-privacy-audit.md`
- Flow / Sequence / DFD liên quan API behavior: `../11-diagrams/README.md`

## Ghi chú

Hệ thống hiện không tách mỗi route family thành một file API riêng cho từng bounded context. Nguồn chính vẫn là:

- `start/routes/*.ts`
- `docs/06-data/api-specification.md`
- `docs/05-api/api-landscape-and-governance.md`

Một câu nhớ ngắn:

`Muốn biết API có tồn tại không, nhìn route và specification. Muốn biết nên dùng và đọc nó thế nào, nhìn governance.`

## Khi Nào Dừng Ở Folder Này

Dừng ở folder này khi bạn đã biết:

1. concern của mình nằm ở API existence, API contract, hay API governance
2. file nào đang giữ phần giải thích chính cho concern đó
3. có cần sang security, data, hay diagrams để đọc sâu hơn hay không
