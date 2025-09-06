# users Backend Module

### Kiến trúc lõi & Phân tích nghiệp vụ
- **Profile Recalculation**: Điểm năng lực (Technical, Soft Skills, Delivery) được tính toán động từ các review và evidence đã được xác thực, cập nhật vào `user_work_history`. Không cho phép sửa đổi trực tiếp trường level của user.
- **Profile Snapshots**: Bản chụp cấu trúc năng lực hiện tại của user (`user_profile_snapshots`), hỗ trợ tạo liên kết chia sẻ bảo mật, có thể xoay vòng (`rotate`) hoặc cấu hình quyền truy cập công khai/riêng tư.

## Module Path

```text
app/modules/users
```

## Folder And File Inventory

```text
./ README.md index.ts
actions/ INDEX.md base_command.ts base_query.ts delete_user.ts get_user_metadata.ts interfaces.ts public_api.ts result.ts user_action_context.ts
actions/commands/ add_user_skill_command.ts approve_user_command.ts build_user_work_history_command.ts change_user_role_command.ts create_recruiter_bookmark_command.ts deactivate_user_command.ts delete_recruiter_bookmark_command.ts publish_user_profile_snapshot_command.ts refresh_user_profile_aggregates_command.ts register_user_command.ts remove_user_skill_command.ts rotate_profile_snapshot_share_link_command.ts update_profile_snapshot_access_command.ts update_recruiter_bookmark_command.ts update_user_details_command.ts update_user_profile_command.ts update_user_skill_command.ts upsert_user_domain_expertise_command.ts upsert_user_performance_stats_command.ts
actions/dtos/request/ approve_user_dto.ts change_user_role_dto.ts get_user_detail_dto.ts get_users_list_dto.ts register_user_dto.ts update_user_details_dto.ts update_user_profile_dto.ts user_skill_dtos.ts
actions/dtos/response/ user_response_dtos.ts
actions/mapper/ user_application_mapper.ts
actions/ports/ user_external_dependencies.ts user_external_dependencies_impl.ts
actions/queries/ check_super_admin_permission_query.ts get_current_profile_snapshot_query.ts get_featured_reviews_query.ts get_pending_approval_users_query.ts get_profile_edit_page_query.ts get_profile_show_page_query.ts get_profile_snapshot_history_query.ts get_profile_view_page_query.ts get_public_profile_snapshot_query.ts get_spider_chart_data_query.ts get_talent_directory_page_query.ts get_user_delivery_metrics_query.ts get_user_detail_query.ts get_user_profile_query.ts get_user_skills_query.ts get_users_list_query.ts list_recruiter_bookmarks_workspace_query.ts search_talents_query.ts
actions/services/ user_public_api.ts
actions/support/ user_query_cache_keys.ts
actions/utils/ profile_completeness.ts
application/context/ user_actor_context.ts
application/dtos/common/ user_action_dtos.ts user_pagination.ts
application/events/ .gitkeep
application/ports/ user_account_reader.ts user_profile_projection_writer.ts
constants/ user_constants.ts
controllers/ add_profile_skill_controller.ts approve_user_controller.ts create_user_controller.ts delete_user_controller.ts edit_profile_controller.ts edit_user_controller.ts get_current_profile_snapshot_controller.ts get_profile_snapshot_history_controller.ts get_public_profile_snapshot_controller.ts list_users_controller.ts pending_approval_count_api_controller.ts pending_approval_users_api_controller.ts pending_approval_users_controller.ts publish_profile_snapshot_controller.ts recruiter_bookmarks_controller.ts recruiter_bookmarks_workspace_controller.ts remove_profile_skill_controller.ts rotate_profile_snapshot_share_link_controller.ts show_profile_controller.ts show_user_controller.ts store_user_controller.ts system_users_api_controller.ts talent_detail_controller.ts talent_directory_page_controller.ts talents_search_controller.ts update_profile_details_controller.ts update_profile_skill_controller.ts update_profile_snapshot_access_controller.ts update_user_controller.ts update_user_role_controller.ts view_user_profile_controller.ts
controllers/mappers/request/ shared.ts user_request_mapper.ts
controllers/mappers/response/ shared.ts user_response_mapper.ts
controllers/mappers/ user_actor_context_mapper.ts
domain/entities/ user_entity.ts
domain/mapper/ user_domain_mapper.ts
domain/ profile_aggregate_rules.ts profile_metrics_rules.ts profile_metrics_types.ts profile_snapshot_rules.ts subscription_rules.ts user_management_rules.ts user_types.ts
domain/repositories/ user_repository_interface.ts
events/ user_events.ts
infra/adapters/ .gitkeep
infra/mapper/ user_infra_mapper.ts
infra/models/ recruiter_bookmark.ts user.ts user_domain_expertise.ts user_performance_stat.ts user_profile_snapshot.ts user_skill.ts user_work_history.ts
infra/repositories/read/ analytics_queries.ts model_queries.ts shared.ts types.ts user_domain_expertise_queries.ts user_performance_stat_queries.ts user_profile_snapshot_queries.ts user_skill_queries.ts user_work_history_queries.ts
infra/repositories/ user_analytics_repository.ts user_domain_expertise_repository.ts user_performance_stat_repository.ts user_profile_snapshot_repository.ts user_repository.ts user_repository_impl.ts user_skill_repository.ts user_work_history_repository.ts
infra/repositories/write/ user_domain_expertise_mutations.ts user_mutations.ts user_performance_stat_mutations.ts user_profile_snapshot_mutations.ts user_skill_mutations.ts user_work_history_mutations.ts
public_contracts/ subscription_rules.ts update_user_profile_dto.ts user_account_status_v1.ts user_actor_identity_v1.ts user_constants.ts user_events_v1.ts user_management_rules.ts user_profile_projection_commands_v1.ts user_public_api.ts user_public_profile_v1.ts
types/ user_profile_data.ts user_records.ts
validators/rules/ database.ts identity.ts
validators/ user.ts
```

## Route Evidence

```text
start/routes/users.ts
```

## Symbol Evidence

