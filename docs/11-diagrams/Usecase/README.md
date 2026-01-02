# Usecase Diagram Gallery

Mỗi diagram có `.mmd` làm source of truth và `.png` cùng basename để xem trực tiếp.

Ảnh được render bằng Mermaid CLI `11.16.0`, theme `neutral`, nền trắng, scale `2`. Không sửa PNG thủ công; sửa MMD rồi render lại.

Mỗi domain dùng `overview/` cho system boundary tổng quát, `high-level/` cho nhóm mục tiêu nghiệp vụ, `low-level/` cho phạm vi chuyên biệt hơn. README trong từng domain chỉ rõ quan hệ cha–con.

## 01-auth-organization

### `uc_01_auth_org`

![uc_01_auth_org](01-auth-organization/overview/uc_01_auth_org.png)

### `uc_01a_auth_account`

![uc_01a_auth_account](01-auth-organization/high-level/uc_01a_auth_account.png)

### `uc_01b_organization_membership`

![uc_01b_organization_membership](01-auth-organization/high-level/uc_01b_organization_membership.png)

## 02-task-project

### `uc_02_task_project`

![uc_02_task_project](02-task-project/overview/uc_02_task_project.png)

### `uc_02a_project_governance`

![uc_02a_project_governance](02-task-project/high-level/uc_02a_project_governance.png)

### `uc_02b_task_lifecycle`

![uc_02b_task_lifecycle](02-task-project/high-level/uc_02b_task_lifecycle.png)

### `uc_02c_sprint_review_governance`

![uc_02c_sprint_review_governance](02-task-project/high-level/uc_02c_sprint_review_governance.png)

### `uc_02d_project_staffing_competency`

![uc_02d_project_staffing_competency](02-task-project/low-level/uc_02d_project_staffing_competency.png)

### `uc_02e_sprint_planning`

![uc_02e_sprint_planning](02-task-project/low-level/uc_02e_sprint_planning.png)

## 03-marketplace-review

### `uc_03_marketplace_review`

![uc_03_marketplace_review](03-marketplace-review/overview/uc_03_marketplace_review.png)

### `uc_03a_marketplace_application`

![uc_03a_marketplace_application](03-marketplace-review/high-level/uc_03a_marketplace_application.png)

### `uc_03b_review_lifecycle`

![uc_03b_review_lifecycle](03-marketplace-review/high-level/uc_03b_review_lifecycle.png)

## 04-permissions

### `uc_04_permission_hierarchy`

![uc_04_permission_hierarchy](04-permissions/overview/uc_04_permission_hierarchy.png)

### `uc_04a_system_admin_surface`

![uc_04a_system_admin_surface](04-permissions/high-level/uc_04a_system_admin_surface.png)

### `uc_04b_org_project_access`

![uc_04b_org_project_access](04-permissions/high-level/uc_04b_org_project_access.png)

## 05-search-observability

### `uc_05_search_observability`

![uc_05_search_observability](05-search-observability/overview/uc_05_search_observability.png)
