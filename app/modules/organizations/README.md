# organizations Backend Module

## Module Path

```text
app/modules/organizations
```

## Folder And File Inventory

```text
./ README.md index.ts
actions/ base_command.ts base_query.ts interfaces.ts organization_action_context.ts public_api.ts result.ts
actions/builders/ member_request_dto_builders.ts
actions/commands/ add_member_by_email_command.ts add_member_command.ts approve_membership.ts bulk_add_members_command.ts bulk_invite_users_command.ts create_join_request_command.ts create_organization_command.ts delete_organization_command.ts invite_user_command.ts process_join_request_command.ts remove_member_command.ts request_organization_join_command.ts switch_organization_command.ts transfer_organization_ownership_command.ts update_member_role_command.ts update_organization_command.ts
actions/current/access/commands/ update_custom_roles_command.ts
actions/current/access/queries/ get_access_configuration_query.ts get_assignable_organization_roles_query.ts
actions/current/dashboard/ get_organization_dashboard_stats_query.ts
actions/current/invitations/queries/ get_invitations_index_page_query.ts list_invitations_query.ts list_join_requests_query.ts
actions/current/members/queries/ get_organization_members_index_page_query.ts list_organization_members_query.ts
actions/current/projects/commands/ create_project_command.ts
actions/current/projects/queries/ list_projects_query.ts
actions/current/settings/commands/ update_organization_settings_command.ts
actions/current/settings/queries/ get_organization_settings_query.ts
actions/current/tasks/queries/ get_organization_tasks_index_page_query.ts
actions/current/workflow/commands/ create_task_status_command.ts
actions/current/workflow/queries/ list_task_statuses_query.ts
actions/dtos/request/ add_member_dto.ts bulk_add_members_dto.ts create_organization_dto.ts delete_organization_dto.ts get_organization_detail_dto.ts get_organization_members_dto.ts get_organizations_list_dto.ts invite_user_dto.ts process_join_request_dto.ts remove_member_dto.ts update_member_role_dto.ts update_organization_dto.ts
actions/dtos/response/ organization_response_dtos.ts
actions/mapper/ organization_application_mapper.ts
actions/ports/ organization_external_dependencies.ts organization_external_dependencies_impl.ts
actions/queries/ check_join_eligibility_query.ts find_pending_join_request_query.ts get_all_organizations_query.ts get_debug_organization_info_query.ts get_organization_basic_info_query.ts get_organization_detail_query.ts get_organization_members_api_query.ts get_organization_members_page_query.ts get_organization_members_query.ts get_organization_members_with_analytics_query.ts get_organization_metadata_query.ts get_organization_show_data_query.ts get_organization_show_page_query.ts get_organization_tasks_query.ts get_organizations_index_page_query.ts get_organizations_list_query.ts get_pending_requests_page_query.ts get_pending_requests_query.ts get_user_owned_organizations_query.ts get_users_in_organization_query.ts
actions/services/ organization_public_api.ts
application/context/ organization_actor_context.ts
application/dtos/common/ organization_pagination.ts
application/events/ .gitkeep
application/ports/ organization_actor_lookup.ts organization_event_publisher.ts organization_membership_reader.ts organization_project_invariant.ts organization_task_invariant.ts
constants/ organization_constants.ts
controllers/ add_direct_member_controller.ts add_member_controller.ts add_users_controller.ts all_organizations_controller.ts api_list_organizations_controller.ts create_organization_controller.ts delete_organization_api_controller.ts invite_member_controller.ts join_organization_controller.ts list_members_controller.ts list_organizations_controller.ts pending_requests_controller.ts process_join_request_controller.ts remove_member_controller.ts show_organization_api_controller.ts show_organization_controller.ts switch_and_redirect_controller.ts switch_organization_controller.ts update_member_role_controller.ts update_organization_api_controller.ts
controllers/current/access/mappers/request/ update_roles_request_mapper.ts
controllers/current/access/mappers/response/ update_roles_response_mapper.ts
controllers/current/access/ show_departments_controller.ts show_permissions_controller.ts show_roles_controller.ts update_roles_controller.ts
controllers/current/ dashboard_controller.ts
controllers/current/invitations/ approve_join_request_controller.ts list_invitations_controller.ts list_join_requests_controller.ts
controllers/current/invitations/mappers/request/ list_invitations_request_mapper.ts
controllers/current/invitations/mappers/response/ list_invitations_response_mapper.ts
controllers/current/mappers/request/ current_organization_mutation_request_mapper.ts
controllers/current/mappers/response/ current_organization_mutation_response_mapper.ts shared.ts
controllers/current/members/ invite_member_controller.ts list_members_controller.ts remove_member_controller.ts update_member_role_controller.ts
controllers/current/members/mappers/request/ list_members_request_mapper.ts
controllers/current/members/mappers/response/ list_members_response_mapper.ts
controllers/current/projects/ create_project_controller.ts list_projects_controller.ts show_project_controller.ts
controllers/current/projects/mappers/request/ current_project_request_mapper.ts
controllers/current/projects/mappers/response/ current_project_response_mapper.ts
controllers/current/settings/ show_settings_controller.ts update_settings_controller.ts
controllers/current/tasks/ list_tasks_controller.ts show_task_controller.ts
controllers/current/tasks/mappers/request/ current_task_request_mapper.ts
controllers/current/workflow/ create_task_status_controller.ts list_task_statuses_controller.ts
controllers/current/workflow/mappers/request/ current_task_status_request_mapper.ts
controllers/current/workflow/mappers/response/ current_task_status_response_mapper.ts
controllers/mappers/ organization_actor_context_mapper.ts
controllers/mappers/request/ join_organization_request_mapper.ts organization_request_mapper.ts
controllers/mappers/response/ join_organization_response_mapper.ts organization_mutation_api_mapper.ts organization_page_props_mapper.ts organization_response_mapper.ts
domain/entities/ organization_entity.ts
domain/mapper/ organization_domain_mapper.ts
domain/ org_access_rules.ts org_permission_policy.ts org_types.ts organization_rules.ts
domain/repositories/ organization_repository_interface.ts
events/ organization_events.ts
infra/adapters/ .gitkeep
infra/current/repositories/ organization_invitation_repository.ts organization_member_repository.ts organization_project_repository.ts organization_settings_repository.ts organization_task_repository.ts organization_workflow_repository.ts
infra/current/repositories/write/ organization_project_mutations.ts organization_settings_mutations.ts organization_workflow_mutations.ts
infra/mapper/ organization_infra_mapper.ts
infra/models/ organization.ts organization_invitation.ts organization_join_request.ts organization_user.ts
infra/repositories/ organization_repository_barrel.ts organization_repository_impl.ts
infra/repositories/organization_user_repository/read/ listing_queries.ts membership_queries.ts shared.ts
infra/repositories/organization_user_repository/write/ mutation_queries.ts
infra/repositories/read/ org_access_repository.ts organization_repository.ts
infra/repositories/write/ organization_mutations.ts
middleware/ organization_admin_context_middleware.ts organization_resolver_middleware.ts require_org_admin_middleware.ts require_org_owner_middleware.ts require_organization_middleware.ts
public_contracts/ organization_constants.ts organization_events_v1.ts organization_membership_v1.ts organization_public_api.ts
public_contracts/schemas/ organization_events_v1.schema.ts
types/ custom_role_definition.ts organization_records.ts
validators/ organization.ts
validators/rules/ database.ts
```

## Route Evidence

```text
start/routes/api.ts
start/routes/api_v1.ts
start/routes/organizations.ts
start/routes/organizations_current.ts
start/routes/projects.ts
start/routes/settings.ts
start/routes/tasks.ts
```

## Symbol Evidence

