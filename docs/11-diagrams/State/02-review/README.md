# Review State Diagrams

- Overview: review-session lifecycle.
- High level: task review, reverse review, dispute case, flagged review.
- Low level: reverse-review escalation plus human and AI-advisory dispute slices.

Escalation triển khai nhánh chi tiết của reverse-review workflow. `state_02e1` và `state_02e2` tách state machine dispute lớn để người đọc phân biệt human-owned resolution với optional AI advisory loop.

`state_02b` và `state_02c` đều thể hiện đủ tám lane đang render. Task Review còn có source-status guard debt ở accept/respond; reverse-review single-submit đi thẳng từ `awaiting_review` sang `awaiting_response`, còn `in_review` là lane tương thích/dự phòng.
