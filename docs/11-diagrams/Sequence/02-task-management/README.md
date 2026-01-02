# 02-task-management hierarchy

## overview

- Chưa có diagram ở tầng này; bắt đầu từ high-level khi domain chỉ có scenario cụ thể.

## high-level

- [seq_02_task_crud](high-level/seq_02_task_crud.mmd)
- [seq_02a_task_create_update](high-level/seq_02a_task_create_update.mmd)
- [seq_02b_task_status_assignment](high-level/seq_02b_task_status_assignment.mmd)
- [seq_02d_task_assignment_decision](high-level/seq_02d_task_assignment_decision.mmd)
- [seq_02e_task_submission_review_handoff](high-level/seq_02e_task_submission_review_handoff.mmd)

## low-level

- [seq_02b1_done_completion_orchestration](low-level/seq_02b1_done_completion_orchestration.mmd)
- [seq_02c_task_delete](low-level/seq_02c_task_delete.mmd)

### Task-delivery reading path

1. Mở Activity overview của Task để biết submission nằm ở đâu trong lifecycle.
2. Mở `cls_02l_task_submission_runtime_design` để thấy controller, factory, command và outbound ports nào tham gia scenario.
3. Mở `seq_02e_task_submission_review_handoff` để thấy một completion package được commit như thế nào.
4. Mở `state_02b_task_review_workflow` khi cần lifecycle nhận package đó.

Handoff giữa ba view là `task_assignment_id`, submission package và `review_session_id`. Sequence
chỉ kể transaction, policy, audit, fan-out staging và review handoff; design-class view xác nhận
mọi lifeline kỹ thuật là một boundary/control/port đã được định danh; worker delivery/realtime là
derived concern có diagram riêng.

Đọc `seq_02b` trước để thấy parent transition Command, rồi `seq_02b1` để thấy ordered subordinate
DONE workflow dùng chung caller-owned transaction.