| Kind | Symbol | File | Line |
|---|---|---|---:|
| interface | `InviteMemberRequestInput` | `app/modules/organizations/actions/builders/member_request_dto_builders.ts` | 8 |
| interface | `UpdateMemberRoleRequestInput` | `app/modules/organizations/actions/builders/member_request_dto_builders.ts` | 16 |
| interface | `BuildMemberRequestOptions` | `app/modules/organizations/actions/builders/member_request_dto_builders.ts` | 23 |
| class | `AddMemberByEmailCommand` | `app/modules/organizations/actions/commands/add_member_by_email_command.ts` | 15 |
| class | `AddMemberCommand` | `app/modules/organizations/actions/commands/add_member_command.ts` | 38 |
| class | `BulkAddMembersCommand` | `app/modules/organizations/actions/commands/bulk_add_members_command.ts` | 29 |
| interface | `BulkInviteUsersDTO` | `app/modules/organizations/actions/commands/bulk_invite_users_command.ts` | 10 |
| class | `BulkInviteUsersCommand` | `app/modules/organizations/actions/commands/bulk_invite_users_command.ts` | 26 |
| class | `CreateJoinRequestCommand` | `app/modules/organizations/actions/commands/create_join_request_command.ts` | 18 |
| class | `CreateOrganizationCommand` | `app/modules/organizations/actions/commands/create_organization_command.ts` | 57 |
| class | `DeleteOrganizationCommand` | `app/modules/organizations/actions/commands/delete_organization_command.ts` | 25 |
| class | `InviteUserCommand` | `app/modules/organizations/actions/commands/invite_user_command.ts` | 38 |
| class | `ProcessJoinRequestCommand` | `app/modules/organizations/actions/commands/process_join_request_command.ts` | 35 |
| class | `RemoveMemberCommand` | `app/modules/organizations/actions/commands/remove_member_command.ts` | 32 |
| interface | `RequestOrganizationJoinResult` | `app/modules/organizations/actions/commands/request_organization_join_command.ts` | 11 |
| class | `RequestOrganizationJoinCommand` | `app/modules/organizations/actions/commands/request_organization_join_command.ts` | 18 |
| class | `SwitchOrganizationCommand` | `app/modules/organizations/actions/commands/switch_organization_command.ts` | 33 |
| interface | `TransferOrganizationOwnershipDTO` | `app/modules/organizations/actions/commands/transfer_organization_ownership_command.ts` | 30 |
| class | `TransferOrganizationOwnershipCommand` | `app/modules/organizations/actions/commands/transfer_organization_ownership_command.ts` | 55 |
| class | `UpdateMemberRoleCommand` | `app/modules/organizations/actions/commands/update_member_role_command.ts` | 46 |
| class | `UpdateOrganizationCommand` | `app/modules/organizations/actions/commands/update_organization_command.ts` | 32 |
| interface | `UpdateCustomRolesDTO` | `app/modules/organizations/actions/current/access/commands/update_custom_roles_command.ts` | 9 |
| class | `UpdateCustomRolesCommand` | `app/modules/organizations/actions/current/access/commands/update_custom_roles_command.ts` | 13 |
| interface | `AccessConfigurationResult` | `app/modules/organizations/actions/current/access/queries/get_access_configuration_query.ts` | 39 |
| class | `GetAccessConfigurationQuery` | `app/modules/organizations/actions/current/access/queries/get_access_configuration_query.ts` | 79 |
| interface | `GetAssignableOrganizationRolesDTO` | `app/modules/organizations/actions/current/access/queries/get_assignable_organization_roles_query.ts` | 6 |
| interface | `AssignableOrganizationRoleOption` | `app/modules/organizations/actions/current/access/queries/get_assignable_organization_roles_query.ts` | 10 |
| interface | `AssignableOrganizationRolesResult` | `app/modules/organizations/actions/current/access/queries/get_assignable_organization_roles_query.ts` | 15 |
| class | `GetAssignableOrganizationRolesQuery` | `app/modules/organizations/actions/current/access/queries/get_assignable_organization_roles_query.ts` | 20 |
| interface | `GetOrganizationDashboardStatsDTO` | `app/modules/organizations/actions/current/dashboard/get_organization_dashboard_stats_query.ts` | 14 |
| interface | `GetOrganizationDashboardStatsResult` | `app/modules/organizations/actions/current/dashboard/get_organization_dashboard_stats_query.ts` | 18 |
| class | `GetOrganizationDashboardStatsQuery` | `app/modules/organizations/actions/current/dashboard/get_organization_dashboard_stats_query.ts` | 41 |
| type | `InvitationsIndexPageInput` | `app/modules/organizations/actions/current/invitations/queries/get_invitations_index_page_query.ts` | 6 |
| interface | `InvitationsIndexPageResult` | `app/modules/organizations/actions/current/invitations/queries/get_invitations_index_page_query.ts` | 8 |
| class | `GetInvitationsIndexPageQuery` | `app/modules/organizations/actions/current/invitations/queries/get_invitations_index_page_query.ts` | 14 |
| interface | `ListInvitationsDTO` | `app/modules/organizations/actions/current/invitations/queries/list_invitations_query.ts` | 11 |
| interface | `ListInvitationsResult` | `app/modules/organizations/actions/current/invitations/queries/list_invitations_query.ts` | 18 |
| class | `ListInvitationsQuery` | `app/modules/organizations/actions/current/invitations/queries/list_invitations_query.ts` | 43 |
| interface | `ListJoinRequestsDTO` | `app/modules/organizations/actions/current/invitations/queries/list_join_requests_query.ts` | 4 |
| interface | `ListJoinRequestsResult` | `app/modules/organizations/actions/current/invitations/queries/list_join_requests_query.ts` | 10 |
| class | `ListJoinRequestsQuery` | `app/modules/organizations/actions/current/invitations/queries/list_join_requests_query.ts` | 30 |
| type | `OrganizationMembersIndexPageInput` | `app/modules/organizations/actions/current/members/queries/get_organization_members_index_page_query.ts` | 8 |
| interface | `OrganizationMembersIndexPageResult` | `app/modules/organizations/actions/current/members/queries/get_organization_members_index_page_query.ts` | 10 |
| class | `GetOrganizationMembersIndexPageQuery` | `app/modules/organizations/actions/current/members/queries/get_organization_members_index_page_query.ts` | 21 |
| interface | `ListOrganizationMembersDTO` | `app/modules/organizations/actions/current/members/queries/list_organization_members_query.ts` | 12 |
| interface | `ListOrganizationMembersResult` | `app/modules/organizations/actions/current/members/queries/list_organization_members_query.ts` | 21 |
| class | `ListOrganizationMembersQuery` | `app/modules/organizations/actions/current/members/queries/list_organization_members_query.ts` | 39 |
| class | `CreateCurrentOrganizationProjectCommand` | `app/modules/organizations/actions/current/projects/commands/create_project_command.ts` | 4 |
| interface | `ListProjectsDTO` | `app/modules/organizations/actions/current/projects/queries/list_projects_query.ts` | 11 |
| interface | `ListProjectsResult` | `app/modules/organizations/actions/current/projects/queries/list_projects_query.ts` | 18 |
| class | `ListProjectsQuery` | `app/modules/organizations/actions/current/projects/queries/list_projects_query.ts` | 42 |
| interface | `UpdateOrganizationSettingsDTO` | `app/modules/organizations/actions/current/settings/commands/update_organization_settings_command.ts` | 14 |
| class | `UpdateOrganizationSettingsCommand` | `app/modules/organizations/actions/current/settings/commands/update_organization_settings_command.ts` | 21 |
| type | `GetOrganizationSettingsDTO` | `app/modules/organizations/actions/current/settings/queries/get_organization_settings_query.ts` | 14 |
| interface | `GetOrganizationSettingsResult` | `app/modules/organizations/actions/current/settings/queries/get_organization_settings_query.ts` | 16 |
| class | `GetOrganizationSettingsQuery` | `app/modules/organizations/actions/current/settings/queries/get_organization_settings_query.ts` | 26 |
| type | `OrganizationTasksIndexPageInput` | `app/modules/organizations/actions/current/tasks/queries/get_organization_tasks_index_page_query.ts` | 8 |
| type | `OrganizationTasksIndexPageResult` | `app/modules/organizations/actions/current/tasks/queries/get_organization_tasks_index_page_query.ts` | 9 |
| class | `GetOrganizationTasksIndexPageQuery` | `app/modules/organizations/actions/current/tasks/queries/get_organization_tasks_index_page_query.ts` | 11 |
| class | `CreateOrganizationTaskStatusCommand` | `app/modules/organizations/actions/current/workflow/commands/create_task_status_command.ts` | 5 |
| type | `ListTaskStatusesDTO` | `app/modules/organizations/actions/current/workflow/queries/list_task_statuses_query.ts` | 11 |
| interface | `ListTaskStatusesResult` | `app/modules/organizations/actions/current/workflow/queries/list_task_statuses_query.ts` | 13 |
| class | `ListTaskStatusesQuery` | `app/modules/organizations/actions/current/workflow/queries/list_task_statuses_query.ts` | 23 |
| class | `AddMemberDTO` | `app/modules/organizations/actions/dtos/request/add_member_dto.ts` | 16 |
| class | `BulkAddMembersDTO` | `app/modules/organizations/actions/dtos/request/bulk_add_members_dto.ts` | 6 |
| class | `CreateOrganizationDTO` | `app/modules/organizations/actions/dtos/request/create_organization_dto.ts` | 16 |
| class | `DeleteOrganizationDTO` | `app/modules/organizations/actions/dtos/request/delete_organization_dto.ts` | 12 |
| class | `GetOrganizationDetailDTO` | `app/modules/organizations/actions/dtos/request/get_organization_detail_dto.ts` | 12 |
| class | `GetOrganizationMembersDTO` | `app/modules/organizations/actions/dtos/request/get_organization_members_dto.ts` | 14 |
| class | `GetOrganizationsListDTO` | `app/modules/organizations/actions/dtos/request/get_organizations_list_dto.ts` | 13 |
| interface | `InviteUserRecord` | `app/modules/organizations/actions/dtos/request/invite_user_dto.ts` | 5 |
| class | `InviteUserDTO` | `app/modules/organizations/actions/dtos/request/invite_user_dto.ts` | 23 |
| class | `ProcessJoinRequestDTO` | `app/modules/organizations/actions/dtos/request/process_join_request_dto.ts` | 13 |
| class | `RemoveMemberDTO` | `app/modules/organizations/actions/dtos/request/remove_member_dto.ts` | 14 |
| interface | `UpdateMemberRoleRecord` | `app/modules/organizations/actions/dtos/request/update_member_role_dto.ts` | 5 |
| class | `UpdateMemberRoleDTO` | `app/modules/organizations/actions/dtos/request/update_member_role_dto.ts` | 22 |
| class | `UpdateOrganizationDTO` | `app/modules/organizations/actions/dtos/request/update_organization_dto.ts` | 12 |
| interface | `OrganizationDetailResponseDTOProps` | `app/modules/organizations/actions/dtos/response/organization_response_dtos.ts` | 11 |
| interface | `OrganizationListItemResponseDTOProps` | `app/modules/organizations/actions/dtos/response/organization_response_dtos.ts` | 27 |
| interface | `OrganizationSummaryResponseDTOProps` | `app/modules/organizations/actions/dtos/response/organization_response_dtos.ts` | 39 |
| interface | `OrganizationMemberResponseDTOProps` | `app/modules/organizations/actions/dtos/response/organization_response_dtos.ts` | 46 |
| class | `OrganizationDetailResponseDTO` | `app/modules/organizations/actions/dtos/response/organization_response_dtos.ts` | 61 |
| class | `OrganizationListItemResponseDTO` | `app/modules/organizations/actions/dtos/response/organization_response_dtos.ts` | 118 |
| class | `OrganizationSummaryResponseDTO` | `app/modules/organizations/actions/dtos/response/organization_response_dtos.ts` | 163 |
| class | `OrganizationMemberResponseDTO` | `app/modules/organizations/actions/dtos/response/organization_response_dtos.ts` | 193 |
| interface | `CommandHandler` | `app/modules/organizations/actions/interfaces.ts` | 7 |
| interface | `QueryHandler` | `app/modules/organizations/actions/interfaces.ts` | 22 |
| interface | `Command` | `app/modules/organizations/actions/interfaces.ts` | 36 |
| interface | `Query` | `app/modules/organizations/actions/interfaces.ts` | 43 |
| class | `OrganizationApplicationMapper` | `app/modules/organizations/actions/mapper/organization_application_mapper.ts` | 20 |
| interface | `OrganizationActionContext` | `app/modules/organizations/actions/organization_action_context.ts` | 1 |
| interface | `AuthenticatedOrganizationActionContext` | `app/modules/organizations/actions/organization_action_context.ts` | 8 |
| function | `makeSystemOrganizationActionContext` | `app/modules/organizations/actions/organization_action_context.ts` | 12 |
| interface | `OrganizationOwnerName` | `app/modules/organizations/actions/ports/organization_external_dependencies.ts` | 4 |
| interface | `OrganizationUserIdentity` | `app/modules/organizations/actions/ports/organization_external_dependencies.ts` | 9 |
| interface | `DebugUserOrganizationsInfo` | `app/modules/organizations/actions/ports/organization_external_dependencies.ts` | 16 |
| interface | `OrganizationUserReaderWriter` | `app/modules/organizations/actions/ports/organization_external_dependencies.ts` | 23 |
| interface | `OrganizationProjectTaskReaderWriter` | `app/modules/organizations/actions/ports/organization_external_dependencies.ts` | 50 |
| interface | `OrganizationExternalDependencies` | `app/modules/organizations/actions/ports/organization_external_dependencies.ts` | 68 |
| class | `InfraOrganizationUserReaderWriter` | `app/modules/organizations/actions/ports/organization_external_dependencies_impl.ts` | 17 |
| class | `InfraOrganizationProjectTaskReaderWriter` | `app/modules/organizations/actions/ports/organization_external_dependencies_impl.ts` | 87 |
| const | `DefaultOrganizationDependencies` | `app/modules/organizations/actions/ports/organization_external_dependencies_impl.ts` | 126 |
| class | `CheckJoinEligibilityQuery` | `app/modules/organizations/actions/queries/check_join_eligibility_query.ts` | 19 |
| class | `FindPendingJoinRequestQuery` | `app/modules/organizations/actions/queries/find_pending_join_request_query.ts` | 12 |
| class | `GetAllOrganizationsQuery` | `app/modules/organizations/actions/queries/get_all_organizations_query.ts` | 36 |
| class | `GetDebugOrganizationInfoQuery` | `app/modules/organizations/actions/queries/get_debug_organization_info_query.ts` | 18 |
| class | `GetOrganizationBasicInfoQuery` | `app/modules/organizations/actions/queries/get_organization_basic_info_query.ts` | 14 |
| class | `GetOrganizationDetailQuery` | `app/modules/organizations/actions/queries/get_organization_detail_query.ts` | 54 |
| class | `GetOrganizationMembersApiQuery` | `app/modules/organizations/actions/queries/get_organization_members_api_query.ts` | 43 |
| interface | `OrganizationMembersPageResult` | `app/modules/organizations/actions/queries/get_organization_members_page_query.ts` | 14 |
| interface | `OrganizationMembersPageFilters` | `app/modules/organizations/actions/queries/get_organization_members_page_query.ts` | 22 |
| class | `GetOrganizationMembersPageQuery` | `app/modules/organizations/actions/queries/get_organization_members_page_query.ts` | 37 |
| class | `GetOrganizationMembersQuery` | `app/modules/organizations/actions/queries/get_organization_members_query.ts` | 54 |
| interface | `OrganizationMembersAnalytics` | `app/modules/organizations/actions/queries/get_organization_members_with_analytics_query.ts` | 8 |
| interface | `GetOrganizationMembersWithAnalyticsResult` | `app/modules/organizations/actions/queries/get_organization_members_with_analytics_query.ts` | 14 |
| class | `GetOrganizationMembersWithAnalyticsQuery` | `app/modules/organizations/actions/queries/get_organization_members_with_analytics_query.ts` | 29 |
| class | `GetOrganizationMetadataQuery` | `app/modules/organizations/actions/queries/get_organization_metadata_query.ts` | 42 |
| class | `GetOrganizationShowDataQuery` | `app/modules/organizations/actions/queries/get_organization_show_data_query.ts` | 23 |
| interface | `OrganizationShowPageResult` | `app/modules/organizations/actions/queries/get_organization_show_page_query.ts` | 9 |
| class | `GetOrganizationShowPageQuery` | `app/modules/organizations/actions/queries/get_organization_show_page_query.ts` | 27 |
| class | `GetOrganizationTasksQuery` | `app/modules/organizations/actions/queries/get_organization_tasks_query.ts` | 32 |
| interface | `OrganizationsIndexPageResult` | `app/modules/organizations/actions/queries/get_organizations_index_page_query.ts` | 10 |
| class | `GetOrganizationsIndexPageQuery` | `app/modules/organizations/actions/queries/get_organizations_index_page_query.ts` | 22 |
| class | `GetOrganizationsListQuery` | `app/modules/organizations/actions/queries/get_organizations_list_query.ts` | 56 |
| interface | `PendingRequestsPageResult` | `app/modules/organizations/actions/queries/get_pending_requests_page_query.ts` | 6 |
| class | `GetPendingRequestsPageQuery` | `app/modules/organizations/actions/queries/get_pending_requests_page_query.ts` | 11 |
| class | `GetPendingRequestsQuery` | `app/modules/organizations/actions/queries/get_pending_requests_query.ts` | 47 |
| class | `GetUserOwnedOrganizationsQuery` | `app/modules/organizations/actions/queries/get_user_owned_organizations_query.ts` | 15 |
| class | `GetUsersInOrganizationQuery` | `app/modules/organizations/actions/queries/get_users_in_organization_query.ts` | 15 |
| class | `Result` | `app/modules/organizations/actions/result.ts` | 5 |
| class | `OrganizationPublicApi` | `app/modules/organizations/actions/services/organization_public_api.ts` | 19 |
| const | `organizationPublicApi` | `app/modules/organizations/actions/services/organization_public_api.ts` | 141 |
| interface | `OrganizationActorContext` | `app/modules/organizations/application/context/organization_actor_context.ts` | 1 |
| const | `ORGANIZATION_PAGINATION` | `app/modules/organizations/application/dtos/common/organization_pagination.ts` | 1 |
| interface | `OrganizationActor` | `app/modules/organizations/application/ports/organization_actor_lookup.ts` | 1 |
| interface | `OrganizationActorLookup` | `app/modules/organizations/application/ports/organization_actor_lookup.ts` | 8 |
| type | `OrganizationPublicEventV1` | `app/modules/organizations/application/ports/organization_event_publisher.ts` | 7 |
| interface | `OrganizationEventPublisher` | `app/modules/organizations/application/ports/organization_event_publisher.ts` | 12 |
| interface | `OrganizationMembershipSnapshot` | `app/modules/organizations/application/ports/organization_membership_reader.ts` | 1 |
| interface | `OrganizationMembershipReader` | `app/modules/organizations/application/ports/organization_membership_reader.ts` | 9 |
| interface | `OrganizationMemberRemovedProjectInvariantInput` | `app/modules/organizations/application/ports/organization_project_invariant.ts` | 3 |
| interface | `OrganizationProjectInvariant` | `app/modules/organizations/application/ports/organization_project_invariant.ts` | 10 |
| interface | `OrganizationMemberRemovedTaskInvariantInput` | `app/modules/organizations/application/ports/organization_task_invariant.ts` | 3 |
| interface | `OrganizationTaskInvariant` | `app/modules/organizations/application/ports/organization_task_invariant.ts` | 10 |
| enum | `OrganizationRole` | `app/modules/organizations/constants/organization_constants.ts` | 22 |
| enum | `OrganizationUserStatus` | `app/modules/organizations/constants/organization_constants.ts` | 33 |
| enum | `PartnerType` | `app/modules/organizations/constants/organization_constants.ts` | 43 |
| class | `AddDirectMemberController` | `app/modules/organizations/controllers/add_direct_member_controller.ts` | 15 |
| class | `AddMemberController` | `app/modules/organizations/controllers/add_member_controller.ts` | 10 |
| class | `AddUsersController` | `app/modules/organizations/controllers/add_users_controller.ts` | 16 |
| class | `AllOrganizationsController` | `app/modules/organizations/controllers/all_organizations_controller.ts` | 10 |
| class | `ApiListOrganizationsController` | `app/modules/organizations/controllers/api_list_organizations_controller.ts` | 9 |
| class | `CreateOrganizationController` | `app/modules/organizations/controllers/create_organization_controller.ts` | 13 |
| function | `buildUpdateCustomRolesDTO` | `app/modules/organizations/controllers/current/access/mappers/request/update_roles_request_mapper.ts` | 5 |
| function | `getUpdateCustomRolesSuccessMessage` | `app/modules/organizations/controllers/current/access/mappers/response/update_roles_response_mapper.ts` | 1 |
| function | `mapUpdateCustomRolesSuccessApiBody` | `app/modules/organizations/controllers/current/access/mappers/response/update_roles_response_mapper.ts` | 5 |
| class | `ShowDepartmentsController` | `app/modules/organizations/controllers/current/access/show_departments_controller.ts` | 6 |
| class | `ShowPermissionsController` | `app/modules/organizations/controllers/current/access/show_permissions_controller.ts` | 6 |
| class | `ShowRolesController` | `app/modules/organizations/controllers/current/access/show_roles_controller.ts` | 6 |
| class | `UpdateRolesController` | `app/modules/organizations/controllers/current/access/update_roles_controller.ts` | 11 |
| class | `OrgDashboardController` | `app/modules/organizations/controllers/current/dashboard_controller.ts` | 13 |
| class | `ApproveJoinRequestController` | `app/modules/organizations/controllers/current/invitations/approve_join_request_controller.ts` | 18 |
| class | `ListInvitationsController` | `app/modules/organizations/controllers/current/invitations/list_invitations_controller.ts` | 17 |
| class | `ListJoinRequestsController` | `app/modules/organizations/controllers/current/invitations/list_join_requests_controller.ts` | 16 |
| function | `buildInvitationsIndexPageInput` | `app/modules/organizations/controllers/current/invitations/mappers/request/list_invitations_request_mapper.ts` | 25 |
| function | `mapInvitationsIndexPageProps` | `app/modules/organizations/controllers/current/invitations/mappers/response/list_invitations_response_mapper.ts` | 3 |
| function | `buildCurrentOrganizationInviteMemberInput` | `app/modules/organizations/controllers/current/mappers/request/current_organization_mutation_request_mapper.ts` | 11 |
| function | `buildCurrentOrganizationRemoveMemberDTO` | `app/modules/organizations/controllers/current/mappers/request/current_organization_mutation_request_mapper.ts` | 25 |
| function | `buildCurrentOrganizationRoleUpdateInput` | `app/modules/organizations/controllers/current/mappers/request/current_organization_mutation_request_mapper.ts` | 37 |
| function | `buildCurrentOrganizationProcessJoinRequestInput` | `app/modules/organizations/controllers/current/mappers/request/current_organization_mutation_request_mapper.ts` | 52 |
| function | `mapCurrentOrganizationMutationApiBody` | `app/modules/organizations/controllers/current/mappers/response/current_organization_mutation_response_mapper.ts` | 1 |
| function | `mapCurrentOrganizationSuccessApiBody` | `app/modules/organizations/controllers/current/mappers/response/current_organization_mutation_response_mapper.ts` | 12 |
| type | `ResponseRecord` | `app/modules/organizations/controllers/current/mappers/response/shared.ts` | 1 |
| interface | `SerializableResponseRecord` | `app/modules/organizations/controllers/current/mappers/response/shared.ts` | 3 |
| function | `serializeForCurrentOrganizationResponse` | `app/modules/organizations/controllers/current/mappers/response/shared.ts` | 19 |
| class | `InviteMemberController` | `app/modules/organizations/controllers/current/members/invite_member_controller.ts` | 17 |
| class | `ListMembersController` | `app/modules/organizations/controllers/current/members/list_members_controller.ts` | 17 |
| function | `buildOrganizationMembersIndexPageInput` | `app/modules/organizations/controllers/current/members/mappers/request/list_members_request_mapper.ts` | 26 |
| function | `mapOrganizationMembersIndexPageProps` | `app/modules/organizations/controllers/current/members/mappers/response/list_members_response_mapper.ts` | 3 |
| class | `RemoveMemberController` | `app/modules/organizations/controllers/current/members/remove_member_controller.ts` | 18 |
| class | `UpdateMemberRoleController` | `app/modules/organizations/controllers/current/members/update_member_role_controller.ts` | 18 |
| class | `CreateProjectController` | `app/modules/organizations/controllers/current/projects/create_project_controller.ts` | 17 |
| class | `ListProjectsController` | `app/modules/organizations/controllers/current/projects/list_projects_controller.ts` | 14 |
| function | `buildCreateCurrentOrganizationProjectDTO` | `app/modules/organizations/controllers/current/projects/mappers/request/current_project_request_mapper.ts` | 65 |
| function | `buildCurrentOrganizationProjectsListInput` | `app/modules/organizations/controllers/current/projects/mappers/request/current_project_request_mapper.ts` | 84 |
| function | `mapCurrentOrganizationProjectMutationApiBody` | `app/modules/organizations/controllers/current/projects/mappers/response/current_project_response_mapper.ts` | 7 |
| class | `OrgShowProjectController` | `app/modules/organizations/controllers/current/projects/show_project_controller.ts` | 12 |
| class | `ShowSettingsController` | `app/modules/organizations/controllers/current/settings/show_settings_controller.ts` | 13 |
| class | `UpdateSettingsController` | `app/modules/organizations/controllers/current/settings/update_settings_controller.ts` | 13 |
| class | `ListTasksController` | `app/modules/organizations/controllers/current/tasks/list_tasks_controller.ts` | 13 |
| function | `buildCurrentOrganizationTasksIndexPageInput` | `app/modules/organizations/controllers/current/tasks/mappers/request/current_task_request_mapper.ts` | 45 |
| class | `OrgShowTaskController` | `app/modules/organizations/controllers/current/tasks/show_task_controller.ts` | 10 |
| class | `CreateTaskStatusController` | `app/modules/organizations/controllers/current/workflow/create_task_status_controller.ts` | 17 |
| class | `ListTaskStatusesController` | `app/modules/organizations/controllers/current/workflow/list_task_statuses_controller.ts` | 13 |
| function | `buildCurrentOrganizationWorkflowCreateTaskStatusDTO` | `app/modules/organizations/controllers/current/workflow/mappers/request/current_task_status_request_mapper.ts` | 31 |
| function | `mapCurrentOrganizationTaskStatusMutationApiBody` | `app/modules/organizations/controllers/current/workflow/mappers/response/current_task_status_response_mapper.ts` | 7 |
| class | `DeleteOrganizationApiController` | `app/modules/organizations/controllers/delete_organization_api_controller.ts` | 9 |
| class | `InviteMemberController` | `app/modules/organizations/controllers/invite_member_controller.ts` | 10 |
| class | `JoinOrganizationController` | `app/modules/organizations/controllers/join_organization_controller.ts` | 18 |
| class | `ListMembersController` | `app/modules/organizations/controllers/list_members_controller.ts` | 16 |
| class | `ListOrganizationsController` | `app/modules/organizations/controllers/list_organizations_controller.ts` | 15 |
| function | `organizationActorContextFromHttp` | `app/modules/organizations/controllers/mappers/organization_actor_context_mapper.ts` | 6 |
| interface | `JoinOrganizationRequestInput` | `app/modules/organizations/controllers/mappers/request/join_organization_request_mapper.ts` | 4 |
| function | `buildJoinOrganizationRequestInput` | `app/modules/organizations/controllers/mappers/request/join_organization_request_mapper.ts` | 9 |
| function | `buildCreateOrganizationDTO` | `app/modules/organizations/controllers/mappers/request/organization_request_mapper.ts` | 91 |
| function | `buildUpdateOrganizationDTO` | `app/modules/organizations/controllers/mappers/request/organization_request_mapper.ts` | 101 |
| function | `buildDeleteOrganizationDTO` | `app/modules/organizations/controllers/mappers/request/organization_request_mapper.ts` | 115 |
| function | `buildOrganizationsListDTO` | `app/modules/organizations/controllers/mappers/request/organization_request_mapper.ts` | 126 |
| function | `buildOrganizationMembersPageFilters` | `app/modules/organizations/controllers/mappers/request/organization_request_mapper.ts` | 142 |
| function | `buildRemoveMemberDTO` | `app/modules/organizations/controllers/mappers/request/organization_request_mapper.ts` | 158 |
| function | `buildProcessJoinRequestDTO` | `app/modules/organizations/controllers/mappers/request/organization_request_mapper.ts` | 189 |
| function | `buildAddDirectMemberDTO` | `app/modules/organizations/controllers/mappers/request/organization_request_mapper.ts` | 210 |
| function | `buildBulkAddMembersDTO` | `app/modules/organizations/controllers/mappers/request/organization_request_mapper.ts` | 221 |
| function | `getJoinOrganizationSuccessMessage` | `app/modules/organizations/controllers/mappers/response/join_organization_response_mapper.ts` | 4 |
| function | `mapJoinOrganizationSuccessApiBody` | `app/modules/organizations/controllers/mappers/response/join_organization_response_mapper.ts` | 8 |
| function | `mapOrganizationMutationApiBody` | `app/modules/organizations/controllers/mappers/response/organization_mutation_api_mapper.ts` | 1 |
| function | `mapOrganizationSuccessApiBody` | `app/modules/organizations/controllers/mappers/response/organization_mutation_api_mapper.ts` | 12 |
| function | `mapOrganizationDetailApiBody` | `app/modules/organizations/controllers/mappers/response/organization_mutation_api_mapper.ts` | 19 |
| function | `mapOrganizationsIndexPageProps` | `app/modules/organizations/controllers/mappers/response/organization_page_props_mapper.ts` | 3 |
| function | `mapOrganizationMembersPageProps` | `app/modules/organizations/controllers/mappers/response/organization_page_props_mapper.ts` | 17 |
| class | `PendingRequestsController` | `app/modules/organizations/controllers/pending_requests_controller.ts` | 10 |
| class | `ProcessJoinRequestController` | `app/modules/organizations/controllers/process_join_request_controller.ts` | 17 |
| class | `RemoveMemberController` | `app/modules/organizations/controllers/remove_member_controller.ts` | 15 |
| class | `ShowOrganizationApiController` | `app/modules/organizations/controllers/show_organization_api_controller.ts` | 10 |
| class | `ShowOrganizationController` | `app/modules/organizations/controllers/show_organization_controller.ts` | 11 |
| class | `SwitchAndRedirectController` | `app/modules/organizations/controllers/switch_and_redirect_controller.ts` | 12 |
| class | `SwitchOrganizationController` | `app/modules/organizations/controllers/switch_organization_controller.ts` | 13 |
| class | `UpdateMemberRoleController` | `app/modules/organizations/controllers/update_member_role_controller.ts` | 11 |
| class | `UpdateOrganizationApiController` | `app/modules/organizations/controllers/update_organization_api_controller.ts` | 12 |
| interface | `CustomRoleDefinition` | `app/modules/organizations/domain/entities/organization_entity.ts` | 9 |
| interface | `OrganizationEntityProps` | `app/modules/organizations/domain/entities/organization_entity.ts` | 15 |
| class | `OrganizationEntity` | `app/modules/organizations/domain/entities/organization_entity.ts` | 35 |
| class | `OrganizationDomainMapper` | `app/modules/organizations/domain/mapper/organization_domain_mapper.ts` | 18 |
| interface | `OrganizationDepartmentTemplate` | `app/modules/organizations/domain/org_access_rules.ts` | 4 |
| interface | `OrganizationDepartmentCoverage` | `app/modules/organizations/domain/org_access_rules.ts` | 12 |
| const | `ORG_ROLE_PRESETS` | `app/modules/organizations/domain/org_access_rules.ts` | 23 |
| const | `ORG_DEPARTMENT_TEMPLATES` | `app/modules/organizations/domain/org_access_rules.ts` | 61 |
| function | `normalizeRoleCode` | `app/modules/organizations/domain/org_access_rules.ts` | 96 |
| function | `sanitizeCustomRoleDefinitions` | `app/modules/organizations/domain/org_access_rules.ts` | 104 |
| function | `getAssignableOrganizationRoles` | `app/modules/organizations/domain/org_access_rules.ts` | 149 |
| function | `buildOrganizationDepartmentCoverage` | `app/modules/organizations/domain/org_access_rules.ts` | 157 |
| function | `canTransferOwnership` | `app/modules/organizations/domain/org_permission_policy.ts` | 48 |
| function | `canRemoveMember` | `app/modules/organizations/domain/org_permission_policy.ts` | 76 |
| function | `canDeleteOrganization` | `app/modules/organizations/domain/org_permission_policy.ts` | 98 |
| function | `canChangeRole` | `app/modules/organizations/domain/org_permission_policy.ts` | 124 |
| function | `canAddMember` | `app/modules/organizations/domain/org_permission_policy.ts` | 159 |
| function | `canProcessJoinRequest` | `app/modules/organizations/domain/org_permission_policy.ts` | 183 |
| function | `canCreateJoinRequest` | `app/modules/organizations/domain/org_permission_policy.ts` | 206 |
| function | `canSwitchOrganization` | `app/modules/organizations/domain/org_permission_policy.ts` | 218 |
| function | `canViewOrganization` | `app/modules/organizations/domain/org_permission_policy.ts` | 226 |
| function | `canViewOrganizationMembers` | `app/modules/organizations/domain/org_permission_policy.ts` | 234 |
| function | `canUpdateOrganization` | `app/modules/organizations/domain/org_permission_policy.ts` | 242 |
| function | `canInviteOrganizationMembers` | `app/modules/organizations/domain/org_permission_policy.ts` | 246 |
| function | `canBulkAddOrganizationMembers` | `app/modules/organizations/domain/org_permission_policy.ts` | 250 |
| function | `canViewPendingJoinRequests` | `app/modules/organizations/domain/org_permission_policy.ts` | 258 |
| function | `checkJoinEligibility` | `app/modules/organizations/domain/org_permission_policy.ts` | 268 |
| function | `canAccessOrganizationAdminShell` | `app/modules/organizations/domain/org_permission_policy.ts` | 298 |
| function | `canAccessOrganizationOwnerControls` | `app/modules/organizations/domain/org_permission_policy.ts` | 306 |
| type | `OrgRole` | `app/modules/organizations/domain/org_types.ts` | 8 |
| type | `MembershipContext` | `app/modules/organizations/domain/org_types.ts` | 10 |
| function | `toOrgRole` | `app/modules/organizations/domain/org_types.ts` | 16 |
| function | `isOrgOwner` | `app/modules/organizations/domain/org_types.ts` | 24 |
| function | `isOrgAdminOrAbove` | `app/modules/organizations/domain/org_types.ts` | 28 |
| function | `isAnyOrgMember` | `app/modules/organizations/domain/org_types.ts` | 32 |
| interface | `OrgOwnershipTransferContext` | `app/modules/organizations/domain/org_types.ts` | 39 |
| interface | `OrgMemberRemovalContext` | `app/modules/organizations/domain/org_types.ts` | 52 |
| interface | `OrgDeletionContext` | `app/modules/organizations/domain/org_types.ts` | 64 |
| interface | `OrgRoleChangeContext` | `app/modules/organizations/domain/org_types.ts` | 75 |
| interface | `OrgMemberAddContext` | `app/modules/organizations/domain/org_types.ts` | 89 |
| interface | `OrgJoinRequestProcessContext` | `app/modules/organizations/domain/org_types.ts` | 101 |
| interface | `OrgJoinRequestEligibility` | `app/modules/organizations/domain/org_types.ts` | 113 |
| interface | `OrganizationCreationContext` | `app/modules/organizations/domain/organization_rules.ts` | 4 |
| interface | `OrganizationSlugInput` | `app/modules/organizations/domain/organization_rules.ts` | 8 |
| function | `canCreateOrganization` | `app/modules/organizations/domain/organization_rules.ts` | 13 |
| function | `normalizeOrganizationName` | `app/modules/organizations/domain/organization_rules.ts` | 21 |
| function | `normalizeOrganizationSlug` | `app/modules/organizations/domain/organization_rules.ts` | 25 |
| function | `resolveOrganizationBaseSlug` | `app/modules/organizations/domain/organization_rules.ts` | 37 |
| function | `buildOrganizationSlugCandidate` | `app/modules/organizations/domain/organization_rules.ts` | 50 |
| interface | `OrganizationRepository` | `app/modules/organizations/domain/repositories/organization_repository_interface.ts` | 12 |
| interface | `OrganizationCreatedEvent` | `app/modules/organizations/events/organization_events.ts` | 2 |
| interface | `OrganizationUpdatedEvent` | `app/modules/organizations/events/organization_events.ts` | 10 |
| interface | `OrganizationDeletedEvent` | `app/modules/organizations/events/organization_events.ts` | 16 |
| interface | `OrganizationMemberAddedEvent` | `app/modules/organizations/events/organization_events.ts` | 21 |
| interface | `OrganizationMemberRemovedEvent` | `app/modules/organizations/events/organization_events.ts` | 28 |
| interface | `OrganizationMemberRoleChangedEvent` | `app/modules/organizations/events/organization_events.ts` | 34 |
| interface | `OrganizationMemberApprovedEvent` | `app/modules/organizations/events/organization_events.ts` | 42 |
| interface | `ListInvitationsFilters` | `app/modules/organizations/infra/current/repositories/organization_invitation_repository.ts` | 10 |
| interface | `InvitationData` | `app/modules/organizations/infra/current/repositories/organization_invitation_repository.ts` | 15 |
| interface | `ListInvitationsResult` | `app/modules/organizations/infra/current/repositories/organization_invitation_repository.ts` | 28 |
| class | `OrganizationInvitationRepository` | `app/modules/organizations/infra/current/repositories/organization_invitation_repository.ts` | 100 |
| interface | `ListMembersFilters` | `app/modules/organizations/infra/current/repositories/organization_member_repository.ts` | 61 |
| interface | `OrganizationMember` | `app/modules/organizations/infra/current/repositories/organization_member_repository.ts` | 67 |
| interface | `ListMembersResult` | `app/modules/organizations/infra/current/repositories/organization_member_repository.ts` | 77 |
| interface | `DashboardMemberStats` | `app/modules/organizations/infra/current/repositories/organization_member_repository.ts` | 82 |
| class | `OrganizationMemberRepository` | `app/modules/organizations/infra/current/repositories/organization_member_repository.ts` | 92 |
| interface | `DashboardProjectStats` | `app/modules/organizations/infra/current/repositories/organization_project_repository.ts` | 54 |
| interface | `ListProjectsFilters` | `app/modules/organizations/infra/current/repositories/organization_project_repository.ts` | 60 |
| interface | `ListProjectsResult` | `app/modules/organizations/infra/current/repositories/organization_project_repository.ts` | 65 |
| class | `OrganizationProjectRepository` | `app/modules/organizations/infra/current/repositories/organization_project_repository.ts` | 80 |
| interface | `OrganizationData` | `app/modules/organizations/infra/current/repositories/organization_settings_repository.ts` | 9 |
| class | `OrganizationSettingsRepository` | `app/modules/organizations/infra/current/repositories/organization_settings_repository.ts` | 17 |
| interface | `DashboardTaskStats` | `app/modules/organizations/infra/current/repositories/organization_task_repository.ts` | 24 |
| class | `OrganizationTaskRepository` | `app/modules/organizations/infra/current/repositories/organization_task_repository.ts` | 31 |
| interface | `TaskStatusData` | `app/modules/organizations/infra/current/repositories/organization_workflow_repository.ts` | 9 |
| class | `OrganizationWorkflowRepository` | `app/modules/organizations/infra/current/repositories/organization_workflow_repository.ts` | 17 |
| interface | `CreateProjectData` | `app/modules/organizations/infra/current/repositories/write/organization_project_mutations.ts` | 3 |
| const | `createProject` | `app/modules/organizations/infra/current/repositories/write/organization_project_mutations.ts` | 8 |
| interface | `UpdateOrganizationData` | `app/modules/organizations/infra/current/repositories/write/organization_settings_mutations.ts` | 4 |
| const | `updateOrganization` | `app/modules/organizations/infra/current/repositories/write/organization_settings_mutations.ts` | 11 |
| interface | `CreateTaskStatusData` | `app/modules/organizations/infra/current/repositories/write/organization_workflow_mutations.ts` | 5 |
| const | `createTaskStatus` | `app/modules/organizations/infra/current/repositories/write/organization_workflow_mutations.ts` | 10 |
| const | `deleteTaskStatus` | `app/modules/organizations/infra/current/repositories/write/organization_workflow_mutations.ts` | 35 |
| class | `OrganizationInfraMapper` | `app/modules/organizations/infra/mapper/organization_infra_mapper.ts` | 20 |
| class | `Organization` | `app/modules/organizations/infra/models/organization.ts` | 13 |
| class | `OrganizationInvitation` | `app/modules/organizations/infra/models/organization_invitation.ts` | 11 |
| class | `OrganizationJoinRequest` | `app/modules/organizations/infra/models/organization_join_request.ts` | 16 |
| class | `OrganizationUser` | `app/modules/organizations/infra/models/organization_user.ts` | 14 |
| class | `OrganizationRepositoryImpl` | `app/modules/organizations/infra/repositories/organization_repository_impl.ts` | 16 |
| const | `countMembers` | `app/modules/organizations/infra/repositories/organization_user_repository/read/listing_queries.ts` | 16 |
| const | `getMembersPreview` | `app/modules/organizations/infra/repositories/organization_user_repository/read/listing_queries.ts` | 30 |
| const | `countMembersByOrgIds` | `app/modules/organizations/infra/repositories/organization_user_repository/read/listing_queries.ts` | 46 |
| const | `paginateMembers` | `app/modules/organizations/infra/repositories/organization_user_repository/read/listing_queries.ts` | 68 |
| const | `findMembersWithUser` | `app/modules/organizations/infra/repositories/organization_user_repository/read/listing_queries.ts` | 173 |
| const | `findMembersWithUserProfile` | `app/modules/organizations/infra/repositories/organization_user_repository/read/listing_queries.ts` | 183 |
| const | `findPendingMembersWithDetails` | `app/modules/organizations/infra/repositories/organization_user_repository/read/listing_queries.ts` | 194 |
| const | `findMembersExcludingUser` | `app/modules/organizations/infra/repositories/organization_user_repository/read/listing_queries.ts` | 210 |
| const | `findPendingMembershipsWithUserInfo` | `app/modules/organizations/infra/repositories/organization_user_repository/read/listing_queries.ts` | 221 |
| const | `countPendingMembers` | `app/modules/organizations/infra/repositories/organization_user_repository/read/listing_queries.ts` | 235 |
| const | `findMembership` | `app/modules/organizations/infra/repositories/organization_user_repository/read/membership_queries.ts` | 12 |
| const | `findApprovedMembershipWithOrganization` | `app/modules/organizations/infra/repositories/organization_user_repository/read/membership_queries.ts` | 21 |
| const | `findApprovedMembershipContext` | `app/modules/organizations/infra/repositories/organization_user_repository/read/membership_queries.ts` | 39 |
| const | `listMembershipsByUser` | `app/modules/organizations/infra/repositories/organization_user_repository/read/membership_queries.ts` | 65 |
| const | `findPendingMembership` | `app/modules/organizations/infra/repositories/organization_user_repository/read/membership_queries.ts` | 72 |
| const | `findMembershipOrFail` | `app/modules/organizations/infra/repositories/organization_user_repository/read/membership_queries.ts` | 84 |
| const | `isApprovedMember` | `app/modules/organizations/infra/repositories/organization_user_repository/read/membership_queries.ts` | 95 |
| const | `isAdminOrOwner` | `app/modules/organizations/infra/repositories/organization_user_repository/read/membership_queries.ts` | 108 |
| const | `validateAllApprovedMembers` | `app/modules/organizations/infra/repositories/organization_user_repository/read/membership_queries.ts` | 127 |
| const | `findApprovedMemberOrFail` | `app/modules/organizations/infra/repositories/organization_user_repository/read/membership_queries.ts` | 145 |
| const | `isMember` | `app/modules/organizations/infra/repositories/organization_user_repository/read/membership_queries.ts` | 163 |
| const | `getMembershipContext` | `app/modules/organizations/infra/repositories/organization_user_repository/read/membership_queries.ts` | 175 |
| const | `findMembershipsByUser` | `app/modules/organizations/infra/repositories/organization_user_repository/read/membership_queries.ts` | 200 |
| const | `findFirstApprovedMembershipWithOrganization` | `app/modules/organizations/infra/repositories/organization_user_repository/read/membership_queries.ts` | 208 |
| const | `findFirstApprovedMembershipContext` | `app/modules/organizations/infra/repositories/organization_user_repository/read/membership_queries.ts` | 222 |
| const | `findOwnerMembershipIds` | `app/modules/organizations/infra/repositories/organization_user_repository/read/membership_queries.ts` | 247 |
| interface | `CountResultRow` | `app/modules/organizations/infra/repositories/organization_user_repository/read/shared.ts` | 5 |
| interface | `PaginatedMemberRow` | `app/modules/organizations/infra/repositories/organization_user_repository/read/shared.ts` | 9 |
| const | `isRecord` | `app/modules/organizations/infra/repositories/organization_user_repository/read/shared.ts` | 19 |
| const | `toNumberValue` | `app/modules/organizations/infra/repositories/organization_user_repository/read/shared.ts` | 23 |
| const | `baseQuery` | `app/modules/organizations/infra/repositories/organization_user_repository/read/shared.ts` | 34 |
| const | `updateRole` | `app/modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries.ts` | 9 |
| const | `deleteMember` | `app/modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries.ts` | 21 |
| const | `updateStatus` | `app/modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries.ts` | 29 |
| const | `addMember` | `app/modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries.ts` | 43 |
| class | `OrgAccessRepository` | `app/modules/organizations/infra/repositories/read/org_access_repository.ts` | 15 |
| class | `OrganizationRepository` | `app/modules/organizations/infra/repositories/read/organization_repository.ts` | 33 |
| const | `findActiveForUpdate` | `app/modules/organizations/infra/repositories/write/organization_mutations.ts` | 8 |
| const | `findActiveForUpdateRecord` | `app/modules/organizations/infra/repositories/write/organization_mutations.ts` | 19 |
| const | `create` | `app/modules/organizations/infra/repositories/write/organization_mutations.ts` | 27 |
| const | `createRecord` | `app/modules/organizations/infra/repositories/write/organization_mutations.ts` | 34 |
| const | `save` | `app/modules/organizations/infra/repositories/write/organization_mutations.ts` | 42 |
| const | `updateByIdRecord` | `app/modules/organizations/infra/repositories/write/organization_mutations.ts` | 53 |
| const | `updateOwnerRecord` | `app/modules/organizations/infra/repositories/write/organization_mutations.ts` | 64 |
| const | `hardDelete` | `app/modules/organizations/infra/repositories/write/organization_mutations.ts` | 72 |
| const | `softDeleteByIdRecord` | `app/modules/organizations/infra/repositories/write/organization_mutations.ts` | 82 |
| const | `hardDeleteByIdRecord` | `app/modules/organizations/infra/repositories/write/organization_mutations.ts` | 93 |
| class | `OrganizationAdminContextMiddleware` | `app/modules/organizations/middleware/organization_admin_context_middleware.ts` | 33 |
| class | `OrganizationResolverMiddleware` | `app/modules/organizations/middleware/organization_resolver_middleware.ts` | 26 |
| class | `RequireOrgAdminMiddleware` | `app/modules/organizations/middleware/require_org_admin_middleware.ts` | 29 |
| class | `RequireOrgOwnerMiddleware` | `app/modules/organizations/middleware/require_org_owner_middleware.ts` | 29 |
| class | `RequireOrganizationMiddleware` | `app/modules/organizations/middleware/require_organization_middleware.ts` | 29 |
| interface | `OrganizationMembershipApprovedV1` | `app/modules/organizations/public_contracts/organization_events_v1.ts` | 1 |
| interface | `OrganizationMemberRemovedV1` | `app/modules/organizations/public_contracts/organization_events_v1.ts` | 9 |
| interface | `OrganizationRoleChangedV1` | `app/modules/organizations/public_contracts/organization_events_v1.ts` | 17 |
| interface | `OrganizationMembershipV1` | `app/modules/organizations/public_contracts/organization_membership_v1.ts` | 1 |
| const | `organizationMemberRemovedV1Schema` | `app/modules/organizations/public_contracts/schemas/organization_events_v1.schema.ts` | 3 |
| const | `organizationRoleChangedV1Schema` | `app/modules/organizations/public_contracts/schemas/organization_events_v1.schema.ts` | 11 |
| interface | `OrganizationCustomRoleDefinition` | `app/modules/organizations/types/custom_role_definition.ts` | 1 |
| type | `SerializedDateTime` | `app/modules/organizations/types/organization_records.ts` | 3 |
| interface | `OrganizationRecord` | `app/modules/organizations/types/organization_records.ts` | 5 |
| interface | `OrganizationMembershipRecord` | `app/modules/organizations/types/organization_records.ts` | 26 |
| const | `processJoinRequestValidator` | `app/modules/organizations/validators/organization.ts` | 6 |
| const | `organizationIdRule` | `app/modules/organizations/validators/rules/database.ts` | 15 |
| const | `userIdRule` | `app/modules/organizations/validators/rules/database.ts` | 16 |

