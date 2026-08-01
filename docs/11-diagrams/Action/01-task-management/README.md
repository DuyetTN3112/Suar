# Task Management Activity Diagrams

Đọc từ tổng quan xuống chi tiết:

```text
01-task-management/
├── overview/    # Hai điểm vào report: chuẩn bị và thực thi task
├── high-level/  # Các workflow nghiệp vụ chính
└── low-level/   # Rule, guard và nhánh ngoại lệ cụ thể
```

## Quan hệ phân tầng

| Overview | High level | Low level |
|---|---|---|
| `act_01_task_definition_overview` | `act_01a_task_crud` | `act_01a1_task_maintenance` |
| `act_01_task_assignment_path_overview` | `act_01c_task_assignment_rules` | `act_01c1_direct_assignment_guards`, `act_01c2_revoke_assignment` |
| `act_01_task_operation_outcome_overview` | `act_01b_task_workflow`, `act_01d_task_board_operations` | `act_01b1_task_cancel_reopen` |
| `act_01_task_cancellation_followup_overview` | `act_01b_task_workflow` | `act_01b1_task_cancel_reopen` |

Hai overview trung gian vẫn ghép hai panel đã được tách tiếp thành bốn canvas độc lập. Mỗi diagram có source `.mmd` và ảnh `.png` cùng basename. Dùng `overview` khi mở đầu chapter/report; chỉ xuống `high-level` hoặc `low-level` khi cần giải thích workflow, rule hoặc ngoại lệ.

`act_01d_task_board_operations` chỉ mô tả Project Kanban canonical. List/timeline/detail/create không phải primary page song song; filter, card drawer và modal nằm trên chính board.
