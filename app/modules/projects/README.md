# projects Backend Module

### Kiến trúc lõi & Phân tích nghiệp vụ
- **Project Context**: Điểm neo chính kết nối giữa Organization, Member, Project Skills (`project_skills`), Project Professional Roles (`project_professional_roles`), và các Task nghiệp vụ.

## Frontend Surface Contract

- User workspace route `/projects` shows projects in the current organization context with organization switch, create guard, status badges, summary cards, and an API-backed detail modal.
- Organization route `/org/projects` is the admin-shell surface for org-scoped create/search/list. Its `ProjectGrid` cards must route to `/org/projects/:id`, not the user-shell `/projects/:id` route.
- Shared detail route rendering uses `inertia/pages/projects/show.svelte` for both `/projects/:id` and `/org/projects/:id`; `shellMode` selects `AppLayout` or `OrganizationLayout`, and `baseRoute` controls back navigation.
- Detail update/delete mutations use `/api/projects/:id`; add-member still posts to `/projects/members` so the existing command and permission checks remain the single source of truth.
- UI status handling must include `active`, `in_progress`, `on_hold`, and `archived`; user-facing labels collapse `active` and `in_progress` into “Đang chạy”.

## Module Path

```text
app/modules/projects
```

## Folder And File Inventory

```text
./ README.md index.ts
actions/ INDEX.md base_command.ts base_query.ts interfaces.ts project_action_context.ts public_api.ts result.ts
actions/commands/ add_project_member_command.ts create_project_command.ts delete_project_command.ts remove_project_member_command.ts transfer_project_ownership_command.ts update_project_command.ts
actions/dtos/request/ add_project_member_dto.ts create_project_dto.ts delete_project_dto.ts remove_project_member_dto.ts update_project_dto.ts
actions/dtos/response/ project_response_dtos.ts
actions/mapper/ project_application_mapper.ts
actions/ports/ project_cache_port.ts project_external_dependencies.ts project_external_dependencies_impl.ts
actions/queries/ get_project_create_page_query.ts get_project_detail_query.ts get_project_members_query.ts get_projects_list_query.ts
actions/services/ project_public_api.ts
application/context/ project_actor_context.ts
application/dtos/common/ project_pagination.ts
application/events/ .gitkeep
application/ports/ project_actor_lookup.ts project_audit_event_publisher.ts project_event_publisher.ts project_member_activity_reader.ts project_organization_access.ts project_permission_reader.ts project_task_assignment_invariant.ts project_task_stats_reader.ts
bootstrap/ project_public_api_factory.ts
constants/ project_constants.ts
controllers/ add_project_member_controller.ts create_project_controller.ts delete_project_api_controller.ts delete_project_controller.ts get_project_detail_api_controller.ts list_projects_controller.ts show_project_controller.ts store_project_controller.ts update_project_api_controller.ts
controllers/mappers/ project_actor_context_mapper.ts
controllers/mappers/request/ project_request_mapper.ts shared.ts
controllers/mappers/response/ project_response_mapper.ts shared.ts
domain/entities/ project_entity.ts
domain/mapper/ project_domain_mapper.ts
domain/ project_permission_policy.ts project_state_rules.ts project_types.ts role_contracts.ts
domain/repositories/ project_repository_interface.ts
events/ project_events.ts
infra/adapters/ .gitkeep audit_event_project_audit_event_publisher.ts in_process_project_event_publisher.ts organization_public_api_project_organization_access_reader.ts public_api_project_permission_reader.ts tasks_public_api_project_task_assignment_invariant.ts tasks_public_api_project_task_stats_reader.ts users_public_api_project_actor_lookup.ts
infra/cache/ project_cache_invalidator.ts
infra/mapper/ project_infra_mapper.ts
infra/models/ project.ts project_attachment.ts project_member.ts
infra/repositories/ project_member_repository.ts project_repository.ts project_repository_impl.ts
infra/repositories/read/ access_queries.ts project_member_queries.ts project_model_queries.ts shared.ts
infra/repositories/write/ project_member_mutations.ts project_mutations.ts
listeners/ organization_member_removed_listener.ts
public_contracts/ create_project_dto.ts project_constants.ts project_facts_v1.ts project_member_removed_v1.ts project_membership_v1.ts project_public_api.ts
public_contracts/schemas/ project_events_v1.schema.ts
types/ custom_role_definition.ts project_records.ts
validators/rules/ database.ts
```

## Route Evidence

```text
start/routes/api.ts
start/routes/projects.ts
```

## Symbol Evidence

