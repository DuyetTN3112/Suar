# Communication Diagram Gallery

Mỗi diagram có `.mmd` làm source of truth và `.png` cùng basename để xem trực tiếp.

Ảnh được render bằng Mermaid CLI `11.16.0`, theme `neutral`, nền trắng, scale `2`. Không sửa PNG thủ công; sửa MMD rồi render lại.

Domain dùng ba tầng thống nhất. `high-level/` chứa scenario nghiệp vụ chính; `low-level/` chứa governance, callback hoặc hậu xử lý cần đọc sâu. Mỗi diagram dùng object/collaborator rõ, message đánh số theo UML Communication (`1`, `1.1`, `1.1.1`).

## 01-business-workflows

### `comm_01_task_assignment`

![comm_01_task_assignment](01-business-workflows/high-level/comm_01_task_assignment.png)

### `comm_02_marketplace_apply`

![comm_02_marketplace_apply](01-business-workflows/high-level/comm_02_marketplace_apply.png)

### `comm_03_review_process`

![comm_03_review_process](01-business-workflows/high-level/comm_03_review_process.png)

### `comm_04_oauth_social_login_session`

![comm_04_oauth_social_login_session](01-business-workflows/high-level/comm_04_oauth_social_login_session.png)

### `comm_05_organization_invitation_acceptance`

![comm_05_organization_invitation_acceptance](01-business-workflows/high-level/comm_05_organization_invitation_acceptance.png)

### `comm_06_project_creation_initial_staffing`

![comm_06_project_creation_initial_staffing](01-business-workflows/high-level/comm_06_project_creation_initial_staffing.png)

### `comm_07_task_submission_review_handoff`

![comm_07_task_submission_review_handoff](01-business-workflows/high-level/comm_07_task_submission_review_handoff.png)

### `comm_10_global_search_authorized_fallback`

![comm_10_global_search_authorized_fallback](01-business-workflows/high-level/comm_10_global_search_authorized_fallback.png)

### Low-level governance and publication

### `comm_08_review_dispute_ai_resolution`

![comm_08_review_dispute_ai_resolution](01-business-workflows/low-level/comm_08_review_dispute_ai_resolution.png)

### `comm_09_profile_aggregation_snapshot_share`

![comm_09_profile_aggregation_snapshot_share](01-business-workflows/low-level/comm_09_profile_aggregation_snapshot_share.png)

### `comm_11_governed_member_role_mutation`

![comm_11_governed_member_role_mutation](01-business-workflows/low-level/comm_11_governed_member_role_mutation.png)
