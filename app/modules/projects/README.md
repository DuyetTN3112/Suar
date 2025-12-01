# projects Backend Module

### Kiến trúc lõi & Phân tích nghiệp vụ
- **Project Context**: Điểm neo chính kết nối giữa Organization, Member, Project Skills (`project_skills`), Project Professional Roles (`project_professional_roles`), và các Task nghiệp vụ.

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