## Import Evidence

### `app/modules/organizations/actions/base_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { CommandHandler } from './interfaces.js'
import { Result } from './result.js'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
```

### `app/modules/organizations/actions/base_query.ts`

```ts
import type { QueryHandler } from './interfaces.js'
import { Result } from './result.js'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
```

### `app/modules/organizations/actions/builders/member_request_dto_builders.ts`

```ts
import { InviteUserDTO } from '../dtos/request/invite_user_dto.js'
import { UpdateMemberRoleDTO } from '../dtos/request/update_member_role_dto.js'
import GetAssignableOrganizationRolesQuery from '#modules/organizations/actions/current/access/queries/get_assignable_organization_roles_query'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { OrganizationRole } from '#modules/organizations/public_contracts/organization_constants'
```

### `app/modules/organizations/actions/commands/add_member_by_email_command.ts`

```ts
import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import AddMemberCommand from '#modules/organizations/actions/commands/add_member_command'
import { AddMemberDTO } from '#modules/organizations/actions/dtos/request/add_member_dto'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
```

### `app/modules/organizations/actions/commands/add_member_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { AddMemberDTO } from '../dtos/request/add_member_dto.js'
import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'
import { EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canAddMember } from '#modules/organizations/domain/org_permission_policy'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
```

### `app/modules/organizations/actions/commands/approve_membership.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
import { OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'
```

### `app/modules/organizations/actions/commands/bulk_add_members_command.ts`

```ts
import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import loggerService from '#modules/logger/public_contracts/logger_service'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import AddMemberCommand from '#modules/organizations/actions/commands/add_member_command'
import { AddMemberDTO } from '#modules/organizations/actions/dtos/request/add_member_dto'
import type { BulkAddMembersDTO } from '#modules/organizations/actions/dtos/request/bulk_add_members_dto'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canBulkAddOrganizationMembers } from '#modules/organizations/domain/org_permission_policy'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import { OrganizationRole } from '#modules/organizations/public_contracts/organization_constants'
```

### `app/modules/organizations/actions/commands/bulk_invite_users_command.ts`

```ts
import { InviteUserDTO } from '../dtos/request/invite_user_dto.js'
import InviteUserCommand from './invite_user_command.js'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
```

### `app/modules/organizations/actions/commands/create_join_request_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
import { OrganizationRole, OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'
```

### `app/modules/organizations/actions/commands/create_organization_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { CreateOrganizationDTO } from '../dtos/request/create_organization_dto.js'
import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'
import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import {
  canCreateOrganization,
  resolveOrganizationBaseSlug,
  resolveUniqueOrganizationSlug,
} from '#modules/organizations/domain/organization_rules'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
import * as OrganizationMutations from '#modules/organizations/infra/repositories/write/organization_mutations'
import { OrganizationRole, OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'
import type { OrganizationRecord } from '#modules/organizations/types/organization_records'
import { orgTaskBootstrap } from '#modules/tasks/public_contracts/task_public_api'
```

### `app/modules/organizations/actions/commands/delete_organization_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { DeleteOrganizationDTO } from '../dtos/request/delete_organization_dto.js'
import { EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canDeleteOrganization } from '#modules/organizations/domain/org_permission_policy'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
import * as OrganizationMutations from '#modules/organizations/infra/repositories/write/organization_mutations'
import { projectPublicApi } from '#modules/projects/public_contracts/project_public_api'
```

### `app/modules/organizations/actions/commands/invite_user_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import {
  buildInviteUserDTO,
  type BuildMemberRequestOptions,
  type InviteMemberRequestInput,
} from '../builders/member_request_dto_builders.js'
import type { InviteUserDTO } from '../dtos/request/invite_user_dto.js'
import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'
import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canInviteOrganizationMembers } from '#modules/organizations/domain/org_permission_policy'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import OrgAccessRepository from '#modules/organizations/infra/repositories/read/org_access_repository'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
import { OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'
```

### `app/modules/organizations/actions/commands/process_join_request_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { ProcessJoinRequestDTO } from '../dtos/request/process_join_request_dto.js'
import { EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canProcessJoinRequest } from '#modules/organizations/domain/org_permission_policy'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
import { OrganizationRole } from '#modules/organizations/public_contracts/organization_constants'
```

### `app/modules/organizations/actions/commands/remove_member_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { RemoveMemberDTO } from '../dtos/request/remove_member_dto.js'
import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'
import { EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canRemoveMember } from '#modules/organizations/domain/org_permission_policy'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
```

### `app/modules/organizations/actions/commands/request_organization_join_command.ts`

```ts
import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'
import CreateJoinRequestCommand from './create_join_request_command.js'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import CheckJoinEligibilityQuery from '#modules/organizations/actions/queries/check_join_eligibility_query'
```

### `app/modules/organizations/actions/commands/switch_organization_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'
import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import {
  canAccessOrganizationAdminShell,
  canSwitchOrganization,
} from '#modules/organizations/domain/org_permission_policy'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
```

### `app/modules/organizations/actions/commands/transfer_organization_ownership_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'
import { EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canTransferOwnership } from '#modules/organizations/domain/org_permission_policy'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
import * as OrganizationMutations from '#modules/organizations/infra/repositories/write/organization_mutations'
import { OrganizationRole } from '#modules/organizations/public_contracts/organization_constants'
import type { OrganizationRecord } from '#modules/organizations/types/organization_records'
```

### `app/modules/organizations/actions/commands/update_member_role_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import {
  buildUpdateMemberRoleDTO,
  type BuildMemberRequestOptions,
  type UpdateMemberRoleRequestInput,
} from '../builders/member_request_dto_builders.js'
import type { UpdateMemberRoleDTO } from '../dtos/request/update_member_role_dto.js'
import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canChangeRole } from '#modules/organizations/domain/org_permission_policy'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
```

### `app/modules/organizations/actions/commands/update_organization_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { UpdateOrganizationDTO } from '../dtos/request/update_organization_dto.js'
import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canUpdateOrganization } from '#modules/organizations/domain/org_permission_policy'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
import * as OrganizationMutations from '#modules/organizations/infra/repositories/write/organization_mutations'
import type { OrganizationRecord } from '#modules/organizations/types/organization_records'
```

### `app/modules/organizations/actions/current/access/commands/update_custom_roles_command.ts`

```ts
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { BaseCommand } from '#modules/organizations/actions/base_command'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { sanitizeCustomRoleDefinitions } from '#modules/organizations/domain/org_access_rules'
import { canUpdateOrganization } from '#modules/organizations/domain/org_permission_policy'
import * as OrganizationSettingsMutations from '#modules/organizations/infra/current/repositories/write/organization_settings_mutations'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
```

### `app/modules/organizations/actions/current/access/queries/get_access_configuration_query.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import {
  describePermission,
  formatRoleLabel,
  getRoleDescription,
  listKnownOrganizationPermissions,
  listProjectPermissionCatalog,
} from '#modules/authorization/public_contracts/access_surface'
import { ORG_ROLE_PERMISSIONS, PROJECT_ROLE_PERMISSIONS } from '#modules/authorization/public_contracts/permissions'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { BaseQuery } from '#modules/organizations/actions/base_query'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import {
  ORG_ROLE_PRESETS,
  buildOrganizationDepartmentCoverage,
  sanitizeCustomRoleDefinitions,
} from '#modules/organizations/domain/org_access_rules'
import { canUpdateOrganization } from '#modules/organizations/domain/org_permission_policy'
import OrganizationMemberRepository from '#modules/organizations/infra/current/repositories/organization_member_repository'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
```

### `app/modules/organizations/actions/current/access/queries/get_assignable_organization_roles_query.ts`

```ts
import { formatRoleLabel } from '#modules/authorization/public_contracts/access_surface'
import { BaseQuery } from '#modules/organizations/actions/base_query'
import { getAssignableOrganizationRoles } from '#modules/organizations/domain/org_access_rules'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
```

### `app/modules/organizations/actions/current/dashboard/get_organization_dashboard_stats_query.ts`

```ts
import { BaseQuery } from '#modules/organizations/actions/base_query'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import OrganizationMemberRepository from '#modules/organizations/infra/current/repositories/organization_member_repository'
import OrganizationProjectRepository from '#modules/organizations/infra/current/repositories/organization_project_repository'
import OrganizationTaskRepository from '#modules/organizations/infra/current/repositories/organization_task_repository'
```

### `app/modules/organizations/actions/current/invitations/queries/get_invitations_index_page_query.ts`

```ts
import ListInvitationsQuery, { type ListInvitationsDTO } from './list_invitations_query.js'
import GetAssignableOrganizationRolesQuery from '#modules/organizations/actions/current/access/queries/get_assignable_organization_roles_query'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
```

### `app/modules/organizations/actions/current/invitations/queries/list_invitations_query.ts`

```ts
import { BaseQuery } from '#modules/organizations/actions/base_query'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import OrganizationInvitationRepository from '#modules/organizations/infra/current/repositories/organization_invitation_repository'
```

### `app/modules/organizations/actions/current/invitations/queries/list_join_requests_query.ts`

```ts
import { BaseQuery } from '#modules/organizations/actions/base_query'
import * as listingQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/listing_queries'
```

### `app/modules/organizations/actions/current/members/queries/get_organization_members_index_page_query.ts`

```ts
import ListOrganizationMembersQuery, {
  type ListOrganizationMembersDTO,
} from './list_organization_members_query.js'
import GetAssignableOrganizationRolesQuery from '#modules/organizations/actions/current/access/queries/get_assignable_organization_roles_query'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
```

### `app/modules/organizations/actions/current/members/queries/list_organization_members_query.ts`

```ts
import { BaseQuery } from '#modules/organizations/actions/base_query'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import OrganizationMemberRepository from '#modules/organizations/infra/current/repositories/organization_member_repository'
```

### `app/modules/organizations/actions/current/projects/commands/create_project_command.ts`

```ts
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { projectPublicApi, type CreateProjectDTO } from '#modules/projects/public_contracts/project_public_api'
```

### `app/modules/organizations/actions/current/projects/queries/list_projects_query.ts`

```ts
import { BaseQuery } from '#modules/organizations/actions/base_query'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import OrganizationProjectRepository from '#modules/organizations/infra/current/repositories/organization_project_repository'
```

### `app/modules/organizations/actions/current/settings/commands/update_organization_settings_command.ts`

```ts
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { BaseCommand } from '#modules/organizations/actions/base_command'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canUpdateOrganization } from '#modules/organizations/domain/org_permission_policy'
import * as OrganizationSettingsMutations from '#modules/organizations/infra/current/repositories/write/organization_settings_mutations'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
```

### `app/modules/organizations/actions/current/settings/queries/get_organization_settings_query.ts`

```ts
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { BaseQuery } from '#modules/organizations/actions/base_query'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canUpdateOrganization } from '#modules/organizations/domain/org_permission_policy'
import OrganizationSettingsRepository from '#modules/organizations/infra/current/repositories/organization_settings_repository'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
```

### `app/modules/organizations/actions/current/tasks/queries/get_organization_tasks_index_page_query.ts`

```ts
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import {
  taskPublicApi,
  type GetTasksIndexPageInput,
  type GetTasksIndexPageResult,
} from '#modules/tasks/public_contracts/task_public_api'
```

### `app/modules/organizations/actions/current/workflow/commands/create_task_status_command.ts`

```ts
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { taskPublicApi, type CreateTaskStatusDTO } from '#modules/tasks/public_contracts/task_public_api'
import type { TaskStatusRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/organizations/actions/current/workflow/queries/list_task_statuses_query.ts`

```ts
import { BaseQuery } from '#modules/organizations/actions/base_query'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import OrganizationWorkflowRepository from '#modules/organizations/infra/current/repositories/organization_workflow_repository'
```

### `app/modules/organizations/actions/dtos/request/add_member_dto.ts`

```ts
import ValidationException from '#modules/http/exceptions/validation_exception'
import { OrganizationRole } from '#modules/organizations/public_contracts/organization_constants'
```

### `app/modules/organizations/actions/dtos/request/bulk_add_members_dto.ts`

```ts
import ValidationException from '#modules/http/exceptions/validation_exception'
```

### `app/modules/organizations/actions/dtos/request/create_organization_dto.ts`

```ts
import ValidationException from '#modules/http/exceptions/validation_exception'
import {
  normalizeOrganizationName,
  resolveOrganizationBaseSlug,
} from '#modules/organizations/domain/organization_rules'
```

### `app/modules/organizations/actions/dtos/request/delete_organization_dto.ts`

```ts
import ValidationException from '#modules/http/exceptions/validation_exception'
```

### `app/modules/organizations/actions/dtos/request/get_organization_detail_dto.ts`

```ts
import ValidationException from '#modules/http/exceptions/validation_exception'
```

### `app/modules/organizations/actions/dtos/request/get_organization_members_dto.ts`

```ts
import ValidationException from '#modules/http/exceptions/validation_exception'
import { ORGANIZATION_PAGINATION as PAGINATION } from '#modules/organizations/application/dtos/common/organization_pagination'
import { OrganizationRole } from '#modules/organizations/public_contracts/organization_constants'
```

### `app/modules/organizations/actions/dtos/request/get_organizations_list_dto.ts`

```ts
import ValidationException from '#modules/http/exceptions/validation_exception'
import { ORGANIZATION_PAGINATION as PAGINATION } from '#modules/organizations/application/dtos/common/organization_pagination'
```

### `app/modules/organizations/actions/dtos/request/invite_user_dto.ts`

```ts
import { formatRoleLabel } from '#modules/authorization/public_contracts/access_surface'
import ValidationException from '#modules/http/exceptions/validation_exception'
import { OrganizationRole } from '#modules/organizations/public_contracts/organization_constants'
```

### `app/modules/organizations/actions/dtos/request/process_join_request_dto.ts`

```ts
import ValidationException from '#modules/http/exceptions/validation_exception'
import { OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'
```

### `app/modules/organizations/actions/dtos/request/remove_member_dto.ts`

```ts
import ValidationException from '#modules/http/exceptions/validation_exception'
```

### `app/modules/organizations/actions/dtos/request/update_member_role_dto.ts`

```ts
import { formatRoleLabel } from '#modules/authorization/public_contracts/access_surface'
import ValidationException from '#modules/http/exceptions/validation_exception'
import { OrganizationRole } from '#modules/organizations/public_contracts/organization_constants'
```

### `app/modules/organizations/actions/dtos/request/update_organization_dto.ts`

```ts
import ValidationException from '#modules/http/exceptions/validation_exception'
```

### `app/modules/organizations/actions/dtos/response/organization_response_dtos.ts`

```ts
import type { OrganizationEntity } from '#modules/organizations/domain/entities/organization_entity'
import type { OrganizationCustomRoleDefinition as CustomRoleDefinition } from '#modules/organizations/types/custom_role_definition'
```

### `app/modules/organizations/actions/interfaces.ts`

```ts
// no imports
```

### `app/modules/organizations/actions/mapper/organization_application_mapper.ts`

```ts
import type { CreateOrganizationDTO } from '../dtos/request/create_organization_dto.js'
import {
  OrganizationDetailResponseDTO,
  OrganizationListItemResponseDTO,
  OrganizationSummaryResponseDTO,
} from '../dtos/response/organization_response_dtos.js'
import type { OrganizationEntity } from '#modules/organizations/domain/entities/organization_entity'
```

### `app/modules/organizations/actions/organization_action_context.ts`

```ts
// no imports
```

### `app/modules/organizations/actions/ports/organization_external_dependencies.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
```

### `app/modules/organizations/actions/ports/organization_external_dependencies_impl.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type {
  DebugUserOrganizationsInfo,
  OrganizationExternalDependencies,
  OrganizationOwnerName,
  OrganizationProjectTaskReaderWriter,
  OrganizationUserIdentity,
  OrganizationUserReaderWriter,
} from './organization_external_dependencies.js'
import { projectPublicApi } from '#modules/projects/public_contracts/project_public_api'
import { taskPublicApi } from '#modules/tasks/public_contracts/task_public_api'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'
```

### `app/modules/organizations/actions/public_api.ts`

```ts
// no imports
```

### `app/modules/organizations/actions/queries/check_join_eligibility_query.ts`

```ts
import { checkJoinEligibility } from '#modules/organizations/domain/org_permission_policy'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
import { type OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'
```

### `app/modules/organizations/actions/queries/find_pending_join_request_query.ts`

```ts
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import type { OrganizationMembershipRecord } from '#modules/organizations/types/organization_records'
```

### `app/modules/organizations/actions/queries/get_all_organizations_query.ts`

```ts
import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'
import * as listingQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/listing_queries'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
```

### `app/modules/organizations/actions/queries/get_debug_organization_info_query.ts`

```ts
import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'
```

### `app/modules/organizations/actions/queries/get_organization_basic_info_query.ts`

```ts
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
```

### `app/modules/organizations/actions/queries/get_organization_detail_query.ts`

```ts
import type { GetOrganizationDetailDTO } from '../dtos/request/get_organization_detail_dto.js'
import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canViewOrganization } from '#modules/organizations/domain/org_permission_policy'
import * as listingQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/listing_queries'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
```

### `app/modules/organizations/actions/queries/get_organization_members_api_query.ts`

```ts
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import ValidationException from '#modules/http/exceptions/validation_exception'
import * as listingQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/listing_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
```

### `app/modules/organizations/actions/queries/get_organization_members_page_query.ts`

```ts
import { GetOrganizationMembersDTO } from '../dtos/request/get_organization_members_dto.js'
import GetOrganizationBasicInfoQuery from './get_organization_basic_info_query.js'
import GetOrganizationMembersQuery from './get_organization_members_query.js'
import GetOrganizationMetadataQuery from './get_organization_metadata_query.js'
import GetOrganizationShowDataQuery from './get_organization_show_data_query.js'
import GetPendingRequestsQuery from './get_pending_requests_query.js'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
```

### `app/modules/organizations/actions/queries/get_organization_members_query.ts`

```ts
import type { GetOrganizationMembersDTO } from '../dtos/request/get_organization_members_dto.js'
import { OrganizationMemberResponseDTO } from '../dtos/response/organization_response_dtos.js'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canViewOrganizationMembers } from '#modules/organizations/domain/org_permission_policy'
import * as listingQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/listing_queries'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
```

### `app/modules/organizations/actions/queries/get_organization_members_with_analytics_query.ts`

```ts
import { type GetOrganizationMembersDTO } from '../dtos/request/get_organization_members_dto.js'
import type { OrganizationMemberResponseDTO } from '../dtos/response/organization_response_dtos.js'
import GetOrganizationMembersQuery from './get_organization_members_query.js'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
```

### `app/modules/organizations/actions/queries/get_organization_metadata_query.ts`

```ts
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import loggerService from '#modules/logger/public_contracts/logger_service'
import { OrganizationRole } from '#modules/organizations/public_contracts/organization_constants'
```

### `app/modules/organizations/actions/queries/get_organization_show_data_query.ts`

```ts
import * as listingQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/listing_queries'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
```

### `app/modules/organizations/actions/queries/get_organization_show_page_query.ts`

```ts
import { GetOrganizationDetailDTO } from '../dtos/request/get_organization_detail_dto.js'
import GetOrganizationDetailQuery from './get_organization_detail_query.js'
import GetOrganizationShowDataQuery from './get_organization_show_data_query.js'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
```

### `app/modules/organizations/actions/queries/get_organization_tasks_query.ts`

```ts
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { taskPublicApi } from '#modules/tasks/public_contracts/task_public_api'
```

### `app/modules/organizations/actions/queries/get_organizations_index_page_query.ts`

```ts
import type { GetOrganizationsListDTO } from '../dtos/request/get_organizations_list_dto.js'
import GetAllOrganizationsQuery from './get_all_organizations_query.js'
import GetOrganizationsListQuery from './get_organizations_list_query.js'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
```

### `app/modules/organizations/actions/queries/get_organizations_list_query.ts`

```ts
import type { GetOrganizationsListDTO } from '../dtos/request/get_organizations_list_dto.js'
import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import * as listingQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/listing_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
```

### `app/modules/organizations/actions/queries/get_pending_requests_page_query.ts`

```ts
import GetOrganizationBasicInfoQuery from './get_organization_basic_info_query.js'
import GetPendingRequestsQuery from './get_pending_requests_query.js'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
```

### `app/modules/organizations/actions/queries/get_pending_requests_query.ts`

```ts
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canViewPendingJoinRequests } from '#modules/organizations/domain/org_permission_policy'
import * as listingQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/listing_queries'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
```

### `app/modules/organizations/actions/queries/get_user_owned_organizations_query.ts`

```ts
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
```

### `app/modules/organizations/actions/queries/get_users_in_organization_query.ts`

```ts
import * as listingQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/listing_queries'
```

### `app/modules/organizations/actions/result.ts`

```ts
// no imports
```

### `app/modules/organizations/actions/services/organization_public_api.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { approveMembershipInternal } from '../commands/approve_membership.js'
import GetDebugOrganizationInfoQuery from '../queries/get_debug_organization_info_query.js'
import GetOrganizationMembersApiQuery from '../queries/get_organization_members_api_query.js'
import GetUserOwnedOrganizationsQuery from '../queries/get_user_owned_organizations_query.js'
import GetUsersInOrganizationQuery from '../queries/get_users_in_organization_query.js'
import { hasOrgPermission } from '#modules/authorization/public_contracts/permissions'
import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import { canAccessOrganizationAdminShell } from '#modules/organizations/domain/org_permission_policy'
import type { OrgRole } from '#modules/organizations/domain/org_types'
import * as listingQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/listing_queries'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
```

### `app/modules/organizations/controllers/add_direct_member_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildAddDirectMemberDTO } from './mappers/request/organization_request_mapper.js'
import { mapOrganizationSuccessApiBody } from './mappers/response/organization_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import AddMemberCommand from '#modules/organizations/actions/commands/add_member_command'
```

### `app/modules/organizations/controllers/add_member_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import AddMemberByEmailCommand from '#modules/organizations/actions/commands/add_member_by_email_command'
```

### `app/modules/organizations/controllers/add_users_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildBulkAddMembersDTO } from './mappers/request/organization_request_mapper.js'
import { mapOrganizationSuccessApiBody } from './mappers/response/organization_response_mapper.js'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import BulkAddMembersCommand from '#modules/organizations/actions/commands/bulk_add_members_command'
```

### `app/modules/organizations/controllers/all_organizations_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import GetAllOrganizationsQuery from '#modules/organizations/actions/queries/get_all_organizations_query'
```

### `app/modules/organizations/controllers/api_list_organizations_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import GetAllOrganizationsQuery from '#modules/organizations/actions/queries/get_all_organizations_query'
```

### `app/modules/organizations/controllers/create_organization_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildCreateOrganizationDTO } from './mappers/request/organization_request_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import CreateOrganizationCommand from '#modules/organizations/actions/commands/create_organization_command'
```

### `app/modules/organizations/controllers/current/access/mappers/request/update_roles_request_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import type { UpdateCustomRolesDTO } from '#modules/organizations/actions/current/access/commands/update_custom_roles_command'
```

### `app/modules/organizations/controllers/current/access/mappers/response/update_roles_response_mapper.ts`

```ts
// no imports
```

### `app/modules/organizations/controllers/current/access/show_departments_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetAccessConfigurationQuery from '#modules/organizations/actions/current/access/queries/get_access_configuration_query'
```

### `app/modules/organizations/controllers/current/access/show_permissions_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetAccessConfigurationQuery from '#modules/organizations/actions/current/access/queries/get_access_configuration_query'
```

### `app/modules/organizations/controllers/current/access/show_roles_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetAccessConfigurationQuery from '#modules/organizations/actions/current/access/queries/get_access_configuration_query'
```

### `app/modules/organizations/controllers/current/access/update_roles_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UpdateCustomRolesCommand from '#modules/organizations/actions/current/access/commands/update_custom_roles_command'
import { buildUpdateCustomRolesDTO } from '#modules/organizations/controllers/current/access/mappers/request/update_roles_request_mapper'
import {
  getUpdateCustomRolesSuccessMessage,
  mapUpdateCustomRolesSuccessApiBody,
} from '#modules/organizations/controllers/current/access/mappers/response/update_roles_response_mapper'
```

### `app/modules/organizations/controllers/current/dashboard_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetOrganizationDashboardStatsQuery from '#modules/organizations/actions/current/dashboard/get_organization_dashboard_stats_query'
```

### `app/modules/organizations/controllers/current/invitations/approve_join_request_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import ProcessJoinRequestCommand from '#modules/organizations/actions/commands/process_join_request_command'
import { buildCurrentOrganizationProcessJoinRequestInput } from '#modules/organizations/controllers/current/mappers/request/current_organization_mutation_request_mapper'
import { mapCurrentOrganizationSuccessApiBody } from '#modules/organizations/controllers/current/mappers/response/current_organization_mutation_response_mapper'
```

### `app/modules/organizations/controllers/current/invitations/list_invitations_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildInvitationsIndexPageInput } from './mappers/request/list_invitations_request_mapper.js'
import { mapInvitationsIndexPageProps } from './mappers/response/list_invitations_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetInvitationsIndexPageQuery from '#modules/organizations/actions/current/invitations/queries/get_invitations_index_page_query'
```

### `app/modules/organizations/controllers/current/invitations/list_join_requests_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ListJoinRequestsQuery from '#modules/organizations/actions/current/invitations/queries/list_join_requests_query'
import { ORGANIZATION_PAGINATION as PAGINATION } from '#modules/organizations/application/dtos/common/organization_pagination'
```

### `app/modules/organizations/controllers/current/invitations/mappers/request/list_invitations_request_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import type { InvitationsIndexPageInput } from '#modules/organizations/actions/current/invitations/queries/get_invitations_index_page_query'
import { ORGANIZATION_PAGINATION as PAGINATION } from '#modules/organizations/application/dtos/common/organization_pagination'
```

### `app/modules/organizations/controllers/current/invitations/mappers/response/list_invitations_response_mapper.ts`

```ts
import type { InvitationsIndexPageResult } from '#modules/organizations/actions/current/invitations/queries/get_invitations_index_page_query'
```

### `app/modules/organizations/controllers/current/mappers/request/current_organization_mutation_request_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ProcessJoinRequestDTO } from '#modules/organizations/actions/dtos/request/process_join_request_dto'
import { RemoveMemberDTO } from '#modules/organizations/actions/dtos/request/remove_member_dto'
import { OrganizationRole } from '#modules/organizations/public_contracts/organization_constants'
```

### `app/modules/organizations/controllers/current/mappers/response/current_organization_mutation_response_mapper.ts`

```ts
// no imports
```

### `app/modules/organizations/controllers/current/mappers/response/shared.ts`

```ts
// no imports
```

### `app/modules/organizations/controllers/current/members/invite_member_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import InviteUserCommand from '#modules/organizations/actions/commands/invite_user_command'
import { buildCurrentOrganizationInviteMemberInput } from '#modules/organizations/controllers/current/mappers/request/current_organization_mutation_request_mapper'
import { mapCurrentOrganizationSuccessApiBody } from '#modules/organizations/controllers/current/mappers/response/current_organization_mutation_response_mapper'
```

### `app/modules/organizations/controllers/current/members/list_members_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildOrganizationMembersIndexPageInput } from './mappers/request/list_members_request_mapper.js'
import { mapOrganizationMembersIndexPageProps } from './mappers/response/list_members_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetOrganizationMembersIndexPageQuery from '#modules/organizations/actions/current/members/queries/get_organization_members_index_page_query'
```

### `app/modules/organizations/controllers/current/members/mappers/request/list_members_request_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import type { OrganizationMembersIndexPageInput } from '#modules/organizations/actions/current/members/queries/get_organization_members_index_page_query'
```

### `app/modules/organizations/controllers/current/members/mappers/response/list_members_response_mapper.ts`

```ts
import type { OrganizationMembersIndexPageResult } from '#modules/organizations/actions/current/members/queries/get_organization_members_index_page_query'
```

### `app/modules/organizations/controllers/current/members/remove_member_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import RemoveMemberCommand from '#modules/organizations/actions/commands/remove_member_command'
import { buildCurrentOrganizationRemoveMemberDTO } from '#modules/organizations/controllers/current/mappers/request/current_organization_mutation_request_mapper'
import { mapCurrentOrganizationSuccessApiBody } from '#modules/organizations/controllers/current/mappers/response/current_organization_mutation_response_mapper'
```

### `app/modules/organizations/controllers/current/members/update_member_role_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import UpdateMemberRoleCommand from '#modules/organizations/actions/commands/update_member_role_command'
import { buildCurrentOrganizationRoleUpdateInput } from '#modules/organizations/controllers/current/mappers/request/current_organization_mutation_request_mapper'
import { mapCurrentOrganizationSuccessApiBody } from '#modules/organizations/controllers/current/mappers/response/current_organization_mutation_response_mapper'
```

### `app/modules/organizations/controllers/current/projects/create_project_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import CreateCurrentOrganizationProjectCommand from '#modules/organizations/actions/current/projects/commands/create_project_command'
import { buildCreateCurrentOrganizationProjectDTO } from '#modules/organizations/controllers/current/projects/mappers/request/current_project_request_mapper'
import { mapCurrentOrganizationProjectMutationApiBody } from '#modules/organizations/controllers/current/projects/mappers/response/current_project_response_mapper'
```

### `app/modules/organizations/controllers/current/projects/list_projects_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ListProjectsQuery from '#modules/organizations/actions/current/projects/queries/list_projects_query'
import { buildCurrentOrganizationProjectsListInput } from '#modules/organizations/controllers/current/projects/mappers/request/current_project_request_mapper'
```

### `app/modules/organizations/controllers/current/projects/mappers/request/current_project_request_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { ORGANIZATION_PAGINATION as PAGINATION } from '#modules/organizations/application/dtos/common/organization_pagination'
import { CreateProjectDTO } from '#modules/projects/public_contracts/create_project_dto'
import type { ProjectVisibility } from '#modules/projects/public_contracts/project_constants'
```

### `app/modules/organizations/controllers/current/projects/mappers/response/current_project_response_mapper.ts`

```ts
import type {
  ResponseRecord,
  SerializableResponseRecord,
} from '#modules/organizations/controllers/current/mappers/response/shared'
import { serializeForCurrentOrganizationResponse } from '#modules/organizations/controllers/current/mappers/response/shared'
```

### `app/modules/organizations/controllers/current/projects/show_project_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import GetProjectDetailQuery from '#modules/projects/actions/queries/get_project_detail_query'
```

### `app/modules/organizations/controllers/current/settings/show_settings_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetOrganizationSettingsQuery from '#modules/organizations/actions/current/settings/queries/get_organization_settings_query'
```

### `app/modules/organizations/controllers/current/settings/update_settings_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UpdateOrganizationSettingsCommand from '#modules/organizations/actions/current/settings/commands/update_organization_settings_command'
```

### `app/modules/organizations/controllers/current/tasks/list_tasks_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetOrganizationTasksIndexPageQuery from '#modules/organizations/actions/current/tasks/queries/get_organization_tasks_index_page_query'
import { buildCurrentOrganizationTasksIndexPageInput } from '#modules/organizations/controllers/current/tasks/mappers/request/current_task_request_mapper'
```

### `app/modules/organizations/controllers/current/tasks/mappers/request/current_task_request_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ORGANIZATION_PAGINATION as PAGINATION } from '#modules/organizations/application/dtos/common/organization_pagination'
import type { GetTasksIndexPageInput } from '#modules/tasks/actions/queries/get_tasks_index_page_query'
```

### `app/modules/organizations/controllers/current/tasks/show_task_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { makeGetTaskDetailQuery } from '#modules/tasks/bootstrap/task_action_factory'
```

### `app/modules/organizations/controllers/current/workflow/create_task_status_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import CreateOrganizationTaskStatusCommand from '#modules/organizations/actions/current/workflow/commands/create_task_status_command'
import { buildCurrentOrganizationWorkflowCreateTaskStatusDTO } from '#modules/organizations/controllers/current/workflow/mappers/request/current_task_status_request_mapper'
import { mapCurrentOrganizationTaskStatusMutationApiBody } from '#modules/organizations/controllers/current/workflow/mappers/response/current_task_status_response_mapper'
```

### `app/modules/organizations/controllers/current/workflow/list_task_statuses_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ListTaskStatusesQuery from '#modules/organizations/actions/current/workflow/queries/list_task_statuses_query'
```

### `app/modules/organizations/controllers/current/workflow/mappers/request/current_task_status_request_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { TaskStatusCategory } from '#modules/tasks/public_contracts/task_constants'
import { CreateTaskStatusDTO } from '#modules/tasks/public_contracts/task_status_dtos'
```

### `app/modules/organizations/controllers/current/workflow/mappers/response/current_task_status_response_mapper.ts`

```ts
import type {
  ResponseRecord,
  SerializableResponseRecord,
} from '#modules/organizations/controllers/current/mappers/response/shared'
import { serializeForCurrentOrganizationResponse } from '#modules/organizations/controllers/current/mappers/response/shared'
```

### `app/modules/organizations/controllers/delete_organization_api_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildDeleteOrganizationDTO } from './mappers/request/organization_request_mapper.js'
import { mapOrganizationMutationApiBody } from './mappers/response/organization_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import DeleteOrganizationCommand from '#modules/organizations/actions/commands/delete_organization_command'
```

### `app/modules/organizations/controllers/invite_member_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import InviteUserCommand from '#modules/organizations/actions/commands/invite_user_command'
```

### `app/modules/organizations/controllers/join_organization_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildJoinOrganizationRequestInput } from './mappers/request/join_organization_request_mapper.js'
import {
  getJoinOrganizationSuccessMessage,
  mapJoinOrganizationSuccessApiBody,
} from './mappers/response/join_organization_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import RequestOrganizationJoinCommand from '#modules/organizations/actions/commands/request_organization_join_command'
```

### `app/modules/organizations/controllers/list_members_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import { buildOrganizationMembersPageFilters } from './mappers/request/organization_request_mapper.js'
import { mapOrganizationMembersPageProps } from './mappers/response/organization_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import GetOrganizationMembersPageQuery from '#modules/organizations/actions/queries/get_organization_members_page_query'
```

### `app/modules/organizations/controllers/list_organizations_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildOrganizationsListDTO } from './mappers/request/organization_request_mapper.js'
import { mapOrganizationsIndexPageProps } from './mappers/response/organization_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import GetOrganizationsIndexPageQuery from '#modules/organizations/actions/queries/get_organizations_index_page_query'
```

### `app/modules/organizations/controllers/mappers/organization_actor_context_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { OrganizationActorContext } from '#modules/organizations/application/context/organization_actor_context'
```

### `app/modules/organizations/controllers/mappers/request/join_organization_request_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
```

### `app/modules/organizations/controllers/mappers/request/organization_request_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { AddMemberDTO } from '#modules/organizations/actions/dtos/request/add_member_dto'
import { BulkAddMembersDTO } from '#modules/organizations/actions/dtos/request/bulk_add_members_dto'
import { CreateOrganizationDTO } from '#modules/organizations/actions/dtos/request/create_organization_dto'
import { DeleteOrganizationDTO } from '#modules/organizations/actions/dtos/request/delete_organization_dto'
import { GetOrganizationsListDTO } from '#modules/organizations/actions/dtos/request/get_organizations_list_dto'
import { ProcessJoinRequestDTO } from '#modules/organizations/actions/dtos/request/process_join_request_dto'
import { RemoveMemberDTO } from '#modules/organizations/actions/dtos/request/remove_member_dto'
import { UpdateOrganizationDTO } from '#modules/organizations/actions/dtos/request/update_organization_dto'
import type { OrganizationMembersPageFilters } from '#modules/organizations/actions/queries/get_organization_members_page_query'
import { ORGANIZATION_PAGINATION as PAGINATION } from '#modules/organizations/application/dtos/common/organization_pagination'
import { processJoinRequestValidator } from '#modules/organizations/validators/organization'
```

### `app/modules/organizations/controllers/mappers/response/join_organization_response_mapper.ts`

```ts
// no imports
```

### `app/modules/organizations/controllers/mappers/response/organization_mutation_api_mapper.ts`

```ts
// no imports
```

### `app/modules/organizations/controllers/mappers/response/organization_page_props_mapper.ts`

```ts
import type { OrganizationMembersPageFilters } from '#modules/organizations/actions/queries/get_organization_members_page_query'
```

### `app/modules/organizations/controllers/mappers/response/organization_response_mapper.ts`

```ts
// no imports
```

### `app/modules/organizations/controllers/pending_requests_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetPendingRequestsPageQuery from '#modules/organizations/actions/queries/get_pending_requests_page_query'
```

### `app/modules/organizations/controllers/process_join_request_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildValidatedProcessJoinRequestInput } from './mappers/request/organization_request_mapper.js'
import { mapOrganizationSuccessApiBody } from './mappers/response/organization_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import ProcessJoinRequestCommand from '#modules/organizations/actions/commands/process_join_request_command'
```

### `app/modules/organizations/controllers/remove_member_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildRemoveMemberDTO } from './mappers/request/organization_request_mapper.js'
import { mapOrganizationSuccessApiBody } from './mappers/response/organization_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import RemoveMemberCommand from '#modules/organizations/actions/commands/remove_member_command'
```

### `app/modules/organizations/controllers/show_organization_api_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapOrganizationDetailApiBody } from './mappers/response/organization_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { GetOrganizationDetailDTO } from '#modules/organizations/actions/dtos/request/get_organization_detail_dto'
import GetOrganizationDetailQuery from '#modules/organizations/actions/queries/get_organization_detail_query'
```

### `app/modules/organizations/controllers/show_organization_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import GetOrganizationShowPageQuery from '#modules/organizations/actions/queries/get_organization_show_page_query'
```

### `app/modules/organizations/controllers/switch_and_redirect_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { PageRoutes } from '#modules/http/public_contracts/route_constants'
import SwitchOrganizationCommand from '#modules/organizations/actions/commands/switch_organization_command'
```

### `app/modules/organizations/controllers/switch_organization_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import SwitchOrganizationCommand from '#modules/organizations/actions/commands/switch_organization_command'
```

### `app/modules/organizations/controllers/update_member_role_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import UpdateMemberRoleCommand from '#modules/organizations/actions/commands/update_member_role_command'
```

### `app/modules/organizations/controllers/update_organization_api_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildUpdateOrganizationDTO } from './mappers/request/organization_request_mapper.js'
import {
  mapOrganizationMutationApiBody,
  mapOrganizationDetailApiBody,
} from './mappers/response/organization_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UpdateOrganizationCommand from '#modules/organizations/actions/commands/update_organization_command'
```
## Code Snippets

### `start/routes/organizations_current.ts`

```ts
import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

