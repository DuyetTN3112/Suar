# Roles Module Overview

## 1. Role Concepts in ShadcnAdmin

- **Role-based Access Control (RBAC):**
  - The system uses RBAC to manage permissions for users and organizations.
  - Roles determine what actions a user can perform within organizations, projects, and system-wide.

## 2. Role Entities & Structure

- **User Roles:**
  - Each user can have one or more roles (e.g., Superadmin, Admin, Member, Guest).
  - Roles are mapped in the `user_roles` table and associated with organizations/projects.
- **Organization Roles:**
  - Roles within organizations (Owner, Admin, Member, etc.)
  - Membership management and role assignment handled via organization modules and actions.
- **Project Roles:**
  - Project-specific roles (Project Manager, Contributor, Viewer, etc.)
  - Permissions for adding/removing members, updating project details, managing tasks.

## 3. Role Assignment & Management

- **Role Assignment:**
  - Roles are assigned during user registration, organization/project membership, or by Superadmin/Admin actions.
  - Role changes are managed via organization/project actions and controllers.
- **Role Update/Removal:**
  - Admins can update or remove roles for users within their scope (organization/project).
  - Role changes trigger notifications and audit logs.

## 4. Role Permissions & Enforcement

- **Permission Checks:**
  - Middleware enforces role-based permissions for API endpoints and UI actions.
  - Example: Only Admins can invite members, only Superadmins can approve users.
- **Audit Logging:**
  - All role changes and permission-sensitive actions are logged for traceability.
- **Soft Delete & Versioning:**
  - Role changes are tracked with version history for audit and rollback.

## 5. Role-related API Endpoints

- `POST /api/users/add`: Add user to organization with specific role.
- `PUT /api/users/:id/approve`: Approve user (Superadmin only).
- `POST /api/organizations/:id/invite`: Invite user to organization with role.
- `PUT /api/organizations/:id/members/:memberId/role`: Update member role in organization.
- `POST /api/projects/:id/members`: Add member to project with role.
- `PUT /api/projects/:id/members/:memberId/role`: Update project member role.

## 6. Role-related Database Tables

- `user_roles`: Maps users to roles and organizations/projects.
- `organization_users`: Membership and role mapping for organizations.
- `project_members`: Membership and role mapping for projects.

## 7. Role-related Actions & Middleware

- **Actions:**
  - `add_member_command`, `update_member_role_command`, `remove_member_command` (organization)
  - `add_project_member_command`, `update_project_member_command` (project)
- **Middleware:**
  - `authorize_role.ts`, `role_middleware.ts`, `audit_log_middleware.ts`
  - Enforces role checks and logs sensitive actions.

## 8. Role-related UI Components

- Role selection dropdowns in user/organization/project forms.
- Conditional rendering of UI elements based on user role.
- Notification banners for role changes and permission errors.

## 9. Role-related Documentation

- See also:
  - `docs/ORGANIZATIONS_MODULE_ANALYSIS.md`
  - `docs/PROJECTS_MODULE_ANALYSIS.md`
  - `docs/ACTION_PATTERN_GUIDE.md`
  - `docs/COMPREHENSIVE_TESTING_PLAN.md`

## 10. Extending Roles

- New roles can be added by updating the role tables and permission logic in middleware/actions.
- UI components and API endpoints should be updated to reflect new roles and permissions.

---

*This document summarizes all aspects of roles in ShadcnAdmin: concepts, entities, assignment, permissions, API, database, middleware, UI, and extension points.*