| Kind | Symbol | File | Line |
|---|---|---|---:|
| class | `AddUserSkillCommand` | `app/modules/users/actions/commands/add_user_skill_command.ts` | 26 |
| class | `ApproveUserCommand` | `app/modules/users/actions/commands/approve_user_command.ts` | 25 |
| interface | `BuildUserWorkHistoryDTO` | `app/modules/users/actions/commands/build_user_work_history_command.ts` | 15 |
| interface | `BuildUserWorkHistoryResult` | `app/modules/users/actions/commands/build_user_work_history_command.ts` | 20 |
| class | `BuildUserWorkHistoryCommand` | `app/modules/users/actions/commands/build_user_work_history_command.ts` | 120 |
| class | `ChangeUserRoleCommand` | `app/modules/users/actions/commands/change_user_role_command.ts` | 24 |
| interface | `CreateRecruiterBookmarkDTO` | `app/modules/users/actions/commands/create_recruiter_bookmark_command.ts` | 9 |
| interface | `RecruiterBookmarkRecord` | `app/modules/users/actions/commands/create_recruiter_bookmark_command.ts` | 16 |
| class | `CreateRecruiterBookmarkCommand` | `app/modules/users/actions/commands/create_recruiter_bookmark_command.ts` | 27 |
| interface | `DeactivateUserDTO` | `app/modules/users/actions/commands/deactivate_user_command.ts` | 25 |
| class | `DeactivateUserCommand` | `app/modules/users/actions/commands/deactivate_user_command.ts` | 41 |
| interface | `DeleteRecruiterBookmarkDTO` | `app/modules/users/actions/commands/delete_recruiter_bookmark_command.ts` | 4 |
| class | `DeleteRecruiterBookmarkCommand` | `app/modules/users/actions/commands/delete_recruiter_bookmark_command.ts` | 8 |
| interface | `PublishUserProfileSnapshotDTO` | `app/modules/users/actions/commands/publish_user_profile_snapshot_command.ts` | 32 |
| interface | `PublishUserProfileSnapshotResult` | `app/modules/users/actions/commands/publish_user_profile_snapshot_command.ts` | 38 |
| class | `PublishUserProfileSnapshotCommand` | `app/modules/users/actions/commands/publish_user_profile_snapshot_command.ts` | 159 |
| interface | `RefreshUserProfileAggregatesDTO` | `app/modules/users/actions/commands/refresh_user_profile_aggregates_command.ts` | 8 |
| interface | `RefreshUserProfileAggregatesResult` | `app/modules/users/actions/commands/refresh_user_profile_aggregates_command.ts` | 15 |
| class | `RefreshUserProfileAggregatesCommand` | `app/modules/users/actions/commands/refresh_user_profile_aggregates_command.ts` | 33 |
| class | `RegisterUserCommand` | `app/modules/users/actions/commands/register_user_command.ts` | 28 |
| class | `RemoveUserSkillCommand` | `app/modules/users/actions/commands/remove_user_skill_command.ts` | 18 |
| interface | `RotateProfileSnapshotShareLinkDTO` | `app/modules/users/actions/commands/rotate_profile_snapshot_share_link_command.ts` | 11 |
| interface | `RotateProfileSnapshotShareLinkResult` | `app/modules/users/actions/commands/rotate_profile_snapshot_share_link_command.ts` | 15 |
| class | `RotateProfileSnapshotShareLinkCommand` | `app/modules/users/actions/commands/rotate_profile_snapshot_share_link_command.ts` | 21 |
| interface | `UpdateProfileSnapshotAccessDTO` | `app/modules/users/actions/commands/update_profile_snapshot_access_command.ts` | 11 |
| interface | `UpdateProfileSnapshotAccessResult` | `app/modules/users/actions/commands/update_profile_snapshot_access_command.ts` | 17 |
| class | `UpdateProfileSnapshotAccessCommand` | `app/modules/users/actions/commands/update_profile_snapshot_access_command.ts` | 25 |
| interface | `UpdateRecruiterBookmarkDTO` | `app/modules/users/actions/commands/update_recruiter_bookmark_command.ts` | 7 |
| class | `UpdateRecruiterBookmarkCommand` | `app/modules/users/actions/commands/update_recruiter_bookmark_command.ts` | 14 |
| class | `UpdateUserDetailsCommand` | `app/modules/users/actions/commands/update_user_details_command.ts` | 23 |
| class | `UpdateUserProfileCommand` | `app/modules/users/actions/commands/update_user_profile_command.ts` | 19 |
| class | `UpdateUserSkillCommand` | `app/modules/users/actions/commands/update_user_skill_command.ts` | 26 |
| interface | `UpsertUserDomainExpertiseDTO` | `app/modules/users/actions/commands/upsert_user_domain_expertise_command.ts` | 10 |
| interface | `UpsertUserDomainExpertiseResult` | `app/modules/users/actions/commands/upsert_user_domain_expertise_command.ts` | 14 |
| class | `UpsertUserDomainExpertiseCommand` | `app/modules/users/actions/commands/upsert_user_domain_expertise_command.ts` | 28 |
| interface | `UpsertUserPerformanceStatsDTO` | `app/modules/users/actions/commands/upsert_user_performance_stats_command.ts` | 17 |
| interface | `UpsertUserPerformanceStatsResult` | `app/modules/users/actions/commands/upsert_user_performance_stats_command.ts` | 23 |
| class | `UpsertUserPerformanceStatsCommand` | `app/modules/users/actions/commands/upsert_user_performance_stats_command.ts` | 56 |
| class | `DeleteUser` | `app/modules/users/actions/delete_user.ts` | 7 |
| class | `ApproveUserDTO` | `app/modules/users/actions/dtos/request/approve_user_dto.ts` | 11 |
| class | `ChangeUserRoleDTO` | `app/modules/users/actions/dtos/request/change_user_role_dto.ts` | 13 |
| class | `GetUserDetailDTO` | `app/modules/users/actions/dtos/request/get_user_detail_dto.ts` | 11 |
| class | `GetUsersListDTO` | `app/modules/users/actions/dtos/request/get_users_list_dto.ts` | 12 |
| class | `UserFiltersDTO` | `app/modules/users/actions/dtos/request/get_users_list_dto.ts` | 26 |
| class | `RegisterUserDTO` | `app/modules/users/actions/dtos/request/register_user_dto.ts` | 11 |
| class | `UpdateUserDetailsDTO` | `app/modules/users/actions/dtos/request/update_user_details_dto.ts` | 7 |
| class | `AddUserSkillDTO` | `app/modules/users/actions/dtos/request/user_skill_dtos.ts` | 9 |
| class | `UpdateUserSkillDTO` | `app/modules/users/actions/dtos/request/user_skill_dtos.ts` | 33 |
| class | `RemoveUserSkillDTO` | `app/modules/users/actions/dtos/request/user_skill_dtos.ts` | 56 |
| interface | `UserDetailResponseDTOProps` | `app/modules/users/actions/dtos/response/user_response_dtos.ts` | 11 |
| interface | `UserListItemResponseDTOProps` | `app/modules/users/actions/dtos/response/user_response_dtos.ts` | 35 |
| interface | `UserProfileResponseDTOProps` | `app/modules/users/actions/dtos/response/user_response_dtos.ts` | 46 |
| interface | `UserSummaryResponseDTOProps` | `app/modules/users/actions/dtos/response/user_response_dtos.ts` | 59 |
| class | `UserDetailResponseDTO` | `app/modules/users/actions/dtos/response/user_response_dtos.ts` | 69 |
| class | `UserListItemResponseDTO` | `app/modules/users/actions/dtos/response/user_response_dtos.ts` | 150 |
| class | `UserProfileResponseDTO` | `app/modules/users/actions/dtos/response/user_response_dtos.ts` | 192 |
| class | `UserSummaryResponseDTO` | `app/modules/users/actions/dtos/response/user_response_dtos.ts` | 240 |
| class | `GetUserMetadata` | `app/modules/users/actions/get_user_metadata.ts` | 7 |
| interface | `CommandHandler` | `app/modules/users/actions/interfaces.ts` | 7 |
| interface | `QueryHandler` | `app/modules/users/actions/interfaces.ts` | 22 |
| interface | `Command` | `app/modules/users/actions/interfaces.ts` | 36 |
| interface | `Query` | `app/modules/users/actions/interfaces.ts` | 43 |
| class | `UserApplicationMapper` | `app/modules/users/actions/mapper/user_application_mapper.ts` | 23 |
| interface | `PendingApprovalUser` | `app/modules/users/actions/ports/user_external_dependencies.ts` | 5 |
| interface | `UserOrganizationMembershipInfo` | `app/modules/users/actions/ports/user_external_dependencies.ts` | 15 |
| interface | `UserActiveSkillInfo` | `app/modules/users/actions/ports/user_external_dependencies.ts` | 19 |
| interface | `UserSkillDetail` | `app/modules/users/actions/ports/user_external_dependencies.ts` | 25 |
| interface | `UserOrganizationMembershipReaderWriter` | `app/modules/users/actions/ports/user_external_dependencies.ts` | 41 |
| interface | `UserSkillReader` | `app/modules/users/actions/ports/user_external_dependencies.ts` | 65 |
| interface | `UserPermissionReader` | `app/modules/users/actions/ports/user_external_dependencies.ts` | 77 |
| interface | `UserExternalDependencies` | `app/modules/users/actions/ports/user_external_dependencies.ts` | 88 |
| class | `InfraUserOrganizationMembershipReaderWriter` | `app/modules/users/actions/ports/user_external_dependencies_impl.ts` | 18 |
| class | `InfraUserSkillReader` | `app/modules/users/actions/ports/user_external_dependencies_impl.ts` | 70 |
| class | `InfraUserPermissionReader` | `app/modules/users/actions/ports/user_external_dependencies_impl.ts` | 112 |
| const | `DefaultUserDependencies` | `app/modules/users/actions/ports/user_external_dependencies_impl.ts` | 129 |
| class | `GetCurrentProfileSnapshotDTO` | `app/modules/users/actions/queries/get_current_profile_snapshot_query.ts` | 5 |
| interface | `CurrentProfileSnapshotResult` | `app/modules/users/actions/queries/get_current_profile_snapshot_query.ts` | 13 |
| class | `GetCurrentProfileSnapshotQuery` | `app/modules/users/actions/queries/get_current_profile_snapshot_query.ts` | 17 |
| class | `GetFeaturedReviewsDTO` | `app/modules/users/actions/queries/get_featured_reviews_query.ts` | 8 |
| interface | `FeaturedReviewItem` | `app/modules/users/actions/queries/get_featured_reviews_query.ts` | 21 |
| class | `GetFeaturedReviewsQuery` | `app/modules/users/actions/queries/get_featured_reviews_query.ts` | 44 |
| class | `GetPendingApprovalUsersQuery` | `app/modules/users/actions/queries/get_pending_approval_users_query.ts` | 21 |
| interface | `GetProfileEditPageInput` | `app/modules/users/actions/queries/get_profile_edit_page_query.ts` | 8 |
| interface | `GetProfileEditPageResult` | `app/modules/users/actions/queries/get_profile_edit_page_query.ts` | 12 |
| class | `GetProfileEditPageQuery` | `app/modules/users/actions/queries/get_profile_edit_page_query.ts` | 21 |
| interface | `GetProfileShowPageInput` | `app/modules/users/actions/queries/get_profile_show_page_query.ts` | 13 |
| interface | `GetProfileShowPageResult` | `app/modules/users/actions/queries/get_profile_show_page_query.ts` | 17 |
| class | `GetProfileShowPageQuery` | `app/modules/users/actions/queries/get_profile_show_page_query.ts` | 26 |
| class | `GetProfileSnapshotHistoryDTO` | `app/modules/users/actions/queries/get_profile_snapshot_history_query.ts` | 5 |
| interface | `ProfileSnapshotHistoryResult` | `app/modules/users/actions/queries/get_profile_snapshot_history_query.ts` | 22 |
| class | `GetProfileSnapshotHistoryQuery` | `app/modules/users/actions/queries/get_profile_snapshot_history_query.ts` | 26 |
| interface | `GetProfileViewPageInput` | `app/modules/users/actions/queries/get_profile_view_page_query.ts` | 10 |
| interface | `GetProfileViewPageResult` | `app/modules/users/actions/queries/get_profile_view_page_query.ts` | 15 |
| class | `GetProfileViewPageQuery` | `app/modules/users/actions/queries/get_profile_view_page_query.ts` | 24 |
| class | `GetPublicProfileSnapshotDTO` | `app/modules/users/actions/queries/get_public_profile_snapshot_query.ts` | 6 |
| interface | `PublicProfileSnapshotResult` | `app/modules/users/actions/queries/get_public_profile_snapshot_query.ts` | 17 |
| class | `GetPublicProfileSnapshotQuery` | `app/modules/users/actions/queries/get_public_profile_snapshot_query.ts` | 21 |
| class | `GetSpiderChartDataDTO` | `app/modules/users/actions/queries/get_spider_chart_data_query.ts` | 9 |
| class | `GetSpiderChartDataQuery` | `app/modules/users/actions/queries/get_spider_chart_data_query.ts` | 42 |
| interface | `TalentDirectoryItem` | `app/modules/users/actions/queries/get_talent_directory_page_query.ts` | 15 |
| interface | `TalentDirectoryPageResult` | `app/modules/users/actions/queries/get_talent_directory_page_query.ts` | 19 |
| class | `GetTalentDirectoryPageQuery` | `app/modules/users/actions/queries/get_talent_directory_page_query.ts` | 39 |
| class | `GetUserDeliveryMetricsDTO` | `app/modules/users/actions/queries/get_user_delivery_metrics_query.ts` | 19 |
| interface | `UserDeliveryMetricsResult` | `app/modules/users/actions/queries/get_user_delivery_metrics_query.ts` | 30 |
| class | `GetUserDeliveryMetricsQuery` | `app/modules/users/actions/queries/get_user_delivery_metrics_query.ts` | 47 |
| class | `GetUserDetailQuery` | `app/modules/users/actions/queries/get_user_detail_query.ts` | 25 |
| class | `GetUserProfileDTO` | `app/modules/users/actions/queries/get_user_profile_query.ts` | 9 |
| interface | `UserProfileResult` | `app/modules/users/actions/queries/get_user_profile_query.ts` | 21 |
| class | `GetUserProfileQuery` | `app/modules/users/actions/queries/get_user_profile_query.ts` | 38 |
| class | `GetUserSkillsDTO` | `app/modules/users/actions/queries/get_user_skills_query.ts` | 10 |
| class | `GetUserSkillsQuery` | `app/modules/users/actions/queries/get_user_skills_query.ts` | 61 |
| class | `GetUsersListQuery` | `app/modules/users/actions/queries/get_users_list_query.ts` | 35 |
| interface | `ListRecruiterBookmarksWorkspaceDTO` | `app/modules/users/actions/queries/list_recruiter_bookmarks_workspace_query.ts` | 5 |
| interface | `RecruiterBookmarkWorkspaceItem` | `app/modules/users/actions/queries/list_recruiter_bookmarks_workspace_query.ts` | 10 |
| interface | `RecruiterBookmarksWorkspaceResult` | `app/modules/users/actions/queries/list_recruiter_bookmarks_workspace_query.ts` | 24 |
| class | `ListRecruiterBookmarksWorkspaceQuery` | `app/modules/users/actions/queries/list_recruiter_bookmarks_workspace_query.ts` | 65 |
| interface | `SearchTalentsDTO` | `app/modules/users/actions/queries/search_talents_query.ts` | 8 |
| interface | `TalentSearchResult` | `app/modules/users/actions/queries/search_talents_query.ts` | 13 |
| class | `SearchTalentsQuery` | `app/modules/users/actions/queries/search_talents_query.ts` | 26 |
| class | `Result` | `app/modules/users/actions/result.ts` | 5 |
| interface | `UserLifetimePerformanceStatsPayload` | `app/modules/users/actions/services/user_public_api.ts` | 24 |
| interface | `UserReviewedSkillScorePayload` | `app/modules/users/actions/services/user_public_api.ts` | 33 |
| interface | `UserSpiderChartSkillPayload` | `app/modules/users/actions/services/user_public_api.ts` | 41 |
| interface | `SocialLoginUserPayload` | `app/modules/users/actions/services/user_public_api.ts` | 46 |
| interface | `AdminUserListFilters` | `app/modules/users/actions/services/user_public_api.ts` | 55 |
| interface | `AdminUserListResult` | `app/modules/users/actions/services/user_public_api.ts` | 61 |
| interface | `DashboardUserStats` | `app/modules/users/actions/services/user_public_api.ts` | 66 |
| class | `UserPublicApi` | `app/modules/users/actions/services/user_public_api.ts` | 88 |
| const | `userPublicApi` | `app/modules/users/actions/services/user_public_api.ts` | 451 |
| function | `buildUserProfileCacheKeys` | `app/modules/users/actions/support/user_query_cache_keys.ts` | 2 |
| function | `buildUserSkillsCacheKeys` | `app/modules/users/actions/support/user_query_cache_keys.ts` | 16 |
| interface | `UserActionContext` | `app/modules/users/actions/user_action_context.ts` | 1 |
| interface | `AuthenticatedUserActionContext` | `app/modules/users/actions/user_action_context.ts` | 8 |
| function | `makeSystemUserActionContext` | `app/modules/users/actions/user_action_context.ts` | 12 |
| function | `calculateProfileCompleteness` | `app/modules/users/actions/utils/profile_completeness.ts` | 7 |
| interface | `UserActorContext` | `app/modules/users/application/context/user_actor_context.ts` | 1 |
| class | `UserPaginationDTO` | `app/modules/users/application/dtos/common/user_action_dtos.ts` | 4 |
| interface | `UserPaginationMeta` | `app/modules/users/application/dtos/common/user_action_dtos.ts` | 20 |
| class | `UserPaginatedResult` | `app/modules/users/application/dtos/common/user_action_dtos.ts` | 28 |
| function | `isValidUserId` | `app/modules/users/application/dtos/common/user_action_dtos.ts` | 52 |
| class | `UserIdDTO` | `app/modules/users/application/dtos/common/user_action_dtos.ts` | 56 |
| const | `USER_PAGINATION` | `app/modules/users/application/dtos/common/user_pagination.ts` | 1 |
| interface | `UserAccountSnapshot` | `app/modules/users/application/ports/user_account_reader.ts` | 1 |
| interface | `UserAccountReader` | `app/modules/users/application/ports/user_account_reader.ts` | 9 |
| interface | `UserProfileProjectionInput` | `app/modules/users/application/ports/user_profile_projection_writer.ts` | 1 |
| interface | `UserProfileProjectionWriter` | `app/modules/users/application/ports/user_profile_projection_writer.ts` | 8 |
| enum | `UserStatusName` | `app/modules/users/constants/user_constants.ts` | 22 |
| enum | `SystemRoleName` | `app/modules/users/constants/user_constants.ts` | 33 |
| enum | `AuthMethod` | `app/modules/users/constants/user_constants.ts` | 43 |
| enum | `OAuthProvider` | `app/modules/users/constants/user_constants.ts` | 53 |
| enum | `ProficiencyLevel` | `app/modules/users/constants/user_constants.ts` | 63 |
| const | `proficiencyLevelOptions` | `app/modules/users/constants/user_constants.ts` | 74 |
| enum | `TrustTierCode` | `app/modules/users/constants/user_constants.ts` | 160 |
| const | `TRUST_TIER_WEIGHTS` | `app/modules/users/constants/user_constants.ts` | 166 |
| enum | `SkillCategoryCode` | `app/modules/users/constants/user_constants.ts` | 176 |
| enum | `SkillDisplayType` | `app/modules/users/constants/user_constants.ts` | 185 |
| const | `skillCategoryOptions` | `app/modules/users/constants/user_constants.ts` | 190 |
| class | `AddProfileSkillController` | `app/modules/users/controllers/add_profile_skill_controller.ts` | 11 |
| class | `ApproveUserController` | `app/modules/users/controllers/approve_user_controller.ts` | 15 |
| class | `CreateUserController` | `app/modules/users/controllers/create_user_controller.ts` | 10 |
| class | `DeleteUserController` | `app/modules/users/controllers/delete_user_controller.ts` | 11 |
| class | `EditProfileController` | `app/modules/users/controllers/edit_profile_controller.ts` | 12 |
| class | `EditUserController` | `app/modules/users/controllers/edit_user_controller.ts` | 14 |
| class | `GetCurrentProfileSnapshotController` | `app/modules/users/controllers/get_current_profile_snapshot_controller.ts` | 10 |
| class | `GetProfileSnapshotHistoryController` | `app/modules/users/controllers/get_profile_snapshot_history_controller.ts` | 10 |
| class | `GetPublicProfileSnapshotController` | `app/modules/users/controllers/get_public_profile_snapshot_controller.ts` | 10 |
| class | `ListUsersController` | `app/modules/users/controllers/list_users_controller.ts` | 15 |
| function | `toPositiveNumber` | `app/modules/users/controllers/mappers/request/shared.ts` | 3 |
| function | `toOptionalString` | `app/modules/users/controllers/mappers/request/shared.ts` | 18 |
| function | `toOptionalNullableString` | `app/modules/users/controllers/mappers/request/shared.ts` | 22 |
| function | `toOptionalNumber` | `app/modules/users/controllers/mappers/request/shared.ts` | 30 |
| function | `toOptionalBoolean` | `app/modules/users/controllers/mappers/request/shared.ts` | 43 |
| function | `toBoolean` | `app/modules/users/controllers/mappers/request/shared.ts` | 56 |
| function | `buildAddUserSkillDTO` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 43 |
| function | `buildApproveUserDTO` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 50 |
| function | `buildGetUserDetailDTO` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 58 |
| function | `buildGetUserProfileDTO` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 62 |
| function | `buildGetUserSkillsDTO` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 70 |
| function | `buildGetSpiderChartDataDTO` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 74 |
| function | `buildGetUserDeliveryMetricsDTO` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 78 |
| function | `buildGetFeaturedReviewsDTO` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 82 |
| function | `buildGetCurrentProfileSnapshotDTO` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 89 |
| function | `buildGetProfileSnapshotHistoryDTO` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 93 |
| function | `buildGetPublicProfileSnapshotDTO` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 105 |
| function | `buildUsersListDTO` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 115 |
| function | `buildPendingApprovalUsersListDTO` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 138 |
| function | `buildSystemUsersListDTO` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 161 |
| function | `buildPublishUserProfileSnapshotDTO` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 185 |
| function | `buildRemoveUserSkillDTO` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 193 |
| function | `buildRotateProfileSnapshotShareLinkDTO` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 197 |
| function | `buildRegisterUserDTO` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 203 |
| function | `buildUpdateUserDetailsDTO` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 212 |
| function | `buildUpdateUserSkillDTO` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 224 |
| function | `buildUpdateProfileSnapshotAccessDTO` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 234 |
| function | `buildUpdateUserProfileDTO` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 245 |
| function | `buildChangeUserRoleDTO` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 256 |
| function | `buildDeleteUserInput` | `app/modules/users/controllers/mappers/request/user_request_mapper.ts` | 268 |
| type | `ResponseRecord` | `app/modules/users/controllers/mappers/response/shared.ts` | 1 |
| interface | `SerializableResponseRecord` | `app/modules/users/controllers/mappers/response/shared.ts` | 3 |
| function | `stripUndefined` | `app/modules/users/controllers/mappers/response/shared.ts` | 42 |
| function | `serializeForResponse` | `app/modules/users/controllers/mappers/response/shared.ts` | 48 |
| function | `serializeNullableForResponse` | `app/modules/users/controllers/mappers/response/shared.ts` | 58 |
| function | `serializeCollectionForResponse` | `app/modules/users/controllers/mappers/response/shared.ts` | 64 |
| function | `normalizePaginationMeta` | `app/modules/users/controllers/mappers/response/shared.ts` | 72 |
| function | `sanitizePublicSnapshot` | `app/modules/users/controllers/mappers/response/shared.ts` | 81 |
| function | `mapProfileEditPageProps` | `app/modules/users/controllers/mappers/response/user_response_mapper.ts` | 159 |
| function | `mapProfileShowPageProps` | `app/modules/users/controllers/mappers/response/user_response_mapper.ts` | 177 |
| function | `mapProfileViewPageProps` | `app/modules/users/controllers/mappers/response/user_response_mapper.ts` | 195 |
| function | `mapProfileViewApiBody` | `app/modules/users/controllers/mappers/response/user_response_mapper.ts` | 213 |
| function | `mapUserMetadataPageProps` | `app/modules/users/controllers/mappers/response/user_response_mapper.ts` | 227 |
| function | `mapEditUserPageProps` | `app/modules/users/controllers/mappers/response/user_response_mapper.ts` | 233 |
| function | `mapShowUserPageProps` | `app/modules/users/controllers/mappers/response/user_response_mapper.ts` | 243 |
| function | `mapSuccessMessageApiBody` | `app/modules/users/controllers/mappers/response/user_response_mapper.ts` | 249 |
| function | `mapCurrentProfileSnapshotApiBody` | `app/modules/users/controllers/mappers/response/user_response_mapper.ts` | 256 |
| function | `mapProfileSnapshotHistoryApiBody` | `app/modules/users/controllers/mappers/response/user_response_mapper.ts` | 265 |
| function | `mapPublicProfileSnapshotApiBody` | `app/modules/users/controllers/mappers/response/user_response_mapper.ts` | 272 |
| function | `mapUsersIndexPageProps` | `app/modules/users/controllers/mappers/response/user_response_mapper.ts` | 281 |
| function | `mapPendingApprovalUsersPageProps` | `app/modules/users/controllers/mappers/response/user_response_mapper.ts` | 293 |
| function | `mapSystemUsersApiBody` | `app/modules/users/controllers/mappers/response/user_response_mapper.ts` | 305 |
| function | `mapPendingApprovalUsersApiBody` | `app/modules/users/controllers/mappers/response/user_response_mapper.ts` | 312 |
| function | `mapPendingApprovalCountApiBody` | `app/modules/users/controllers/mappers/response/user_response_mapper.ts` | 325 |
| function | `mapSnapshotMutationApiBody` | `app/modules/users/controllers/mappers/response/user_response_mapper.ts` | 332 |
| function | `userActorContextFromHttp` | `app/modules/users/controllers/mappers/user_actor_context_mapper.ts` | 6 |
| class | `PendingApprovalCountApiController` | `app/modules/users/controllers/pending_approval_count_api_controller.ts` | 11 |
| class | `PendingApprovalUsersApiController` | `app/modules/users/controllers/pending_approval_users_api_controller.ts` | 11 |
| class | `PendingApprovalUsersController` | `app/modules/users/controllers/pending_approval_users_controller.ts` | 15 |
| class | `PublishProfileSnapshotController` | `app/modules/users/controllers/publish_profile_snapshot_controller.ts` | 10 |
| class | `RecruiterBookmarksController` | `app/modules/users/controllers/recruiter_bookmarks_controller.ts` | 9 |
| class | `RecruiterBookmarksWorkspaceController` | `app/modules/users/controllers/recruiter_bookmarks_workspace_controller.ts` | 6 |
| class | `RemoveProfileSkillController` | `app/modules/users/controllers/remove_profile_skill_controller.ts` | 11 |
| class | `RotateProfileSnapshotShareLinkController` | `app/modules/users/controllers/rotate_profile_snapshot_share_link_controller.ts` | 10 |
| class | `ShowProfileController` | `app/modules/users/controllers/show_profile_controller.ts` | 12 |
| class | `ShowUserController` | `app/modules/users/controllers/show_user_controller.ts` | 13 |
| class | `StoreUserController` | `app/modules/users/controllers/store_user_controller.ts` | 11 |
| class | `SystemUsersApiController` | `app/modules/users/controllers/system_users_api_controller.ts` | 15 |
| class | `TalentDetailController` | `app/modules/users/controllers/talent_detail_controller.ts` | 8 |
| class | `TalentDirectoryPageController` | `app/modules/users/controllers/talent_directory_page_controller.ts` | 6 |
| class | `TalentsSearchController` | `app/modules/users/controllers/talents_search_controller.ts` | 6 |
| class | `UpdateProfileDetailsController` | `app/modules/users/controllers/update_profile_details_controller.ts` | 11 |
| class | `UpdateProfileSkillController` | `app/modules/users/controllers/update_profile_skill_controller.ts` | 11 |
| class | `UpdateProfileSnapshotAccessController` | `app/modules/users/controllers/update_profile_snapshot_access_controller.ts` | 10 |
| class | `UpdateUserController` | `app/modules/users/controllers/update_user_controller.ts` | 11 |
| class | `UpdateUserRoleController` | `app/modules/users/controllers/update_user_role_controller.ts` | 12 |
| class | `ViewUserProfileController` | `app/modules/users/controllers/view_user_profile_controller.ts` | 11 |
| type | `UserStatus` | `app/modules/users/domain/entities/user_entity.ts` | 16 |
| type | `UserSystemRole` | `app/modules/users/domain/entities/user_entity.ts` | 17 |
| type | `UserAuthMethod` | `app/modules/users/domain/entities/user_entity.ts` | 18 |
| interface | `UserProfileSettings` | `app/modules/users/domain/entities/user_entity.ts` | 20 |
| interface | `UserTrustData` | `app/modules/users/domain/entities/user_entity.ts` | 35 |
| interface | `UserCredibilityData` | `app/modules/users/domain/entities/user_entity.ts` | 52 |
| interface | `UserEntityProps` | `app/modules/users/domain/entities/user_entity.ts` | 60 |
| class | `UserEntity` | `app/modules/users/domain/entities/user_entity.ts` | 86 |
| class | `UserDomainMapper` | `app/modules/users/domain/mapper/user_domain_mapper.ts` | 19 |
| interface | `WorkHistoryDeliveryTimingInput` | `app/modules/users/domain/profile_aggregate_rules.ts` | 1 |
| interface | `KnowledgeArtifact` | `app/modules/users/domain/profile_aggregate_rules.ts` | 6 |
| interface | `PerformanceAggregateRow` | `app/modules/users/domain/profile_aggregate_rules.ts` | 11 |
| interface | `SelfAssessmentAccuracyRow` | `app/modules/users/domain/profile_aggregate_rules.ts` | 23 |
| interface | `PerformanceAggregateMetrics` | `app/modules/users/domain/profile_aggregate_rules.ts` | 28 |
| interface | `DomainExpertiseSkillScore` | `app/modules/users/domain/profile_aggregate_rules.ts` | 45 |
| interface | `DomainExpertiseRow` | `app/modules/users/domain/profile_aggregate_rules.ts` | 50 |
| interface | `DomainExpertiseTopSkill` | `app/modules/users/domain/profile_aggregate_rules.ts` | 58 |
| interface | `DomainExpertiseMetrics` | `app/modules/users/domain/profile_aggregate_rules.ts` | 64 |
| function | `calculateWorkHistoryDeliveryTiming` | `app/modules/users/domain/profile_aggregate_rules.ts` | 141 |
| function | `buildKnowledgeArtifacts` | `app/modules/users/domain/profile_aggregate_rules.ts` | 160 |
| function | `calculateAverageScore` | `app/modules/users/domain/profile_aggregate_rules.ts` | 183 |
| function | `calculatePerformanceAggregateMetrics` | `app/modules/users/domain/profile_aggregate_rules.ts` | 190 |
| function | `calculateDomainExpertiseMetrics` | `app/modules/users/domain/profile_aggregate_rules.ts` | 280 |
| function | `calculateDeliveryMetrics` | `app/modules/users/domain/profile_metrics_rules.ts` | 31 |
| function | `calculateSkillAggregation` | `app/modules/users/domain/profile_metrics_rules.ts` | 112 |
| function | `calculateYearsOfExperience` | `app/modules/users/domain/profile_metrics_rules.ts` | 137 |
| function | `formatJoinedDate` | `app/modules/users/domain/profile_metrics_rules.ts` | 148 |
| interface | `TaskAssignmentData` | `app/modules/users/domain/profile_metrics_types.ts` | 14 |
| interface | `UserSkillData` | `app/modules/users/domain/profile_metrics_types.ts` | 29 |
| interface | `DeliveryMetricsContext` | `app/modules/users/domain/profile_metrics_types.ts` | 41 |
| interface | `DeliveryMetricsResult` | `app/modules/users/domain/profile_metrics_types.ts` | 48 |
| interface | `SkillAggregationContext` | `app/modules/users/domain/profile_metrics_types.ts` | 60 |
| interface | `SkillAggregationResult` | `app/modules/users/domain/profile_metrics_types.ts` | 67 |
| interface | `ExperienceContext` | `app/modules/users/domain/profile_metrics_types.ts` | 76 |
| function | `buildProfileSnapshotSlug` | `app/modules/users/domain/profile_snapshot_rules.ts` | 1 |
| function | `pickTopFrequencyKeys` | `app/modules/users/domain/profile_snapshot_rules.ts` | 11 |
| interface | `UserRepository` | `app/modules/users/domain/repositories/user_repository_interface.ts` | 12 |
| function | `toStorageSubscriptionPlan` | `app/modules/users/domain/subscription_rules.ts` | 1 |
| function | `toDisplaySubscriptionPlan` | `app/modules/users/domain/subscription_rules.ts` | 9 |
| function | `canApproveUser` | `app/modules/users/domain/user_management_rules.ts` | 32 |
| function | `canChangeUserRole` | `app/modules/users/domain/user_management_rules.ts` | 55 |
| function | `canDeactivateUser` | `app/modules/users/domain/user_management_rules.ts` | 79 |
| function | `canToggleAdminMode` | `app/modules/users/domain/user_management_rules.ts` | 97 |
| function | `canAccessSystemAdministration` | `app/modules/users/domain/user_management_rules.ts` | 101 |
| function | `canAccessAllowedSystemRoles` | `app/modules/users/domain/user_management_rules.ts` | 109 |
| function | `canAccessUserAdministrationQueue` | `app/modules/users/domain/user_management_rules.ts` | 131 |
| function | `canAccessSystemUsersList` | `app/modules/users/domain/user_management_rules.ts` | 146 |
| function | `validateSystemRole` | `app/modules/users/domain/user_management_rules.ts` | 156 |
| interface | `UserApprovalContext` | `app/modules/users/domain/user_types.ts` | 12 |
| interface | `UserRoleChangeContext` | `app/modules/users/domain/user_types.ts` | 22 |
| interface | `UserDeactivationContext` | `app/modules/users/domain/user_types.ts` | 34 |
| interface | `UserApprovedEvent` | `app/modules/users/events/user_events.ts` | 2 |
| interface | `UserDeactivatedEvent` | `app/modules/users/events/user_events.ts` | 8 |
| interface | `UserProfileUpdatedEvent` | `app/modules/users/events/user_events.ts` | 14 |
| interface | `UserLoginEvent` | `app/modules/users/events/user_events.ts` | 19 |
| interface | `UserLogoutEvent` | `app/modules/users/events/user_events.ts` | 26 |
| class | `UserInfraMapper` | `app/modules/users/infra/mapper/user_infra_mapper.ts` | 21 |
| class | `RecruiterBookmark` | `app/modules/users/infra/models/recruiter_bookmark.ts` | 12 |
| class | `User` | `app/modules/users/infra/models/user.ts` | 28 |
| class | `UserDomainExpertise` | `app/modules/users/infra/models/user_domain_expertise.ts` | 14 |
| class | `UserPerformanceStat` | `app/modules/users/infra/models/user_performance_stat.ts` | 14 |
| class | `UserProfileSnapshot` | `app/modules/users/infra/models/user_profile_snapshot.ts` | 14 |
| class | `UserSkill` | `app/modules/users/infra/models/user_skill.ts` | 18 |
| class | `UserWorkHistory` | `app/modules/users/infra/models/user_work_history.ts` | 14 |
| const | `findTaskAssignmentsForMetrics` | `app/modules/users/infra/repositories/read/analytics_queries.ts` | 13 |
| const | `findUserSkillsForAggregation` | `app/modules/users/infra/repositories/read/analytics_queries.ts` | 34 |
| const | `findTopReviewedSkills` | `app/modules/users/infra/repositories/read/analytics_queries.ts` | 51 |
| const | `findReviewForSkill` | `app/modules/users/infra/repositories/read/analytics_queries.ts` | 66 |
| const | `findTaskTitleById` | `app/modules/users/infra/repositories/read/analytics_queries.ts` | 100 |
| const | `findUserCreatedAt` | `app/modules/users/infra/repositories/read/analytics_queries.ts` | 110 |
| const | `findActiveOrFail` | `app/modules/users/infra/repositories/read/model_queries.ts` | 10 |
| const | `isActive` | `app/modules/users/infra/repositories/read/model_queries.ts` | 24 |
| const | `isFreelancer` | `app/modules/users/infra/repositories/read/model_queries.ts` | 36 |
| const | `isSuperadmin` | `app/modules/users/infra/repositories/read/model_queries.ts` | 45 |
| const | `findNotDeletedOrFail` | `app/modules/users/infra/repositories/read/model_queries.ts` | 54 |
| const | `findNotDeletedOrFailRecord` | `app/modules/users/infra/repositories/read/model_queries.ts` | 59 |
| const | `getSystemRoleName` | `app/modules/users/infra/repositories/read/model_queries.ts` | 67 |
| const | `isSystemAdmin` | `app/modules/users/infra/repositories/read/model_queries.ts` | 76 |
| const | `findByIds` | `app/modules/users/infra/repositories/read/model_queries.ts` | 86 |
| const | `findByOrganization` | `app/modules/users/infra/repositories/read/model_queries.ts` | 96 |
| const | `findById` | `app/modules/users/infra/repositories/read/model_queries.ts` | 109 |
| const | `findByEmail` | `app/modules/users/infra/repositories/read/model_queries.ts` | 119 |
| const | `findWithOrganizations` | `app/modules/users/infra/repositories/read/model_queries.ts` | 127 |
| const | `queryNotDeleted` | `app/modules/users/infra/repositories/read/model_queries.ts` | 135 |
| const | `findProfileWithRelations` | `app/modules/users/infra/repositories/read/model_queries.ts` | 142 |
| const | `findProfileWithRelationsRecord` | `app/modules/users/infra/repositories/read/model_queries.ts` | 159 |
| const | `paginateUsersList` | `app/modules/users/infra/repositories/read/model_queries.ts` | 168 |
| const | `isRecord` | `app/modules/users/infra/repositories/read/shared.ts` | 2 |
| const | `toNullableString` | `app/modules/users/infra/repositories/read/shared.ts` | 6 |
| const | `toNullableNumber` | `app/modules/users/infra/repositories/read/shared.ts` | 10 |
| const | `toNullableId` | `app/modules/users/infra/repositories/read/shared.ts` | 14 |
| interface | `TaskAssignmentMetricsRow` | `app/modules/users/infra/repositories/read/types.ts` | 2 |
| interface | `UserSkillAggregationRow` | `app/modules/users/infra/repositories/read/types.ts` | 14 |
| interface | `TopReviewedSkillRow` | `app/modules/users/infra/repositories/read/types.ts` | 23 |
| interface | `FeaturedSkillReviewRow` | `app/modules/users/infra/repositories/read/types.ts` | 31 |
| interface | `UserCreatedAtRow` | `app/modules/users/infra/repositories/read/types.ts` | 39 |
| const | `findByUser` | `app/modules/users/infra/repositories/read/user_domain_expertise_queries.ts` | 9 |
| const | `findLatestLifetimeByUser` | `app/modules/users/infra/repositories/read/user_performance_stat_queries.ts` | 9 |
| const | `findByUserAndPeriod` | `app/modules/users/infra/repositories/read/user_performance_stat_queries.ts` | 21 |
| const | `findCurrentByUser` | `app/modules/users/infra/repositories/read/user_profile_snapshot_queries.ts` | 10 |
| const | `listByUser` | `app/modules/users/infra/repositories/read/user_profile_snapshot_queries.ts` | 21 |
| const | `findPublicBySlugOrToken` | `app/modules/users/infra/repositories/read/user_profile_snapshot_queries.ts` | 29 |
| const | `slugExists` | `app/modules/users/infra/repositories/read/user_profile_snapshot_queries.ts` | 45 |
| const | `findOwnedById` | `app/modules/users/infra/repositories/read/user_profile_snapshot_queries.ts` | 59 |
| const | `findLatestByUser` | `app/modules/users/infra/repositories/read/user_profile_snapshot_queries.ts` | 67 |
| const | `countByUserSince` | `app/modules/users/infra/repositories/read/user_profile_snapshot_queries.ts` | 74 |
| const | `toRecord` | `app/modules/users/infra/repositories/read/user_skill_queries.ts` | 11 |
| const | `findOwnedById` | `app/modules/users/infra/repositories/read/user_skill_queries.ts` | 15 |
| const | `findOwnedByIdWithSkill` | `app/modules/users/infra/repositories/read/user_skill_queries.ts` | 23 |
| const | `findByUserAndSkill` | `app/modules/users/infra/repositories/read/user_skill_queries.ts` | 31 |
| const | `listByUserWithSkill` | `app/modules/users/infra/repositories/read/user_skill_queries.ts` | 39 |
| const | `listRecentByUser` | `app/modules/users/infra/repositories/read/user_work_history_queries.ts` | 9 |
| const | `findByUserAndAssignment` | `app/modules/users/infra/repositories/read/user_work_history_queries.ts` | 17 |
| const | `listByUser` | `app/modules/users/infra/repositories/read/user_work_history_queries.ts` | 28 |
| class | `UserAnalyticsRepository` | `app/modules/users/infra/repositories/user_analytics_repository.ts` | 5 |
| class | `UserDomainExpertiseRepository` | `app/modules/users/infra/repositories/user_domain_expertise_repository.ts` | 5 |
| class | `UserPerformanceStatRepository` | `app/modules/users/infra/repositories/user_performance_stat_repository.ts` | 5 |
| class | `UserProfileSnapshotRepository` | `app/modules/users/infra/repositories/user_profile_snapshot_repository.ts` | 5 |
| class | `UserRepositoryImpl` | `app/modules/users/infra/repositories/user_repository_impl.ts` | 17 |
| class | `UserSkillRepository` | `app/modules/users/infra/repositories/user_skill_repository.ts` | 7 |
| class | `UserWorkHistoryRepository` | `app/modules/users/infra/repositories/user_work_history_repository.ts` | 5 |
| const | `create` | `app/modules/users/infra/repositories/write/user_domain_expertise_mutations.ts` | 5 |
| const | `save` | `app/modules/users/infra/repositories/write/user_domain_expertise_mutations.ts` | 12 |
| const | `create` | `app/modules/users/infra/repositories/write/user_mutations.ts` | 11 |
| const | `createRecord` | `app/modules/users/infra/repositories/write/user_mutations.ts` | 18 |
| const | `save` | `app/modules/users/infra/repositories/write/user_mutations.ts` | 26 |
| const | `updateCurrentOrganization` | `app/modules/users/infra/repositories/write/user_mutations.ts` | 34 |
| const | `updateByIdRecord` | `app/modules/users/infra/repositories/write/user_mutations.ts` | 43 |
| const | `updateStatusRecord` | `app/modules/users/infra/repositories/write/user_mutations.ts` | 54 |
| const | `updateSystemRoleRecord` | `app/modules/users/infra/repositories/write/user_mutations.ts` | 62 |
| const | `mergeTrustData` | `app/modules/users/infra/repositories/write/user_mutations.ts` | 70 |
| const | `updateCredibilityData` | `app/modules/users/infra/repositories/write/user_mutations.ts` | 89 |
| const | `softDelete` | `app/modules/users/infra/repositories/write/user_mutations.ts` | 99 |
| const | `create` | `app/modules/users/infra/repositories/write/user_performance_stat_mutations.ts` | 5 |
| const | `save` | `app/modules/users/infra/repositories/write/user_performance_stat_mutations.ts` | 12 |
| const | `unsetCurrentByUser` | `app/modules/users/infra/repositories/write/user_profile_snapshot_mutations.ts` | 9 |
| const | `create` | `app/modules/users/infra/repositories/write/user_profile_snapshot_mutations.ts` | 18 |
| const | `save` | `app/modules/users/infra/repositories/write/user_profile_snapshot_mutations.ts` | 25 |
| const | `create` | `app/modules/users/infra/repositories/write/user_skill_mutations.ts` | 5 |
| const | `save` | `app/modules/users/infra/repositories/write/user_skill_mutations.ts` | 12 |
| const | `deleteUserSkill` | `app/modules/users/infra/repositories/write/user_skill_mutations.ts` | 23 |
| const | `create` | `app/modules/users/infra/repositories/write/user_work_history_mutations.ts` | 9 |
| const | `save` | `app/modules/users/infra/repositories/write/user_work_history_mutations.ts` | 16 |
| const | `deleteByUser` | `app/modules/users/infra/repositories/write/user_work_history_mutations.ts` | 27 |
| class | `UpdateUserProfileDTO` | `app/modules/users/public_contracts/update_user_profile_dto.ts` | 4 |
| interface | `UserAccountStatusV1` | `app/modules/users/public_contracts/user_account_status_v1.ts` | 1 |
| interface | `UserActorIdentityV1` | `app/modules/users/public_contracts/user_actor_identity_v1.ts` | 1 |
| interface | `UserProfileProjectionUpdatedV1` | `app/modules/users/public_contracts/user_events_v1.ts` | 1 |
| interface | `RefreshUserTrustScoreV1` | `app/modules/users/public_contracts/user_profile_projection_commands_v1.ts` | 1 |
| interface | `RefreshUserPerformanceScoreV1` | `app/modules/users/public_contracts/user_profile_projection_commands_v1.ts` | 7 |
| interface | `RefreshUserWorkHistoryV1` | `app/modules/users/public_contracts/user_profile_projection_commands_v1.ts` | 13 |
| interface | `UserPublicProfileV1` | `app/modules/users/public_contracts/user_public_profile_v1.ts` | 1 |
| interface | `UserProfileSettings` | `app/modules/users/types/user_profile_data.ts` | 1 |
| interface | `UserTrustData` | `app/modules/users/types/user_profile_data.ts` | 16 |
| interface | `UserCredibilityData` | `app/modules/users/types/user_profile_data.ts` | 33 |
| type | `SerializedDateTime` | `app/modules/users/types/user_records.ts` | 9 |
| interface | `DateTimeLike` | `app/modules/users/types/user_records.ts` | 10 |
| interface | `UserRecord` | `app/modules/users/types/user_records.ts` | 14 |
| interface | `UserSkillRecord` | `app/modules/users/types/user_records.ts` | 40 |
| interface | `UserProfileRecord` | `app/modules/users/types/user_records.ts` | 54 |
| interface | `UserProfileSnapshotRecord` | `app/modules/users/types/user_records.ts` | 59 |
| interface | `UserPerformanceStatRecord` | `app/modules/users/types/user_records.ts` | 70 |
| interface | `UserDomainExpertiseRecord` | `app/modules/users/types/user_records.ts` | 90 |
| interface | `UserWorkHistoryRecord` | `app/modules/users/types/user_records.ts` | 97 |
| const | `userIdRule` | `app/modules/users/validators/rules/database.ts` | 15 |
| const | `emailRule` | `app/modules/users/validators/rules/identity.ts` | 3 |
| const | `newEmailRule` | `app/modules/users/validators/rules/identity.ts` | 5 |
| const | `newUsernameRule` | `app/modules/users/validators/rules/identity.ts` | 12 |
| const | `createUserValidator` | `app/modules/users/validators/user.ts` | 6 |
| const | `updateUserValidator` | `app/modules/users/validators/user.ts` | 20 |
| const | `updateUserDetailValidator` | `app/modules/users/validators/user.ts` | 59 |
| const | `updateUserProfileValidator` | `app/modules/users/validators/user.ts` | 70 |
| const | `updateUserSettingValidator` | `app/modules/users/validators/user.ts` | 80 |