/**
 * Current Organization Admin Routes
 *
 * Prefix: /org
 * Access: Organization Admin/Owner only
 *
 * Middleware stack:
 * - auth() → Ensure authenticated
 * - requireOrg() → Ensure current_organization_id exists
 * - requireOrgAdmin() → Check org_role (org_owner or org_admin)
 * - orgAdminContext() → Set organization context
 *
 * ⚠️ IMPORTANT:
 * These routes are for ORGANIZATION-level management, not system administration.
 * Organization admin ≠ System admin
 */

// ================ LAZY-LOADED CONTROLLERS ================
// Organization Dashboard
const OrgDashboardController = () =>
  import('#modules/organizations/controllers/current/dashboard_controller')

// Member Management
const OrgListMembersController = () =>
  import('#modules/organizations/controllers/current/members/list_members_controller')
const OrgInviteMemberController = () =>
  import('#modules/organizations/controllers/current/members/invite_member_controller')
const OrgRemoveMemberController = () =>
  import('#modules/organizations/controllers/current/members/remove_member_controller')
const OrgUpdateMemberRoleController = () =>
  import('#modules/organizations/controllers/current/members/update_member_role_controller')

// Invitations & Join Requests
const OrgListJoinRequestsController = () =>
  import('#modules/organizations/controllers/current/invitations/list_join_requests_controller')
