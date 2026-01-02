# Review and Governance ERD

```text
04-review-governance/
├── overview/    # Không giữ composite nhiều cluster
├── high-level/  # Task review, dispute/AI, sprint review, board
└── low-level/   # Report-readable relationship slices + bounded physical inventory cards
```

Mở trực tiếp logical `04a`–`04d`; mỗi file chỉ chứa một relationship cluster. Physical inventory `04a`–`04d` bám đúng từng logical slice.

`logical_erd_04a1` và `logical_erd_04a2` tách task-review thành hai câu hỏi đọc độc lập: ai tham gia phiên review, và rating liên kết evidence/flag như thế nào.

Chuỗi dispute/advisory đọc theo `logical_erd_04b1_dispute_case_file` →
`logical_erd_04b3_case_file_ai_advisory` → `logical_erd_04b4_ai_feedback`. Mỗi lát chỉ trả lời một
FK relationship; mọi cột ngoài lát vẫn ghi target chính xác, còn `source_type`, `source_id` và legacy
`dispute_id` của evaluation được ghi rõ là không phải FK.