## Import Evidence

### `app/modules/users/actions/base_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { CommandHandler } from './interfaces.js'
import { Result } from './result.js'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
```

### `app/modules/users/actions/base_query.ts`

```ts
import type { QueryHandler } from './interfaces.js'
import { Result } from './result.js'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
```

### `app/modules/users/actions/commands/add_user_skill_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import { DefaultUserDependencies } from '../ports/user_external_dependencies_impl.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { del as deleteCacheKey } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
import type { AddUserSkillDTO } from '#modules/users/actions/dtos/request/user_skill_dtos'
import {
  buildUserProfileCacheKeys,
  buildUserSkillsCacheKeys,
} from '#modules/users/actions/support/user_query_cache_keys'
import * as userSkillQueries from '#modules/users/infra/repositories/read/user_skill_queries'
import * as userSkillMutations from '#modules/users/infra/repositories/write/user_skill_mutations'
import { ProficiencyLevel } from '#modules/users/public_contracts/user_constants'
import type { UserSkillRecord } from '#modules/users/types/user_records'
import { skillPublicApi } from '#modules/skills/actions/services/skill_public_api'
```

### `app/modules/users/actions/commands/approve_user_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import { BaseCommand } from '../base_command.js'
import type { ApproveUserDTO } from '../dtos/request/approve_user_dto.js'
import { DefaultUserDependencies } from '../ports/user_external_dependencies_impl.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { canApproveUser } from '#modules/users/public_contracts/user_management_rules'
```

### `app/modules/users/actions/commands/build_user_work_history_command.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { BaseCommand } from '#modules/users/actions/base_command'
import {
  buildKnowledgeArtifacts,
  calculateAverageScore,
  calculateWorkHistoryDeliveryTiming,
} from '#modules/users/domain/profile_aggregate_rules'
import * as workHistoryQueries from '#modules/users/infra/repositories/read/user_work_history_queries'
import UserAnalyticsRepository from '#modules/users/infra/repositories/user_analytics_repository'
import * as workHistoryMutations from '#modules/users/infra/repositories/write/user_work_history_mutations'
```

### `app/modules/users/actions/commands/change_user_role_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import { BaseCommand } from '../base_command.js'
import type { ChangeUserRoleDTO } from '../dtos/request/change_user_role_dto.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import * as userModelQueries from '#modules/users/infra/repositories/read/model_queries'
import * as userMutations from '#modules/users/infra/repositories/write/user_mutations'
import { canChangeUserRole } from '#modules/users/public_contracts/user_management_rules'
```

### `app/modules/users/actions/commands/create_recruiter_bookmark_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
```

### `app/modules/users/actions/commands/deactivate_user_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import { DefaultUserDependencies } from '../ports/user_external_dependencies_impl.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import * as userModelQueries from '#modules/users/infra/repositories/read/model_queries'
import * as userMutations from '#modules/users/infra/repositories/write/user_mutations'
import { UserStatusName } from '#modules/users/public_contracts/user_constants'
import { canDeactivateUser } from '#modules/users/public_contracts/user_management_rules'
import type { UserRecord } from '#modules/users/types/user_records'
```

### `app/modules/users/actions/commands/delete_recruiter_bookmark_command.ts`

```ts
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
```

### `app/modules/users/actions/commands/publish_user_profile_snapshot_command.ts`

```ts
import { randomBytes } from 'node:crypto'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import RefreshUserProfileAggregatesCommand from './refresh_user_profile_aggregates_command.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
import {
  buildProfileSnapshotSlug,
  pickTopFrequencyKeys,
} from '#modules/users/domain/profile_snapshot_rules'
import * as userModelQueries from '#modules/users/infra/repositories/read/model_queries'
import * as domainExpertiseQueries from '#modules/users/infra/repositories/read/user_domain_expertise_queries'
import * as performanceStatQueries from '#modules/users/infra/repositories/read/user_performance_stat_queries'
import * as profileSnapshotQueries from '#modules/users/infra/repositories/read/user_profile_snapshot_queries'
import * as userSkillQueries from '#modules/users/infra/repositories/read/user_skill_queries'
import * as workHistoryQueries from '#modules/users/infra/repositories/read/user_work_history_queries'
import * as profileSnapshotMutations from '#modules/users/infra/repositories/write/user_profile_snapshot_mutations'
import type {
  UserDomainExpertiseRecord,
  UserPerformanceStatRecord,
  UserProfileSnapshotRecord,
  UserRecord,
  UserSkillRecord,
  UserWorkHistoryRecord,
} from '#modules/users/types/user_records'
```

### `app/modules/users/actions/commands/refresh_user_profile_aggregates_command.ts`

```ts
import BuildUserWorkHistoryCommand from './build_user_work_history_command.js'
import UpsertUserDomainExpertiseCommand from './upsert_user_domain_expertise_command.js'
import UpsertUserPerformanceStatsCommand from './upsert_user_performance_stats_command.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { BaseCommand } from '#modules/users/actions/base_command'
```

### `app/modules/users/actions/commands/register_user_command.ts`

```ts
import { inject } from '@adonisjs/core'
import emitter from '@adonisjs/core/services/emitter'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { BaseCommand } from '../base_command.js'
import type { RegisterUserDTO } from '../dtos/request/register_user_dto.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import * as userMutations from '#modules/users/infra/repositories/write/user_mutations'
import { SystemRoleName } from '#modules/users/public_contracts/user_constants'
import type { UserRecord } from '#modules/users/types/user_records'
```

### `app/modules/users/actions/commands/remove_user_skill_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { del as deleteCacheKey } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
import type { RemoveUserSkillDTO } from '#modules/users/actions/dtos/request/user_skill_dtos'
import {
  buildUserProfileCacheKeys,
  buildUserSkillsCacheKeys,
} from '#modules/users/actions/support/user_query_cache_keys'
import * as userSkillQueries from '#modules/users/infra/repositories/read/user_skill_queries'
import * as userSkillMutations from '#modules/users/infra/repositories/write/user_skill_mutations'
```

### `app/modules/users/actions/commands/rotate_profile_snapshot_share_link_command.ts`

```ts
import { randomBytes } from 'node:crypto'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
import * as userModelQueries from '#modules/users/infra/repositories/read/model_queries'
import * as profileSnapshotQueries from '#modules/users/infra/repositories/read/user_profile_snapshot_queries'
import * as profileSnapshotMutations from '#modules/users/infra/repositories/write/user_profile_snapshot_mutations'
```

### `app/modules/users/actions/commands/update_profile_snapshot_access_command.ts`

```ts
import { randomBytes } from 'node:crypto'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
import * as userModelQueries from '#modules/users/infra/repositories/read/model_queries'
import * as profileSnapshotQueries from '#modules/users/infra/repositories/read/user_profile_snapshot_queries'
import * as profileSnapshotMutations from '#modules/users/infra/repositories/write/user_profile_snapshot_mutations'
```

### `app/modules/users/actions/commands/update_recruiter_bookmark_command.ts`

```ts
import type { RecruiterBookmarkRecord } from './create_recruiter_bookmark_command.js'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
```

### `app/modules/users/actions/commands/update_user_details_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import type { UpdateUserDetailsDTO } from '../dtos/request/update_user_details_dto.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
import * as userModelQueries from '#modules/users/infra/repositories/read/model_queries'
import * as userMutations from '#modules/users/infra/repositories/write/user_mutations'
import type { UserRecord } from '#modules/users/types/user_records'
```

### `app/modules/users/actions/commands/update_user_profile_command.ts`

```ts
import { inject } from '@adonisjs/core'
import emitter from '@adonisjs/core/services/emitter'
import { BaseCommand } from '../base_command.js'
import type { UpdateUserProfileDTO } from '../dtos/request/update_user_profile_dto.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import * as userModelQueries from '#modules/users/infra/repositories/read/model_queries'
import * as userMutations from '#modules/users/infra/repositories/write/user_mutations'
import type { UserRecord } from '#modules/users/types/user_records'
```

### `app/modules/users/actions/commands/update_user_skill_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { del as deleteCacheKey } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
import type { UpdateUserSkillDTO } from '#modules/users/actions/dtos/request/user_skill_dtos'
import {
  buildUserProfileCacheKeys,
  buildUserSkillsCacheKeys,
} from '#modules/users/actions/support/user_query_cache_keys'
import * as userSkillQueries from '#modules/users/infra/repositories/read/user_skill_queries'
import * as userSkillMutations from '#modules/users/infra/repositories/write/user_skill_mutations'
import { ProficiencyLevel } from '#modules/users/public_contracts/user_constants'
import type { UserSkillRecord } from '#modules/users/types/user_records'
import { skillPublicApi } from '#modules/skills/actions/services/skill_public_api'
```

### `app/modules/users/actions/commands/upsert_user_domain_expertise_command.ts`

```ts
import { DateTime } from 'luxon'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { BaseCommand } from '#modules/users/actions/base_command'
import { calculateDomainExpertiseMetrics } from '#modules/users/domain/profile_aggregate_rules'
import * as domainExpertiseQueries from '#modules/users/infra/repositories/read/user_domain_expertise_queries'
import UserAnalyticsRepository from '#modules/users/infra/repositories/user_analytics_repository'
import * as domainExpertiseMutations from '#modules/users/infra/repositories/write/user_domain_expertise_mutations'
```

### `app/modules/users/actions/commands/upsert_user_performance_stats_command.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { BaseCommand } from '#modules/users/actions/base_command'
import {
  calculatePerformanceAggregateMetrics,
  type PerformanceAggregateMetrics,
  type PerformanceAggregateRow,
  type SelfAssessmentAccuracyRow,
} from '#modules/users/domain/profile_aggregate_rules'
import * as userModelQueries from '#modules/users/infra/repositories/read/model_queries'
import * as performanceStatQueries from '#modules/users/infra/repositories/read/user_performance_stat_queries'
import UserAnalyticsRepository from '#modules/users/infra/repositories/user_analytics_repository'
import * as performanceStatMutations from '#modules/users/infra/repositories/write/user_performance_stat_mutations'
```

### `app/modules/users/actions/delete_user.ts`

```ts
import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import * as userModelQueries from '#modules/users/infra/repositories/read/model_queries'
import * as userMutations from '#modules/users/infra/repositories/write/user_mutations'
```

### `app/modules/users/actions/dtos/request/approve_user_dto.ts`

```ts
import type { Command } from '../../interfaces.js'
import ValidationException from '#modules/http/exceptions/validation_exception'
```

### `app/modules/users/actions/dtos/request/change_user_role_dto.ts`

```ts
import type { Command } from '../../interfaces.js'
import ValidationException from '#modules/http/exceptions/validation_exception'
import { SystemRoleName } from '#modules/users/public_contracts/user_constants'
```

### `app/modules/users/actions/dtos/request/get_user_detail_dto.ts`

```ts
import type { Query } from '../../interfaces.js'
import { UserIdDTO } from '#modules/users/application/dtos/common/user_action_dtos'
```

### `app/modules/users/actions/dtos/request/get_users_list_dto.ts`

```ts
import type { Query } from '../../interfaces.js'
import type { OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'
import type { UserPaginationDTO } from '#modules/users/application/dtos/common/user_action_dtos'
```

### `app/modules/users/actions/dtos/request/register_user_dto.ts`

```ts
import type { Command } from '../../interfaces.js'
import ValidationException from '#modules/http/exceptions/validation_exception'
```

### `app/modules/users/actions/dtos/request/update_user_details_dto.ts`

```ts
// no imports
```

### `app/modules/users/actions/dtos/request/update_user_profile_dto.ts`

```ts
// no imports
```

### `app/modules/users/actions/dtos/request/user_skill_dtos.ts`

```ts
// no imports
```

### `app/modules/users/actions/dtos/response/user_response_dtos.ts`

```ts
import type { UserEntity } from '#modules/users/domain/entities/user_entity'
import type { UserProfileSettings, UserTrustData, UserCredibilityData } from '#modules/users/types/user_profile_data'
```

### `app/modules/users/actions/get_user_metadata.ts`

```ts
import { SystemRoleName, UserStatusName } from '#modules/users/public_contracts/user_constants'
```

### `app/modules/users/actions/interfaces.ts`

```ts
// no imports
```

### `app/modules/users/actions/mapper/user_application_mapper.ts`

```ts
import type { RegisterUserDTO } from '../dtos/request/register_user_dto.js'
import type { UpdateUserDetailsDTO } from '../dtos/request/update_user_details_dto.js'
import type { UpdateUserProfileDTO } from '../dtos/request/update_user_profile_dto.js'
import {
  UserDetailResponseDTO,
  UserListItemResponseDTO,
  UserProfileResponseDTO,
  UserSummaryResponseDTO,
} from '../dtos/response/user_response_dtos.js'
import { type UserEntity } from '#modules/users/domain/entities/user_entity'
```

### `app/modules/users/actions/ports/user_external_dependencies.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DateTime } from 'luxon'
```

### `app/modules/users/actions/ports/user_external_dependencies_impl.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type {
  PendingApprovalUser,
  UserActiveSkillInfo,
  UserExternalDependencies,
  UserOrganizationMembershipInfo,
  UserOrganizationMembershipReaderWriter,
  UserPermissionReader,
  UserSkillDetail,
  UserSkillReader,
} from './user_external_dependencies.js'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import { skillPublicApi } from '#modules/skills/public_contracts/skill_public_api'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'
```

### `app/modules/users/actions/public_api.ts`

```ts
// no imports
```

### `app/modules/users/actions/queries/check_super_admin_permission_query.ts`

```ts
// no imports
```

### `app/modules/users/actions/queries/get_current_profile_snapshot_query.ts`

```ts
import { BaseQuery } from '#modules/users/actions/base_query'
import * as profileSnapshotQueries from '#modules/users/infra/repositories/read/user_profile_snapshot_queries'
import type { UserProfileSnapshotRecord } from '#modules/users/types/user_records'
```

### `app/modules/users/actions/queries/get_featured_reviews_query.ts`

```ts
import { BaseQuery } from '#modules/users/actions/base_query'
import * as userAnalyticsQueries from '#modules/users/infra/repositories/read/analytics_queries'
import type { TopReviewedSkillRow } from '#modules/users/infra/repositories/read/types'
```

### `app/modules/users/actions/queries/get_pending_approval_users_query.ts`

```ts
import { DefaultUserDependencies } from '../ports/user_external_dependencies_impl.js'
```

### `app/modules/users/actions/queries/get_profile_edit_page_query.ts`

```ts
import GetUserProfileQuery, { GetUserProfileDTO } from './get_user_profile_query.js'
import GetUserSkillsQuery, { GetUserSkillsDTO } from './get_user_skills_query.js'
import { skillPublicApi } from '#modules/skills/public_contracts/skill_public_api'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import { proficiencyLevelOptions, skillCategoryOptions } from '#modules/users/public_contracts/user_constants'
```

### `app/modules/users/actions/queries/get_profile_show_page_query.ts`

```ts
import GetCurrentProfileSnapshotQuery, {
  GetCurrentProfileSnapshotDTO,
} from './get_current_profile_snapshot_query.js'
import GetFeaturedReviewsQuery, { GetFeaturedReviewsDTO } from './get_featured_reviews_query.js'
import GetSpiderChartDataQuery, { GetSpiderChartDataDTO } from './get_spider_chart_data_query.js'
import GetUserDeliveryMetricsQuery, {
  GetUserDeliveryMetricsDTO,
} from './get_user_delivery_metrics_query.js'
import GetUserProfileQuery, { GetUserProfileDTO } from './get_user_profile_query.js'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
```

### `app/modules/users/actions/queries/get_profile_snapshot_history_query.ts`

```ts
import { BaseQuery } from '#modules/users/actions/base_query'
import * as profileSnapshotQueries from '#modules/users/infra/repositories/read/user_profile_snapshot_queries'
import type { UserProfileSnapshotRecord } from '#modules/users/types/user_records'
```

### `app/modules/users/actions/queries/get_profile_view_page_query.ts`

```ts
import GetFeaturedReviewsQuery, { GetFeaturedReviewsDTO } from './get_featured_reviews_query.js'
import GetSpiderChartDataQuery, { GetSpiderChartDataDTO } from './get_spider_chart_data_query.js'
import GetUserDeliveryMetricsQuery, {
  GetUserDeliveryMetricsDTO,
} from './get_user_delivery_metrics_query.js'
import GetUserProfileQuery, { GetUserProfileDTO } from './get_user_profile_query.js'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
```

### `app/modules/users/actions/queries/get_public_profile_snapshot_query.ts`

```ts
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseQuery } from '#modules/users/actions/base_query'
import * as profileSnapshotQueries from '#modules/users/infra/repositories/read/user_profile_snapshot_queries'
import type { UserProfileSnapshotRecord } from '#modules/users/types/user_records'
```

### `app/modules/users/actions/queries/get_spider_chart_data_query.ts`

```ts
import { DefaultUserDependencies } from '../ports/user_external_dependencies_impl.js'
import { BaseQuery } from '#modules/users/actions/base_query'
```

### `app/modules/users/actions/queries/get_talent_directory_page_query.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import SearchTalentsQuery, { type SearchTalentsDTO, type TalentSearchResult } from './search_talents_query.js'
import { BaseQuery } from '#modules/users/actions/base_query'
```

### `app/modules/users/actions/queries/get_user_delivery_metrics_query.ts`

```ts
import { BaseQuery } from '#modules/users/actions/base_query'
import {
  calculateDeliveryMetrics,
  calculateSkillAggregation,
  calculateYearsOfExperience,
  formatJoinedDate,
} from '#modules/users/domain/profile_metrics_rules'
import type {
  DeliveryMetricsResult,
  SkillAggregationResult,
  TaskAssignmentData,
  UserSkillData,
} from '#modules/users/domain/profile_metrics_types'
import * as userAnalyticsQueries from '#modules/users/infra/repositories/read/analytics_queries'
```

### `app/modules/users/actions/queries/get_user_detail_query.ts`

```ts
import { inject } from '@adonisjs/core'
import { BaseQuery } from '../base_query.js'
import type { GetUserDetailDTO } from '../dtos/request/get_user_detail_dto.js'
import * as userModelQueries from '#modules/users/infra/repositories/read/model_queries'
import type { UserRecord } from '#modules/users/types/user_records'
```

### `app/modules/users/actions/queries/get_user_profile_query.ts`

```ts
import { BaseQuery } from '#modules/users/actions/base_query'
import { calculateProfileCompleteness } from '#modules/users/actions/utils/profile_completeness'
import * as userModelQueries from '#modules/users/infra/repositories/read/model_queries'
import type { UserProfileRecord } from '#modules/users/types/user_records'
```

### `app/modules/users/actions/queries/get_user_skills_query.ts`

```ts
import { DefaultUserDependencies } from '../ports/user_external_dependencies_impl.js'
import { BaseQuery } from '#modules/users/actions/base_query'
import * as workHistoryQueries from '#modules/users/infra/repositories/read/user_work_history_queries'
```

### `app/modules/users/actions/queries/get_users_list_query.ts`

```ts
import { inject } from '@adonisjs/core'
import { BaseQuery } from '../base_query.js'
import type { GetUsersListDTO } from '../dtos/request/get_users_list_dto.js'
import { UserPaginatedResult } from '#modules/users/application/dtos/common/user_action_dtos'
import * as userModelQueries from '#modules/users/infra/repositories/read/model_queries'
import type { UserRecord } from '#modules/users/types/user_records'
```

### `app/modules/users/actions/queries/list_recruiter_bookmarks_workspace_query.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import { BaseQuery } from '#modules/users/actions/base_query'
```

### `app/modules/users/actions/queries/search_talents_query.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import { calculateApplicantMatch } from '../../../tasks/domain/match_formulas.js'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseQuery } from '#modules/users/actions/base_query'
```

### `app/modules/users/actions/result.ts`

```ts
// no imports
```

### `app/modules/users/actions/services/user_public_api.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import type { UpdateUserProfileDTO } from '../dtos/request/update_user_profile_dto.js'
import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import type { UserSettingData } from '#modules/settings/types/user_setting'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import * as userModelQueries from '#modules/users/infra/repositories/read/model_queries'
import * as performanceStatQueries from '#modules/users/infra/repositories/read/user_performance_stat_queries'
import * as userSkillQueries from '#modules/users/infra/repositories/read/user_skill_queries'
import UserRepository from '#modules/users/infra/repositories/user_repository'
import * as userMutations from '#modules/users/infra/repositories/write/user_mutations'
import * as performanceStatMutations from '#modules/users/infra/repositories/write/user_performance_stat_mutations'
import * as userSkillMutations from '#modules/users/infra/repositories/write/user_skill_mutations'
import { canToggleAdminMode as canToggleAdminModePolicy } from '#modules/users/public_contracts/user_management_rules'
import type { UserCredibilityData, UserTrustData } from '#modules/users/types/user_profile_data'
import type { UserRecord } from '#modules/users/types/user_records'
import { skillPublicApi } from '#modules/skills/actions/services/skill_public_api'
```

### `app/modules/users/actions/support/user_query_cache_keys.ts`

```ts
// no imports
```

### `app/modules/users/actions/user_action_context.ts`

```ts
// no imports
```

### `app/modules/users/actions/utils/profile_completeness.ts`

```ts
// no imports
```

### `app/modules/users/controllers/add_profile_skill_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildAddUserSkillDTO } from './mappers/request/user_request_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import AddUserSkillCommand from '#modules/users/actions/commands/add_user_skill_command'
```

### `app/modules/users/controllers/approve_user_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildApproveUserDTO } from './mappers/request/user_request_mapper.js'
import { mapSuccessMessageApiBody } from './mappers/response/user_response_mapper.js'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import ApproveUserCommand from '#modules/users/actions/commands/approve_user_command'
```

### `app/modules/users/controllers/create_user_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapUserMetadataPageProps } from './mappers/response/user_response_mapper.js'
import GetUserMetadata from '#modules/users/actions/get_user_metadata'
```

### `app/modules/users/controllers/delete_user_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildDeleteUserInput } from './mappers/request/user_request_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import DeleteUser from '#modules/users/actions/delete_user'
```

### `app/modules/users/controllers/edit_profile_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapProfileEditPageProps } from './mappers/response/user_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import GetProfileEditPageQuery from '#modules/users/actions/queries/get_profile_edit_page_query'
```

### `app/modules/users/controllers/edit_user_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildGetUserDetailDTO } from './mappers/request/user_request_mapper.js'
import { mapEditUserPageProps } from './mappers/response/user_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetUserMetadata from '#modules/users/actions/get_user_metadata'
import GetUserDetailQuery from '#modules/users/actions/queries/get_user_detail_query'
```

### `app/modules/users/controllers/get_current_profile_snapshot_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildGetCurrentProfileSnapshotDTO } from './mappers/request/user_request_mapper.js'
import { mapCurrentProfileSnapshotApiBody } from './mappers/response/user_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetCurrentProfileSnapshotQuery from '#modules/users/actions/queries/get_current_profile_snapshot_query'
```

### `app/modules/users/controllers/get_profile_snapshot_history_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildGetProfileSnapshotHistoryDTO } from './mappers/request/user_request_mapper.js'
import { mapProfileSnapshotHistoryApiBody } from './mappers/response/user_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetProfileSnapshotHistoryQuery from '#modules/users/actions/queries/get_profile_snapshot_history_query'
```

### `app/modules/users/controllers/get_public_profile_snapshot_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildGetPublicProfileSnapshotDTO } from './mappers/request/user_request_mapper.js'
import { mapPublicProfileSnapshotApiBody } from './mappers/response/user_response_mapper.js'
import { optionalActionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetPublicProfileSnapshotQuery from '#modules/users/actions/queries/get_public_profile_snapshot_query'
```

### `app/modules/users/controllers/list_users_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildUsersListDTO } from './mappers/request/user_request_mapper.js'
import { mapUsersIndexPageProps } from './mappers/response/user_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetUserMetadata from '#modules/users/actions/get_user_metadata'
import GetUsersListQuery from '#modules/users/actions/queries/get_users_list_query'
import { USER_PAGINATION as PAGINATION } from '#modules/users/application/dtos/common/user_pagination'
```

### `app/modules/users/controllers/mappers/request/shared.ts`

```ts
import { USER_PAGINATION as PAGINATION } from '#modules/users/application/dtos/common/user_pagination'
```

### `app/modules/users/controllers/mappers/request/user_request_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import {
  PAGINATION,
  toBoolean,
  toOptionalBoolean,
  toOptionalNullableString,
  toOptionalNumber,
  toOptionalString,
  toPositiveNumber,
} from './shared.js'
import { OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'
import { ApproveUserDTO } from '#modules/users/actions/dtos/request/approve_user_dto'
import { ChangeUserRoleDTO } from '#modules/users/actions/dtos/request/change_user_role_dto'
import { GetUserDetailDTO } from '#modules/users/actions/dtos/request/get_user_detail_dto'
import { GetUsersListDTO, UserFiltersDTO } from '#modules/users/actions/dtos/request/get_users_list_dto'
import { RegisterUserDTO } from '#modules/users/actions/dtos/request/register_user_dto'
import { UpdateUserDetailsDTO } from '#modules/users/actions/dtos/request/update_user_details_dto'
import { UpdateUserProfileDTO } from '#modules/users/actions/dtos/request/update_user_profile_dto'
import {
  AddUserSkillDTO,
  RemoveUserSkillDTO,
  UpdateUserSkillDTO,
} from '#modules/users/actions/dtos/request/user_skill_dtos'
import { GetCurrentProfileSnapshotDTO } from '#modules/users/actions/queries/get_current_profile_snapshot_query'
import { GetFeaturedReviewsDTO } from '#modules/users/actions/queries/get_featured_reviews_query'
import { GetProfileSnapshotHistoryDTO } from '#modules/users/actions/queries/get_profile_snapshot_history_query'
import { GetPublicProfileSnapshotDTO } from '#modules/users/actions/queries/get_public_profile_snapshot_query'
import { GetSpiderChartDataDTO } from '#modules/users/actions/queries/get_spider_chart_data_query'
import { GetUserDeliveryMetricsDTO } from '#modules/users/actions/queries/get_user_delivery_metrics_query'
import { GetUserProfileDTO } from '#modules/users/actions/queries/get_user_profile_query'
import { GetUserSkillsDTO } from '#modules/users/actions/queries/get_user_skills_query'
import { UserPaginationDTO } from '#modules/users/application/dtos/common/user_action_dtos'
import { UserStatusName } from '#modules/users/public_contracts/user_constants'
```

### `app/modules/users/controllers/mappers/response/shared.ts`

```ts
// no imports
```

### `app/modules/users/controllers/mappers/response/user_response_mapper.ts`

```ts
import type { ResponseRecord, SerializableResponseRecord } from './shared.js'
import {
  normalizePaginationMeta,
  sanitizePublicSnapshot,
  serializeCollectionForResponse,
  serializeForResponse,
  serializeNullableForResponse,
} from './shared.js'
```

### `app/modules/users/controllers/mappers/user_actor_context_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { UserActorContext } from '#modules/users/application/context/user_actor_context'
```

### `app/modules/users/controllers/pending_approval_count_api_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapPendingApprovalCountApiBody } from './mappers/response/user_response_mapper.js'
import { requireSystemUserAdminAccess } from '#modules/authorization/controllers/require_system_user_admin_access'
import GetPendingApprovalUsersQuery from '#modules/users/actions/queries/get_pending_approval_users_query'
```

### `app/modules/users/controllers/pending_approval_users_api_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapPendingApprovalUsersApiBody } from './mappers/response/user_response_mapper.js'
import { requireSystemUserAdminAccess } from '#modules/authorization/controllers/require_system_user_admin_access'
import GetPendingApprovalUsersQuery from '#modules/users/actions/queries/get_pending_approval_users_query'
```

### `app/modules/users/controllers/pending_approval_users_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildPendingApprovalUsersListDTO } from './mappers/request/user_request_mapper.js'
import { mapPendingApprovalUsersPageProps } from './mappers/response/user_response_mapper.js'
import { resolveSystemUserAdminAccess } from '#modules/authorization/controllers/require_system_user_admin_access'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetUserMetadata from '#modules/users/actions/get_user_metadata'
import GetUsersListQuery from '#modules/users/actions/queries/get_users_list_query'
```

### `app/modules/users/controllers/publish_profile_snapshot_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildPublishUserProfileSnapshotDTO } from './mappers/request/user_request_mapper.js'
import { mapSnapshotMutationApiBody } from './mappers/response/user_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import PublishUserProfileSnapshotCommand from '#modules/users/actions/commands/publish_user_profile_snapshot_command'
```

### `app/modules/users/controllers/recruiter_bookmarks_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import CreateRecruiterBookmarkCommand from '#modules/users/actions/commands/create_recruiter_bookmark_command'
import DeleteRecruiterBookmarkCommand from '#modules/users/actions/commands/delete_recruiter_bookmark_command'
import UpdateRecruiterBookmarkCommand from '#modules/users/actions/commands/update_recruiter_bookmark_command'
```

### `app/modules/users/controllers/recruiter_bookmarks_workspace_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ListRecruiterBookmarksWorkspaceQuery from '#modules/users/actions/queries/list_recruiter_bookmarks_workspace_query'
```

### `app/modules/users/controllers/remove_profile_skill_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildRemoveUserSkillDTO } from './mappers/request/user_request_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import RemoveUserSkillCommand from '#modules/users/actions/commands/remove_user_skill_command'
```

### `app/modules/users/controllers/rotate_profile_snapshot_share_link_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildRotateProfileSnapshotShareLinkDTO } from './mappers/request/user_request_mapper.js'
import { mapSnapshotMutationApiBody } from './mappers/response/user_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import RotateProfileSnapshotShareLinkCommand from '#modules/users/actions/commands/rotate_profile_snapshot_share_link_command'
```

### `app/modules/users/controllers/show_profile_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapProfileShowPageProps } from './mappers/response/user_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import GetProfileShowPageQuery from '#modules/users/actions/queries/get_profile_show_page_query'
```

### `app/modules/users/controllers/show_user_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildGetUserDetailDTO } from './mappers/request/user_request_mapper.js'
import { mapShowUserPageProps } from './mappers/response/user_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetUserDetailQuery from '#modules/users/actions/queries/get_user_detail_query'
```

### `app/modules/users/controllers/store_user_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildRegisterUserDTO } from './mappers/request/user_request_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import RegisterUserCommand from '#modules/users/actions/commands/register_user_command'
```

### `app/modules/users/controllers/system_users_api_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildSystemUsersListDTO } from './mappers/request/user_request_mapper.js'
import { mapSystemUsersApiBody } from './mappers/response/user_response_mapper.js'
import { requireSystemUserAdminAccess } from '#modules/authorization/controllers/require_system_user_admin_access'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetUsersListQuery from '#modules/users/actions/queries/get_users_list_query'
```

### `app/modules/users/controllers/talent_detail_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapProfileViewApiBody } from './mappers/response/user_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetProfileViewPageQuery from '#modules/users/actions/queries/get_profile_view_page_query'
```

### `app/modules/users/controllers/talent_directory_page_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetTalentDirectoryPageQuery from '#modules/users/actions/queries/get_talent_directory_page_query'
```

### `app/modules/users/controllers/talents_search_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import SearchTalentsQuery from '#modules/users/actions/queries/search_talents_query'
```

### `app/modules/users/controllers/update_profile_details_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildUpdateUserDetailsDTO } from './mappers/request/user_request_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UpdateUserDetailsCommand from '#modules/users/actions/commands/update_user_details_command'
```

### `app/modules/users/controllers/update_profile_skill_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildUpdateUserSkillDTO } from './mappers/request/user_request_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UpdateUserSkillCommand from '#modules/users/actions/commands/update_user_skill_command'
```

### `app/modules/users/controllers/update_profile_snapshot_access_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildUpdateProfileSnapshotAccessDTO } from './mappers/request/user_request_mapper.js'
import { mapSnapshotMutationApiBody } from './mappers/response/user_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UpdateProfileSnapshotAccessCommand from '#modules/users/actions/commands/update_profile_snapshot_access_command'
```

### `app/modules/users/controllers/update_user_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildUpdateUserProfileDTO } from './mappers/request/user_request_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UpdateUserProfileCommand from '#modules/users/actions/commands/update_user_profile_command'
```

### `app/modules/users/controllers/update_user_role_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildChangeUserRoleDTO } from './mappers/request/user_request_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import ChangeUserRoleCommand from '#modules/users/actions/commands/change_user_role_command'
```

### `app/modules/users/controllers/view_user_profile_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapProfileViewPageProps } from './mappers/response/user_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetProfileViewPageQuery from '#modules/users/actions/queries/get_profile_view_page_query'
```
## Code Snippets

### `start/routes/users.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { throttle } from '#start/limiter'