| Kind | Symbol | File | Line |
|---|---|---|---:|
| class | `AddProjectMemberCommand` | `app/modules/projects/actions/commands/add_project_member_command.ts` | 31 |
| class | `CreateProjectCommand` | `app/modules/projects/actions/commands/create_project_command.ts` | 37 |
| class | `DeleteProjectCommand` | `app/modules/projects/actions/commands/delete_project_command.ts` | 31 |
| class | `RemoveProjectMemberCommand` | `app/modules/projects/actions/commands/remove_project_member_command.ts` | 35 |
| interface | `TransferProjectOwnershipDTO` | `app/modules/projects/actions/commands/transfer_project_ownership_command.ts` | 29 |
| class | `TransferProjectOwnershipCommand` | `app/modules/projects/actions/commands/transfer_project_ownership_command.ts` | 51 |
| class | `UpdateProjectCommand` | `app/modules/projects/actions/commands/update_project_command.ts` | 31 |
| interface | `AddProjectMemberDTOInterface` | `app/modules/projects/actions/dtos/request/add_project_member_dto.ts` | 9 |
| class | `AddProjectMemberDTO` | `app/modules/projects/actions/dtos/request/add_project_member_dto.ts` | 15 |
| interface | `DeleteProjectDTOInterface` | `app/modules/projects/actions/dtos/request/delete_project_dto.ts` | 8 |
| class | `DeleteProjectDTO` | `app/modules/projects/actions/dtos/request/delete_project_dto.ts` | 15 |
| interface | `RemoveProjectMemberDTOInterface` | `app/modules/projects/actions/dtos/request/remove_project_member_dto.ts` | 8 |
| class | `RemoveProjectMemberDTO` | `app/modules/projects/actions/dtos/request/remove_project_member_dto.ts` | 15 |
| interface | `UpdateProjectDTOInterface` | `app/modules/projects/actions/dtos/request/update_project_dto.ts` | 11 |
| type | `UpdateProjectValidatedPayload` | `app/modules/projects/actions/dtos/request/update_project_dto.ts` | 24 |
| class | `UpdateProjectDTO` | `app/modules/projects/actions/dtos/request/update_project_dto.ts` | 26 |
| interface | `ProjectDetailResponseDTOProps` | `app/modules/projects/actions/dtos/response/project_response_dtos.ts` | 11 |
| interface | `ProjectListItemResponseDTOProps` | `app/modules/projects/actions/dtos/response/project_response_dtos.ts` | 32 |
| interface | `ProjectSummaryResponseDTOProps` | `app/modules/projects/actions/dtos/response/project_response_dtos.ts` | 45 |
| class | `ProjectDetailResponseDTO` | `app/modules/projects/actions/dtos/response/project_response_dtos.ts` | 55 |
| class | `ProjectListItemResponseDTO` | `app/modules/projects/actions/dtos/response/project_response_dtos.ts` | 127 |
| class | `ProjectSummaryResponseDTO` | `app/modules/projects/actions/dtos/response/project_response_dtos.ts` | 175 |
| interface | `CommandHandler` | `app/modules/projects/actions/interfaces.ts` | 7 |
| interface | `QueryHandler` | `app/modules/projects/actions/interfaces.ts` | 22 |
| interface | `Command` | `app/modules/projects/actions/interfaces.ts` | 36 |
| interface | `Query` | `app/modules/projects/actions/interfaces.ts` | 43 |
| class | `ProjectApplicationMapper` | `app/modules/projects/actions/mapper/project_application_mapper.ts` | 20 |
| interface | `ProjectCachePort` | `app/modules/projects/actions/ports/project_cache_port.ts` | 2 |
| interface | `ProjectActorInfo` | `app/modules/projects/actions/ports/project_external_dependencies.ts` | 4 |
| interface | `ProjectTaskPreview` | `app/modules/projects/actions/ports/project_external_dependencies.ts` | 10 |
| interface | `ProjectTaskSummary` | `app/modules/projects/actions/ports/project_external_dependencies.ts` | 21 |
| interface | `ProjectOrganizationReader` | `app/modules/projects/actions/ports/project_external_dependencies.ts` | 29 |
| interface | `ProjectTaskReaderWriter` | `app/modules/projects/actions/ports/project_external_dependencies.ts` | 49 |
| interface | `ProjectUserReader` | `app/modules/projects/actions/ports/project_external_dependencies.ts` | 78 |
| interface | `ProjectPermissionReader` | `app/modules/projects/actions/ports/project_external_dependencies.ts` | 86 |
| interface | `ProjectExternalDependencies` | `app/modules/projects/actions/ports/project_external_dependencies.ts` | 97 |
| class | `InfraProjectOrganizationReader` | `app/modules/projects/actions/ports/project_external_dependencies_impl.ts` | 20 |
| class | `InfraProjectTaskReaderWriter` | `app/modules/projects/actions/ports/project_external_dependencies_impl.ts` | 52 |
| class | `InfraProjectUserReader` | `app/modules/projects/actions/ports/project_external_dependencies_impl.ts` | 106 |
| class | `InfraProjectPermissionReader` | `app/modules/projects/actions/ports/project_external_dependencies_impl.ts` | 131 |
| const | `DefaultProjectDependencies` | `app/modules/projects/actions/ports/project_external_dependencies_impl.ts` | 149 |
| interface | `ProjectActionContext` | `app/modules/projects/actions/project_action_context.ts` | 1 |
| interface | `AuthenticatedProjectActionContext` | `app/modules/projects/actions/project_action_context.ts` | 8 |
| function | `makeSystemProjectActionContext` | `app/modules/projects/actions/project_action_context.ts` | 12 |
| interface | `GetProjectCreatePageResult` | `app/modules/projects/actions/queries/get_project_create_page_query.ts` | 5 |
| class | `GetProjectCreatePageQuery` | `app/modules/projects/actions/queries/get_project_create_page_query.ts` | 10 |
| interface | `GetProjectDetailResult` | `app/modules/projects/actions/queries/get_project_detail_query.ts` | 32 |
| class | `GetProjectDetailQuery` | `app/modules/projects/actions/queries/get_project_detail_query.ts` | 103 |
| interface | `GetProjectMembersDTO` | `app/modules/projects/actions/queries/get_project_members_query.ts` | 15 |
| interface | `GetProjectMembersResult` | `app/modules/projects/actions/queries/get_project_members_query.ts` | 26 |
| class | `GetProjectMembersQuery` | `app/modules/projects/actions/queries/get_project_members_query.ts` | 68 |
| interface | `GetProjectsListDTO` | `app/modules/projects/actions/queries/get_projects_list_query.ts` | 15 |
| interface | `GetProjectsListResult` | `app/modules/projects/actions/queries/get_projects_list_query.ts` | 31 |
| class | `GetProjectsListQuery` | `app/modules/projects/actions/queries/get_projects_list_query.ts` | 84 |
| class | `Result` | `app/modules/projects/actions/result.ts` | 5 |
| class | `ProjectPublicApi` | `app/modules/projects/actions/services/project_public_api.ts` | 13 |
| const | `projectPublicApi` | `app/modules/projects/actions/services/project_public_api.ts` | 85 |
| interface | `ProjectActorContext` | `app/modules/projects/application/context/project_actor_context.ts` | 1 |
| const | `PROJECT_PAGINATION` | `app/modules/projects/application/dtos/common/project_pagination.ts` | 1 |
| interface | `ProjectActor` | `app/modules/projects/application/ports/project_actor_lookup.ts` | 3 |
| interface | `ProjectActorLookup` | `app/modules/projects/application/ports/project_actor_lookup.ts` | 10 |
| interface | `ProjectAuditEvent` | `app/modules/projects/application/ports/project_audit_event_publisher.ts` | 3 |
| interface | `ProjectAuditEventPublisher` | `app/modules/projects/application/ports/project_audit_event_publisher.ts` | 10 |
| interface | `ProjectEventPublisher` | `app/modules/projects/application/ports/project_event_publisher.ts` | 9 |
| interface | `ProjectMemberActivityReader` | `app/modules/projects/application/ports/project_member_activity_reader.ts` | 3 |
| interface | `ProjectOrganizationAccessSnapshot` | `app/modules/projects/application/ports/project_organization_access.ts` | 3 |
| interface | `ProjectOrganizationAccessReader` | `app/modules/projects/application/ports/project_organization_access.ts` | 10 |
| interface | `ProjectPermissionReader` | `app/modules/projects/application/ports/project_permission_reader.ts` | 3 |
| interface | `ProjectMemberTaskReassignmentInput` | `app/modules/projects/application/ports/project_task_assignment_invariant.ts` | 3 |
| interface | `ProjectMemberTaskReassignmentResult` | `app/modules/projects/application/ports/project_task_assignment_invariant.ts` | 11 |
| interface | `ProjectTaskAssignmentInvariant` | `app/modules/projects/application/ports/project_task_assignment_invariant.ts` | 16 |
| interface | `ProjectTaskStats` | `app/modules/projects/application/ports/project_task_stats_reader.ts` | 3 |
| interface | `ProjectTaskStatsReader` | `app/modules/projects/application/ports/project_task_stats_reader.ts` | 11 |
| function | `makeProjectPublicApi` | `app/modules/projects/bootstrap/project_public_api_factory.ts` | 4 |
| enum | `ProjectRole` | `app/modules/projects/constants/project_constants.ts` | 20 |
| enum | `ProjectVisibility` | `app/modules/projects/constants/project_constants.ts` | 31 |
| enum | `ProjectStatus` | `app/modules/projects/constants/project_constants.ts` | 41 |
| class | `AddProjectMemberController` | `app/modules/projects/controllers/add_project_member_controller.ts` | 11 |
| class | `CreateProjectController` | `app/modules/projects/controllers/create_project_controller.ts` | 10 |
| class | `DeleteProjectApiController` | `app/modules/projects/controllers/delete_project_api_controller.ts` | 18 |
| class | `DeleteProjectController` | `app/modules/projects/controllers/delete_project_controller.ts` | 11 |
| class | `GetProjectDetailApiController` | `app/modules/projects/controllers/get_project_detail_api_controller.ts` | 13 |
| class | `ListProjectsController` | `app/modules/projects/controllers/list_projects_controller.ts` | 15 |
| function | `projectActorContextFromHttp` | `app/modules/projects/controllers/mappers/project_actor_context_mapper.ts` | 6 |
| function | `buildCreateProjectDTO` | `app/modules/projects/controllers/mappers/request/project_request_mapper.ts` | 31 |
| function | `buildUpdateProjectDTO` | `app/modules/projects/controllers/mappers/request/project_request_mapper.ts` | 50 |
| function | `buildProjectsListDTO` | `app/modules/projects/controllers/mappers/request/project_request_mapper.ts` | 66 |
| function | `buildOrganizationProjectsListInput` | `app/modules/projects/controllers/mappers/request/project_request_mapper.ts` | 87 |
| function | `buildAddProjectMemberDTO` | `app/modules/projects/controllers/mappers/request/project_request_mapper.ts` | 101 |
| function | `buildDeleteProjectDTO` | `app/modules/projects/controllers/mappers/request/project_request_mapper.ts` | 109 |
| const | `PROJECTS_DEFAULT_LIMIT` | `app/modules/projects/controllers/mappers/request/shared.ts` | 7 |
| function | `toOptionalString` | `app/modules/projects/controllers/mappers/request/shared.ts` | 12 |
| function | `toOptionalNumber` | `app/modules/projects/controllers/mappers/request/shared.ts` | 16 |
| function | `toOptionalDateTime` | `app/modules/projects/controllers/mappers/request/shared.ts` | 29 |
| function | `toDateTimeOrNull` | `app/modules/projects/controllers/mappers/request/shared.ts` | 38 |
| function | `toOptionalVisibility` | `app/modules/projects/controllers/mappers/request/shared.ts` | 46 |
| function | `toPositiveNumber` | `app/modules/projects/controllers/mappers/request/shared.ts` | 54 |
| function | `toBoolean` | `app/modules/projects/controllers/mappers/request/shared.ts` | 70 |
| function | `toProjectSortBy` | `app/modules/projects/controllers/mappers/request/shared.ts` | 83 |
| function | `toProjectSortOrder` | `app/modules/projects/controllers/mappers/request/shared.ts` | 90 |
| function | `mapProjectsIndexPageProps` | `app/modules/projects/controllers/mappers/response/project_response_mapper.ts` | 16 |
| function | `mapProjectDetailPageProps` | `app/modules/projects/controllers/mappers/response/project_response_mapper.ts` | 31 |
| function | `mapProjectDetailApiBody` | `app/modules/projects/controllers/mappers/response/project_response_mapper.ts` | 35 |
| function | `mapProjectMutationApiBody` | `app/modules/projects/controllers/mappers/response/project_response_mapper.ts` | 39 |
| function | `mapDeleteProjectApiBody` | `app/modules/projects/controllers/mappers/response/project_response_mapper.ts` | 46 |
| function | `mapOrganizationProjectsPageProps` | `app/modules/projects/controllers/mappers/response/project_response_mapper.ts` | 53 |
| function | `mapScopedProjectDetailPageProps` | `app/modules/projects/controllers/mappers/response/project_response_mapper.ts` | 62 |
| type | `ResponseRecord` | `app/modules/projects/controllers/mappers/response/shared.ts` | 1 |
| interface | `SerializableResponseRecord` | `app/modules/projects/controllers/mappers/response/shared.ts` | 3 |
| function | `serializeForResponse` | `app/modules/projects/controllers/mappers/response/shared.ts` | 19 |
| function | `serializeCollectionForResponse` | `app/modules/projects/controllers/mappers/response/shared.ts` | 29 |
| class | `ShowProjectController` | `app/modules/projects/controllers/show_project_controller.ts` | 13 |
| class | `StoreProjectController` | `app/modules/projects/controllers/store_project_controller.ts` | 11 |
| class | `UpdateProjectApiController` | `app/modules/projects/controllers/update_project_api_controller.ts` | 16 |
| type | `ProjectStatus` | `app/modules/projects/domain/entities/project_entity.ts` | 9 |
| interface | `CustomRoleDefinition` | `app/modules/projects/domain/entities/project_entity.ts` | 11 |
| type | `ProjectVisibility` | `app/modules/projects/domain/entities/project_entity.ts` | 16 |
| interface | `ProjectEntityProps` | `app/modules/projects/domain/entities/project_entity.ts` | 18 |
| class | `ProjectEntity` | `app/modules/projects/domain/entities/project_entity.ts` | 40 |
| class | `ProjectDomainMapper` | `app/modules/projects/domain/mapper/project_domain_mapper.ts` | 18 |
| function | `canCreateProject` | `app/modules/projects/domain/project_permission_policy.ts` | 64 |
| function | `canAccessProjectOrganizationScope` | `app/modules/projects/domain/project_permission_policy.ts` | 77 |
| function | `canViewProjectMembers` | `app/modules/projects/domain/project_permission_policy.ts` | 90 |
| function | `canUpdateProject` | `app/modules/projects/domain/project_permission_policy.ts` | 107 |
| function | `canUpdateProjectFields` | `app/modules/projects/domain/project_permission_policy.ts` | 120 |
| function | `canDeleteProject` | `app/modules/projects/domain/project_permission_policy.ts` | 163 |
| function | `canManageProjectMembers` | `app/modules/projects/domain/project_permission_policy.ts` | 201 |
| function | `canAddProjectMember` | `app/modules/projects/domain/project_permission_policy.ts` | 215 |
| function | `canRemoveProjectMember` | `app/modules/projects/domain/project_permission_policy.ts` | 250 |
| function | `canTransferProjectOwnership` | `app/modules/projects/domain/project_permission_policy.ts` | 280 |
| function | `canViewProject` | `app/modules/projects/domain/project_permission_policy.ts` | 309 |
| function | `calculateProjectPermissions` | `app/modules/projects/domain/project_permission_policy.ts` | 324 |
| function | `calculateProjectDetailPermissions` | `app/modules/projects/domain/project_permission_policy.ts` | 369 |
| function | `validateProjectDates` | `app/modules/projects/domain/project_state_rules.ts` | 20 |
| function | `validateProjectStatus` | `app/modules/projects/domain/project_state_rules.ts` | 41 |
| function | `canDeleteProjectWithTasks` | `app/modules/projects/domain/project_state_rules.ts` | 55 |
| function | `canRemoveMemberFromProject` | `app/modules/projects/domain/project_state_rules.ts` | 72 |
| interface | `ProjectPermissionContext` | `app/modules/projects/domain/project_types.ts` | 16 |
| interface | `ProjectOwnershipTransferContext` | `app/modules/projects/domain/project_types.ts` | 36 |
| interface | `ProjectDeletionContext` | `app/modules/projects/domain/project_types.ts` | 51 |
| interface | `ProjectMemberAddContext` | `app/modules/projects/domain/project_types.ts` | 66 |
| interface | `ProjectMemberRemovalContext` | `app/modules/projects/domain/project_types.ts` | 83 |
| type | `ProjectUpdateFieldsResult` | `app/modules/projects/domain/project_types.ts` | 96 |
| interface | `ProjectRepository` | `app/modules/projects/domain/repositories/project_repository_interface.ts` | 12 |
| const | `ProjectOrgRole` | `app/modules/projects/domain/role_contracts.ts` | 3 |
| const | `ProjectSystemRole` | `app/modules/projects/domain/role_contracts.ts` | 9 |
| interface | `ProjectCreatedEvent` | `app/modules/projects/events/project_events.ts` | 2 |
| interface | `ProjectUpdatedEvent` | `app/modules/projects/events/project_events.ts` | 9 |
| interface | `ProjectDeletedEvent` | `app/modules/projects/events/project_events.ts` | 15 |
| interface | `ProjectMemberAddedEvent` | `app/modules/projects/events/project_events.ts` | 21 |
| interface | `ProjectMemberRemovedEvent` | `app/modules/projects/events/project_events.ts` | 28 |
| interface | `ProjectOwnershipTransferredEvent` | `app/modules/projects/events/project_events.ts` | 34 |
| class | `AuditEventProjectAuditEventPublisher` | `app/modules/projects/infra/adapters/audit_event_project_audit_event_publisher.ts` | 9 |
| class | `InProcessProjectEventPublisher` | `app/modules/projects/infra/adapters/in_process_project_event_publisher.ts` | 12 |
| class | `OrganizationPublicApiProjectOrganizationAccessReader` | `app/modules/projects/infra/adapters/organization_public_api_project_organization_access_reader.ts` | 9 |
| class | `PublicApiProjectPermissionReader` | `app/modules/projects/infra/adapters/public_api_project_permission_reader.ts` | 7 |
| class | `TasksPublicApiProjectTaskAssignmentInvariant` | `app/modules/projects/infra/adapters/tasks_public_api_project_task_assignment_invariant.ts` | 8 |
| class | `TasksPublicApiProjectTaskStatsReader` | `app/modules/projects/infra/adapters/tasks_public_api_project_task_stats_reader.ts` | 10 |
| class | `UsersPublicApiProjectActorLookup` | `app/modules/projects/infra/adapters/users_public_api_project_actor_lookup.ts` | 9 |
| class | `ProjectCacheInvalidator` | `app/modules/projects/infra/cache/project_cache_invalidator.ts` | 4 |
| class | `ProjectInfraMapper` | `app/modules/projects/infra/mapper/project_infra_mapper.ts` | 20 |
| class | `Project` | `app/modules/projects/infra/models/project.ts` | 15 |
| class | `ProjectAttachment` | `app/modules/projects/infra/models/project_attachment.ts` | 10 |
| class | `ProjectMember` | `app/modules/projects/infra/models/project_member.ts` | 10 |
| class | `ProjectRepositoryImpl` | `app/modules/projects/infra/repositories/project_repository_impl.ts` | 16 |
| const | `isStakeholder` | `app/modules/projects/infra/repositories/read/access_queries.ts` | 10 |
| const | `paginateByUserAccess` | `app/modules/projects/infra/repositories/read/access_queries.ts` | 29 |
| const | `getStatsByUserAccess` | `app/modules/projects/infra/repositories/read/access_queries.ts` | 158 |
| const | `findMember` | `app/modules/projects/infra/repositories/read/project_member_queries.ts` | 30 |
| const | `findMemberOrFail` | `app/modules/projects/infra/repositories/read/project_member_queries.ts` | 39 |
| const | `isProjectManagerOrOwner` | `app/modules/projects/infra/repositories/read/project_member_queries.ts` | 48 |
| const | `findManagerOrOwnerIds` | `app/modules/projects/infra/repositories/read/project_member_queries.ts` | 63 |
| const | `getRoleName` | `app/modules/projects/infra/repositories/read/project_member_queries.ts` | 81 |
| const | `isMember` | `app/modules/projects/infra/repositories/read/project_member_queries.ts` | 91 |
| const | `findMembersWithUser` | `app/modules/projects/infra/repositories/read/project_member_queries.ts` | 104 |
| const | `findActiveByUser` | `app/modules/projects/infra/repositories/read/project_member_queries.ts` | 112 |
| const | `countByProject` | `app/modules/projects/infra/repositories/read/project_member_queries.ts` | 120 |
| const | `listPaged` | `app/modules/projects/infra/repositories/read/project_member_queries.ts` | 130 |
| const | `getMembersWithDetails` | `app/modules/projects/infra/repositories/read/project_member_queries.ts` | 150 |
| const | `hasAccess` | `app/modules/projects/infra/repositories/read/project_member_queries.ts` | 193 |
| const | `countByProjectIds` | `app/modules/projects/infra/repositories/read/project_member_queries.ts` | 206 |
| const | `findDetailWithRelations` | `app/modules/projects/infra/repositories/read/project_model_queries.ts` | 12 |
| const | `findDetailWithRelationsRecord` | `app/modules/projects/infra/repositories/read/project_model_queries.ts` | 27 |
| const | `findActiveOrFail` | `app/modules/projects/infra/repositories/read/project_model_queries.ts` | 35 |
| const | `validateBelongsToOrg` | `app/modules/projects/infra/repositories/read/project_model_queries.ts` | 45 |
| const | `findIdsByOrganization` | `app/modules/projects/infra/repositories/read/project_model_queries.ts` | 57 |
| const | `listSimpleByOrganization` | `app/modules/projects/infra/repositories/read/project_model_queries.ts` | 69 |
| const | `countByOrgIds` | `app/modules/projects/infra/repositories/read/project_model_queries.ts` | 86 |
| const | `getExtraNumber` | `app/modules/projects/infra/repositories/read/shared.ts` | 16 |
| const | `getCountValue` | `app/modules/projects/infra/repositories/read/shared.ts` | 27 |
| const | `isRawRecord` | `app/modules/projects/infra/repositories/read/shared.ts` | 34 |
| const | `addMember` | `app/modules/projects/infra/repositories/write/project_member_mutations.ts` | 5 |
| const | `updateRole` | `app/modules/projects/infra/repositories/write/project_member_mutations.ts` | 21 |
| const | `deleteMember` | `app/modules/projects/infra/repositories/write/project_member_mutations.ts` | 34 |
| const | `removeAllByProject` | `app/modules/projects/infra/repositories/write/project_member_mutations.ts` | 46 |
| const | `removeAllByUser` | `app/modules/projects/infra/repositories/write/project_member_mutations.ts` | 54 |
| const | `lockForUpdate` | `app/modules/projects/infra/repositories/write/project_mutations.ts` | 8 |
| const | `findActiveForUpdate` | `app/modules/projects/infra/repositories/write/project_mutations.ts` | 19 |
| const | `findActiveForUpdateRecord` | `app/modules/projects/infra/repositories/write/project_mutations.ts` | 21 |
| const | `create` | `app/modules/projects/infra/repositories/write/project_mutations.ts` | 29 |
| const | `createRecord` | `app/modules/projects/infra/repositories/write/project_mutations.ts` | 36 |
| const | `save` | `app/modules/projects/infra/repositories/write/project_mutations.ts` | 44 |
| const | `updateById` | `app/modules/projects/infra/repositories/write/project_mutations.ts` | 52 |
| const | `updateByIdRecord` | `app/modules/projects/infra/repositories/write/project_mutations.ts` | 63 |
| const | `updateOwner` | `app/modules/projects/infra/repositories/write/project_mutations.ts` | 72 |
| const | `updateOwnerRecord` | `app/modules/projects/infra/repositories/write/project_mutations.ts` | 80 |
| const | `softDeleteById` | `app/modules/projects/infra/repositories/write/project_mutations.ts` | 89 |
| const | `softDeleteByIdRecord` | `app/modules/projects/infra/repositories/write/project_mutations.ts` | 100 |
| const | `hardDelete` | `app/modules/projects/infra/repositories/write/project_mutations.ts` | 109 |
| const | `hardDeleteById` | `app/modules/projects/infra/repositories/write/project_mutations.ts` | 119 |
| const | `hardDeleteByIdRecord` | `app/modules/projects/infra/repositories/write/project_mutations.ts` | 128 |
| interface | `CreateProjectDTOInterface` | `app/modules/projects/public_contracts/create_project_dto.ts` | 6 |
| type | `CreateProjectValidatedPayload` | `app/modules/projects/public_contracts/create_project_dto.ts` | 18 |
| class | `CreateProjectDTO` | `app/modules/projects/public_contracts/create_project_dto.ts` | 20 |
| interface | `ProjectFactsV1` | `app/modules/projects/public_contracts/project_facts_v1.ts` | 1 |
| interface | `ProjectMemberRemovedV1` | `app/modules/projects/public_contracts/project_member_removed_v1.ts` | 1 |
| interface | `ProjectMembershipV1` | `app/modules/projects/public_contracts/project_membership_v1.ts` | 1 |
| const | `projectMemberRemovedV1Schema` | `app/modules/projects/public_contracts/schemas/project_events_v1.schema.ts` | 3 |
| interface | `ProjectCustomRoleDefinition` | `app/modules/projects/types/custom_role_definition.ts` | 1 |
| type | `SerializedDateTime` | `app/modules/projects/types/project_records.ts` | 2 |
| interface | `ProjectRecord` | `app/modules/projects/types/project_records.ts` | 4 |
| interface | `ProjectDetailRecord` | `app/modules/projects/types/project_records.ts` | 26 |
| interface | `ProjectMemberRecord` | `app/modules/projects/types/project_records.ts` | 33 |
| const | `projectIdRule` | `app/modules/projects/validators/rules/database.ts` | 15 |
| const | `organizationIdRule` | `app/modules/projects/validators/rules/database.ts` | 16 |
| const | `userIdRule` | `app/modules/projects/validators/rules/database.ts` | 17 |

