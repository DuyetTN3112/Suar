# Privacy Data Handling Context

| Field           | Value                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| Status          | Active                                                                                                        |
| Audience        | Dev, QA, reviewer, DevOps, product/ops reader cần hiểu dữ liệu hệ thống đang cầm                              |
| Purpose         | Ghi lại bối cảnh xử lý dữ liệu đã được code/schema/SQL xác nhận mà không giả vờ thay thế legal privacy policy |
| Source of Truth | route, model, schema, schema evidence, Audit/notification evidence hiện tại                                   |
| Last Reviewed   | 2026-07-10                                                                                                    |
| Review Cycle    | Khi thêm loại dữ liệu mới, đổi sharing model, đổi audit/event storage, hoặc đổi public exposure surface       |
| Owner           | Engineering                                                                                                   |
| Stale Risk      | Cao                                                                                                           |

## File Này Dùng Để Làm Gì

File này giúp người đọc trả lời nhanh:

- hệ thống đang giữ loại dữ liệu gì
- dữ liệu đó lộ ra ở surface nào
- dữ liệu nào là hồ sơ người dùng, dữ liệu nào là operational log
- đâu là privacy context kỹ thuật đã được xác nhận, đâu chưa phải legal policy

Nếu bạn đang:

- cần biết hệ thống đang cầm loại dữ liệu gì: đọc `Mental Model` rồi `Verified Data Categories`
- cần biết dữ liệu đó có thể lộ ra ở đâu: đọc `Verified Exposure Surfaces`
- cần biết file này không chứng minh điều gì: đọc `Điều File Này Chưa Chứng Minh`

## Điều Quan Trọng Phải Nói Rõ

Đây không phải:

- văn bản pháp lý chính thức
- privacy policy public-facing
- data retention policy hoàn chỉnh

Đây là technical context document, viết để người đọc không đoán mò dữ liệu hệ thống đang giữ.

## Mental Model

Suar không chỉ giữ dữ liệu hồ sơ cơ bản.

Hệ thống hiện cho thấy ít nhất bốn lớp dữ liệu cần quan tâm:

- account và identity
- profile, skill, trust, performance
- sharing/bookmark/recruiter interaction
- operational/audit/error/activity telemetry

Một câu nhớ ngắn:

`Suar không chỉ giữ profile người dùng. Nó còn giữ dữ liệu đánh giá, chia sẻ, và telemetry vận hành.`

## Verified Data Categories

### 1. Account And Identity Data

Những trường đã thấy rõ trong model/schema:

- email
- username
- avatar URL
- bio
- phone
- address
- timezone
- language

Ý nghĩa thực tế:

- đây không chỉ là auth account tối thiểu
- profile người dùng có chứa dữ liệu cá nhân và dữ liệu hiển thị

### 2. Profile, Talent, Capability Data

Các nhóm dữ liệu đã thấy:

- skills
- trust data
- credibility data
- performance stats
- work history
- profile snapshots
- talent bookmark notes/folder/rating

Ý nghĩa thực tế:

- hệ thống không chỉ lưu “CV tĩnh”
- hệ thống đang giữ cả dữ liệu đánh giá, dữ liệu năng lực, và dữ liệu chia sẻ hồ sơ

### 3. Operational And Telemetry Data

Các nhóm đã thấy:

- notifications payload
- audit event metadata
- error event metadata
- IP address
- user agent
- correlation ID

Ý nghĩa thực tế:

- hệ thống có giữ dấu vết hành vi và dấu vết vận hành
- đây là vùng cần cẩn thận khi nói về privacy, retention, và production troubleshooting

## Verified Exposure Surfaces

Các surface hiện có liên quan trực tiếp tới dữ liệu người dùng:

- internal profile workspace: `/profile`
- user profile route: `/users/:id/profile`
- public snapshot route: `/profiles/:slug`
- admin audit/moderation surfaces

Điều này giúp người đọc hiểu dữ liệu không chỉ nằm trong DB mà còn đi ra các route/surface cụ thể.

Điều practical cần nhớ:

- dữ liệu có trong DB không tự động nghĩa là đang public
- nhưng route public như `/profiles/:slug` là boundary rất quan trọng phải đọc đúng

## Verified Control Signals

Những control signal đã đọc được từ runtime hiện tại:

- đa số route quan trọng đi qua auth gate
- nhiều workspace route đi qua org gate
- admin route đi qua system-admin gate
- public callback routes được carve-out riêng
- snapshot sharing dùng slug/token/access-level fields

Điều này chưa đủ để kết luận privacy posture hoàn chỉnh, nhưng đủ để nói hệ thống có control boundary chứ không phải mở tràn.

Nói ngắn:

- file này giúp bạn biết chỗ nào đang có gate kỹ thuật
- không giúp bạn kết luận mọi nghĩa vụ privacy/legal đã được xử lý xong

## Điều File Này Chưa Chứng Minh

File này chưa chứng minh:

- retention period chính thức cho từng loại dữ liệu
- consent/legal basis theo yêu cầu pháp lý
- deletion/export workflow hoàn chỉnh cho privacy request

Nếu cần những thứ đó, phải có thêm policy/legal artifact riêng.

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. hệ thống đang giữ những nhóm dữ liệu nào
2. dữ liệu đó lộ ra ở surface nào và đang có gate kỹ thuật nào
3. lúc nào cần sang access-control doc, operations doc, hay evidence doc để kiểm tra sâu hơn

## Sources

- `start/routes/users.ts`
- `start/routes/admin.ts`
- `database/schema.ts`
- `schema/migration evidence`
- `app/modules/users/infra/models/*`
- `app/modules/audit/infra/repositories/audit_repository_provider.ts`
- `app/modules/audit/infra/repositories/postgres_audit_log_repository.ts`
- `app/modules/notifications/infra/repositories/notification_repository_provider.ts`
- `database/migrations/20260729070000_canonicalize_auth_session_audit_evidence.ts`