// Users — use-case controllers
const ListUsersController = () => import('#modules/users/controllers/list_users_controller')
const CreateUserController = () => import('#modules/users/controllers/create_user_controller')
const StoreUserController = () => import('#modules/users/controllers/store_user_controller')
const ShowUserController = () => import('#modules/users/controllers/show_user_controller')
const EditUserController = () => import('#modules/users/controllers/edit_user_controller')
const UpdateUserController = () => import('#modules/users/controllers/update_user_controller')
const DeleteUserController = () => import('#modules/users/controllers/delete_user_controller')
const ApproveUserController = () => import('#modules/users/controllers/approve_user_controller')
const UpdateUserRoleController = () =>
  import('#modules/users/controllers/update_user_role_controller')
const PendingApprovalUsersController = () =>
  import('#modules/users/controllers/pending_approval_users_controller')
const PendingApprovalUsersApiController = () =>
  import('#modules/users/controllers/pending_approval_users_api_controller')
const PendingApprovalCountApiController = () =>
  import('#modules/users/controllers/pending_approval_count_api_controller')
const SystemUsersApiController = () =>
  import('#modules/users/controllers/system_users_api_controller')
const TalentsSearchController = () =>
  import('#modules/users/controllers/talents_search_controller')
const TalentDetailController = () =>
  import('#modules/users/controllers/talent_detail_controller')