## Import Evidence

### `app/modules/projects/actions/base_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { CommandHandler } from './interfaces.js'
import { Result } from './result.js'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
```

### `app/modules/projects/actions/base_query.ts`

```ts
import type { QueryHandler } from './interfaces.js'
import { Result } from './result.js'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
```

### `app/modules/projects/actions/commands/add_project_member_command.ts`

```ts
import type { AddProjectMemberDTO } from '../dtos/request/add_project_member_dto.js'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { BaseCommand } from '#modules/projects/actions/base_command'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import type { ProjectActorLookup } from '#modules/projects/application/ports/project_actor_lookup'
import type { ProjectAuditEventPublisher } from '#modules/projects/application/ports/project_audit_event_publisher'
import type { ProjectEventPublisher } from '#modules/projects/application/ports/project_event_publisher'
import type { ProjectOrganizationAccessReader } from '#modules/projects/application/ports/project_organization_access'
import { canAddProjectMember } from '#modules/projects/domain/project_permission_policy'
import { AuditEventProjectAuditEventPublisher } from '#modules/projects/infra/adapters/audit_event_project_audit_event_publisher'
import { InProcessProjectEventPublisher } from '#modules/projects/infra/adapters/in_process_project_event_publisher'
import { OrganizationPublicApiProjectOrganizationAccessReader } from '#modules/projects/infra/adapters/organization_public_api_project_organization_access_reader'
import { UsersPublicApiProjectActorLookup } from '#modules/projects/infra/adapters/users_public_api_project_actor_lookup'
import * as projectMemberQueries from '#modules/projects/infra/repositories/read/project_member_queries'
import * as projectModelQueries from '#modules/projects/infra/repositories/read/project_model_queries'
import * as projectMemberMutations from '#modules/projects/infra/repositories/write/project_member_mutations'
```

### `app/modules/projects/actions/commands/create_project_command.ts`

```ts
import type { CreateProjectDTO } from '../dtos/request/create_project_dto.js'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { BaseCommand } from '#modules/projects/actions/base_command'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import type { ProjectAuditEventPublisher } from '#modules/projects/application/ports/project_audit_event_publisher'
import type { ProjectEventPublisher } from '#modules/projects/application/ports/project_event_publisher'
import type { ProjectOrganizationAccessReader } from '#modules/projects/application/ports/project_organization_access'
import type { ProjectPermissionReader } from '#modules/projects/application/ports/project_permission_reader'
import { canCreateProject } from '#modules/projects/domain/project_permission_policy'
import { validateProjectStatus, validateProjectDates } from '#modules/projects/domain/project_state_rules'
import { AuditEventProjectAuditEventPublisher } from '#modules/projects/infra/adapters/audit_event_project_audit_event_publisher'
import { InProcessProjectEventPublisher } from '#modules/projects/infra/adapters/in_process_project_event_publisher'
import { OrganizationPublicApiProjectOrganizationAccessReader } from '#modules/projects/infra/adapters/organization_public_api_project_organization_access_reader'
import { PublicApiProjectPermissionReader } from '#modules/projects/infra/adapters/public_api_project_permission_reader'
import * as projectModelQueries from '#modules/projects/infra/repositories/read/project_model_queries'
import * as projectMemberMutations from '#modules/projects/infra/repositories/write/project_member_mutations'
import * as projectMutations from '#modules/projects/infra/repositories/write/project_mutations'
import { ProjectRole } from '#modules/projects/public_contracts/project_constants'
import type { ProjectDetailRecord } from '#modules/projects/types/project_records'
```

### `app/modules/projects/actions/commands/delete_project_command.ts`

```ts
import type { DeleteProjectDTO } from '../dtos/request/delete_project_dto.js'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'
import { BaseCommand } from '#modules/projects/actions/base_command'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import type { ProjectActorLookup } from '#modules/projects/application/ports/project_actor_lookup'
import type { ProjectAuditEventPublisher } from '#modules/projects/application/ports/project_audit_event_publisher'
import type { ProjectEventPublisher } from '#modules/projects/application/ports/project_event_publisher'
import type { ProjectOrganizationAccessReader } from '#modules/projects/application/ports/project_organization_access'
import type { ProjectTaskStatsReader } from '#modules/projects/application/ports/project_task_stats_reader'
import { canDeleteProject } from '#modules/projects/domain/project_permission_policy'
import { AuditEventProjectAuditEventPublisher } from '#modules/projects/infra/adapters/audit_event_project_audit_event_publisher'
import { InProcessProjectEventPublisher } from '#modules/projects/infra/adapters/in_process_project_event_publisher'
import { OrganizationPublicApiProjectOrganizationAccessReader } from '#modules/projects/infra/adapters/organization_public_api_project_organization_access_reader'
import { TasksPublicApiProjectTaskStatsReader } from '#modules/projects/infra/adapters/tasks_public_api_project_task_stats_reader'
import { UsersPublicApiProjectActorLookup } from '#modules/projects/infra/adapters/users_public_api_project_actor_lookup'
import * as projectMutations from '#modules/projects/infra/repositories/write/project_mutations'
```

### `app/modules/projects/actions/commands/remove_project_member_command.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { RemoveProjectMemberDTO } from '../dtos/request/remove_project_member_dto.js'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { BaseCommand } from '#modules/projects/actions/base_command'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import type { ProjectActorLookup } from '#modules/projects/application/ports/project_actor_lookup'
import type { ProjectAuditEventPublisher } from '#modules/projects/application/ports/project_audit_event_publisher'
import type { ProjectEventPublisher } from '#modules/projects/application/ports/project_event_publisher'
import type { ProjectOrganizationAccessReader } from '#modules/projects/application/ports/project_organization_access'
import type { ProjectTaskAssignmentInvariant } from '#modules/projects/application/ports/project_task_assignment_invariant'
import { canRemoveProjectMember } from '#modules/projects/domain/project_permission_policy'
import { AuditEventProjectAuditEventPublisher } from '#modules/projects/infra/adapters/audit_event_project_audit_event_publisher'
import { InProcessProjectEventPublisher } from '#modules/projects/infra/adapters/in_process_project_event_publisher'
import { OrganizationPublicApiProjectOrganizationAccessReader } from '#modules/projects/infra/adapters/organization_public_api_project_organization_access_reader'
import { TasksPublicApiProjectTaskAssignmentInvariant } from '#modules/projects/infra/adapters/tasks_public_api_project_task_assignment_invariant'
import { UsersPublicApiProjectActorLookup } from '#modules/projects/infra/adapters/users_public_api_project_actor_lookup'
import * as projectMemberQueries from '#modules/projects/infra/repositories/read/project_member_queries'
import * as projectModelQueries from '#modules/projects/infra/repositories/read/project_model_queries'
import * as projectMemberMutations from '#modules/projects/infra/repositories/write/project_member_mutations'
```

### `app/modules/projects/actions/commands/transfer_project_ownership_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DefaultProjectDependencies } from '../ports/project_external_dependencies_impl.js'
import { EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { canTransferProjectOwnership } from '#modules/projects/domain/project_permission_policy'
import * as projectMemberQueries from '#modules/projects/infra/repositories/read/project_member_queries'
import * as projectMemberMutations from '#modules/projects/infra/repositories/write/project_member_mutations'
import * as projectMutations from '#modules/projects/infra/repositories/write/project_mutations'
import { ProjectRole } from '#modules/projects/public_contracts/project_constants'
import type { ProjectRecord } from '#modules/projects/types/project_records'
```

### `app/modules/projects/actions/commands/update_project_command.ts`

```ts
import type { UpdateProjectDTO } from '../dtos/request/update_project_dto.js'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { BaseCommand } from '#modules/projects/actions/base_command'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import type { ProjectActorLookup } from '#modules/projects/application/ports/project_actor_lookup'
import type { ProjectAuditEventPublisher } from '#modules/projects/application/ports/project_audit_event_publisher'
import type { ProjectEventPublisher } from '#modules/projects/application/ports/project_event_publisher'
import type { ProjectOrganizationAccessReader } from '#modules/projects/application/ports/project_organization_access'
import { canUpdateProjectFields } from '#modules/projects/domain/project_permission_policy'
import { AuditEventProjectAuditEventPublisher } from '#modules/projects/infra/adapters/audit_event_project_audit_event_publisher'
import { InProcessProjectEventPublisher } from '#modules/projects/infra/adapters/in_process_project_event_publisher'
import { OrganizationPublicApiProjectOrganizationAccessReader } from '#modules/projects/infra/adapters/organization_public_api_project_organization_access_reader'
import { UsersPublicApiProjectActorLookup } from '#modules/projects/infra/adapters/users_public_api_project_actor_lookup'
import * as projectMemberQueries from '#modules/projects/infra/repositories/read/project_member_queries'
import * as projectMutations from '#modules/projects/infra/repositories/write/project_mutations'
import type { ProjectRecord } from '#modules/projects/types/project_records'
```

### `app/modules/projects/actions/dtos/request/add_project_member_dto.ts`

```ts
import ValidationException from '#modules/http/exceptions/validation_exception'
import { ProjectRole } from '#modules/projects/public_contracts/project_constants'
```

### `app/modules/projects/actions/dtos/request/create_project_dto.ts`

```ts
// no imports
```

### `app/modules/projects/actions/dtos/request/delete_project_dto.ts`

```ts
import ValidationException from '#modules/http/exceptions/validation_exception'
```

### `app/modules/projects/actions/dtos/request/remove_project_member_dto.ts`

```ts
import ValidationException from '#modules/http/exceptions/validation_exception'
```

### `app/modules/projects/actions/dtos/request/update_project_dto.ts`

```ts
import type { DateTime } from 'luxon'
import ValidationException from '#modules/http/exceptions/validation_exception'
import { ProjectStatus, ProjectVisibility } from '#modules/projects/public_contracts/project_constants'
```

### `app/modules/projects/actions/dtos/response/project_response_dtos.ts`

```ts
import type { ProjectEntity } from '#modules/projects/domain/entities/project_entity'
import type { ProjectCustomRoleDefinition as CustomRoleDefinition } from '#modules/projects/types/custom_role_definition'
```

### `app/modules/projects/actions/interfaces.ts`

```ts
// no imports
```

### `app/modules/projects/actions/mapper/project_application_mapper.ts`

```ts
import type { CreateProjectDTO } from '../dtos/request/create_project_dto.js'
import {
  ProjectDetailResponseDTO,
  ProjectListItemResponseDTO,
  ProjectSummaryResponseDTO,
} from '../dtos/response/project_response_dtos.js'
import type { ProjectEntity } from '#modules/projects/domain/entities/project_entity'
```

### `app/modules/projects/actions/ports/project_cache_port.ts`

```ts
// no imports
```

### `app/modules/projects/actions/ports/project_external_dependencies.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
```

### `app/modules/projects/actions/ports/project_external_dependencies_impl.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type {
  ProjectActorInfo,
  ProjectExternalDependencies,
  ProjectOrganizationReader,
  ProjectPermissionReader,
  ProjectTaskPreview,
  ProjectTaskReaderWriter,
  ProjectTaskSummary,
  ProjectUserReader,
} from './project_external_dependencies.js'
import { crossModulePermissionChecker } from '#modules/authorization/public_contracts/permission_checker'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import { taskPublicApi } from '#modules/tasks/public_contracts/task_public_api'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'
```

### `app/modules/projects/actions/project_action_context.ts`

```ts
// no imports
```

### `app/modules/projects/actions/public_api.ts`

```ts
// no imports
```

### `app/modules/projects/actions/queries/get_project_create_page_query.ts`

```ts
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
```

### `app/modules/projects/actions/queries/get_project_detail_query.ts`

```ts
import { DefaultProjectDependencies } from '../ports/project_external_dependencies_impl.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { BaseQuery } from '#modules/projects/actions/base_query'
import {
  canAccessProjectOrganizationScope,
  calculateProjectDetailPermissions,
  canViewProject,
} from '#modules/projects/domain/project_permission_policy'
import type { ProjectPermissionContext } from '#modules/projects/domain/project_types'
import * as projectMemberQueries from '#modules/projects/infra/repositories/read/project_member_queries'
import * as projectModelQueries from '#modules/projects/infra/repositories/read/project_model_queries'
import type { ProjectDetailRecord } from '#modules/projects/types/project_records'
```

### `app/modules/projects/actions/queries/get_project_members_query.ts`

```ts
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { BaseQuery } from '#modules/projects/actions/base_query'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { PROJECT_PAGINATION as PAGINATION } from '#modules/projects/application/dtos/common/project_pagination'
import type { ProjectTaskStatsReader } from '#modules/projects/application/ports/project_task_stats_reader'
import { canViewProjectMembers } from '#modules/projects/domain/project_permission_policy'
import { TasksPublicApiProjectTaskStatsReader } from '#modules/projects/infra/adapters/tasks_public_api_project_task_stats_reader'
import ProjectMemberRepository from '#modules/projects/infra/repositories/project_member_repository'
```

### `app/modules/projects/actions/queries/get_projects_list_query.ts`

```ts
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { BaseQuery } from '#modules/projects/actions/base_query'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { PROJECT_PAGINATION as PAGINATION } from '#modules/projects/application/dtos/common/project_pagination'
import type { ProjectTaskStatsReader } from '#modules/projects/application/ports/project_task_stats_reader'
import { TasksPublicApiProjectTaskStatsReader } from '#modules/projects/infra/adapters/tasks_public_api_project_task_stats_reader'
import * as accessQueries from '#modules/projects/infra/repositories/read/access_queries'
import * as projectMemberQueries from '#modules/projects/infra/repositories/read/project_member_queries'
import type { ProjectVisibility } from '#modules/projects/public_contracts/project_constants'
```

### `app/modules/projects/actions/result.ts`

```ts
// no imports
```

### `app/modules/projects/actions/services/project_public_api.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import CreateProjectCommand from '../commands/create_project_command.js'
import type { CreateProjectDTO } from '../dtos/request/create_project_dto.js'
import type { ProjectCachePort } from '../ports/project_cache_port.js'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { ProjectCacheInvalidator } from '#modules/projects/infra/cache/project_cache_invalidator'
import * as projectMemberQueries from '#modules/projects/infra/repositories/read/project_member_queries'
import * as projectModelQueries from '#modules/projects/infra/repositories/read/project_model_queries'
```

### `app/modules/projects/controllers/add_project_member_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildAddProjectMemberDTO } from './mappers/request/project_request_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import AddProjectMemberCommand from '#modules/projects/actions/commands/add_project_member_command'
```

### `app/modules/projects/controllers/create_project_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import GetProjectCreatePageQuery from '#modules/projects/actions/queries/get_project_create_page_query'
```

### `app/modules/projects/controllers/delete_project_api_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildDeleteProjectDTO } from './mappers/request/project_request_mapper.js'
import { mapDeleteProjectApiBody } from './mappers/response/project_response_mapper.js'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import DeleteProjectCommand from '#modules/projects/actions/commands/delete_project_command'
```

### `app/modules/projects/controllers/delete_project_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildDeleteProjectDTO } from './mappers/request/project_request_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import DeleteProjectCommand from '#modules/projects/actions/commands/delete_project_command'
```

### `app/modules/projects/controllers/get_project_detail_api_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapProjectDetailApiBody } from './mappers/response/project_response_mapper.js'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import GetProjectDetailQuery from '#modules/projects/actions/queries/get_project_detail_query'
```

### `app/modules/projects/controllers/list_projects_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildProjectsListDTO } from './mappers/request/project_request_mapper.js'
import { mapProjectsIndexPageProps } from './mappers/response/project_response_mapper.js'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import GetProjectsListQuery from '#modules/projects/actions/queries/get_projects_list_query'
```

### `app/modules/projects/controllers/mappers/project_actor_context_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ProjectActorContext } from '#modules/projects/application/context/project_actor_context'
```

### `app/modules/projects/controllers/mappers/request/project_request_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import {
  PAGINATION,
  PROJECTS_DEFAULT_LIMIT,
  toBoolean,
  toDateTimeOrNull,
  toOptionalDateTime,
  toOptionalNumber,
  toOptionalString,
  toOptionalVisibility,
  toPositiveNumber,
  toProjectSortBy,
  toProjectSortOrder,
} from './shared.js'
import { AddProjectMemberDTO } from '#modules/projects/actions/dtos/request/add_project_member_dto'
import { CreateProjectDTO } from '#modules/projects/actions/dtos/request/create_project_dto'
import { DeleteProjectDTO } from '#modules/projects/actions/dtos/request/delete_project_dto'
import { UpdateProjectDTO } from '#modules/projects/actions/dtos/request/update_project_dto'
import type { GetProjectsListDTO } from '#modules/projects/actions/queries/get_projects_list_query'
import type { ProjectRole } from '#modules/projects/public_contracts/project_constants'
```

### `app/modules/projects/controllers/mappers/request/shared.ts`

```ts
import { DateTime } from 'luxon'
import type { GetProjectsListDTO } from '#modules/projects/actions/queries/get_projects_list_query'
import { PROJECT_PAGINATION as PAGINATION } from '#modules/projects/application/dtos/common/project_pagination'
import type { ProjectVisibility } from '#modules/projects/public_contracts/project_constants'
```

### `app/modules/projects/controllers/mappers/response/project_response_mapper.ts`

```ts
import type { ResponseRecord, SerializableResponseRecord } from './shared.js'
import { serializeCollectionForResponse, serializeForResponse } from './shared.js'
```

### `app/modules/projects/controllers/mappers/response/shared.ts`

```ts
// no imports
```

### `app/modules/projects/controllers/show_project_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapProjectDetailPageProps } from './mappers/response/project_response_mapper.js'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import GetProjectDetailQuery from '#modules/projects/actions/queries/get_project_detail_query'
```

### `app/modules/projects/controllers/store_project_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildCreateProjectDTO } from './mappers/request/project_request_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import CreateProjectCommand from '#modules/projects/actions/commands/create_project_command'
```

### `app/modules/projects/controllers/update_project_api_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildUpdateProjectDTO } from './mappers/request/project_request_mapper.js'
import { mapProjectMutationApiBody } from './mappers/response/project_response_mapper.js'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UpdateProjectCommand from '#modules/projects/actions/commands/update_project_command'
```
## Code Snippets

### `start/routes/projects.ts`

```ts
import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'
import { throttle } from '#start/limiter'

