# Marketplace Decisions

| Tầng | Diagram |
|---|---|
| Overview | — |
| High level | `dmn_01_marketplace_application_decisions` |
| Low level | — |

Model chứa hai decision table độc lập:

1. contributor có được gửi proposal cho task hay không;
2. actor có được approve/reject proposal hiện tại hay không.

Thứ tự rule dùng hit policy `FIRST` và bám theo thứ tự guard trong:

- `app/modules/tasks/domain/task_assignment_rules.ts::canApplyForTask`
- `app/modules/tasks/domain/task_assignment_rules.ts::canProcessApplication`
- `app/modules/tasks/tests/backend/unit/task_assignment_rules.spec.ts`

Output reason dùng stable semantic code dành cho model documentation, không khẳng định đó là API error code hiện hành.

