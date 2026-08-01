# User Lifecycle Activity Diagrams

| Tầng | Diagram |
|---|---|
| Overview | authentication; workspace/session |
| High level | OAuth login and first-time registration |
| Low level | provider handoff; logout teardown; social-login account resolution; workspace routing |

High-level chỉ nối ba giai đoạn. Provider handoff, account resolution và workspace routing nằm trong file riêng.

Workspace/session diagrams chỉ mô tả User realm. System Admin không phải nhánh role của User và có principal/session flow riêng dưới Platform Support.