const ListProjectsController = () =>
  import('#modules/projects/controllers/list_projects_controller')
const CreateProjectController = () =>
  import('#modules/projects/controllers/create_project_controller')
const StoreProjectController = () =>
  import('#modules/projects/controllers/store_project_controller')
const ShowProjectController = () => import('#modules/projects/controllers/show_project_controller')
const DeleteProjectController = () =>
  import('#modules/projects/controllers/delete_project_controller')
const AddProjectMemberController = () =>
  import('#modules/projects/controllers/add_project_member_controller')

// Nhóm routes cho dự án, yêu cầu đăng nhập và có tổ chức hiện tại
router
  .group(() => {
    // Danh sách dự án
    router.get('/projects', [ListProjectsController, 'handle']).as('projects.index')
    // Form tạo dự án mới
    router.get('/projects/create', [CreateProjectController, 'handle']).as('projects.create')
    // Lưu dự án mới
    router.post('/projects', [StoreProjectController, 'handle']).as('projects.store')
    // Xem chi tiết dự án
    router.get('/projects/:id', [ShowProjectController, 'handle']).as('projects.show')
    // Xóa dự án
    router.delete('/projects/:id', [DeleteProjectController, 'handle']).as('projects.destroy')
    // Thêm thành viên vào dự án
    router
      .post('/projects/members', [AddProjectMemberController, 'handle'])
      .as('projects.members.add')
  })
  .use([middleware.auth(), middleware.requireOrg(), throttle])

