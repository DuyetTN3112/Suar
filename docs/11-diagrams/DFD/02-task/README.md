# 02-task hierarchy

## overview

- [dfd_02a_task_authoring_context](overview/dfd_02a_task_authoring_context.mmd)
- [dfd_02b_task_execution_completion](overview/dfd_02b_task_execution_completion.mmd)

## high-level

- [dfd_02a_task_authoring](high-level/dfd_02a_task_authoring.mmd)
- [dfd_02b_task_execution](high-level/dfd_02b_task_execution.mmd)
- [dfd_02c_task_completion_package](high-level/dfd_02c_task_completion_package.mmd)

## low-level

- [dfd_02a1_task_creation](low-level/dfd_02a1_task_creation.mmd)
- [dfd_02a2_task_requirement_update](low-level/dfd_02a2_task_requirement_update.mmd)
- [dfd_02b1a_task_comment](low-level/dfd_02b1a_task_comment.mmd)
- [dfd_02b1b_task_attachment](low-level/dfd_02b1b_task_attachment.mmd)
- [dfd_02b2a_assignee_change](low-level/dfd_02b2a_assignee_change.mmd)
- [dfd_02b2b_status_transition](low-level/dfd_02b2b_status_transition.mmd)
- [dfd_02b2c_done_completion_transition](low-level/dfd_02b2c_done_completion_transition.mmd)
- [dfd_02b3_board_reads](low-level/dfd_02b3_board_reads.mmd)
- [dfd_02c1a_submission_package](low-level/dfd_02c1a_submission_package.mmd)
- [dfd_02c1b_submission_evidence](low-level/dfd_02c1b_submission_evidence.mmd)
- [dfd_02c2_lock_review_handoff](low-level/dfd_02c2_lock_review_handoff.mmd)

The two overview frames form one formal Level~2 expansion of P3, not two separate levels. D3 is the
explicit durable handoff: task authoring establishes task/requirement versions in `dfd_02a`, then
execution and completion read and update the same logical store in `dfd_02b`. The split distinguishes
authoring authority from contributor execution and completion evidence; it keeps every named flow
readable on portrait A4.

Đọc overview → high-level map → low-level atomic flow. Mỗi low-level file chứa một câu chuyện dữ liệu; các bước nối tiếp không tách khi vẫn là một pipeline thống nhất.

`dfd_02b2c` là data view của DONE transition: assignment, review workflow và event-outbox writes
giữ cùng parent transaction. Sequence tương ứng là `seq_02b1_done_completion_orchestration`.
