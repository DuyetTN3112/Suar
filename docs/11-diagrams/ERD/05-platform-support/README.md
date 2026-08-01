# Platform Support ERD

```text
05-platform-support/
├── overview/    # Không giữ composite hai cluster
├── high-level/  # Hai bounded logical slices
└── low-level/   # Chưa có physical inventory riêng
```

Mở trực tiếp `logical_erd_05a_notifications` hoặc `logical_erd_05b_durable_observability`; không còn overview ghép hai relationship cluster.

Runtime `SanitizingLogger` không phải relational data nên cố ý không nằm trong ERD.

`logical_erd_05b` chốt ownership:

- `audit_events` là canonical evidence store;
- `auth_session_event_receipts` bảo vệ idempotency;
- `source_occurred_at` giữ producer time, còn `occurred_at` giữ database record/hash order;
