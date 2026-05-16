# Task Review → Profile Projection Contract

| Field | Value |
| --- | --- |
| Status | Runtime contract |
| Last verified | 2026-08-13 |
| Scope | Task completion, Task Review Board finalization, profile projection, AI assessment advisory |

This document defines the behaviour that runtime code and tests must preserve. It is deliberately
narrower than the V4/V5/V6 capability material and the Task-to-Verified-Accomplishment design,
which remain useful product/design references but include target-state proposals.

## Canonical gate

```text
Task Board: Done
  → work delivery is complete; no profile change

Task Review Board: resolved
  → dispute/review outcome is resolved; no profile change

Task Review Board: done
  → durable task-review:finalized event
  → consumer rechecks persisted workflow identity and done state
  → refresh profile aggregates
```

`resolved` is not a synonym for `done`. The review board must show it as a separate state. Only
an organization owner, organization administrator, or system administrator may perform the final
review completion. The server transition is atomic and auditable.

The current durable implementation is:

- `FinalizeTaskReviewWorkflowCommand` changes only a native `resolved` workflow to `done` and
  stages `task-review:finalized`.
- `ProcessTaskReviewFinalizedEventCommand` rereads the workflow under its consumer transaction.
  It rejects missing, stale, mismatched, or non-`done` records before calling
  `refreshProfileAggregates`.
- `listAssignmentDeliverySourceRows` and `listCompletedAssignmentProfileSourceRows` both require
  a matching `task_review_workflows.status = done`. Thus an accidental/stale profile refresh cannot
  make a merely completed Task Board row count.

## What enters a profile

After the final gate, data is separated rather than conflated:

| Profile surface | Meaning | Minimum evidence |
| --- | --- | --- |
| Delivery metrics | Finished work whose review workflow is final | completed assignment + matching review workflow `done` |
| Demonstrated work | A concrete work record: action, object, ownership, context, outcome, and verification label | final workflow; legacy/reconstructed records remain `retrospective` with limited confidence |
| Verified capability | A reviewed capability claim, level, and score | governed reviewer evidence and published rubric/skill rules |
| Public snapshot / search | A deliberately published, safe projection | snapshot/privacy policy plus the applicable verified-work/capability evidence |

No Task Board status, AI response, score, or chart is itself a verified professional claim.

## Docs và công việc

`docs` là một **trạng thái board cố định**, dùng để giữ thông tin chung, đường dẫn và tài liệu
sống của dự án. Một mục Docs được tạo trực tiếp tại trạng thái này, không có người thực hiện,
không đi qua review và không thể đi vào hồ sơ năng lực. Nó không được kéo sang trạng thái công
việc; một công việc cũng không được kéo sang Docs. Tài liệu do một người thực hiện vẫn là một
công việc bình thường, dù `task_type` hoặc nhãn của nó là `documentation`.

Với công việc bình thường tạo từ giao diện, hệ thống tạo sẵn hợp đồng đánh giá có kiểm soát và
đặt khả năng đưa vào hồ sơ theo luồng review cuối cùng. Người tạo không chọn bật/tắt bằng chứng
trong giao diện. Điều này không buộc người thực hiện phải tự nộp bằng chứng; phần đánh giá là
quan sát của người nghiệm thu dựa trên tiêu chí và đầu ra đã chốt. `operational_only` vẫn được
hỗ trợ cho dữ liệu lịch sử/đầu vào API hợp lệ, nhưng không được dùng để biến một mục Docs thành
công việc hoặc để bỏ qua cổng review.

## AI assessment boundary

AI may assess the final review package and return a structured **proposal**. For example, it may
propose that a task originally declared as Svelte L4 has bounded evidence consistent with L6 or
L7. The declared target is an assessment baseline, not a cap; the immutable assessment ceiling is
the cap.
The proposal must:

- identify the immutable assessment contract and allowed capability IDs;
- stay within the declared target/ceiling bounds;
- state evidence, uncertainty, blockers, and a public-safe work claim separately;
- set `requires_human_approval: true` and `profile_mutation_permitted: false`.

AI cannot create a skill, change a level, publish a work claim, or mutate a profile. A human
review/governance action and its own evidence rules decide whether any proposal becomes a profile
signal.

## Presentation rule

For both the owner profile and recruiter-facing profile, demonstrated work is rendered before
capability scores, KPI cards, and radar charts. Charts are supporting aggregates only and are not
rendered as a zero-data visualization. Every work record shows its verification status and
confidence so a recruiter can distinguish a review-confirmed record from retrospective history.

## Verification references

- Runtime gate tests:
  `app/modules/reviews/tests/backend/unit/finalize_task_review_workflow_command.spec.ts` and
  `process_task_review_finalized_event_command.spec.ts`.
- Profile source gate:
  `app/modules/tasks/infra/repositories/task-assignment/read/assignment_delivery_fact_queries.ts`
  and `completed_assignment_profile_fact_queries.ts`.
- Runtime design references (not automatic source of truth):
  `docs/superpowers/specs/2026-08-01-task-to-verified-accomplishment-design.md`,
  `docs/superpowers/plans/2026-08-01-task-to-verified-accomplishment-implementation.md`, and
  `docs/superpowers/handoffs/2026-07-03-capability-model-v6-profile-handoff.md`.
