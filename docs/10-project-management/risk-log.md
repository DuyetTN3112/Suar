# Risk Log

## Mục đích

Tài liệu này tách riêng `Risk Log` thành artifact độc lập trong `docs/10-project-management/`.

Các dòng rủi ro dưới đây chỉ dùng evidence có thật từ code, config, schema, schema evidence, và capability docs hiện hành. Không có score giả định hay owner giả định nếu repo không cung cấp.

Nếu bạn đọc file này:

- như manager/lead: tập trung vào `Impact Surface`
- như dev/QA/DevOps: tập trung vào `Evidence` và `Mitigation Signals Already Present`

Một câu nhớ ngắn:

`Đây là risk log dựa trên evidence hiện có của hệ thống, không phải risk register PM đầy đủ với owner/date/score.`

## Risk Register

| Risk ID | Risk                                            | Evidence                                                                                | Impact Surface                                | Mitigation Signals Already Present                                                          |
| ------- | ----------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| R-01    | OAuth provider dependency                       | `start/routes/auth.ts`, `config/auth.ts`                                                | onboarding, sign-in, session bootstrap        | login throttle, provider separation, callback error handling                                |
| R-02    | Legacy + new task workflow coexistence          | task model, task constants, `schema/migration evidence`                                 | status reads/writes, workflow consistency     | `task_status_id` treated as runtime truth, mirror compatibility noted                       |
| R-03    | Public AI callback exposure                     | `start/routes/reviews.ts`, `config/shield.ts`, `process_ai_dispute_callback_command.ts` | dispute automation, replay/signature handling | callback exceptions are explicit, signed-request callback behavior implemented              |
| R-04    | Realtime expectation mismatch                   | `config/transmit.ts`, `docs/11-diagrams/Architecture/01-system-architecture/README.md`  | UX expectations, notification/update latency  | transport is explicitly marked `null`; runtime support diagram also keeps realtime inactive |
| R-05    | Health endpoint credential provisioning failure | `start/routes/index.ts`, `start/env.ts`                                                 | monitoring visibility                         | credential middleware and secure-by-default env handling                                    |
| R-06    | Permission drift between app and DB logic       | `schema/migration evidence` permission functions                                        | authorization correctness                     | DB permission functions are explicit and inspectable                                        |
| R-07    | Audit/error/notification growth                 | `schema/migration evidence`, Audit/Notification repositories                            | storage growth, query latency                 | dedicated indexes on time/user/entity/status/correlation                                    |
| R-08    | Stakeholder misread of competency scores        | `docs/01-business/capability-model-and-product-positioning.md`                          | product trust, external interpretation        | capability docs explicitly reject absolute-score framing                                    |

## Notes

- Bộ tài liệu hiện không có official risk scoring rubric kiểu probability/impact/owner/target date.
- File này không bịa thêm mức `high/medium/low` hoặc action owner khi source không có.

Điều này có nghĩa:

- file đủ tốt để cảnh báo và định hướng đọc tiếp
- chưa phải công cụ duy nhất để quản trị rủi ro theo quy trình PM chính thức

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. risk concern của mình đang nằm ở dependency, workflow drift, security surface, hay growth/perception risk nào
2. evidence nào đang chống lưng cho risk đó
3. có cần sang operations, security, hay governance docs để đọc sâu hơn hay không