const OrgApproveJoinRequestController = () =>
  import('#modules/organizations/controllers/current/invitations/approve_join_request_controller')
const OrgListInvitationsController = () =>
  import('#modules/organizations/controllers/current/invitations/list_invitations_controller')

// Settings
const OrgShowSettingsController = () =>
  import('#modules/organizations/controllers/current/settings/show_settings_controller')
const OrgUpdateSettingsController = () =>
  import('#modules/organizations/controllers/current/settings/update_settings_controller')
const OrgShowRolesController = () =>
  import('#modules/organizations/controllers/current/access/show_roles_controller')
const OrgShowPermissionsController = () =>
  import('#modules/organizations/controllers/current/access/show_permissions_controller')
const OrgShowDepartmentsController = () =>
  import('#modules/organizations/controllers/current/access/show_departments_controller')
const OrgUpdateRolesController = () =>
  import('#modules/organizations/controllers/current/access/update_roles_controller')

// Projects (Organization-level)
const OrgListProjectsController = () =>
  import('#modules/organizations/controllers/current/projects/list_projects_controller')
const OrgCreateProjectController = () =>
  import('#modules/organizations/controllers/current/projects/create_project_controller')
const OrgShowProjectController = () =>
  import('#modules/organizations/controllers/current/projects/show_project_controller')