```

### `app/modules/projects/actions/commands/add_project_member_command.ts`

```ts
import type { AddProjectMemberDTO } from '../dtos/request/add_project_member_dto.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { BaseCommand } from '#modules/projects/actions/base_command'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import type { ProjectActorLookup } from '#modules/projects/application/ports/project_actor_lookup'
import type { ProjectAuditEventPublisher } from '#modules/projects/application/ports/project_audit_event_publisher'
import type { ProjectEventPublisher } from '#modules/projects/application/ports/project_event_publisher'
import type { ProjectOrganizationAccessReader } from '#modules/projects/application/ports/project_organization_access'
import { canAddProjectMember } from '#modules/projects/domain/project_permission_policy'
import { AuditEventProjectAuditEventPublisher } from '#modules/projects/infra/adapters/audit_event_project_audit_event_publisher'
import { InProcessProjectEventPublisher } from '#modules/projects/infra/adapters/in_process_project_event_publisher'
import { OrganizationPublicApiProjectOrganizationAccessReader } from '#modules/projects/infra/adapters/organization_public_api_project_organization_access_reader'
import { UsersPublicApiProjectActorLookup } from '#modules/projects/infra/adapters/users_public_api_project_actor_lookup'
import * as projectMemberQueries from '#modules/projects/infra/repositories/read/project_member_queries'
import * as projectModelQueries from '#modules/projects/infra/repositories/read/project_model_queries'
import * as projectMemberMutations from '#modules/projects/infra/repositories/write/project_member_mutations'

/**
 * Command to add a member to a project
 *
 * Business Rules:
 * - Only owner or superadmin can add members
 * - User must be in the same organization
 * - User cannot already be a member
 * - Validates project_role_id exists (FK validation)
 * - Sends notification to the added user
 *
 * @extends {BaseCommand<AddProjectMemberDTO, void>}
 */
export default class AddProjectMemberCommand extends BaseCommand<AddProjectMemberDTO> {
  constructor(
    execCtx: ProjectActionContext,
    private readonly actorLookup: ProjectActorLookup = new UsersPublicApiProjectActorLookup(),
    private readonly organizationAccessReader: ProjectOrganizationAccessReader = new OrganizationPublicApiProjectOrganizationAccessReader(),
    private readonly projectEventPublisher: ProjectEventPublisher = new InProcessProjectEventPublisher(),
    private readonly projectAuditEventPublisher: ProjectAuditEventPublisher = new AuditEventProjectAuditEventPublisher()
  ) {
    super(execCtx)
  }

  /**
   * Execute the command
   *
   * @param dto - Validated AddProjectMemberDTO
   */
  async handle(dto: AddProjectMemberDTO): Promise<void> {
    const userId = this.getCurrentUserId()

    await this.executeInTransaction(async (trx) => {
      // 1. Load project
      const project = await projectModelQueries.findActiveOrFail(dto.project_id, trx)

      // 2-6. Validate via pure rule
      const actor = await this.actorLookup.findProjectActor(userId, trx)
      const organizationAccess = await this.organizationAccessReader.findOrganizationAccess(
        {
          organizationId: project.organization_id,
          actorUserId: userId,
        },
        trx
      )
      await this.organizationAccessReader.ensureApprovedMember(project.organization_id, dto.user_id, trx)
      const existingMember = await projectMemberQueries.findMember(
        dto.project_id,
        dto.user_id,
        trx
      )

      enforcePolicy(
        canAddProjectMember({
          actorId: userId,
          actorSystemRole: actor?.systemRole ?? null,
          actorOrgRole: organizationAccess?.actorOrganizationRole ?? null,
          projectOwnerId: project.owner_id ?? '',
          projectCreatorId: project.creator_id,
          targetRole: dto.project_role,
          isTargetOrgMember: true,
          isAlreadyMember: !!existingMember,
        })
      )

      // Load user to be added (for audit log)
      const userToAdd = await this.actorLookup.findProjectActor(dto.user_id, trx)

      // 7. Add user as member
      await projectMemberMutations.addMember(dto.project_id, dto.user_id, dto.project_role, trx)

      await this.projectAuditEventPublisher.publishProjectAudit(this.execCtx, {
          action: 'add_member',
          entityId: project.id,
          oldValues: null,
          newValues: {
            user_id: dto.user_id,
            username: userToAdd?.username ?? null,
            project_role: dto.project_role,
          },
        })
    })

    await this.projectEventPublisher.publishProjectMemberAdded({
      projectId: dto.project_id,
      userId: dto.user_id,
      project_role: dto.project_role,
      addedBy: userId,
    })
  }
}

```

### `app/modules/projects/actions/commands/create_project_command.ts`

```ts
import type { CreateProjectDTO } from '../dtos/request/create_project_dto.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { BaseCommand } from '#modules/projects/actions/base_command'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import type { ProjectAuditEventPublisher } from '#modules/projects/application/ports/project_audit_event_publisher'
import type { ProjectEventPublisher } from '#modules/projects/application/ports/project_event_publisher'
import type { ProjectOrganizationAccessReader } from '#modules/projects/application/ports/project_organization_access'
import type { ProjectPermissionReader } from '#modules/projects/application/ports/project_permission_reader'
import { canCreateProject } from '#modules/projects/domain/project_permission_policy'
import { validateProjectStatus, validateProjectDates } from '#modules/projects/domain/project_state_rules'
import { AuditEventProjectAuditEventPublisher } from '#modules/projects/infra/adapters/audit_event_project_audit_event_publisher'
import { InProcessProjectEventPublisher } from '#modules/projects/infra/adapters/in_process_project_event_publisher'
import { OrganizationPublicApiProjectOrganizationAccessReader } from '#modules/projects/infra/adapters/organization_public_api_project_organization_access_reader'
import { PublicApiProjectPermissionReader } from '#modules/projects/infra/adapters/public_api_project_permission_reader'
import * as projectModelQueries from '#modules/projects/infra/repositories/read/project_model_queries'
import * as projectMemberMutations from '#modules/projects/infra/repositories/write/project_member_mutations'
import * as projectMutations from '#modules/projects/infra/repositories/write/project_mutations'
import { ProjectRole } from '#modules/projects/public_contracts/project_constants'
import type { ProjectDetailRecord } from '#modules/projects/types/project_records'

/**
 * Command to create a new project
 *
 * Di chuyển logic từ database triggers:
 * - before_insert_project: Check permission can_create_project, set owner_id, manager_id
 * - after_project_insert: Add owner to project_members với project_role_id = 1
 *
 * Business Rules:
 * - Check permission can_create_project (từ trigger before_insert_project)
 * - Owner mặc định là creator
 * - Manager mặc định là owner
 * - Creator tự động thành project_members với role owner (project_role_id = 1)
 *
 * @extends {BaseCommand<CreateProjectDTO, ProjectDetailRecord>}
 */
export default class CreateProjectCommand extends BaseCommand<
  CreateProjectDTO,
  ProjectDetailRecord
> {
  constructor(
    execCtx: ProjectActionContext,
    private readonly permissionReader: ProjectPermissionReader = new PublicApiProjectPermissionReader(),
    private readonly organizationAccessReader: ProjectOrganizationAccessReader = new OrganizationPublicApiProjectOrganizationAccessReader(),
    private readonly projectEventPublisher: ProjectEventPublisher = new InProcessProjectEventPublisher(),
    private readonly projectAuditEventPublisher: ProjectAuditEventPublisher = new AuditEventProjectAuditEventPublisher()
  ) {
    super(execCtx)
  }

  async handle(dto: CreateProjectDTO): Promise<ProjectDetailRecord> {
    const userId = this.getCurrentUserId()

    const createdProject = await this.executeInTransaction(async (trx) => {
      // 1. Check permission can_create_project (logic từ procedure)
      const hasPermission = await this.permissionReader.checkOrganizationPermission({
        actorUserId: userId,
        organizationId: dto.organization_id,
        permission: 'can_create_project',
        trx,
      })

      enforcePolicy(
        canCreateProject({
          actorSystemRole: null,
          isOrgAdminOrOwner: hasPermission,
        })
      )

      const isSuperadmin = await this.permissionReader.isSystemSuperadmin(userId, trx)

      // 2. v3: Validate status via pure rule
      if (dto.status) {
        enforcePolicy(validateProjectStatus(dto.status))
      }

      // 3. Validate dates via pure rule
      if (dto.start_date && dto.end_date) {
        enforcePolicy(
          validateProjectDates({
            startDate: dto.start_date.toISO() ?? null,
            endDate: dto.end_date.toISO() ?? null,
          })
        )
      }

      // 4. Organization members must be approved unless the actor is a superadmin bypass.
      if (!isSuperadmin) {
        await this.organizationAccessReader.ensureApprovedMember(dto.organization_id, userId, trx)
      }

      // 5. Set owner_id and manager_id
      const ownerId = userId
      const managerId = dto.manager_id ?? ownerId

      // 6. Create the project
      const project = await projectMutations.createRecord(
        {
          name: dto.name,
          description: dto.description ?? null,
          organization_id: dto.organization_id,
          creator_id: userId,
          owner_id: ownerId,
          manager_id: managerId,
          status: dto.status,
          visibility: dto.visibility,
          start_date: dto.start_date ?? null,
          end_date: dto.end_date ?? null,
          budget: dto.budget,
        },
        trx
      )

      // 7. Add owner as project member (from trigger)
      await projectMemberMutations.addMember(project.id, ownerId, ProjectRole.OWNER, trx)

      await this.projectAuditEventPublisher.publishProjectAudit(this.execCtx, {
        action: 'create',
        entityId: project.id,
        oldValues: null,
        newValues: project,
      })

      return project
    })

    const result = await this.loadProjectWithRelations(createdProject.id)

    await this.projectEventPublisher.publishProjectCreated({
      projectId: result.id,
      creatorId: userId,
      organizationId: result.organization_id,
      name: result.name,
    })

    return result
  }

  /**
   * Load project with all necessary relations
   */
  private async loadProjectWithRelations(
    projectId: string
  ): Promise<ProjectDetailRecord> {
    return projectModelQueries.findDetailWithRelationsRecord(projectId)
  }
}