const TalentDirectoryPageController = () =>
  import('#modules/users/controllers/talent_directory_page_controller')
const RecruiterBookmarksWorkspaceController = () =>
  import('#modules/users/controllers/recruiter_bookmarks_workspace_controller')
const RecruiterBookmarksController = () =>
  import('#modules/users/controllers/recruiter_bookmarks_controller')

// Profile — use-case controllers
const ShowProfileController = () => import('#modules/users/controllers/show_profile_controller')
const EditProfileController = () => import('#modules/users/controllers/edit_profile_controller')
const UpdateProfileDetailsController = () =>
  import('#modules/users/controllers/update_profile_details_controller')
const AddProfileSkillController = () =>
  import('#modules/users/controllers/add_profile_skill_controller')
const UpdateProfileSkillController = () =>
  import('#modules/users/controllers/update_profile_skill_controller')
const RemoveProfileSkillController = () =>
  import('#modules/users/controllers/remove_profile_skill_controller')
const ViewUserProfileController = () =>
  import('#modules/users/controllers/view_user_profile_controller')
const PublishProfileSnapshotController = () =>
  import('#modules/users/controllers/publish_profile_snapshot_controller')
const GetPublicProfileSnapshotController = () =>
  import('#modules/users/controllers/get_public_profile_snapshot_controller')