// Tasks (Organization-level)
const OrgListTasksController = () =>
  import('#modules/organizations/controllers/current/tasks/list_tasks_controller')
const OrgShowTaskController = () =>
  import('#modules/organizations/controllers/current/tasks/show_task_controller')

// Workflow Customization
const OrgListTaskStatusesController = () =>
  import('#modules/organizations/controllers/current/workflow/list_task_statuses_controller')
const OrgCreateTaskStatusController = () =>
  import('#modules/organizations/controllers/current/workflow/create_task_status_controller')

// ================ ROUTE DEFINITIONS ================

router
  .group(() => {
    // ─── Dashboard ───
    router.get('/', [OrgDashboardController, 'handle']).as('org.dashboard')

    // ─── Member Management ───
    router
      .group(() => {
        router.get('/', [OrgListMembersController, 'handle']).as('org.members.index')
        router.post('/invite', [OrgInviteMemberController, 'handle']).as('org.members.invite')
        router.delete('/:id', [OrgRemoveMemberController, 'handle']).as('org.members.remove')
        router
          .put('/:id/role', [OrgUpdateMemberRoleController, 'handle'])
          .as('org.members.updateRole')
      })
      .prefix('/members')

    // ─── Join Requests & Invitations ───
    router
      .group(() => {
        router.get('/requests', [OrgListJoinRequestsController, 'handle']).as('org.requests.index')
        router
          .put('/requests/:id/approve', [OrgApproveJoinRequestController, 'handle'])
          .as('org.requests.approve')
        router
          .get('/invitations', [OrgListInvitationsController, 'handle'])
          .as('org.invitations.index')
      })
      .prefix('/invitations')

    // ─── Settings ───
    router
      .group(() => {
        router.get('/', [OrgShowSettingsController, 'handle']).as('org.settings.show')
        router.put('/', [OrgUpdateSettingsController, 'handle']).as('org.settings.update')
      })
      .prefix('/settings')

    router.get('/roles', [OrgShowRolesController, 'handle']).as('org.roles.index')
    router.put('/roles', [OrgUpdateRolesController, 'handle']).as('org.roles.update')
    router.get('/permissions', [OrgShowPermissionsController, 'handle']).as('org.permissions.index')
    router.get('/departments', [OrgShowDepartmentsController, 'handle']).as('org.departments.index')

    // ─── Projects (Organization-level) ───
    router
      .group(() => {
        router.get('/', [OrgListProjectsController, 'handle']).as('org.projects.index')
        router.post('/', [OrgCreateProjectController, 'handle']).as('org.projects.create')
        router.get('/:id', [OrgShowProjectController, 'handle']).as('org.projects.show')
      })
      .prefix('/projects')

    // ─── Tasks (Organization-level) ───
    router
      .group(() => {
        router.get('/', [OrgListTasksController, 'handle']).as('org.tasks.index')
        router.get('/:id', [OrgShowTaskController, 'handle']).as('org.tasks.show')
      })
      .prefix('/tasks')

    // ─── Workflow Customization ───
    router
      .group(() => {
        router
          .get('/statuses', [OrgListTaskStatusesController, 'handle'])
          .as('org.workflow.statuses')
        router
          .post('/statuses', [OrgCreateTaskStatusController, 'handle'])
          .as('org.workflow.createStatus')
      })
      .prefix('/workflow')
  })
  .prefix('/org')
  .use([
    middleware.auth(),
    middleware.requireOrg(),
    middleware.requireOrgAdmin(),
    middleware.orgAdminContext(),
  ])