```

### `app/modules/projects/actions/commands/delete_project_command.ts`

```ts
import type { DeleteProjectDTO } from '../dtos/request/delete_project_dto.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'
import { BaseCommand } from '#modules/projects/actions/base_command'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import type { ProjectActorLookup } from '#modules/projects/application/ports/project_actor_lookup'
import type { ProjectAuditEventPublisher } from '#modules/projects/application/ports/project_audit_event_publisher'
import type { ProjectEventPublisher } from '#modules/projects/application/ports/project_event_publisher'
import type { ProjectOrganizationAccessReader } from '#modules/projects/application/ports/project_organization_access'
import type { ProjectTaskStatsReader } from '#modules/projects/application/ports/project_task_stats_reader'
import { canDeleteProject } from '#modules/projects/domain/project_permission_policy'
import { AuditEventProjectAuditEventPublisher } from '#modules/projects/infra/adapters/audit_event_project_audit_event_publisher'
import { InProcessProjectEventPublisher } from '#modules/projects/infra/adapters/in_process_project_event_publisher'
import { OrganizationPublicApiProjectOrganizationAccessReader } from '#modules/projects/infra/adapters/organization_public_api_project_organization_access_reader'
import { TasksPublicApiProjectTaskStatsReader } from '#modules/projects/infra/adapters/tasks_public_api_project_task_stats_reader'
import { UsersPublicApiProjectActorLookup } from '#modules/projects/infra/adapters/users_public_api_project_actor_lookup'
import * as projectMutations from '#modules/projects/infra/repositories/write/project_mutations'

/**
 * Command to delete a project (soft delete by default)
 *
 * Business Rules:
 * - Only owner or superadmin can delete projects
 * - Warns if project has incomplete tasks
 * - Soft delete by default (sets deleted_at timestamp)
 * - Permanent delete option available (use with caution)
 *
 * @extends {BaseCommand<DeleteProjectDTO, void>}
 */
export default class DeleteProjectCommand extends BaseCommand<DeleteProjectDTO> {
  constructor(
    execCtx: ProjectActionContext,
    private readonly taskStatsReader: ProjectTaskStatsReader = new TasksPublicApiProjectTaskStatsReader(),
    private readonly actorLookup: ProjectActorLookup = new UsersPublicApiProjectActorLookup(),
    private readonly organizationAccessReader: ProjectOrganizationAccessReader = new OrganizationPublicApiProjectOrganizationAccessReader(),
    private readonly projectEventPublisher: ProjectEventPublisher = new InProcessProjectEventPublisher(),
    private readonly projectAuditEventPublisher: ProjectAuditEventPublisher = new AuditEventProjectAuditEventPublisher()
  ) {
    super(execCtx)
  }

  /**
   * Execute the command
   *
   * @param dto - Validated DeleteProjectDTO
   */
  async handle(dto: DeleteProjectDTO): Promise<void> {
    const userId = this.getCurrentUserId()

    const deletedProjectEvent = await this.executeInTransaction(async (trx) => {
      // 1. Load project
      const project = await projectMutations.findActiveForUpdateRecord(dto.project_id, trx)

      // Optional scope guard for adapters that require current organization context.
      if (dto.current_organization_id && project.organization_id !== dto.current_organization_id) {
        enforcePolicy(PR.deny('Dự án không thuộc tổ chức hiện tại'))
      }

      // 2. Check permissions and incomplete tasks via pure rule
      const user = await this.actorLookup.findProjectActor(userId, trx)
      const organizationAccess = await this.organizationAccessReader.findOrganizationAccess(
        {
          organizationId: project.organization_id,
          actorUserId: userId,
        },
        trx
      )
      const taskStats = await this.taskStatsReader.getTaskStats(project.id, trx)

      enforcePolicy(
        canDeleteProject({
          actorId: userId,
          actorSystemRole: user?.systemRole ?? null,
          actorOrgRole: organizationAccess?.actorOrganizationRole ?? null,
          projectOwnerId: project.owner_id ?? '',
          projectCreatorId: project.creator_id,
          incompleteTaskCount: taskStats.incompleteTasks,
          pendingReviewSessionCount: taskStats.pendingReviewSessions,
        })
      )

      // 4. Store old values for audit
      const oldValues = { ...project }

      // 5. Perform delete (soft or permanent)
      const deletedProject = dto.isPermanentDelete()
        ? await projectMutations.hardDeleteByIdRecord(project.id, trx)
        : await projectMutations.softDeleteByIdRecord(project.id, trx)

      await this.projectAuditEventPublisher.publishProjectAudit(this.execCtx, {
        action: 'delete',
        entityId: project.id,
        oldValues,
        newValues: {
          deleted_at: deletedProject.deleted_at,
          reason: dto.reason,
          permanent: dto.permanent,
        },
      })

      return {
        projectId: project.id,
        organizationId: project.organization_id,
      }
    })

    await this.projectEventPublisher.publishProjectDeleted({
      projectId: deletedProjectEvent.projectId,
      organizationId: deletedProjectEvent.organizationId,
      deletedBy: userId,
    })
  }
}

```

### `app/modules/projects/actions/commands/remove_project_member_command.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { RemoveProjectMemberDTO } from '../dtos/request/remove_project_member_dto.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { BaseCommand } from '#modules/projects/actions/base_command'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import type { ProjectActorLookup } from '#modules/projects/application/ports/project_actor_lookup'
import type { ProjectAuditEventPublisher } from '#modules/projects/application/ports/project_audit_event_publisher'
import type { ProjectEventPublisher } from '#modules/projects/application/ports/project_event_publisher'
import type { ProjectOrganizationAccessReader } from '#modules/projects/application/ports/project_organization_access'
import type { ProjectTaskAssignmentInvariant } from '#modules/projects/application/ports/project_task_assignment_invariant'
import { canRemoveProjectMember } from '#modules/projects/domain/project_permission_policy'
import { AuditEventProjectAuditEventPublisher } from '#modules/projects/infra/adapters/audit_event_project_audit_event_publisher'
import { InProcessProjectEventPublisher } from '#modules/projects/infra/adapters/in_process_project_event_publisher'
import { OrganizationPublicApiProjectOrganizationAccessReader } from '#modules/projects/infra/adapters/organization_public_api_project_organization_access_reader'
import { TasksPublicApiProjectTaskAssignmentInvariant } from '#modules/projects/infra/adapters/tasks_public_api_project_task_assignment_invariant'
import { UsersPublicApiProjectActorLookup } from '#modules/projects/infra/adapters/users_public_api_project_actor_lookup'
import * as projectMemberQueries from '#modules/projects/infra/repositories/read/project_member_queries'
import * as projectModelQueries from '#modules/projects/infra/repositories/read/project_model_queries'
import * as projectMemberMutations from '#modules/projects/infra/repositories/write/project_member_mutations'

/**
 * Command to remove a member from a project
 *
 * Business Rules:
 * - Only owner or superadmin can remove members
 * - Cannot remove the owner
 * - Cannot remove the last superadmin
 * - Tasks assigned to removed member are reassigned to manager or specified user
 *
 * @extends {BaseCommand<RemoveProjectMemberDTO, void>}
 */
export default class RemoveProjectMemberCommand extends BaseCommand<RemoveProjectMemberDTO> {
  constructor(
    execCtx: ProjectActionContext,
    private readonly taskAssignmentInvariant: ProjectTaskAssignmentInvariant = new TasksPublicApiProjectTaskAssignmentInvariant(),
    private readonly actorLookup: ProjectActorLookup = new UsersPublicApiProjectActorLookup(),
    private readonly organizationAccessReader: ProjectOrganizationAccessReader = new OrganizationPublicApiProjectOrganizationAccessReader(),
    private readonly projectEventPublisher: ProjectEventPublisher = new InProcessProjectEventPublisher(),
    private readonly projectAuditEventPublisher: ProjectAuditEventPublisher = new AuditEventProjectAuditEventPublisher()
  ) {
    super(execCtx)
  }

  /**
   * Execute the command
   *
   * @param dto - Validated RemoveProjectMemberDTO
   */
  async handle(dto: RemoveProjectMemberDTO): Promise<void> {
    const userId = this.getCurrentUserId()

    await this.executeInTransaction(async (trx) => {
      // 1. Load project
      const project = await projectModelQueries.findActiveOrFail(dto.project_id, trx)

      // 2. Check permissions via pure rule
      const actor = await this.actorLookup.findProjectActor(userId, trx)
      const organizationAccess = await this.organizationAccessReader.findOrganizationAccess(
        {
          organizationId: project.organization_id,
          actorUserId: userId,
        },
        trx
      )

      enforcePolicy(
        canRemoveProjectMember({
          actorId: userId,
          actorSystemRole: actor?.systemRole ?? null,
          actorOrgRole: organizationAccess?.actorOrganizationRole ?? null,
          projectOwnerId: project.owner_id ?? '',
          projectCreatorId: project.creator_id,
          targetUserId: dto.user_id,
        })
      )

      // 3. Load user to be removed (for audit log)
      const userToRemove = await this.actorLookup.findProjectActor(dto.user_id, trx)

      // 5. Get member role before removal
      const memberRole = await projectMemberQueries.getRoleName(dto.project_id, dto.user_id, trx)

      // 6. Reassign tasks if needed
      const reassignToUserId = dto.reassign_to ?? project.manager_id ?? project.owner_id
      if (reassignToUserId === null) {
        throw new BusinessLogicException(
          'Không thể phân công lại công việc - không có người dùng hợp lệ'
        )
      }
      await this.reassignTasks(dto.project_id, dto.user_id, reassignToUserId, userId, trx)

      // 7. Remove member
      await projectMemberMutations.deleteMember(dto.project_id, dto.user_id, trx)

      await this.projectAuditEventPublisher.publishProjectAudit(this.execCtx, {
        action: 'remove_member',
        entityId: project.id,
        oldValues: {
          user_id: dto.user_id,
          username: userToRemove?.username ?? null,
          role: memberRole,
        },
        newValues: {
          reason: dto.reason,
          reassigned_to: reassignToUserId,
        },
      })
    })

    await this.projectEventPublisher.publishProjectMemberRemoved({
      projectId: dto.project_id,
      userId: dto.user_id,
      removedBy: userId,
    })
  }

  /**
   * Reassign all tasks from removed member → delegate to Model
   */
  private async reassignTasks(
    projectId: string,
    fromUserId: string,
    toUserId: string,
    requestedByUserId: string,
    trx: TransactionClientContract
  ): Promise<void> {
    await this.taskAssignmentInvariant.reassignOrUnassignTasksForRemovedMember({
      projectId,
      removedUserId: fromUserId,
      fallbackAssigneeUserId: toUserId,
      requestedByUserId,
      trx,
    })
  }
}

```

### `app/modules/projects/actions/commands/transfer_project_ownership_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { DefaultProjectDependencies } from '../ports/project_external_dependencies_impl.js'

import { EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { canTransferProjectOwnership } from '#modules/projects/domain/project_permission_policy'
import * as projectMemberQueries from '#modules/projects/infra/repositories/read/project_member_queries'
import * as projectMemberMutations from '#modules/projects/infra/repositories/write/project_member_mutations'
import * as projectMutations from '#modules/projects/infra/repositories/write/project_mutations'
import { ProjectRole } from '#modules/projects/public_contracts/project_constants'
import type { ProjectRecord } from '#modules/projects/types/project_records'

/**
 * DTO for transferring project ownership
 */
export interface TransferProjectOwnershipDTO {
  project_id: string
  new_owner_id: string
}

interface PersistedProjectOwnershipTransfer {
  project: ProjectRecord
  oldOwnerId: string | null
}

/**
 * Command: Transfer Project Ownership
 *
 * Migrate từ stored procedure: transfer_project_ownership
 *
 * Business rules:
 * - Chỉ owner hoặc org_admin mới có thể transfer
 * - Không thể transfer cho chính mình
 * - New owner phải là member của organization
 * - Thêm new owner vào project_members nếu chưa có
 * - Cập nhật role: old owner → project_manager, new owner → project_owner
 */
export default class TransferProjectOwnershipCommand {
  constructor(
    protected execCtx: ProjectActionContext,
    private createNotification: NotificationCreator
  ) {}

  async execute(dto: TransferProjectOwnershipDTO): Promise<ProjectRecord> {
    const actorId = this.requireActorId()
    const transfer = await this.transferOwnershipInTransaction(dto, actorId)
    await this.runPostCommitEffects(transfer, actorId, dto)
    return transfer.project
  }

  private requireActorId(): string {
    const currentUserId = this.execCtx.userId
    if (!currentUserId) {
      throw new UnauthorizedException()
    }

    return currentUserId
  }

  private async loadOwnershipTransferContext(
    dto: TransferProjectOwnershipDTO,
    actorId: string,
    trx: TransactionClientContract
  ): Promise<{
    project: ProjectRecord
    currentOwnerId: string | null
  }> {
    const project = await projectMutations.findActiveForUpdateRecord(dto.project_id, trx)
    const currentOwnerId = project.owner_id ?? null

    const actorOrgRole = await DefaultProjectDependencies.organization.getMembershipRole(
      project.organization_id,
      actorId,
      trx
    )
    const isNewOwnerOrgMember = await DefaultProjectDependencies.organization.isApprovedMember(
      project.organization_id,
      dto.new_owner_id,
      trx
    )

    enforcePolicy(
      canTransferProjectOwnership({
        actorId,
        actorOrgRole,
        projectOwnerId: currentOwnerId ?? '',
        newOwnerId: dto.new_owner_id,
        isNewOwnerOrgMember,
      })
    )

    const isNewOwnerActive = await DefaultProjectDependencies.user.isActiveUser(
      dto.new_owner_id,
      trx
    )
    if (!isNewOwnerActive) {
      throw new BusinessLogicException('Chủ sở hữu mới phải là người dùng active')
    }

    return { project, currentOwnerId }
  }

  private async persistOwnershipTransfer(
    dto: TransferProjectOwnershipDTO,
    actorId: string,
    trx: TransactionClientContract
  ): Promise<PersistedProjectOwnershipTransfer> {
    const { project, currentOwnerId } = await this.loadOwnershipTransferContext(dto, actorId, trx)

    await this.upsertProjectOwnerMembership(dto, trx)
    await this.demotePreviousOwner(dto.project_id, currentOwnerId, dto.new_owner_id, trx)
    const updatedProject = await this.updateProjectOwner(project, dto.new_owner_id, trx)
    await this.recordOwnershipTransferAudit(currentOwnerId, actorId, dto)

    return {
      project: updatedProject,
      oldOwnerId: currentOwnerId,
    }
  }

  private async upsertProjectOwnerMembership(
    dto: TransferProjectOwnershipDTO,
    trx: TransactionClientContract
  ): Promise<void> {
    const existingMember = await projectMemberQueries.findMember(
      dto.project_id,
      dto.new_owner_id,
      trx
    )

    if (!existingMember) {
      await projectMemberMutations.addMember(
        dto.project_id,
        dto.new_owner_id,
        ProjectRole.OWNER,
        trx
      )
      return
    }

    await projectMemberMutations.updateRole(
      dto.project_id,
      dto.new_owner_id,
      ProjectRole.OWNER,
      trx
    )
  }

  private async demotePreviousOwner(
    projectId: string,
    currentOwnerId: string | null,
    newOwnerId: string,
    trx: TransactionClientContract
  ): Promise<void> {
    if (!currentOwnerId || currentOwnerId === newOwnerId) {
      return
    }

    await projectMemberMutations.updateRole(projectId, currentOwnerId, ProjectRole.MANAGER, trx)
  }

  private async updateProjectOwner(
    project: ProjectRecord,
    newOwnerId: string,
    trx: TransactionClientContract
  ): Promise<ProjectRecord> {
    return projectMutations.updateOwnerRecord(project.id, newOwnerId, trx)
  }

  private async recordOwnershipTransferAudit(
    currentOwnerId: string | null,
    actorId: string,
    dto: TransferProjectOwnershipDTO
  ): Promise<void> {
    await auditPublicApi.log(
      {
        user_id: actorId,
        action: 'transfer_ownership',
        entity_type: EntityType.PROJECT,
        entity_id: dto.project_id,
        old_values: { owner_id: currentOwnerId },
        new_values: { owner_id: dto.new_owner_id },
      },
      this.execCtx
    )
  }

  private async transferOwnershipInTransaction(
    dto: TransferProjectOwnershipDTO,
    actorId: string
  ): Promise<PersistedProjectOwnershipTransfer> {
    const trx: TransactionClientContract = await db.transaction()

    try {
      const transfer = await this.persistOwnershipTransfer(dto, actorId, trx)
      await trx.commit()
      return transfer
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private async runPostCommitEffects(
    transfer: PersistedProjectOwnershipTransfer,
    actorId: string,
    dto: TransferProjectOwnershipDTO
  ): Promise<void> {
    void emitter.emit('project:ownership:transferred', {
      projectId: dto.project_id,
      fromUserId: transfer.oldOwnerId ?? '',
      toUserId: dto.new_owner_id,
      transferredBy: actorId,
    })

    if (transfer.oldOwnerId) {
      await this.sendNotifications(transfer.project, transfer.oldOwnerId, dto.new_owner_id)
    }
  }

  private async sendNotifications(
    project: ProjectRecord,
    oldOwnerId: string,
    newOwnerId: string
  ): Promise<void> {
    try {
      await this.createNotification.handle({
        user_id: newOwnerId,
        title: 'Bạn đã trở thành project owner',
        message: `Bạn đã được chuyển giao quyền sở hữu project "${project.name}".`,
        type: BACKEND_NOTIFICATION_TYPES.PROJECT_OWNERSHIP_TRANSFERRED,
        related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.PROJECT,
        related_entity_id: project.id,
      })

      await this.createNotification.handle({
        user_id: oldOwnerId,
        title: 'Đã chuyển giao quyền sở hữu project',
        message: `Quyền sở hữu project "${project.name}" đã được chuyển giao.`,
        type: BACKEND_NOTIFICATION_TYPES.PROJECT_OWNERSHIP_TRANSFERRED,
        related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.PROJECT,
        related_entity_id: project.id,
      })
    } catch (error) {
      loggerService.error('[TransferProjectOwnershipCommand] Failed to send notifications:', error)
    }
  }
}

```

### `app/modules/projects/actions/commands/update_project_command.ts`

```ts
import type { UpdateProjectDTO } from '../dtos/request/update_project_dto.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { BaseCommand } from '#modules/projects/actions/base_command'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import type { ProjectActorLookup } from '#modules/projects/application/ports/project_actor_lookup'
import type { ProjectAuditEventPublisher } from '#modules/projects/application/ports/project_audit_event_publisher'
import type { ProjectEventPublisher } from '#modules/projects/application/ports/project_event_publisher'
import type { ProjectOrganizationAccessReader } from '#modules/projects/application/ports/project_organization_access'
import { canUpdateProjectFields } from '#modules/projects/domain/project_permission_policy'
import { AuditEventProjectAuditEventPublisher } from '#modules/projects/infra/adapters/audit_event_project_audit_event_publisher'
import { InProcessProjectEventPublisher } from '#modules/projects/infra/adapters/in_process_project_event_publisher'
import { OrganizationPublicApiProjectOrganizationAccessReader } from '#modules/projects/infra/adapters/organization_public_api_project_organization_access_reader'
import { UsersPublicApiProjectActorLookup } from '#modules/projects/infra/adapters/users_public_api_project_actor_lookup'
import * as projectMemberQueries from '#modules/projects/infra/repositories/read/project_member_queries'
import * as projectMutations from '#modules/projects/infra/repositories/write/project_mutations'
import type { ProjectRecord } from '#modules/projects/types/project_records'

/**
 * Command to update an existing project
 *
 * Business Rules:
 * - Owner can update all fields
 * - Superadmin can update all fields
 * - Manager can update: description, start_date, end_date, status
 * - Logs all field changes to audit trail
 *
 * @extends {BaseCommand<UpdateProjectDTO, ProjectRecord>}
 */
export default class UpdateProjectCommand extends BaseCommand<
  UpdateProjectDTO,
  ProjectRecord
> {
  constructor(
    execCtx: ProjectActionContext,
    private readonly actorLookup: ProjectActorLookup = new UsersPublicApiProjectActorLookup(),
    private readonly organizationAccessReader: ProjectOrganizationAccessReader = new OrganizationPublicApiProjectOrganizationAccessReader(),
    private readonly projectEventPublisher: ProjectEventPublisher = new InProcessProjectEventPublisher(),
    private readonly projectAuditEventPublisher: ProjectAuditEventPublisher = new AuditEventProjectAuditEventPublisher()
  ) {
    super(execCtx)
  }

  /**
   * Execute the command
   *
   * @param dto - Validated UpdateProjectDTO
   * @returns Updated project
   */
  async handle(dto: UpdateProjectDTO): Promise<ProjectRecord> {
    const userId = this.getCurrentUserId()

    // Check if there are any updates
    if (!dto.hasUpdates()) {
      throw new BusinessLogicException('Không có thay đổi nào để cập nhật')
    }

    const result = await this.executeInTransaction(async (trx) => {
      // 1. Load project with lock (prevents concurrent updates)
      const project = await projectMutations.findActiveForUpdateRecord(dto.project_id, trx)

      // 2. Check permissions via pure rule
      const actor = await this.actorLookup.findProjectActor(userId, trx)
      const organizationAccess = await this.organizationAccessReader.findOrganizationAccess(
        {
          organizationId: project.organization_id,
          actorUserId: userId,
        },
        trx
      )
      const projectMember = await projectMemberQueries.findMember(dto.project_id, userId, trx)
      const actorProjectRole = projectMember?.project_role ?? null

      const fieldResult = canUpdateProjectFields(
        {
          actorId: userId,
          actorSystemRole: actor?.systemRole ?? null,
          actorOrgRole: organizationAccess?.actorOrganizationRole ?? null,
          actorProjectRole,
          projectCreatorId: project.creator_id,
          projectOwnerId: project.owner_id ?? '',
          projectOrganizationId: project.organization_id,
        },
        dto.getUpdatedFields()
      )
      enforcePolicy(fieldResult)

      // 3. Store old values for audit
      const oldValues = this.getTrackedFields(project)

      // 4. Update project fields
      const updateData = dto.toObject()
      const updatedProject = await projectMutations.updateByIdRecord(project.id, updateData, trx)

      // 5. Get new values
      const newValues = this.getTrackedFields(updatedProject)

      // 6. Log audit trail for each changed field
      await this.logFieldChanges(project.id, oldValues, newValues, dto.getUpdatedFields())

      return {
        project: updatedProject,
        projectUpdatedEvent: {
          projectId: project.id,
          updatedBy: userId,
          changes: updateData,
        },
      }
    })

    await this.projectEventPublisher.publishProjectUpdated(result.projectUpdatedEvent)

    return result.project
  }

  /**
   * Get tracked field values for audit
   */
  private getTrackedFields(project: ProjectRecord): Record<string, unknown> {
    return {
      name: project.name,
      description: project.description,
      status: project.status,
      start_date: project.start_date,
      end_date: project.end_date,
      manager_id: project.manager_id,
      owner_id: project.owner_id,
      visibility: project.visibility,
      budget: project.budget,
    }
  }

  /**
   * Log changes for each updated field
   */
  private async logFieldChanges(
    projectId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    updatedFields: string[]
  ): Promise<void> {
    for (const field of updatedFields) {
      if (oldValues[field] !== newValues[field]) {
        if (this.execCtx.userId) {
          await this.projectAuditEventPublisher.publishProjectAudit(this.execCtx, {
            action: 'update',
            entityId: projectId,
            oldValues: { [field]: oldValues[field] },
            newValues: {
              [field]: newValues[field],
            },
          })
        }
      }
    }
  }
}

```

### `app/modules/projects/actions/queries/get_project_create_page_query.ts`

```ts
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'

export interface GetProjectCreatePageResult {
  organizations: Awaited<ReturnType<typeof organizationPublicApi.listUserOwnedOrganizations>>
  statuses: { id: string; name: string }[]
}

export default class GetProjectCreatePageQuery {
  constructor(protected execCtx: ProjectActionContext) {}

  async execute(): Promise<GetProjectCreatePageResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const organizations = await organizationPublicApi.listUserOwnedOrganizations(userId)

    return {
      organizations,
      statuses: [],
    }
  }
}

```

### `app/modules/projects/actions/queries/get_project_detail_query.ts`

```ts
import { DefaultProjectDependencies } from '../ports/project_external_dependencies_impl.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { BaseQuery } from '#modules/projects/actions/base_query'
import {
  canAccessProjectOrganizationScope,
  calculateProjectDetailPermissions,
  canViewProject,
} from '#modules/projects/domain/project_permission_policy'
import type { ProjectPermissionContext } from '#modules/projects/domain/project_types'
import * as projectMemberQueries from '#modules/projects/infra/repositories/read/project_member_queries'
import * as projectModelQueries from '#modules/projects/infra/repositories/read/project_model_queries'
import type { ProjectDetailRecord } from '#modules/projects/types/project_records'

/**
 * Member interface for query results
 */
interface ProjectMemberResult {
  user_id: string
  username: string
  email: string
  role: string
  joined_at: Date
  task_count: number
}

/**
 * Query result interface
 */
export interface GetProjectDetailResult {
  project: {
    id: string
    name: string
    description: string | null
    organization_id: string
    organization_name: string | null
    creator_id: string
    creator_name: string | null
    manager_id: string | null
    manager_name: string | null
    owner_id: string | null
    owner_name: string | null
    start_date: string | null
    end_date: string | null
    status: string
    budget: number | null
    visibility: string | null
    created_at: string | null
    updated_at: string | null
  }
  members: {
    user_id: string
    username: string
    email: string
    role: string
    joined_at: Date
    task_count: number
  }[]
  tasks: {
    id: string
    title: string
    description: string | null
    status: string
    task_status_id: string | null
    priority: string | null
    assignee_name: string | null
    due_date: string | null
  }[]
  tasks_summary: {
    total: number
    pending: number
    in_progress: number
    completed: number
    overdue: number
  }
  recent_activity: unknown[]
  permissions: {
    isOwner: boolean
    isManager: boolean
    isCreator: boolean
    isMember: boolean
    canEdit: boolean
    canDelete: boolean
    canAddMembers: boolean
  }
}

/**
 * Query to get detailed information about a single project
 *
 * Features:
 * - Full project information with all relations
 * - List of members with roles and task counts
 * - Task summary grouped by status
 * - Recent activity (last 10 audit logs)
 * - User permissions (what actions user can perform)
 * - Cached for 5 minutes
 *
 * @extends {BaseQuery<number, GetProjectDetailResult>}
 */
export default class GetProjectDetailQuery extends BaseQuery<
  {
    projectId: string
    organizationId?: string
  },
  GetProjectDetailResult
> {
  /**
   * Execute the query
   */
  async handle(input: {
    projectId: string
    organizationId?: string
  }): Promise<GetProjectDetailResult> {
    const projectId = input.projectId
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new UnauthorizedException()
    }

    // Load project with relations
    const project = await projectModelQueries.findDetailWithRelationsRecord(projectId)

    const permissionContext = await this.buildPermissionContext(
      userId,
      project,
      input.organizationId
    )
    enforcePolicy(canViewProject(permissionContext))

    // Fetch all related data in parallel
    const [members, tasks, tasksSummary, recentActivity] = await Promise.all([
      this.getMembers(projectId),
      this.getTasks(projectId),
      this.getTasksSummary(projectId),
      this.getRecentActivity(projectId),
    ])

    // Calculate permissions
    const permissions = calculateProjectDetailPermissions({
      ...permissionContext,
      projectManagerId: project.manager_id,
    })

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        organization_id: project.organization_id,
        organization_name: project.organization?.name ?? null,
        creator_id: project.creator_id,
        creator_name: project.creator?.username ?? null,
        manager_id: project.manager_id,
        manager_name: project.manager?.username ?? null,
        owner_id: project.owner_id,
        owner_name: project.owner?.username ?? null,
        start_date: project.start_date,
        end_date: project.end_date,
        status: project.status,
        budget: project.budget,
        visibility: project.visibility,
        created_at: project.created_at,
        updated_at: project.updated_at,
      },
      members,
      tasks,
      tasks_summary: tasksSummary,
      recent_activity: recentActivity,
      permissions,
    }
  }

  private async buildPermissionContext(
    userId: string,
    project: ProjectDetailRecord,
    currentOrganizationId?: string
  ): Promise<ProjectPermissionContext> {
    enforcePolicy(
      canAccessProjectOrganizationScope({
        requestedOrganizationId: currentOrganizationId ?? null,
        projectOrganizationId: project.organization_id,
      })
    )

    const orgId = currentOrganizationId ?? project.organization_id
    const [actorSystemRole, actorMembership, actorProjectRole] = await Promise.all([
      DefaultProjectDependencies.user.getSystemRoleName(userId),
      DefaultProjectDependencies.organization.getMembershipRole(orgId, userId),
      projectMemberQueries.getRoleName(project.id, userId).then((role) =>
        role === 'unknown' ? null : role
      ),
    ])

    return {
      actorId: userId,
      actorSystemRole,
      actorOrgRole: actorMembership,
      actorProjectRole,
      projectCreatorId: project.creator_id,
      projectOwnerId: project.owner_id ?? (''),
      projectOrganizationId: project.organization_id,
    }
  }

  /**
   * Get list of project members with details → delegate to Model
   */
  private async getMembers(projectId: string): Promise<ProjectMemberResult[]> {
    const { data: members } = await projectMemberQueries.getMembersWithDetails(projectId)

    // Get task count for each member via Model
    const taskCountMap = await DefaultProjectDependencies.task.countByAssignees(projectId)

    return members.map((member) => ({
      ...member,
      task_count: taskCountMap.get(member.user_id) ?? 0,
    }))
  }

  private async getTasks(projectId: string): Promise<
    {
      id: string
      title: string
      description: string | null
      status: string
      task_status_id: string | null
      priority: string | null
      assignee_name: string | null
      due_date: string | null
    }[]
  > {
    return DefaultProjectDependencies.task.listPreviewByProject(projectId, 8)
  }

  /**
   * Get tasks summary grouped by status
   */
  private getTasksSummary(projectId: string): Promise<{
    total: number
    pending: number
    in_progress: number
    completed: number
    overdue: number
  }> {
    return DefaultProjectDependencies.task.getSummaryByProject(projectId)
  }

  /**
   * Get recent activity (last 10 audit logs) → delegate to Model
   */
  private async getRecentActivity(projectId: string): Promise<
    {
      id: string
      user_id: string | null
      entity_type: string
      entity_id: string | null
      action: string
      created_at: Date
      username: string | null
    }[]
  > {
    const logs = await auditPublicApi.listByEntity('project', projectId, 10)
    const userMap = await auditPublicApi.buildUserMap(logs, ['id', 'username'])

    return logs.map((log) => {
      const user = userMap.get(String(log.user_id))
      return {
        id: log.id,
        user_id: log.user_id ?? null,
        entity_type: log.entity_type,
        entity_id: log.entity_id ?? null,
        action: log.action,
        created_at: log.created_at,
        username: user?.username ?? null,
      }
    })
  }

  /**
   * Get cache key for this query
   */
  protected getCacheKey(projectId: string): string {
    const userId = this.getCurrentUserId() ?? 0
    return `projects:detail:${projectId}:user:${userId}`
  }

  /**
   * Cache TTL: 5 minutes
   */
  protected getCacheTTL(): number {
    return 5 * 60
  }
}

