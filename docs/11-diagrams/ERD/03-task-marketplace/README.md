# Task and Marketplace ERD

```text
03-task-marketplace/
├── overview/    # Task/marketplace domain map
├── high-level/  # Workflow, submission, application, collaboration
└── low-level/   # Report-readable relationship slices + bounded physical inventory cards
```

`logical_erd_03_task_marketplace` → `logical_erd_03a`–`03d` → physical inventory `03a`–`03d` tương ứng.

Các file `logical_erd_03a1`, `03b1`, `03b2`, `03b3`, `03c1` là lát logical nhỏ dành cho trang A4. Mỗi file giữ tối đa một câu hỏi dữ liệu: task/assignment, requirements, assignment-to-submission, submission evidence, hoặc marketplace application. Mọi lát report-facing đều ghi cả cột FK và target theo mẫu `CHILD.fk_column -> PARENT.id`; target ngoài lát được ghi rõ, không bị bỏ qua.

Đọc `03b2` trước để nhận `task_assignment_id` và `task_submission_id`, rồi `03b3` để theo các evidence rows. Hai file tách vì ownership của package và shape của evidence là hai câu hỏi dữ liệu độc lập; README này là điểm nối của chúng.