```

### `start/routes/organizations.ts`

```ts
import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { throttle } from '#start/limiter'

// Organization use-case controllers
const ListOrganizationsController = () =>
  import('#modules/organizations/controllers/list_organizations_controller')
const ShowOrganizationController = () =>
  import('#modules/organizations/controllers/show_organization_controller')
const CreateOrganizationController = () =>
  import('#modules/organizations/controllers/create_organization_controller')
const SwitchAndRedirectController = () =>
  import('#modules/organizations/controllers/switch_and_redirect_controller')
const AllOrganizationsController = () =>
  import('#modules/organizations/controllers/all_organizations_controller')
const JoinOrganizationController = () =>
  import('#modules/organizations/controllers/join_organization_controller')
const ApiListOrganizationsController = () =>
  import('#modules/organizations/controllers/api_list_organizations_controller')
const ListMembersController = () =>
  import('#modules/organizations/controllers/list_members_controller')
const PendingRequestsController = () =>
  import('#modules/organizations/controllers/pending_requests_controller')
const AddMemberController = () => import('#modules/organizations/controllers/add_member_controller')
const InviteMemberController = () =>
  import('#modules/organizations/controllers/invite_member_controller')
const ProcessJoinRequestController = () =>
  import('#modules/organizations/controllers/process_join_request_controller')
const AddDirectMemberController = () =>
  import('#modules/organizations/controllers/add_direct_member_controller')
const RemoveMemberController = () =>
  import('#modules/organizations/controllers/remove_member_controller')
const UpdateMemberRoleController = () =>
  import('#modules/organizations/controllers/update_member_role_controller')
const AddUsersController = () => import('#modules/organizations/controllers/add_users_controller')

// Route hiển thị tất cả tổ chức (không phụ thuộc vào người dùng)
router
  .get('/all-organizations', [AllOrganizationsController, 'handle'])
  .as('organizations.all')
  .use(middleware.auth())

// API endpoint để lấy danh sách tổ chức
router
  .get('/api/organizations', [ApiListOrganizationsController, 'handle'])
  .as('api.organizations.list')
  .use(middleware.auth())

// Route debug tổ chức - phải đặt trước các route khác
router
  .get('/organizations/debug', async ({ inertia }) => {
    return inertia.render('organizations/organization-debug', {})
  })
  .as('organizations.debug')
  .use(middleware.auth())

// Route tham gia tổ chức
router
  .get('/organizations/:id/join', [JoinOrganizationController, 'handle'])
  .as('organizations.join')
  .use(middleware.auth())

// Route POST tham gia tổ chức (cho phép tham gia từ API)
router
  .post('/organizations/:id/join', [JoinOrganizationController, 'handle'])
  .as('organizations.join.post')
  .use(middleware.auth())

// Nhóm route cho tổ chức
router
  .group(() => {
    // Danh sách tổ chức
    router.get('/', [ListOrganizationsController, 'handle']).as('organizations.index')
    // Tạo tổ chức mới
    router.get('/create', [CreateOrganizationController, 'showForm']).as('organizations.create')

    router.post('/', [CreateOrganizationController, 'handle']).as('organizations.store')
    // Chi tiết tổ chức
    router.get('/:id', [ShowOrganizationController, 'handle']).as('organizations.show')

    // TODO: Implement edit, update, destroy methods
    // router.get('/:id/edit', [EditOrganizationController, 'showForm']).as('organizations.edit')
    // router.post('/:id', [EditOrganizationController, 'handle']).as('organizations.update')
    // router.delete('/:id', [DeleteOrganizationController, 'handle']).as('organizations.destroy')

    // Chuyển đổi tổ chức hiện tại
    router
      .post('/:id/switch', [SwitchAndRedirectController, 'switchOrganization'])
      .as('organizations.switch')

    // Quản lý thành viên tổ chức — use-case controllers
    router
      .group(() => {
        // Hiển thị danh sách thành viên
        router.get('/', [ListMembersController, 'handle']).as('organizations.members.index')
        // Hiển thị yêu cầu tham gia đang chờ
        router
          .get('/pending', [PendingRequestsController, 'handle'])
          .as('organizations.members.pending_requests')
        // Thêm thành viên mới
        router.post('/add', [AddMemberController, 'handle']).as('organizations.members.add')
        // Mời người dùng vào tổ chức
        router
          .post('/invite', [InviteMemberController, 'handle'])
          .as('organizations.members.invite')
        // Thêm người dùng trực tiếp (cho admin)
        router
          .post('/add-direct', [AddDirectMemberController, 'handle'])
          .as('organizations.members.add_direct')
        // Xử lý yêu cầu tham gia
        router
          .post('/process-request/:userId', [ProcessJoinRequestController, 'handle'])
          .as('organizations.members.process_request')
        // Cập nhật vai trò thành viên
        router
          .post('/update-role/:userId', [UpdateMemberRoleController, 'handle'])
          .as('organizations.members.update_role')
        // Xóa thành viên
        router
          .delete('/:userId', [RemoveMemberController, 'handle'])
          .as('organizations.members.remove')
      })
      .prefix('/:id/members')
  })
  .prefix('/organizations')
  .use([middleware.auth(), throttle])

const SwitchOrganizationController = () =>
  import('#modules/organizations/controllers/switch_organization_controller')

// API chuyển tổ chức
router
  .post('/switch-organization', [SwitchOrganizationController, 'handle'])
  .as('organizations.switch.api')
  .use(middleware.auth())

// Thêm route GET để xử lý redirect sau khi chuyển tổ chức
router
  .get('/organizations/switch/:id', [SwitchAndRedirectController, 'handle'])
  .as('organizations.switch.redirect')
  .use(middleware.auth())

// Quản lý thành viên tổ chức (standalone routes)
router
  .delete('/organizations/users/:id/remove', [RemoveMemberController, 'handle'])
  .as('organizations.users.remove')
  .use(middleware.auth())

// TODO: editPermissions and updatePermissions routes — not yet implemented
// Uncomment when EditPermissionsController and UpdatePermissionsController are created
// router.get('/organizations/users/:id/edit-permissions', [EditPermissionsController, 'handle'])
// router.post('/organizations/users/:id/update-permissions', [UpdatePermissionsController, 'handle'])
// router.put('/organizations/users/:id/update-permissions', [UpdatePermissionsController, 'handle'])

router
  .post('/organizations/users/add', [AddUsersController, 'handle'])
  .as('organizations.users.add')
  .use(middleware.auth())

```

### `app/modules/organizations/actions/commands/add_member_by_email_command.ts`

```ts
import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'

import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import AddMemberCommand from '#modules/organizations/actions/commands/add_member_command'
import { AddMemberDTO } from '#modules/organizations/actions/dtos/request/add_member_dto'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'

/**
 * Command: Add Member By Email
 *
 * Resolves user from email, then delegates to AddMemberCommand.
 * Controller only needs to pass email + org + role — no User.findBy() in controller.
 */
export default class AddMemberByEmailCommand {
  constructor(protected execCtx: OrganizationActionContext) {}

  async execute(organizationId: string, email: string, roleId: string): Promise<void> {
    const user = await DefaultOrganizationDependencies.user.findUserByEmail(email)
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng với email này')
    }

    const addMember = new AddMemberCommand(this.execCtx, notificationPublicApi)
    const dto = new AddMemberDTO(organizationId, user.id, roleId)
    await addMember.execute(dto)
  }
}

```

### `app/modules/organizations/actions/commands/add_member_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import type { AddMemberDTO } from '../dtos/request/add_member_dto.js'
import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'

import { EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canAddMember } from '#modules/organizations/domain/org_permission_policy'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'

/**
 * Command: Add Member to Organization
 *
 * Pattern: Permission check with notification (learned from Projects module)
 * Business rules:
 * - Only Owner (role_id = 1) or Admin (role_id = 2) can add members
 * - Cannot add member as Owner (role_id = 1)
 * - Check for duplicate membership
 * - Send notification to added member
 *
 * @example
 * const command = new AddMemberCommand(ctx, createNotification)
 * await command.execute(dto)
 */
export default class AddMemberCommand {
  constructor(
    protected execCtx: OrganizationActionContext,
    private createNotification: NotificationCreator
  ) {}

