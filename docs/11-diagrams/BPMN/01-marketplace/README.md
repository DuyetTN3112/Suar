# Marketplace BPMN

| Tầng | Diagram |
|---|---|
| Overview | — |
| High level | proposal submission, review decision, assignment outcome |
| Low level | — |

[`bpmn_01_marketplace_proposal_assignment`](high-level/bpmn_01_marketplace_proposal_assignment.bpmn) mô tả một collaboration duy nhất giữa contributor, Suar Platform và authorized reviewer:

1. contributor gửi proposal;
2. platform kiểm tra eligibility và tạo pending application;
3. reviewer approve/reject;
4. platform chỉ assign khi task vẫn chưa có assignee, sau đó audit và trả kết quả.

Đây là BPMN view của participant/message boundary. Activity và Sequence cùng concern vẫn là nơi đọc guard chi tiết và implementation interaction:

- [`act_02b_marketplace_apply`](../../Action/02-marketplace/high-level/act_02b_marketplace_apply.mmd)
- [`act_02b1_marketplace_process_application`](../../Action/02-marketplace/low-level/act_02b1_marketplace_process_application.mmd)
- [`seq_03b_marketplace_process_application`](../../Sequence/03-marketplace/high-level/seq_03b_marketplace_process_application.mmd)
