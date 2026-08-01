# Review Governance Decisions

| Tầng | Diagram |
|---|---|
| Overview | — |
| High level | `dmn_02_review_governance_decisions` |
| Low level | — |

Model chứa ba decision table độc lập:

1. reviewee có được confirm/dispute một review session hay không;
2. reviewee có được mở dispute hay không;
3. system administrator có được resolve dispute hay không.

Mỗi table dùng hit policy `FIRST` để giữ nguyên precedence của guard trong:

- `app/modules/reviews/domain/review_policy.ts::canConfirmReview`
- `app/modules/reviews/domain/review_dispute_rules.ts::canOpenReviewDispute`
- `app/modules/reviews/domain/review_dispute_rules.ts::canResolveReviewDispute`
- `app/modules/reviews/tests/backend/unit/review_policy.spec.ts`

Các semantic reason code trong DMN dùng cho tài liệu và review rule; chúng không khẳng định API runtime hiện trả đúng các code đó. TypeScript policy vẫn là runtime implementation.