  /**
   * Execute command: Add member to organization
   *
   * Steps:
   * 1. Validate user exists
   * 2. Check permissions (Owner or Admin)
   * 3. Check for duplicate membership
   * 4. Begin transaction
   * 5. Add member to organization_users
   * 6. Create audit log
   * 7. Commit transaction
   * 8. Send notification (outside transaction)
   */
  async execute(dto: AddMemberDTO): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Unauthorized')
    }
    const trx = await db.transaction()

    try {
      // 1. Validate user exists
      const userToAdd = await DefaultOrganizationDependencies.user.findUserIdentity(dto.userId, trx)
      if (!userToAdd) {
        throw new BusinessLogicException(`User with ID ${dto.userId} not found`)
      }

      // 2. Check permissions, role validity, and duplicate membership
      const actorMembership = await membershipQueries.getMembershipContext(
        dto.organizationId,
        userId,
        trx
      )
      const actorOrgRole = actorMembership?.role ?? null
      const alreadyMember = await membershipQueries.isMember(
        dto.userId,
        dto.organizationId,
        trx
      )
      enforcePolicy(
        canAddMember({
          actorOrgRole,
          targetRoleId: dto.roleId,
          isAlreadyMember: alreadyMember,
        })
      )

      // 5. Add member to organization → delegate to Model
      await membershipMutations.addMember(
        {
          organization_id: dto.organizationId,
          user_id: dto.userId,
          org_role: dto.roleId,
        },
        trx
      )

      // 6. Create audit log
      await auditPublicApi.log(
        {
          user_id: userId,
          action: 'add_member',
          entity_type: EntityType.ORGANIZATION,
          entity_id: dto.organizationId,
          new_values: {
            ...dto.toObject(),
            added_user_id: dto.userId,
            role: dto.getRoleName(),
            org_role: dto.roleId,
          },
        },
        this.execCtx
      )

      await trx.commit()

      // Emit domain event
      void emitter.emit('organization:member:added', {
        organizationId: dto.organizationId,
        userId: dto.userId,
        org_role: dto.roleId,
        invitedBy: userId,
      })

      // Invalidate organization member caches
      await cacheStore.deleteByPattern(`organization:members:*`)
      await cacheStore.deleteByPattern(`organization:metadata:*`)

      // 7. Send notification (outside transaction)
      await this.sendMemberAddedNotification(dto, userId)
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Helper: Send notification to added member
   */
  private async sendMemberAddedNotification(
    dto: AddMemberDTO,
    _addedByUserId: string
  ): Promise<void> {
    try {
      await this.createNotification.handle({
        user_id: dto.userId,
        title: 'Được thêm vào tổ chức',
        message: `Bạn đã được thêm vào tổ chức với vai trò ${dto.getRoleNameVi()}`,
        type: BACKEND_NOTIFICATION_TYPES.MEMBER_ADDED,
        related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.ORGANIZATION,
        related_entity_id: dto.organizationId,
      })
    } catch (error) {
      loggerService.error('[AddMemberCommand] Failed to send notification:', error)
    }
  }
}

```

### `app/modules/organizations/actions/commands/approve_membership.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
import { OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'

export async function approveMembershipInternal(
  organizationId: string,
  userId: string,
  trx?: TransactionClientContract
): Promise<void> {
  await membershipMutations.updateStatus(
    organizationId,
    userId,
    OrganizationUserStatus.APPROVED,
    trx
  )
}

```

### `app/modules/organizations/actions/commands/bulk_add_members_command.ts`

```ts
import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import loggerService from '#modules/logger/public_contracts/logger_service'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import AddMemberCommand from '#modules/organizations/actions/commands/add_member_command'
import { AddMemberDTO } from '#modules/organizations/actions/dtos/request/add_member_dto'
import type { BulkAddMembersDTO } from '#modules/organizations/actions/dtos/request/bulk_add_members_dto'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canBulkAddOrganizationMembers } from '#modules/organizations/domain/org_permission_policy'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import { OrganizationRole } from '#modules/organizations/public_contracts/organization_constants'

interface BulkAddResult {
  user_id: string
  status: 'added' | 'skipped' | 'failed'
  message: string
}

/**
 * Command: Bulk Add Members to Organization
 *
 * Business rules:
 * - Requester must be org owner (super admin)
 * - Skips non-existent users
 * - Skips users already in organization
 * - Uses AddMemberCommand for each user
 */
export default class BulkAddMembersCommand {
  constructor(protected execCtx: OrganizationActionContext) {}

  async execute(dto: BulkAddMembersDTO): Promise<{
    results: BulkAddResult[]
    addedCount: number
  }> {
    // 1. Check requester is org owner
    await this.checkPermission(dto.requesterId, dto.organizationId)

    // 2. Process each user
    const addMember = new AddMemberCommand(this.execCtx, notificationPublicApi)
    const defaultRoleId = OrganizationRole.MEMBER
    const results: BulkAddResult[] = []

    for (const userId of dto.userIds) {
      try {
        const targetUser = await DefaultOrganizationDependencies.user.findUserIdentity(userId)
        if (!targetUser) {
          results.push({
            user_id: userId,
            status: 'skipped',
            message: 'Không tìm thấy người dùng',
          })
          continue
        }

        // Check not already a member
        const existingMember = await membershipQueries.findMembership(
          dto.organizationId,
          userId
        )

        if (existingMember) {
          results.push({
            user_id: userId,
            status: 'skipped',
            message: 'Người dùng đã là thành viên của tổ chức',
          })
          continue
        }

        // Add member using existing command
        const memberDto = new AddMemberDTO(dto.organizationId, targetUser.id, defaultRoleId)
        await addMember.execute(memberDto)

        results.push({
          user_id: userId,
          status: 'added',
          message: 'Thêm thành công',
        })
      } catch (error: unknown) {
        loggerService.error(`[BulkAddMembersCommand] Error adding user ${userId}:`, error)
        results.push({
          user_id: userId,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Lỗi không xác định',
        })
      }
    }

    const addedCount = results.filter((r) => r.status === 'added').length

    return { results, addedCount }
  }

  private async checkPermission(userId: string, organizationId: string): Promise<void> {
    const orgUser = await membershipQueries.findMembership(organizationId, userId)
    enforcePolicy(canBulkAddOrganizationMembers(orgUser?.org_role ?? null))
  }
}

```

### `app/modules/organizations/actions/commands/bulk_invite_users_command.ts`

```ts
import { InviteUserDTO } from '../dtos/request/invite_user_dto.js'

import InviteUserCommand from './invite_user_command.js'

import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'

/**
 * DTO for bulk inviting users
 */
export interface BulkInviteUsersDTO {
  organization_id: string
  user_emails: string[]
  org_role: string
  message?: string
}

/**
 * Command: Bulk Invite Users to Organization
 *
 * Migrate từ stored procedure: bulk_invite_users_to_organization
 *
 * Business rules:
 * - Loop qua danh sách emails và gọi InviteUserCommand cho từng user
 * - Collect kết quả success/failure
 */
export default class BulkInviteUsersCommand {
  constructor(protected execCtx: OrganizationActionContext) {}

  async execute(dto: BulkInviteUsersDTO): Promise<{
    success: string[]
    failed: { email: string; error: string }[]
  }> {
    const success: string[] = []
    const failed: { email: string; error: string }[] = []

    const inviteCommand = new InviteUserCommand(this.execCtx)

    for (const email of dto.user_emails) {
      try {
        const inviteDto = InviteUserDTO.fromValidatedPayload({
          organization_id: dto.organization_id,
          email,
          role_id: dto.org_role,
          message: dto.message,
        })

        await inviteCommand.execute(inviteDto)
        success.push(email)
      } catch (error) {
        failed.push({
          email: email,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return { success, failed }
  }
}

```

### `app/modules/organizations/actions/commands/create_join_request_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
import { OrganizationRole, OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'

/**
 * Command: Create Join Request
 *
 * Persist pending membership, audit log, and post-commit event for a join request.
 * Eligibility and orchestration stay in RequestOrganizationJoinCommand.
 */
export default class CreateJoinRequestCommand {
  constructor(protected execCtx: OrganizationActionContext) {}

  async execute(organizationId: string): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Unauthorized')
    }
    const trx = await db.transaction()

    try {
      const existingMembership = await membershipQueries.findMembership(
        organizationId,
        userId,
        trx
      )

      if (existingMembership?.status === OrganizationUserStatus.REJECTED) {
        await membershipMutations.updateStatus(organizationId, userId, 'pending', trx)
      } else {
        await membershipMutations.addMember(
          {
            organization_id: organizationId,
            user_id: userId,
            org_role: OrganizationRole.MEMBER,
            status: OrganizationUserStatus.PENDING,
          },
          trx
        )
      }

      await auditPublicApi.log(
        {
          user_id: userId,
          action: AuditAction.JOIN,
          entity_type: EntityType.ORGANIZATION,
          entity_id: organizationId,
          new_values: {
            user_id: userId,
            organization_id: organizationId,
            status: OrganizationUserStatus.PENDING,
          },
        },
        this.execCtx
      )

      await trx.commit()

      void emitter.emit('audit:log', {
        userId,
        action: 'join_request',
        entityType: 'organization',
        entityId: organizationId,
        newValues: { status: OrganizationUserStatus.PENDING },
      })
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}

```

### `app/modules/organizations/actions/commands/create_organization_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { CreateOrganizationDTO } from '../dtos/request/create_organization_dto.js'
import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import {
  canCreateOrganization,
  resolveOrganizationBaseSlug,
  resolveUniqueOrganizationSlug,
} from '#modules/organizations/domain/organization_rules'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
import * as OrganizationMutations from '#modules/organizations/infra/repositories/write/organization_mutations'
import { OrganizationRole, OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'
import type { OrganizationRecord } from '#modules/organizations/types/organization_records'
import { orgTaskBootstrap } from '#modules/tasks/public_contracts/task_public_api'

/**
 * Command: Create Organization
 *
 * Di chuyển logic từ database triggers:
 * - before_organization_insert: Auto generate slug từ name
 * - after_organization_insert: Add owner to organization_users với role_id = 1
 *
 * Business rules:
 * - Any authenticated user can create organization
 * - Creator automatically becomes Owner (role_id = 1)
 * - Slug auto-generated nếu không cung cấp
 *
 * @example
 * const command = new CreateOrganizationCommand(ctx, createNotification)
 * const org = await command.execute(dto)
 */
interface OrganizationCreationContext {
  baseSlug: string
}

interface PersistedOrganizationCreation {
  organization: OrganizationRecord
}

export default class CreateOrganizationCommand {
  constructor(
    protected execCtx: OrganizationActionContext,
    private createNotification: NotificationCreator
  ) {}

  /**
   * Execute command: Create new organization
   *
   * Pattern: REQUIRE ACTOR → FETCH/VALIDATE → PERSIST → POST-COMMIT
   */
  async execute(dto: CreateOrganizationDTO): Promise<OrganizationRecord> {
    const actorId = this.requireActorId()
    const creation = await this.persistOrganizationCreationInTransaction(dto, actorId)
    await this.runPostCommitEffects(creation.organization, actorId)
    return creation.organization
  }

  private requireActorId(): string {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Unauthorized')
    }

    return userId
  }

  private async loadCreationContext(
    dto: CreateOrganizationDTO,
    actorId: string,
    trx: TransactionClientContract
  ): Promise<OrganizationCreationContext> {
    const creatorIsActive = await DefaultOrganizationDependencies.user.isActiveUser(actorId, trx)
    enforcePolicy(canCreateOrganization({ actorIsActive: creatorIsActive }))

    return {
      baseSlug: resolveOrganizationBaseSlug({ name: dto.name, slug: dto.slug }),
    }
  }

  private async persistOrganizationCreation(
    dto: CreateOrganizationDTO,
    actorId: string,
    context: OrganizationCreationContext,
    trx: TransactionClientContract
  ): Promise<PersistedOrganizationCreation> {
    const slug = await this.getUniqueSlug(context.baseSlug, trx)

    const organization = await OrganizationMutations.createRecord(
      {
        name: dto.name,
        slug,
        description: dto.description ?? null,
        logo: dto.logo ?? null,
        website: dto.website ?? null,
        owner_id: actorId,
        plan: null,
      },
      trx
    )

    // v3: org_role is inline VARCHAR, no more role_id FK
    await membershipMutations.addMember(
      {
        organization_id: organization.id,
        user_id: actorId,
        org_role: OrganizationRole.OWNER,
        status: OrganizationUserStatus.APPROVED,
      },
      trx
    )

    await DefaultOrganizationDependencies.user.updateCurrentOrganization(
      actorId,
      organization.id,
      trx
    )

    // Seed default task statuses + workflow transitions inside the same transaction.
    await orgTaskBootstrap.seedDefaultStatusesForOrganization(organization.id, trx)

    await auditPublicApi.log(
      {
        user_id: actorId,
        action: AuditAction.CREATE,
        entity_type: EntityType.ORGANIZATION,
        entity_id: organization.id,
        new_values: organization,
      },
      this.execCtx
    )

    return { organization }
  }

  private async persistOrganizationCreationInTransaction(
    dto: CreateOrganizationDTO,
    actorId: string
  ): Promise<PersistedOrganizationCreation> {
    const trx = await db.transaction()

    try {
      const context = await this.loadCreationContext(dto, actorId, trx)
      const creation = await this.persistOrganizationCreation(dto, actorId, context, trx)
      await trx.commit()
      return creation
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private async runPostCommitEffects(
    organization: OrganizationRecord,
    actorId: string
  ): Promise<void> {
    void emitter.emit('organization:created', {
      organizationId: organization.id,
      ownerId: actorId,
      name: organization.name,
      slug: organization.slug,
      ip: this.execCtx.ip,
    })

    await cacheStore.deleteByPattern(`organization:*`)

    await this.sendWelcomeNotification(organization, actorId)
  }

  private async getUniqueSlug(baseSlug: string, trx: TransactionClientContract): Promise<string> {
    const slug = await resolveUniqueOrganizationSlug(baseSlug, (candidate) =>
      OrganizationRepository.slugExists(candidate, trx)
    )

    if (!slug) {
      throw new BusinessLogicException('Không thể tạo slug unique')
    }

    return slug
  }

  /**
   * Helper: Send welcome notification
   */
  private async sendWelcomeNotification(
    organization: OrganizationRecord,
    userId: string
  ): Promise<void> {
    try {
      await this.createNotification.handle({
        user_id: userId,
        title: 'Tổ chức mới được tạo',
        message: `Bạn đã tạo tổ chức "${organization.name}" thành công. Bạn là Chủ sở hữu của tổ chức này.`,
        type: BACKEND_NOTIFICATION_TYPES.ORGANIZATION_CREATED,
        related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.ORGANIZATION,
        related_entity_id: organization.id,
      })
    } catch (error) {
      loggerService.error('[CreateOrganizationCommand] Failed to send notification:', error)
    }
  }
}

```

### `app/modules/organizations/actions/commands/delete_organization_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import type { DeleteOrganizationDTO } from '../dtos/request/delete_organization_dto.js'

import { EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canDeleteOrganization } from '#modules/organizations/domain/org_permission_policy'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
import * as OrganizationMutations from '#modules/organizations/infra/repositories/write/organization_mutations'
import { projectPublicApi } from '#modules/projects/public_contracts/project_public_api'

/**
 * Command: Delete Organization
 *
 * Soft delete (default) or permanent delete.
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class DeleteOrganizationCommand {
  constructor(protected execCtx: OrganizationActionContext) {}

  async execute(dto: DeleteOrganizationDTO): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const trx = await db.transaction()

    try {
      // ── FETCH ──────────────────────────────────────────────────────────
      const organization = await OrganizationRepository.findActiveOrFailRecord(
        dto.organizationId,
        trx
      )

      const actorMembership = await membershipQueries.getMembershipContext(
        organization.id,
        userId,
        trx
      )
      const orgRole = actorMembership?.role ?? null
      const activeProjectCount = await projectPublicApi.countActiveByOrganization(
        organization.id,
        trx
      )

      // ── DECIDE (pure, sync) ────────────────────────────────────────────
      enforcePolicy(
        canDeleteOrganization({
          actorId: userId,
          actorOrgRole: orgRole,
          activeProjectCount,
        })
      )

      // ── PERSIST ────────────────────────────────────────────────────────
      const oldValues = { ...organization }

      const deletedOrganization = dto.isPermanentDelete()
        ? await OrganizationMutations.hardDeleteByIdRecord(organization.id, trx)
        : await OrganizationMutations.softDeleteByIdRecord(organization.id, trx)

      await auditPublicApi.log(
        {
          user_id: userId,
          action: dto.isPermanentDelete() ? 'permanent_delete' : 'soft_delete',
          entity_type: EntityType.ORGANIZATION,
          entity_id: organization.id,
          old_values: oldValues,
          new_values: {
            deleted_at: deletedOrganization.deleted_at,
            deletion_type: dto.getDeletionType(),
            reason: dto.getNormalizedReason(),
          },
        },
        this.execCtx
      )

      await trx.commit()

      // Emit domain event
      void emitter.emit('organization:deleted', {
        organizationId: organization.id,
        deletedBy: userId,
      })

      // Invalidate organization caches
      await cacheStore.deleteByPattern(`organization:*`)
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}

```