```

### `app/modules/projects/actions/queries/get_project_members_query.ts`

```ts
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { BaseQuery } from '#modules/projects/actions/base_query'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { PROJECT_PAGINATION as PAGINATION } from '#modules/projects/application/dtos/common/project_pagination'
import type { ProjectTaskStatsReader } from '#modules/projects/application/ports/project_task_stats_reader'
import { canViewProjectMembers } from '#modules/projects/domain/project_permission_policy'
import { TasksPublicApiProjectTaskStatsReader } from '#modules/projects/infra/adapters/tasks_public_api_project_task_stats_reader'
import ProjectMemberRepository from '#modules/projects/infra/repositories/project_member_repository'

/**
 * DTO for GetProjectMembersQuery input
 */
export interface GetProjectMembersDTO {
  project_id: string
  page?: number
  limit?: number
  role?: string
  search?: string
}

/**
 * Query result interface
 */
export interface GetProjectMembersResult {
  data: {
    user_id: string
    username: string
    email: string
    role: string
    joined_at: Date
    task_count: number
    last_active_at: Date | null
  }[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Query to get paginated list of project members
 *
 * Features:
 * - Pagination support
 * - Filter by role
 * - Search by name or email
 * - Includes task count per member
 * - Includes last activity timestamp
 * - Cached for 3 minutes
 *
 * @extends {BaseQuery<GetProjectMembersDTO, GetProjectMembersResult>}
 */
/**
 * Member row interface for query results
 */
interface MemberRow {
  user_id: string
  role: string
  joined_at: Date
  username: string
  email: string
}

export default class GetProjectMembersQuery extends BaseQuery<
  GetProjectMembersDTO,
  GetProjectMembersResult
> {
  constructor(
    execCtx: ProjectActionContext,
    private readonly taskStatsReader: ProjectTaskStatsReader = new TasksPublicApiProjectTaskStatsReader()
  ) {
    super(execCtx)
  }

  /**
   * Execute the query
   */
  async handle(dto: GetProjectMembersDTO): Promise<GetProjectMembersResult> {
    // Validate user has access to this project
    await this.validateAccess(dto.project_id)

    // Default values
    const page = dto.page ?? 1
    const limit = dto.limit ?? PAGINATION.DEFAULT_PER_PAGE

    // Get members → delegate to Model
    const { data: members, total } = await ProjectMemberRepository.getMembersWithDetails(
      dto.project_id,
      {
        page,
        limit,
        role: dto.role,
        search: dto.search,
      }
    )

    // Enrich with task counts and last activity
    const enrichedMembers = await this.enrichMembers(members, dto.project_id)

    return {
      data: enrichedMembers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Validate user has access to view project members → delegate to Model
   */
  private async validateAccess(projectId: string): Promise<void> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new UnauthorizedException()
    }

    const hasAccess = await ProjectMemberRepository.hasAccess(projectId, userId)
    enforcePolicy(canViewProjectMembers({ hasProjectAccess: hasAccess }))
  }

  /**
   * Enrich members with task counts and last activity → delegate to Model
   */
  private async enrichMembers(
    members: MemberRow[],
    projectId: string
  ): Promise<GetProjectMembersResult['data']> {
    if (members.length === 0) return []

    const userIds = members.map((m) => m.user_id)

    // Get task counts and last activity in parallel → delegate to Model
    const [taskCountMap, lastActivityMap] = await Promise.all([
      this.taskStatsReader.countTasksByAssignees(projectId, userIds),
      auditPublicApi.getLastActivityByUsers('project', projectId, userIds),
    ])

    // Enrich members
    return members.map((member) => ({
      ...member,
      task_count: taskCountMap.get(member.user_id) ?? 0,
      last_active_at: lastActivityMap.get(member.user_id) ?? null,
    }))
  }

  /**
   * Get cache key for this query
   */
  protected getCacheKey(input: GetProjectMembersDTO): string {
    return `projects:members:${input.project_id}:${JSON.stringify(input)}`
  }

  /**
   * Cache TTL: 3 minutes
   */
  protected getCacheTTL(): number {
    return 3 * 60
  }
}

```
