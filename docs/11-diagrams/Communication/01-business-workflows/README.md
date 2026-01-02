# Business Workflow Communication Diagrams

- Overview: không tạo composite giả; chọn scenario theo chapter.
- High level: task assignment, marketplace proposal, review submission, OAuth session, organization invitation/acceptance, project provisioning, task-to-review handoff, global search.
- Low level: governed dispute/AI callback, profile snapshot publication, governed member-role mutation.

Quan hệ đọc:

- Organization invitation/acceptance → governed role mutation.
- Task submission/review handoff → review submission → dispute/AI/human resolution.
- Project provisioning → task assignment hoặc marketplace proposal.
- Profile aggregation → immutable snapshot → public share.

Mỗi file là một workflow hợp tác có message numbering. Dấu `*` trong số message biểu thị lặp trên danh sách template/member/source, không phải scenario mới.