const GetCurrentProfileSnapshotController = () =>
  import('#modules/users/controllers/get_current_profile_snapshot_controller')
const GetProfileSnapshotHistoryController = () =>
  import('#modules/users/controllers/get_profile_snapshot_history_controller')
const UpdateProfileSnapshotAccessController = () =>
  import('#modules/users/controllers/update_profile_snapshot_access_controller')
const RotateProfileSnapshotShareLinkController = () =>
  import('#modules/users/controllers/rotate_profile_snapshot_share_link_controller')

router
  .group(() => {
    // Users routes (use-case controllers)
    router.get('/users', [ListUsersController, 'handle']).as('users.index')
    router.get('/users/create', [CreateUserController, 'handle']).as('users.create')
    router
      .get('/users/pending-approval', [PendingApprovalUsersController, 'handle'])
      .as('users.pending_approval')
    router.post('/users', [StoreUserController, 'handle']).as('users.store')
    router.get('/users/:id', [ShowUserController, 'handle']).as('users.show')
    router.get('/users/:id/edit', [EditUserController, 'handle']).as('users.edit')
    router.put('/users/:id', [UpdateUserController, 'handle']).as('users.update')
    router.delete('/users/:id', [DeleteUserController, 'handle']).as('users.destroy')
    router.put('/users/:id/approve', [ApproveUserController, 'handle']).as('users.approve')
    router.put('/users/:id/role', [UpdateUserRoleController, 'handle']).as('users.update_role')

    router
      .get('/marketplace/talents', [TalentDirectoryPageController, 'handle'])
      .as('marketplace.talents')
    router
      .get('/marketplace/bookmarks', [RecruiterBookmarksWorkspaceController, 'handle'])
      .as('marketplace.bookmarks')

    // API routes
    router
      .get('/api/users/pending-approval', [PendingApprovalUsersApiController, 'handle'])
      .as('api.users.pending_approval')
    router
      .get('/api/users/pending-approval/count', [PendingApprovalCountApiController, 'handle'])
      .as('api.users.pending_approval_count')
    router
      .get('/api/system-users', [SystemUsersApiController, 'handle'])
      .as('api.users.system_users')
    router
      .get('/api/talents/search', [TalentsSearchController, 'handle'])
      .as('api.talents.search')
    router
      .get('/api/org/talents/search', [TalentsSearchController, 'handle'])
      .as('api.org.talents.search')
    router
      .get('/api/org/talents/:userId', [TalentDetailController, 'handle'])
      .as('api.org.talents.show')
    router
      .get('/api/recruiter-bookmarks', [RecruiterBookmarksController, 'index'])
      .as('api.recruiter_bookmarks.index')
    router
      .post('/api/recruiter-bookmarks', [RecruiterBookmarksController, 'store'])
      .as('api.recruiter_bookmarks.store')
    router
      .patch('/api/recruiter-bookmarks/:id', [RecruiterBookmarksController, 'update'])
      .as('api.recruiter_bookmarks.update')
    router
      .delete('/api/recruiter-bookmarks/:id', [RecruiterBookmarksController, 'destroy'])
      .as('api.recruiter_bookmarks.destroy')
    router
      .get('/api/recruiters/bookmarks', [RecruiterBookmarksController, 'index'])
      .as('api.recruiters.bookmarks.index')
    router
      .post('/api/recruiters/bookmarks', [RecruiterBookmarksController, 'store'])
      .as('api.recruiters.bookmarks.store')
    router
      .patch('/api/recruiters/bookmarks/:id', [RecruiterBookmarksController, 'update'])
      .as('api.recruiters.bookmarks.update')
    router
      .delete('/api/recruiters/bookmarks/:id', [RecruiterBookmarksController, 'destroy'])
      .as('api.recruiters.bookmarks.destroy')
    router
      .post('/api/org/talents/:userId/bookmarks', [RecruiterBookmarksController, 'store'])
      .as('api.org.talents.bookmarks.store')
    router
      .delete('/api/org/talents/:userId/bookmarks', [
        RecruiterBookmarksController,
        'destroyByTalent',
      ])
      .as('api.org.talents.bookmarks.destroy')

    // Profile routes (use-case controllers)
    router.get('/profile', [ShowProfileController, 'handle']).as('profile.show')
    router.get('/profile/edit', [EditProfileController, 'handle']).as('profile.edit')
    router
      .put('/profile/details', [UpdateProfileDetailsController, 'handle'])
      .as('profile.updateDetails')

    // Profile skills management
    router.post('/profile/skills', [AddProfileSkillController, 'handle']).as('profile.skills.add')
    router
      .put('/profile/skills/:id', [UpdateProfileSkillController, 'handle'])
      .as('profile.skills.update')
    router
      .delete('/profile/skills/:id', [RemoveProfileSkillController, 'handle'])
      .as('profile.skills.remove')

    // View other user's public profile
    router.get('/users/:id/profile', [ViewUserProfileController, 'handle']).as('profile.viewUser')

    // Profile snapshots
    router
      .post('/profile/snapshots/publish', [PublishProfileSnapshotController, 'handle'])
      .as('profile.snapshots.publish')
    router
      .post('/api/me/profile-snapshots', [PublishProfileSnapshotController, 'handle'])
      .as('api.me.profile_snapshots.publish')
    router
      .get('/profile/snapshots/current', [GetCurrentProfileSnapshotController, 'handle'])
      .as('profile.snapshots.current')
    router
      .get('/api/me/profile-snapshots/current', [GetCurrentProfileSnapshotController, 'handle'])
      .as('api.me.profile_snapshots.current')
    router
      .get('/profile/snapshots/history', [GetProfileSnapshotHistoryController, 'handle'])
      .as('profile.snapshots.history')
    router
      .get('/api/me/profile-snapshots', [GetProfileSnapshotHistoryController, 'handle'])
      .as('api.me.profile_snapshots.index')
    router
      .patch('/profile/snapshots/:id/access', [UpdateProfileSnapshotAccessController, 'handle'])
      .as('profile.snapshots.access')
    router
      .patch('/api/me/profile-snapshots/:id/access', [
        UpdateProfileSnapshotAccessController,
        'handle',
      ])
      .as('api.me.profile_snapshots.access')
    router
      .post('/profile/snapshots/:id/rotate-link', [
        RotateProfileSnapshotShareLinkController,
        'handle',
      ])
      .as('profile.snapshots.rotate_link')
    router
      .post('/api/me/profile-snapshots/:id/rotate-link', [
        RotateProfileSnapshotShareLinkController,
        'handle',
      ])
      .as('api.me.profile_snapshots.rotate_link')

    // @deprecated - Settings moved to settings controller
    router
      .put('/profile/settings', ({ response, session }: HttpContext) => {
        session.flash('info', 'This feature has been moved to the settings page')
        response.redirect().toRoute('settings.index')
      })
      .as('profile.update_settings')
  })
  .use([middleware.auth(), middleware.requireOrg(), throttle])

// Public snapshot route (no auth required)
router
  .get('/profiles/:slug', [GetPublicProfileSnapshotController, 'handle'])
  .as('profile.snapshot.public')

```

### `app/modules/users/actions/commands/add_user_skill_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'

import { DefaultUserDependencies } from '../ports/user_external_dependencies_impl.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { del as deleteCacheKey } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
import type { AddUserSkillDTO } from '#modules/users/actions/dtos/request/user_skill_dtos'
import {
  buildUserProfileCacheKeys,
  buildUserSkillsCacheKeys,
} from '#modules/users/actions/support/user_query_cache_keys'
import * as userSkillQueries from '#modules/users/infra/repositories/read/user_skill_queries'
import * as userSkillMutations from '#modules/users/infra/repositories/write/user_skill_mutations'
import { ProficiencyLevel } from '#modules/users/public_contracts/user_constants'
import type { UserSkillRecord } from '#modules/users/types/user_records'
import { skillPublicApi } from '#modules/skills/actions/services/skill_public_api'

/**
 * Command to add a skill to user's profile
 * Creates a UserSkill record with initial proficiency level
 * Source mặc định = 'imported' (self-declared bởi user)
 */
export default class AddUserSkillCommand extends BaseCommand<
  AddUserSkillDTO,
  UserSkillRecord
> {
  async handle(dto: AddUserSkillDTO): Promise<UserSkillRecord> {
    const result = await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // Verify skill exists and is active
      const skill = await DefaultUserDependencies.skill.findActiveSkillById(dto.skill_id, trx)

      if (!skill) {
        throw new BusinessLogicException('Skill không tồn tại hoặc đã bị vô hiệu hóa')
      }

      // v3: Validate proficiency level code against enum
      const validLevels = Object.values(ProficiencyLevel) as string[]
      if (!validLevels.includes(dto.level_code)) {
        throw new BusinessLogicException(`Mức độ thành thạo không hợp lệ: ${dto.level_code}`)
      }

      // Check if user already has this skill
      const existing = await userSkillQueries.findByUserAndSkill(userId, dto.skill_id, trx)

      if (existing) {
        throw new ConflictException('User already has this skill')
      }

      const activeScale = await skillPublicApi.proficiencyScale.getActiveScaleWithLevels(trx)
      const matchedLevel = activeScale?.levels.find((level) => level.code === dto.level_code)
      const proficiencyLevelId = matchedLevel ? matchedLevel.id : null

      // Create user skill (v3: level_code instead of proficiency_level_id)
      // v3.1: source = 'imported' (self-declared, có thể update bởi user)
      const userSkill = await userSkillMutations.create(
        {
          user_id: userId,
          skill_id: dto.skill_id,
          level_code: dto.level_code,
          proficiency_level_id: proficiencyLevelId,
          total_reviews: 0,
          avg_score: null,
          source: 'imported' as const,
        },
        trx
      )

      // Log audit
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'add_skill',
          entity_type: 'user_skill',
          entity_id: userSkill.id,
          old_values: null,
          new_values: {
            skill_id: dto.skill_id,
            skill_name: skill.skill_name,
            level_code: dto.level_code,
            source: 'imported',
          },
        })
      }

      return {
        userSkill: userSkillQueries.toRecord(userSkill),
        cacheKeys: [
          ...buildUserProfileCacheKeys(userId),
          ...buildUserSkillsCacheKeys(userId, [skill.category_code]),
        ],
        skillScoreUpdatedEvent: {
          userId,
          skillId: dto.skill_id,
          oldScore: null,
          newScore: 0,
        },
      }
    })

    for (const cacheKey of result.cacheKeys) {
      await deleteCacheKey(cacheKey)
    }
    void emitter.emit('skill:score:updated', result.skillScoreUpdatedEvent)

    return result.userSkill
  }
}

```

### `app/modules/users/actions/commands/approve_user_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'

import { BaseCommand } from '../base_command.js'
import type { ApproveUserDTO } from '../dtos/request/approve_user_dto.js'
import { DefaultUserDependencies } from '../ports/user_external_dependencies_impl.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { canApproveUser } from '#modules/users/public_contracts/user_management_rules'

/**
 * ApproveUserCommand
 *
 * Approves a pending user in an organization.
 * Changes user status from 'pending' to 'approved' in organization_users table.
 *
 * This is a Command (Write operation) that changes system state.
 *
 * Business Rules:
 * - Org owner or org admin (has 'can_approve_members' permission) can approve users
 * - System superadmin can approve users
 * - User must be in 'pending' status
 * - Audit log is created
 */
export default class ApproveUserCommand extends BaseCommand<ApproveUserDTO> {
  /**
   * Main handler - approves a user in organization
   */
  async handle(dto: ApproveUserDTO): Promise<void> {
    const result = await this.executeInTransaction(async (trx) => {
      // 1-2. Verify permission and status via pure rule
      const hasPermission = await DefaultUserDependencies.permission.checkOrgPermission(
        dto.approverId,
        dto.organizationId,
        'can_approve_members',
        trx
      )
      const membership = await DefaultUserDependencies.organizationMembership.findMembershipStatus(
        dto.userId,
        dto.organizationId,
        trx
      )

      enforcePolicy(
        canApproveUser({
          hasApprovePermission: hasPermission,
          targetMembershipStatus: membership?.status ?? null,
        })
      )

      // 3. Update user status to approved
      await DefaultUserDependencies.organizationMembership.approveMembership(
        dto.userId,
        dto.organizationId,
        trx
      )

      // 4. Log the approval
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'approve',
          entity_type: 'user',
          entity_id: dto.userId,
          old_values: undefined,
          new_values: {
            organization_id: dto.organizationId,
            approved_by: dto.approverId,
          },
        })
      }

      // Return event data for post-commit emission
      return {
        userApprovedEvent: {
          userId: dto.userId,
          approvedBy: dto.approverId,
          organizationId: dto.organizationId,
        },
      }
    })

    // Side-effects are post-commit to avoid firing on rollback.
    void emitter.emit('user:approved', result.userApprovedEvent)
  }
}

```

### `app/modules/users/actions/commands/build_user_work_history_command.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { BaseCommand } from '#modules/users/actions/base_command'
import {
  buildKnowledgeArtifacts,
  calculateAverageScore,
  calculateWorkHistoryDeliveryTiming,
} from '#modules/users/domain/profile_aggregate_rules'
import * as workHistoryQueries from '#modules/users/infra/repositories/read/user_work_history_queries'
import UserAnalyticsRepository from '#modules/users/infra/repositories/user_analytics_repository'
import * as workHistoryMutations from '#modules/users/infra/repositories/write/user_work_history_mutations'

export interface BuildUserWorkHistoryDTO {
  userId: string
  fullRebuild?: boolean
}

export interface BuildUserWorkHistoryResult {
  userId: string
  totalCompletedAssignments: number
  inserted: number
  updated: number
}

interface AssignmentSnapshotRow {
  task_assignment_id: string
  task_id: string
  organization_id: string | null
  project_id: string | null
  task_title: string
  task_type: string | null
  business_domain: string | null
  problem_category: string | null
  role_in_task: string | null
  autonomy_level: string | null
  collaboration_type: string | null
  tech_stack: unknown
  domain_tags: unknown
  difficulty: string | null
  estimated_time: number | string | null
  actual_time: number | string | null
  assignment_estimated_hours: number | string | null
  assignment_actual_hours: number | string | null
  due_date: Date | string | null
  completed_at: Date | string | null
  measurable_outcomes: unknown
  impact_scope: string | null
}

interface CompletedReviewSessionRow {
  id: string
  overall_quality_score: number | null
}

interface SkillReviewSummaryRow {
  skill_id: string
  skill_name: string | null
  assigned_level_code: string
  reviewer_type: string
  comment: string | null
}

interface ReviewEvidenceSummaryRow {
  id: string
  evidence_type: string
  url: string | null
  title: string | null
}

interface SelfAssessmentNarrativeRow {
  what_went_well: string | null
  what_would_do_different: string | null
}

interface AssignmentAnalytics {
  completedAt: DateTime | null
  overallQualityScore: number | null
  skillScores: Record<string, unknown>[]
  evidenceLinks: Record<string, unknown>[]
  knowledgeArtifacts: Record<string, unknown>[]
}

interface WorkHistoryPayload {
  task_id: string
  task_assignment_id: string
  organization_id: string | null
  project_id: string | null
  task_title: string
  task_type: string | null
  business_domain: string | null
  problem_category: string | null
  role_in_task: string | null
  autonomy_level: string | null
  collaboration_type: string | null
  tech_stack: string[]
  domain_tags: string[]
  difficulty: string | null
  estimated_hours: number | null
  actual_hours: number | null
  was_on_time: boolean | null
  days_early_or_late: number | null
  measurable_outcomes: Record<string, unknown>[]
  estimated_business_value: string | null
  knowledge_artifacts: Record<string, unknown>[]
  overall_quality_score: number | null
  skill_scores: Record<string, unknown>[]
  evidence_links: Record<string, unknown>[]
  completed_at: DateTime | null
  is_featured: boolean
  is_public: boolean
}

interface MaterializedWorkHistoryBatch {
  inserted: number
  updated: number
}

export default class BuildUserWorkHistoryCommand extends BaseCommand<
  BuildUserWorkHistoryDTO,
  BuildUserWorkHistoryResult
