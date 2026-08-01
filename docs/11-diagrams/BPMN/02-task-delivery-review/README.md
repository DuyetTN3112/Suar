# Task Delivery Review BPMN

| Tầng | Diagram |
|---|---|
| Overview | — |
| High level | completion submission, review-session handoff, assigned review, quorum outcome |
| Low level | — |

[`bpmn_02_task_delivery_review`](high-level/bpmn_02_task_delivery_review.bpmn) là black-box collaboration giữa contributor, Suar Platform và assigned reviewer:

1. completion package;
2. review assignment;
3. scores and feedback;
4. review outcome.

Diagram cố ý không vẽ validation branch, persistence và quorum loop. Các concern đó đã có Activity/Sequence riêng; nhét lại vào BPMN overview sẽ làm trùng nội dung và rối message flow:

- [`seq_02e_task_submission_review_handoff`](../../Sequence/02-task-management/high-level/seq_02e_task_submission_review_handoff.mmd)
- [`act_03a_review_submit`](../../Action/03-review/high-level/act_03a_review_submit.mmd)
- [`seq_04_review`](../../Sequence/04-review/high-level/seq_04_review.mmd)
