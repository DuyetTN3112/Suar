# Review Dispute BPMN

| Tầng | Diagram |
|---|---|
| Overview | — |
| High level | dispute request, optional AI advisory, human resolution, audit/notification |
| Low level | — |

[`bpmn_03_review_dispute_resolution`](high-level/bpmn_03_review_dispute_resolution.bpmn) là black-box collaboration với sáu message được đánh số giữa reviewee, Suar Platform, Clawagent và system administrator. Intake guard, case state và resolution side effects không bị nhồi vào overview; chúng nằm trong Activity, Sequence, State và DMN liên quan.

Trạng thái evidence là **Partial**: case-file, guard, signed callback surface và human resolution tồn tại trong source; việc gọi Clawagent phụ thuộc cấu hình external. Advisory không bao giờ là quyết định cuối. System administrator vẫn phải đưa final decision và rationale.

Đọc thêm:

- [`act_03d_review_dispute_lifecycle`](../../Action/03-review/high-level/act_03d_review_dispute_lifecycle.mmd)
- [`seq_04c_review_dispute_admin_resolution`](../../Sequence/04-review/low-level/seq_04c_review_dispute_admin_resolution.mmd)
- [`arch_07_ai_dispute_integration`](../../Architecture/01-system-architecture/low-level/arch_07_ai_dispute_integration.mmd)
- [`dmn_02_review_governance_decisions`](../../DMN/02-review-governance/high-level/dmn_02_review_governance_decisions.dmn)