> {
  async handle(dto: BuildUserWorkHistoryDTO): Promise<BuildUserWorkHistoryResult> {
    return await this.executeInTransaction(async (trx) => {
      const assignmentRows = await this.loadAssignmentSnapshots(dto.userId, trx)

      if (dto.fullRebuild) {
        await this.deleteExistingWorkHistory(dto.userId, trx)
      }

      const materialized = await this.materializeWorkHistory(dto.userId, assignmentRows, trx)

      await this.auditBuildSummary(
        dto.userId,
        dto.fullRebuild ?? false,
        assignmentRows.length,
        materialized.inserted,
        materialized.updated
      )

      return {
        userId: dto.userId,
        totalCompletedAssignments: assignmentRows.length,
        inserted: materialized.inserted,
        updated: materialized.updated,
      }
    })
  }

  private toDateTime(value: Date | string | null): DateTime | null {
    if (!value) return null

    if (value instanceof Date) {
      return DateTime.fromJSDate(value)
    }

    const parsed = DateTime.fromISO(value)
    return parsed.isValid ? parsed : null
  }

  private toNumber(value: number | string | null): number | null {
    if (value === null) return null
    const converted = Number(value)
    return Number.isFinite(converted) ? converted : null
  }

  private toStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string')
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown
        return Array.isArray(parsed)
          ? parsed.filter((item): item is string => typeof item === 'string')
          : []
      } catch {
        return []
      }
    }

    return []
  }

  private toObjectArray(value: unknown): Record<string, unknown>[] {
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is Record<string, unknown> => typeof item === 'object' && item !== null
      )
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown
        return Array.isArray(parsed)
          ? parsed.filter(
              (item): item is Record<string, unknown> => typeof item === 'object' && item !== null
            )
          : []
      } catch {
        return []
      }
    }

    return []
  }

  private async loadAssignmentSnapshots(
    userId: string,
    trx: TransactionClientContract
  ): Promise<AssignmentSnapshotRow[]> {
    return (await UserAnalyticsRepository.listCompletedAssignmentSnapshots(
      userId,
      trx
    )) as AssignmentSnapshotRow[]
  }

  private async deleteExistingWorkHistory(
    userId: string,
    trx: TransactionClientContract
  ): Promise<void> {
    await workHistoryMutations.deleteByUser(userId, trx)
  }

  private async loadAssignmentAnalytics(
    userId: string,
    assignment: AssignmentSnapshotRow,
    trx: TransactionClientContract
  ): Promise<AssignmentAnalytics> {
    const completedAt = this.toDateTime(assignment.completed_at)
    const reviewSessions = (await UserAnalyticsRepository.listCompletedReviewSessionsForAssignment(
      assignment.task_assignment_id,
      userId,
      trx
    )) as CompletedReviewSessionRow[]

    const sessionIds = reviewSessions.map((session) => session.id)
    const qualityValues = reviewSessions
      .map((session) => session.overall_quality_score)
      .filter((value): value is number => typeof value === 'number')

    const overallQualityScore = calculateAverageScore(qualityValues)

    const skillScores =
      sessionIds.length > 0
        ? (
            (await UserAnalyticsRepository.listSkillReviewSummariesBySessionIds(
              sessionIds,
              trx
            )) as SkillReviewSummaryRow[]
          ).map((item) => ({
            skill_id: item.skill_id,
            skill_name: item.skill_name,
            assigned_level_code: item.assigned_level_code,
            reviewer_type: item.reviewer_type,
            comment: item.comment,
          }))
        : []

    const evidenceLinks =
      sessionIds.length > 0
        ? (
            (await UserAnalyticsRepository.listReviewEvidenceSummariesBySessionIds(
              sessionIds,
              trx
            )) as ReviewEvidenceSummaryRow[]
          ).map((item) => ({
            evidence_id: item.id,
            evidence_type: item.evidence_type,
            url: item.url,
            title: item.title,
          }))
        : []

    const selfAssessment = (await UserAnalyticsRepository.findSelfAssessmentNarrative(
      assignment.task_assignment_id,
      userId,
      trx
    )) as SelfAssessmentNarrativeRow | undefined

    return {
      completedAt,
      overallQualityScore,
      skillScores,
      evidenceLinks,
      knowledgeArtifacts: buildKnowledgeArtifacts({
        whatWentWell: selfAssessment?.what_went_well ?? null,
        whatWouldDoDifferent: selfAssessment?.what_would_do_different ?? null,
      }),
    }
  }

  private buildWorkHistoryPayload(
    assignment: AssignmentSnapshotRow,
    analytics: AssignmentAnalytics
  ): WorkHistoryPayload {
    const dueDate = this.toDateTime(assignment.due_date)
    const { wasOnTime, daysEarlyOrLate } = calculateWorkHistoryDeliveryTiming({
      dueDate: dueDate?.toJSDate() ?? null,
      completedAt: analytics.completedAt?.toJSDate() ?? null,
    })

    return {
      task_id: assignment.task_id,
      task_assignment_id: assignment.task_assignment_id,
      organization_id: assignment.organization_id,
      project_id: assignment.project_id,
      task_title: assignment.task_title,
      task_type: assignment.task_type,
      business_domain: assignment.business_domain,
      problem_category: assignment.problem_category,
      role_in_task: assignment.role_in_task,
      autonomy_level: assignment.autonomy_level,
      collaboration_type: assignment.collaboration_type,
      tech_stack: this.toStringArray(assignment.tech_stack),
      domain_tags: this.toStringArray(assignment.domain_tags),
      difficulty: assignment.difficulty,
      estimated_hours:
        this.toNumber(assignment.assignment_estimated_hours) ??
        this.toNumber(assignment.estimated_time),
      actual_hours:
        this.toNumber(assignment.assignment_actual_hours) ?? this.toNumber(assignment.actual_time),
      was_on_time: wasOnTime,
      days_early_or_late: daysEarlyOrLate,
      measurable_outcomes: this.toObjectArray(assignment.measurable_outcomes),
      estimated_business_value: assignment.impact_scope,
      knowledge_artifacts: analytics.knowledgeArtifacts,
      overall_quality_score: analytics.overallQualityScore,
      skill_scores: analytics.skillScores,
      evidence_links: analytics.evidenceLinks,
      completed_at: analytics.completedAt,
      is_featured: false,
      is_public: false,
    }
  }

  private async upsertWorkHistoryRow(
    userId: string,
    payload: WorkHistoryPayload,
    trx: TransactionClientContract
  ): Promise<'inserted' | 'updated'> {
    const existing = await workHistoryQueries.findByUserAndAssignment(
      userId,
      payload.task_assignment_id,
      trx
    )

    if (existing) {
      existing.merge(payload)
      await workHistoryMutations.save(existing, trx)
      return 'updated'
    }

    await workHistoryMutations.create(
      {
        user_id: userId,
        ...payload,
      },
      trx
    )
    return 'inserted'
  }

  private async materializeWorkHistory(
    userId: string,
    assignmentRows: AssignmentSnapshotRow[],
    trx: TransactionClientContract
  ): Promise<MaterializedWorkHistoryBatch> {
    let inserted = 0
    let updated = 0

    for (const assignment of assignmentRows) {
      const analytics = await this.loadAssignmentAnalytics(userId, assignment, trx)
      const payload = this.buildWorkHistoryPayload(assignment, analytics)
      const outcome = await this.upsertWorkHistoryRow(userId, payload, trx)

      if (outcome === 'inserted') {
        inserted += 1
      } else {
        updated += 1
      }
    }

    return { inserted, updated }
  }

  private async auditBuildSummary(
    userId: string,
    fullRebuild: boolean,
    totalCompletedAssignments: number,
    inserted: number,
    updated: number
  ): Promise<void> {
    if (this.execCtx.userId) {
      await auditPublicApi.write(this.execCtx, {
        user_id: this.execCtx.userId,
        action: 'build_user_work_history',
        entity_type: 'user_work_history',
        entity_id: userId,
        old_values: null,
        new_values: {
          full_rebuild: fullRebuild,
          total_completed_assignments: totalCompletedAssignments,
          inserted,
          updated,
        },
      })
    }
  }
}

```

### `app/modules/users/actions/commands/change_user_role_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'

import { BaseCommand } from '../base_command.js'
import type { ChangeUserRoleDTO } from '../dtos/request/change_user_role_dto.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import * as userModelQueries from '#modules/users/infra/repositories/read/model_queries'
import * as userMutations from '#modules/users/infra/repositories/write/user_mutations'
import { canChangeUserRole } from '#modules/users/public_contracts/user_management_rules'

/**
 * ChangeUserRoleCommand (v3)
 *
 * Changes a user's system role.
 * v3: system_role is inline VARCHAR on users table.
 * newRoleId in DTO is now a role name string (e.g. 'superadmin', 'system_admin').
 *
 * Business Rules:
 * - Only superadmin can change roles
 * - Cannot change own role
 * - Target user must exist and not be deleted
 */
export default class ChangeUserRoleCommand extends BaseCommand<ChangeUserRoleDTO> {
  async handle(dto: ChangeUserRoleDTO): Promise<void> {
    // Verify permissions via pure rule
    const isSuperadmin = await userModelQueries.isSuperadmin(dto.changerId)
    enforcePolicy(
      canChangeUserRole({
        actorId: dto.changerId,
        targetUserId: dto.targetUserId,
        isActorSuperadmin: isSuperadmin,
        newRole: dto.newRoleId,
      })
    )

    // Verify target user exists and not deleted
    const targetUser = await userModelQueries.findNotDeletedOrFailRecord(dto.targetUserId)

    // Get old role for audit log
    const oldRole = targetUser.system_role

    // v3: Update inline system_role string
    await userMutations.updateSystemRoleRecord(dto.targetUserId, dto.newRoleId)

    // Log the action
    if (this.execCtx.userId) {
      await auditPublicApi.write(this.execCtx, {
        user_id: this.execCtx.userId,
        action: 'change_user_role',
        entity_type: 'user',
        entity_id: dto.targetUserId,
        old_values: { system_role: oldRole },
        new_values: { system_role: dto.newRoleId },
      })
    }

    // Emit audit event
    void emitter.emit('audit:log', {
      userId: dto.changerId,
      action: 'change_user_role',
      entityType: 'user',
      entityId: dto.targetUserId,
      oldValues: { system_role: oldRole },
      newValues: { system_role: dto.newRoleId },
    })

    // Invalidate permission cache
    void emitter.emit('cache:invalidate', {
      entityType: 'user',
      entityId: dto.targetUserId,
      patterns: [`*user:${dto.targetUserId}:*`],
    })
  }
}

```

### `app/modules/users/actions/commands/deactivate_user_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import { DefaultUserDependencies } from '../ports/user_external_dependencies_impl.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import * as userModelQueries from '#modules/users/infra/repositories/read/model_queries'
import * as userMutations from '#modules/users/infra/repositories/write/user_mutations'
import { UserStatusName } from '#modules/users/public_contracts/user_constants'
import { canDeactivateUser } from '#modules/users/public_contracts/user_management_rules'
import type { UserRecord } from '#modules/users/types/user_records'

/**
 * DTO for deactivating a user
 */
export interface DeactivateUserDTO {
  user_id: string
  reason?: string
}

/**
 * Command: Deactivate User
 *
 * Migrate từ stored procedure: deactivate_user
 *
 * Business rules:
 * - Chỉ superadmin mới có thể deactivate users
 * - Không thể deactivate chính mình
 * - Set user.status_id = 2 (inactive)
 * - Gửi notification cho user
 */
export default class DeactivateUserCommand {
  constructor(
    protected execCtx: UserActionContext,
    private createNotification: NotificationCreator
  ) {}

  async execute(dto: DeactivateUserDTO): Promise<UserRecord> {
    const adminUserId = this.execCtx.userId
    if (!adminUserId) {
      throw new UnauthorizedException()
    }
    const trx = await db.transaction()

    try {
      // 1-2. Check permissions via pure rule
      const isSuperadmin = await DefaultUserDependencies.permission.isSystemSuperadmin(
        adminUserId,
        trx
      )
      enforcePolicy(
        canDeactivateUser({
          actorId: adminUserId,
          targetUserId: dto.user_id,
          isActorSuperadmin: isSuperadmin,
        })
      )

      const user = await userModelQueries.findNotDeletedOrFailRecord(dto.user_id, trx)

      // Save old status
      const oldStatus = user.status

      // 4. Update user status to inactive
      const updatedUser = await userMutations.updateStatusRecord(
        dto.user_id,
        UserStatusName.INACTIVE,
        trx
      )

      // 5. Create audit log
      await auditPublicApi.log(
        {
          user_id: adminUserId,
          action: 'deactivate_user',
          entity_type: 'users',
          entity_id: dto.user_id,
          old_values: { status: oldStatus },
          new_values: { status: UserStatusName.INACTIVE, reason: dto.reason },
        },
        this.execCtx
      )

      await trx.commit()

      // Emit domain event
      void emitter.emit('user:deactivated', {
        userId: dto.user_id,
        deactivatedBy: adminUserId,
        reason: dto.reason,
      })

      // 6. Send notification
      await this.sendNotification(dto.user_id, dto.reason)

      return updatedUser
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private async sendNotification(userId: string, reason?: string): Promise<void> {
    try {
      await this.createNotification.handle({
        user_id: userId,
        title: 'Tài khoản đã bị vô hiệu hóa',
        message: `Tài khoản của bạn đã bị vô hiệu hóa. Lý do: ${reason ?? 'Không có lý do cụ thể'}`,
        type: BACKEND_NOTIFICATION_TYPES.ACCOUNT_DEACTIVATED,
        related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.USER,
        related_entity_id: userId,
      })
    } catch (error) {
      loggerService.error('[DeactivateUserCommand] Failed to send notification:', error)
    }
  }
}

```

### `app/modules/users/actions/commands/publish_user_profile_snapshot_command.ts`

```ts
import { randomBytes } from 'node:crypto'

import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import RefreshUserProfileAggregatesCommand from './refresh_user_profile_aggregates_command.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
import {
  buildProfileSnapshotSlug,
  pickTopFrequencyKeys,
} from '#modules/users/domain/profile_snapshot_rules'
import * as userModelQueries from '#modules/users/infra/repositories/read/model_queries'
import * as domainExpertiseQueries from '#modules/users/infra/repositories/read/user_domain_expertise_queries'
import * as performanceStatQueries from '#modules/users/infra/repositories/read/user_performance_stat_queries'
import * as profileSnapshotQueries from '#modules/users/infra/repositories/read/user_profile_snapshot_queries'
import * as userSkillQueries from '#modules/users/infra/repositories/read/user_skill_queries'
import * as workHistoryQueries from '#modules/users/infra/repositories/read/user_work_history_queries'
import * as profileSnapshotMutations from '#modules/users/infra/repositories/write/user_profile_snapshot_mutations'
import type {
  UserDomainExpertiseRecord,
  UserPerformanceStatRecord,
  UserProfileSnapshotRecord,
  UserRecord,
  UserSkillRecord,
  UserWorkHistoryRecord,
} from '#modules/users/types/user_records'

export interface PublishUserProfileSnapshotDTO {
  snapshotName?: string
  isPublic?: boolean
  expiresInDays?: number | null
}

export interface PublishUserProfileSnapshotResult {
  snapshotId: string
  version: number
  shareableSlug: string | null
  shareableToken: string | null
  isPublic: boolean
}

interface LoadedSnapshotReadModel {
  user: UserRecord
  skills: UserSkillRecord[]
  performanceStatsRow: UserPerformanceStatRecord | null
  domainExpertiseRow: UserDomainExpertiseRecord | null
  latestHighlights: UserWorkHistoryRecord[]
}

interface LoadedSnapshotInputs {
  lastSnapshot: UserProfileSnapshotRecord | null
  readModel: LoadedSnapshotReadModel
}

interface BuiltSnapshotContent {
  nextVersion: number
  isPublic: boolean
  shareableSlug: string | null
  shareableToken: string | null
  summary: SnapshotSummary
  performanceMetrics: SnapshotPerformanceMetrics
  trustMetrics: SnapshotTrustMetrics
  verifiedSkills: SnapshotVerifiedSkill[]
  workHighlights: SnapshotWorkHighlight[]
}

interface PersistedUserProfileSnapshot {
  snapshot: UserProfileSnapshotRecord
  content: BuiltSnapshotContent
}

interface SnapshotSummary extends Record<string, unknown> {
  user_id: string
  username: string
  total_verified_skills: number
  total_tasks_completed: number
  trust_score: number
  trust_tier: string | null
  performance_score: number
  generated_at: string | null
}

interface SnapshotPerformanceMetrics extends Record<string, unknown> {
  period_start: string | null
  period_end: string | null
  total_tasks_completed: number
  total_hours_worked: number
  avg_quality_score: number | null
  on_time_delivery_rate: number | null
  avg_days_early_or_late: number | null
  performance_score: number | null
  tasks_by_type: Record<string, number>
  tasks_by_domain: Record<string, number>
  tasks_by_difficulty: Record<string, number>
  tasks_as_lead: number
  tasks_as_sole_contributor: number
  tasks_mentoring_others: number
  longest_on_time_streak: number
  current_on_time_streak: number
  self_assessment_accuracy: number | null
  trust_data: unknown
}

interface SnapshotDomainExpertiseSummary extends Record<string, unknown> {
  tech_stack_frequency: Record<string, number>
  domain_frequency: Record<string, number>
  problem_category_frequency: Record<string, number>
  top_skills: Record<string, unknown>[]
}

interface SnapshotTrustMetrics extends Record<string, unknown> {
  trust_data: unknown
  domain_expertise: SnapshotDomainExpertiseSummary
  tech_stack: string[]
}

interface SnapshotVerifiedSkill extends Record<string, unknown> {
  skill_id: string
  skill_name: string
  level_code: string
  total_reviews: number
  avg_percentage: number | null
  avg_score: number | null
  last_reviewed_at: string | null
}

interface SnapshotWorkHighlight extends Record<string, unknown> {
  task_assignment_id: string
  task_id: string
  task_title: string
  task_type: string | null
  business_domain: string | null
  problem_category: string | null
  role_in_task: string | null
  collaboration_type: string | null
  difficulty: string | null
  overall_quality_score: number | null
  was_on_time: boolean | null
  completed_at: string | null
}

type VerifiedSkillSource = UserSkillRecord & {
  skill: {
    skill_name: string
    category_code: string
  }
}

/**
 * Rate limit: max 3 snapshots per user per 24 hours
 */
const SNAPSHOT_RATE_LIMIT_MAX = 3
const SNAPSHOT_RATE_LIMIT_WINDOW_HOURS = 24

export default class PublishUserProfileSnapshotCommand extends BaseCommand<
  PublishUserProfileSnapshotDTO,
  PublishUserProfileSnapshotResult
> {
  async handle(dto: PublishUserProfileSnapshotDTO): Promise<PublishUserProfileSnapshotResult> {
    const userId = this.getCurrentUserId()

    // Guard: user phải active và không suspended
    const user = await userModelQueries.findNotDeletedOrFailRecord(userId)
    if (user.status === 'suspended') {
      throw new BusinessLogicException('Tài khoản bị suspended không thể publish profile snapshot')
    }
    const userIsActive = await userModelQueries.isActive(userId)
    if (!userIsActive) {
      throw new BusinessLogicException('Tài khoản không active nên không thể publish profile snapshot')
    }

    // Guard: rate limit - max 3 snapshots per 24 hours
    await this.enforceRateLimit(userId)

    await this.refreshAggregates(userId)
    const readModel = await this.loadSnapshotReadModel(userId)

    return await this.executeInTransaction(async (trx) => {
      const inputs: LoadedSnapshotInputs = {
        lastSnapshot: await this.loadLastSnapshot(userId, trx),
        readModel,
      }
      const content = this.buildSnapshotContent(userId, dto, inputs)
      const persisted = await this.persistSnapshot(userId, dto, readModel.user, content, trx)
      this.registerPostCommitCacheInvalidation(trx, userId, persisted.content.shareableSlug)
      return this.toResult(persisted)
    })
  }

  /**
   * Rate limit: kiểm tra số lượng snapshot trong 24h qua
   */
  private async enforceRateLimit(userId: string): Promise<void> {
    const since = DateTime.now().minus({ hours: SNAPSHOT_RATE_LIMIT_WINDOW_HOURS })
    const recentCount = await profileSnapshotQueries.countByUserSince(userId, since)
    if (recentCount >= SNAPSHOT_RATE_LIMIT_MAX) {
      throw new BusinessLogicException(
        `Đã vượt quá giới hạn publish snapshot (${SNAPSHOT_RATE_LIMIT_MAX} lần/${SNAPSHOT_RATE_LIMIT_WINDOW_HOURS}h). Vui lòng thử lại sau.`
      )
    }
  }

  private async refreshAggregates(userId: string): Promise<void> {
    await new RefreshUserProfileAggregatesCommand(this.execCtx).handle({
      userId,
      fullRebuild: false,
    })
  }

  private async loadSnapshotReadModel(userId: string): Promise<LoadedSnapshotReadModel> {
    const user = await userModelQueries.findNotDeletedOrFailRecord(userId)
    const skills = await userSkillQueries.listByUserWithSkill(userId)
    const performanceStatsRow = await performanceStatQueries.findLatestLifetimeByUser(userId)
    const domainExpertiseRow = await domainExpertiseQueries.findByUser(userId)
    const latestHighlights = await workHistoryQueries.listRecentByUser(userId, 6)

    return {
      user,
      skills,
      performanceStatsRow,
      domainExpertiseRow,
      latestHighlights,
    }
  }

  private async loadLastSnapshot(
    userId: string,
    trx: TransactionClientContract
  ): Promise<UserProfileSnapshotRecord | null> {
    return profileSnapshotQueries.findLatestByUser(userId, trx)
  }

  private buildSnapshotContent(
    userId: string,
    dto: PublishUserProfileSnapshotDTO,
    inputs: LoadedSnapshotInputs
  ): BuiltSnapshotContent {
    const nextVersion = (inputs.lastSnapshot?.version ?? 0) + 1
    const verifiedSkills = this.buildVerifiedSkills(inputs.readModel.skills)
    const performanceMetrics = this.buildPerformanceMetrics(
      inputs.readModel.user,
      inputs.readModel.performanceStatsRow
    )
    const domainExpertiseSummary = this.buildDomainExpertiseSummary(
      inputs.readModel.domainExpertiseRow
    )
    const workHighlights = this.buildWorkHighlights(inputs.readModel.latestHighlights)
    const isPublic = dto.isPublic ?? true

    return {
      nextVersion,
      isPublic,
      shareableSlug: isPublic
        ? buildProfileSnapshotSlug({
            username: inputs.readModel.user.username,
            userId,
            version: nextVersion,
            suffix: Date.now().toString(36),
          })
        : null,
      shareableToken: isPublic ? randomBytes(16).toString('hex') : null,
      summary: this.buildSummary(
        userId,
        inputs.readModel.user,
        verifiedSkills.length,
        inputs,
        workHighlights
      ),
      performanceMetrics,
      trustMetrics: this.buildTrustMetrics(inputs.readModel.user, domainExpertiseSummary),
      verifiedSkills,
      workHighlights,
    }
  }

  private buildVerifiedSkills(skills: LoadedSnapshotReadModel['skills']): SnapshotVerifiedSkill[] {
    return skills
      .filter((skill): skill is VerifiedSkillSource => skill.total_reviews > 0 && !!skill.skill)
      .map((skill) => ({
        skill_id: skill.skill_id,
        skill_name: skill.skill.skill_name,
        level_code: skill.level_code,
        total_reviews: skill.total_reviews,
        avg_percentage: skill.avg_percentage,
        avg_score: skill.avg_score,
        last_reviewed_at: skill.last_reviewed_at?.toISO() ?? null,
      }))
  }

  private buildSummary(
    userId: string,
    user: UserRecord,
    totalVerifiedSkills: number,
    inputs: LoadedSnapshotInputs,
    workHighlights: SnapshotWorkHighlight[]
  ): SnapshotSummary {
    return {
      user_id: userId,
      username: user.username,
      total_verified_skills: totalVerifiedSkills,
      total_tasks_completed:
        inputs.readModel.performanceStatsRow?.total_tasks_completed ?? workHighlights.length,
      trust_score: user.trust_data?.calculated_score ?? 0,
      trust_tier: user.trust_data?.current_tier_code ?? null,
      performance_score:
        inputs.readModel.performanceStatsRow?.performance_score ??
        user.trust_data?.performance_score ??
        0,
      generated_at: DateTime.now().toISO(),
    }
  }

  private buildPerformanceMetrics(
    user: UserRecord,
    performanceStatsRow: LoadedSnapshotReadModel['performanceStatsRow']
  ): SnapshotPerformanceMetrics {
    return {
      period_start: performanceStatsRow?.period_start?.toISO() ?? null,
      period_end: performanceStatsRow?.period_end?.toISO() ?? null,
      total_tasks_completed: performanceStatsRow?.total_tasks_completed ?? 0,
      total_hours_worked: performanceStatsRow?.total_hours_worked ?? 0,
      avg_quality_score: performanceStatsRow?.avg_quality_score ?? null,
      on_time_delivery_rate: performanceStatsRow?.on_time_delivery_rate ?? null,
      avg_days_early_or_late: performanceStatsRow?.avg_days_early_or_late ?? null,
      performance_score:
        performanceStatsRow?.performance_score ?? user.trust_data?.performance_score ?? null,
      tasks_by_type: performanceStatsRow?.tasks_by_type ?? {},
      tasks_by_domain: performanceStatsRow?.tasks_by_domain ?? {},
      tasks_by_difficulty: performanceStatsRow?.tasks_by_difficulty ?? {},
      tasks_as_lead: performanceStatsRow?.tasks_as_lead ?? 0,
      tasks_as_sole_contributor: performanceStatsRow?.tasks_as_sole_contributor ?? 0,
      tasks_mentoring_others: performanceStatsRow?.tasks_mentoring_others ?? 0,
      longest_on_time_streak: performanceStatsRow?.longest_on_time_streak ?? 0,
      current_on_time_streak: performanceStatsRow?.current_on_time_streak ?? 0,
      self_assessment_accuracy: performanceStatsRow?.self_assessment_accuracy ?? null,
      trust_data: user.trust_data ?? null,
    }
  }

  private buildDomainExpertiseSummary(
    domainExpertiseRow: LoadedSnapshotReadModel['domainExpertiseRow']
  ): SnapshotDomainExpertiseSummary {
    return {
      tech_stack_frequency: domainExpertiseRow?.tech_stack_frequency ?? {},
      domain_frequency: domainExpertiseRow?.domain_frequency ?? {},
      problem_category_frequency: domainExpertiseRow?.problem_category_frequency ?? {},
      top_skills: domainExpertiseRow?.top_skills ?? [],
    }
  }

  private buildTrustMetrics(
    user: UserRecord,
    domainExpertiseSummary: SnapshotDomainExpertiseSummary
  ): SnapshotTrustMetrics {
    return {
      trust_data: user.trust_data ?? null,
      domain_expertise: domainExpertiseSummary,
      tech_stack: pickTopFrequencyKeys(domainExpertiseSummary.tech_stack_frequency, 10),
    }
  }

  private buildWorkHighlights(
    latestHighlights: LoadedSnapshotReadModel['latestHighlights']
  ): SnapshotWorkHighlight[] {
    return latestHighlights.map((item) => ({
      task_assignment_id: item.task_assignment_id,
      task_id: item.task_id,
      task_title: item.task_title,
      task_type: item.task_type,
      business_domain: item.business_domain,
      problem_category: item.problem_category,
      role_in_task: item.role_in_task,
      collaboration_type: item.collaboration_type,
      difficulty: item.difficulty,
      overall_quality_score: item.overall_quality_score,
      was_on_time: item.was_on_time,
      completed_at: item.completed_at?.toISO() ?? null,
    }))
  }

  private async persistSnapshot(
    userId: string,
    dto: PublishUserProfileSnapshotDTO,
    user: UserRecord,
    content: BuiltSnapshotContent,
    trx: TransactionClientContract
  ): Promise<PersistedUserProfileSnapshot> {
    await profileSnapshotMutations.unsetCurrentByUser(userId, trx)

    const snapshot = await profileSnapshotMutations.create(
      {
        user_id: userId,
        version: content.nextVersion,
        snapshot_name: dto.snapshotName?.trim() ?? null,
        is_current: true,
        is_public: content.isPublic,
        shareable_slug: content.shareableSlug,
        shareable_token: content.shareableToken,
        summary: content.summary,
        skills_verified: content.verifiedSkills,
        work_highlights: content.workHighlights,
        performance_metrics: content.performanceMetrics,
        trust_metrics: content.trustMetrics,
        scoring_version: user.trust_data?.scoring_version ?? 'v1',
      },
      trx
    )

    if (this.execCtx.userId) {
      await auditPublicApi.write(this.execCtx, {
        user_id: this.execCtx.userId,
        action: 'publish_profile_snapshot',
        entity_type: 'user_profile_snapshot',
        entity_id: snapshot.id,
        old_values: null,
        new_values: {
          snapshot_id: snapshot.id,
          version: content.nextVersion,
          is_public: content.isPublic,
          shareable_slug: content.shareableSlug,
        },
      })
    }

    return {
      snapshot,
      content,
    }
  }

  private registerPostCommitCacheInvalidation(
    trx: TransactionClientContract,
    userId: string,
    shareableSlug: string | null
  ): void {
    void trx.on('commit', () => {
      void cacheStore.deleteByPattern(`*profile:snapshot:current*${userId}*`)
      void cacheStore.deleteByPattern(`*profile:snapshot:history*${userId}*`)

      if (shareableSlug) {
        void cacheStore.deleteByPattern(`*profile:snapshot:public*${shareableSlug}*`)
      }
    })
  }

  private toResult(persisted: PersistedUserProfileSnapshot): PublishUserProfileSnapshotResult {
    return {
      snapshotId: persisted.snapshot.id,
      version: persisted.content.nextVersion,
      shareableSlug: persisted.content.shareableSlug,
      shareableToken: persisted.content.shareableToken,
      isPublic: persisted.content.isPublic,
    }
  }
}

```

### `app/modules/users/actions/commands/refresh_user_profile_aggregates_command.ts`

```ts
import BuildUserWorkHistoryCommand from './build_user_work_history_command.js'
import UpsertUserDomainExpertiseCommand from './upsert_user_domain_expertise_command.js'
import UpsertUserPerformanceStatsCommand from './upsert_user_performance_stats_command.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { BaseCommand } from '#modules/users/actions/base_command'

export interface RefreshUserProfileAggregatesDTO {
  userId: string
  fullRebuild?: boolean
  periodStart?: string | null
  periodEnd?: string | null
}

export interface RefreshUserProfileAggregatesResult {
  userId: string
  workHistory: {
    totalCompletedAssignments: number
    inserted: number
    updated: number
  }
  performance: {
    statsId: string
    totalTasksCompleted: number
    performanceScore: number | null
  }
  domainExpertise: {
    expertiseId: string
    topSkillsCount: number
  }
}

export default class RefreshUserProfileAggregatesCommand extends BaseCommand<
  RefreshUserProfileAggregatesDTO,
  RefreshUserProfileAggregatesResult
> {
  async handle(dto: RefreshUserProfileAggregatesDTO): Promise<RefreshUserProfileAggregatesResult> {
    const workHistoryResult = await new BuildUserWorkHistoryCommand(this.execCtx).handle({
      userId: dto.userId,
      fullRebuild: dto.fullRebuild ?? false,
    })

    const performanceResult = await new UpsertUserPerformanceStatsCommand(this.execCtx).handle({
      userId: dto.userId,
      periodStart: dto.periodStart ?? null,
      periodEnd: dto.periodEnd ?? null,
    })

    const domainExpertiseResult = await new UpsertUserDomainExpertiseCommand(this.execCtx).handle({
      userId: dto.userId,
    })

    if (this.execCtx.userId) {
      await auditPublicApi.write(this.execCtx, {
        user_id: this.execCtx.userId,
        action: 'refresh_user_profile_aggregates',
        entity_type: 'user',
        entity_id: dto.userId,
        old_values: null,
        new_values: {
          full_rebuild: dto.fullRebuild ?? false,
          work_history_total: workHistoryResult.totalCompletedAssignments,
          performance_score: performanceResult.performanceScore,
          top_skills_count: domainExpertiseResult.topSkillsCount,
        },
      })
    }

    return {
      userId: dto.userId,
      workHistory: {
        totalCompletedAssignments: workHistoryResult.totalCompletedAssignments,
        inserted: workHistoryResult.inserted,
        updated: workHistoryResult.updated,
      },
      performance: {
        statsId: performanceResult.statsId,
        totalTasksCompleted: performanceResult.totalTasksCompleted,
        performanceScore: performanceResult.performanceScore,
      },
      domainExpertise: {
        expertiseId: domainExpertiseResult.expertiseId,
        topSkillsCount: domainExpertiseResult.topSkillsCount,
      },
    }
  }
}

```

### `app/modules/users/actions/commands/register_user_command.ts`

```ts
import { inject } from '@adonisjs/core'
import emitter from '@adonisjs/core/services/emitter'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { BaseCommand } from '../base_command.js'
import type { RegisterUserDTO } from '../dtos/request/register_user_dto.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import * as userMutations from '#modules/users/infra/repositories/write/user_mutations'
import { SystemRoleName } from '#modules/users/public_contracts/user_constants'
import type { UserRecord } from '#modules/users/types/user_records'

/**
 * RegisterUserCommand
 *
 * Registers a new user in the system.
 *
 * This is a Command (Write operation) that changes system state.
 * Follows the User Intent: "Register a new user" (not just "Create User")
 *
 * @example
 * ```typescript
 * const dto = new RegisterUserDTO('johndoe', 'john@example.com', 2, 1)
 * const user = await registerUserCommand.handle(dto)
 * ```
 */
@inject()
export default class RegisterUserCommand extends BaseCommand<RegisterUserDTO, UserRecord> {
  /**
   * Main handler - creates user account
   * Uses transaction to ensure data consistency
   */
  async handle(dto: RegisterUserDTO): Promise<UserRecord> {
    const result = await this.executeInTransaction(async (trx) => {
      // Create user account
      const user = await this.createUserAccount(dto, trx)

      // Log audit trail
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'create',
          entity_type: 'user',
          entity_id: user.id,
          old_values: undefined,
          new_values: user,
        })
      }

      return {
        user,
        auditEvent: {
          userId: user.id,
          action: 'create',
          entityType: 'user',
          entityId: user.id,
          newValues: { username: dto.username, email: dto.email },
        },
      }
    })

    void emitter.emit('audit:log', result.auditEvent)

    return result.user
  }

  /**
   * Private subtask: Create user account
   */
  private async createUserAccount(
    dto: RegisterUserDTO,
    trx: TransactionClientContract
  ): Promise<UserRecord> {
    return await userMutations.createRecord(
      {
        username: dto.username,
        email: dto.email,
        system_role: dto.roleId || SystemRoleName.REGISTERED_USER,
        status: dto.statusId,
      },
      trx
    )
  }
}

```

### `app/modules/users/actions/commands/remove_user_skill_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { del as deleteCacheKey } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
import type { RemoveUserSkillDTO } from '#modules/users/actions/dtos/request/user_skill_dtos'
import {
  buildUserProfileCacheKeys,
  buildUserSkillsCacheKeys,
} from '#modules/users/actions/support/user_query_cache_keys'
import * as userSkillQueries from '#modules/users/infra/repositories/read/user_skill_queries'
import * as userSkillMutations from '#modules/users/infra/repositories/write/user_skill_mutations'

/**
 * Command to remove a skill from user's profile
 */
export default class RemoveUserSkillCommand extends BaseCommand<RemoveUserSkillDTO> {
  async handle(dto: RemoveUserSkillDTO): Promise<void> {
    const result = await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // Find and verify ownership of the user skill
      const userSkill = await userSkillQueries.findOwnedByIdWithSkill(
        dto.user_skill_id,
        userId,
        trx
      )

      if (!userSkill) {
        throw new BusinessLogicException('User skill không tồn tại')
      }

      const skillInfo = {
        skill_id: userSkill.skill_id,
        skill_name: userSkill.skill.skill_name,
        level_code: userSkill.level_code,
      }

      // Delete the user skill
      await userSkillMutations.delete(userSkill, trx)

      // Log audit
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'remove_skill',
          entity_type: 'user_skill',
          entity_id: dto.user_skill_id,
          old_values: skillInfo,
          new_values: null,
        })
      }

      return {
        cacheKeys: [
          ...buildUserProfileCacheKeys(userId),
          ...buildUserSkillsCacheKeys(userId, [userSkill.skill.category_code]),
        ],
        skillScoreUpdatedEvent: {
          userId,
          skillId: userSkill.skill_id,
          oldScore: null,
          newScore: 0,
        },
      }
    })

    for (const cacheKey of result.cacheKeys) {
      await deleteCacheKey(cacheKey)
    }
    void emitter.emit('skill:score:updated', result.skillScoreUpdatedEvent)
  }
}

```
