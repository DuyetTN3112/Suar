# tasks Backend Module

### Kiến trúc lõi & Phân tích nghiệp vụ
- **Task Workflow**: Dựa trên cấu trúc trạng thái động `task_status_id` (trỏ tới bảng `task_statuses`). Cột `status` cũ trong bảng `tasks` được coi là legacy và chỉ dùng để duy trì tương thích ngược.
- **Required Skills**: Mỗi task quy định kĩ năng tối thiểu (`minimum_required_level`) và mức trần đánh giá (`assessment_ceiling_level`). Thông tin này được snapshot lại theo phiên bản khi task bắt đầu (`task_requirement_versions`).
- **Task Submission & Evidence**: Giao nộp kết quả công việc qua submission package (`task_submissions` và `task_submission_evidences`), cho phép tải lên URL bằng chứng thực tế và khóa lại (`locked`) để ngăn chặn chỉnh sửa sau khi nộp.

## Module Path

```text
app/modules/tasks
```

## Folder And File Inventory

```text
./ README.md index.ts
actions/ base_command.ts base_query.ts interfaces.ts public_api.ts result.ts task_action_context.ts
actions/bootstrap/ org_task_bootstrap.ts
actions/commands/ add_task_submission_evidence_command.ts apply_for_task_command.ts assign_task_command.ts batch_update_task_status_command.ts create_task_assignment_snapshot_command.ts create_task_attachment_command.ts create_task_command.ts create_task_comment_command.ts create_task_status_command.ts delete_task_attachment_command.ts delete_task_command.ts delete_task_comment_command.ts delete_task_status_command.ts delete_task_submission_evidence_command.ts patch_task_status_board_poc_command.ts process_application_command.ts revoke_task_access_command.ts seed_default_task_statuses.ts submit_task_submission_command.ts task_completion_package_access.ts update_task_command.ts update_task_sort_order_command.ts update_task_status_command.ts update_task_status_definition_command.ts update_task_time_command.ts update_workflow_command.ts withdraw_application_command.ts
actions/dtos/request/ assign_task_dto.ts create_task_dto.ts create_task_dto_state_builder.ts delete_task_dto.ts get_task_detail_dto.ts get_tasks_list_dto.ts task_application_dtos.ts task_status_dtos.ts update_task_dto.ts update_task_dto_payload_builder.ts update_task_status_dto.ts update_task_time_dto.ts
actions/dtos/response/ task_response_dtos.ts
actions/listeners/ task_completion_listener.ts
actions/mapper/ task_application_mapper.ts task_query_output_mapper.ts
actions/ports/ task_assignment_command_repository_port.ts task_cache_port.ts task_command_repository_port.ts task_external_dependencies.ts task_public_api_repository_port.ts task_public_api_repository_port_impl.ts task_query_repository_port.ts task_status_query_repository_port.ts
actions/queries/ check_task_create_permission_query.ts get_application_match_score_query.ts get_my_applications_query.ts get_public_tasks_query.ts get_task_applications_query.ts get_task_applications_ranking_query.ts get_task_audit_logs_query.ts get_task_create_page_query.ts get_task_detail_query.ts get_task_edit_page_query.ts get_task_metadata_query.ts get_task_projects_query.ts get_task_statistics_query.ts get_task_status_board_page_query.ts get_tasks_grouped_query.ts get_tasks_index_page_query.ts get_tasks_list_query.ts get_tasks_page_query.ts get_tasks_timeline_query.ts get_user_tasks_query.ts list_task_statuses_query.ts list_workflow_query.ts
actions/services/ task_public_api.ts task_requirement_version_service.ts task_skill_requirement_service.ts
actions/support/ task_create_payload_builder.ts task_create_persistence_support.ts task_create_post_commit.ts task_create_preconditions.ts task_permission_context_builder.ts task_permission_filter_builder.ts task_required_skill_persistence.ts task_version_snapshot.ts update_task_persistence_support.ts update_task_post_commit_support.ts
application/context/ task_actor_context.ts
application/dtos/common/ task_pagination.ts
application/events/ .gitkeep
application/ports/ task_actor_lookup.ts task_event_publisher.ts task_organization_membership.ts task_project_access.ts task_review_session_creator.ts
bootstrap/adapters/ monolith_task_org_reader.ts monolith_task_permission_reader.ts monolith_task_project_reader.ts monolith_task_review_reader.ts monolith_task_skill_reader.ts monolith_task_user_reader.ts
bootstrap/ task_action_factory.ts task_composition_root.ts
constants/ task_constants.ts
controllers/ apply_for_task_api_controller.ts apply_for_task_controller.ts batch_update_task_status_controller.ts check_create_permission_controller.ts create_task_controller.ts create_task_status_controller.ts delete_task_controller.ts delete_task_status_controller.ts edit_task_controller.ts get_task_audit_logs_controller.ts list_public_tasks_api_controller.ts list_public_tasks_controller.ts list_task_applications_controller.ts list_task_statuses_controller.ts list_tasks_controller.ts list_tasks_grouped_controller.ts list_tasks_timeline_controller.ts list_workflow_controller.ts match_scores_controller.ts my_applications_controller.ts patch_task_status_board_poc_controller.ts process_application_controller.ts show_task_controller.ts show_task_status_board_controller.ts task_command_initializers.ts task_submission_controller.ts update_task_sort_order_controller.ts update_task_status_controller.ts update_task_status_definition_controller.ts update_task_time_controller.ts update_workflow_controller.ts withdraw_application_controller.ts
controllers/mappers/request/ shared.ts task_application_request_mapper.ts task_request_mapper.ts task_status_request_mapper.ts
controllers/mappers/response/ public_task_response_mapper.ts shared.ts task_application_response_mapper.ts task_response_mapper.ts task_status_response_mapper.ts
controllers/mappers/ task_actor_context_mapper.ts
controllers/v1/ add_task_requirement_controller.ts create_task_status_controller.ts delete_task_status_controller.ts list_task_requirement_versions_controller.ts list_task_requirements_controller.ts list_task_statuses_controller.ts prefill_task_requirements_from_role_controller.ts remove_task_requirement_controller.ts show_task_status_controller.ts update_task_requirement_controller.ts update_task_status_controller.ts
domain/entities/ task_entity.ts
domain/mapper/ task_domain_mapper.ts
domain/ match_formulas.ts role_contracts.ts task_assignment_rules.ts task_assignment_snapshot_rules.ts task_permission_policy.ts task_state_machine.ts task_status_mirror.ts task_status_rules.ts task_submission_rules.ts task_types.ts
domain/repositories/ task_repository_interface.ts
events/ task_events.ts
infra/adapters/ .gitkeep
infra/cache/ task_cache_invalidator.ts
infra/mapper/ task_infra_mapper.ts
infra/models/ task.ts task_application.ts task_assignment.ts task_assignment_snapshot.ts task_attachment.ts task_comment.ts task_required_skill.ts task_requirement_version.ts task_requirement_version_item.ts task_self_assessment.ts task_status.ts task_submission.ts task_submission_evidence.ts task_version.ts task_workflow_transition.ts
infra/repositories/read/ aggregate_queries.ts detail_queries.ts list_queries.ts public_queries.ts shared.ts statistics_queries.ts task_application_queries.ts task_assignment_queries.ts task_detail_query_repository.ts task_identity_query_repository.ts task_status_query_repository.ts task_workflow_transition_queries.ts
infra/repositories/ task_application_repository.ts task_assignment_repository.ts task_repository_impl.ts task_required_skill_repository.ts task_requirement_repository.ts task_status_repository.ts task_version_repository.ts task_workflow_transition_repository.ts
infra/repositories/write/ task_aggregate_mutations.ts task_application_mutations.ts task_assignment_command_repository.ts task_assignment_mutations.ts task_command_repository.ts task_mutations.ts task_required_skill_mutations.ts task_version_mutations.ts task_workflow_transition_mutations.ts
public_contracts/schemas/ task_events_v1.schema.ts
public_contracts/ task_assignment_commands_v1.ts task_assignment_facts_v1.ts task_constants.ts task_events_v1.ts task_public_api.ts task_status_dtos.ts
types/ task_records.ts
validators/rules/ database.ts
validators/ task.ts task_status.ts
```

## Route Evidence

```text
start/routes/api.ts
start/routes/api_v1.ts
start/routes/skills.ts
start/routes/tasks.ts
```

## Symbol Evidence

| Kind | Symbol | File | Line |
|---|---|---|---:|
| interface | `OrgTaskBootstrap` | `app/modules/tasks/actions/bootstrap/org_task_bootstrap.ts` | 6 |
| const | `orgTaskBootstrap` | `app/modules/tasks/actions/bootstrap/org_task_bootstrap.ts` | 13 |
| interface | `AddTaskSubmissionEvidenceDTO` | `app/modules/tasks/actions/commands/add_task_submission_evidence_command.ts` | 12 |
| interface | `TaskSubmissionEvidenceResult` | `app/modules/tasks/actions/commands/add_task_submission_evidence_command.ts` | 29 |
| class | `AddTaskSubmissionEvidenceCommand` | `app/modules/tasks/actions/commands/add_task_submission_evidence_command.ts` | 34 |
| class | `ApplyForTaskCommand` | `app/modules/tasks/actions/commands/apply_for_task_command.ts` | 25 |
| class | `AssignTaskCommand` | `app/modules/tasks/actions/commands/assign_task_command.ts` | 44 |
| class | `BatchUpdateTaskStatusCommand` | `app/modules/tasks/actions/commands/batch_update_task_status_command.ts` | 30 |
| interface | `CreateTaskAssignmentSnapshotDTO` | `app/modules/tasks/actions/commands/create_task_assignment_snapshot_command.ts` | 7 |
| interface | `TaskAssignmentSnapshotResult` | `app/modules/tasks/actions/commands/create_task_assignment_snapshot_command.ts` | 13 |
| class | `CreateTaskAssignmentSnapshotCommand` | `app/modules/tasks/actions/commands/create_task_assignment_snapshot_command.ts` | 53 |
| interface | `CreateTaskAttachmentDTO` | `app/modules/tasks/actions/commands/create_task_attachment_command.ts` | 10 |
| interface | `TaskAttachmentResult` | `app/modules/tasks/actions/commands/create_task_attachment_command.ts` | 19 |
| class | `CreateTaskAttachmentCommand` | `app/modules/tasks/actions/commands/create_task_attachment_command.ts` | 24 |
| class | `CreateTaskCommand` | `app/modules/tasks/actions/commands/create_task_command.ts` | 41 |
| interface | `CreateTaskCommentDTO` | `app/modules/tasks/actions/commands/create_task_comment_command.ts` | 10 |
| interface | `TaskCommentResult` | `app/modules/tasks/actions/commands/create_task_comment_command.ts` | 18 |
| class | `CreateTaskCommentCommand` | `app/modules/tasks/actions/commands/create_task_comment_command.ts` | 23 |
| class | `CreateTaskStatusCommand` | `app/modules/tasks/actions/commands/create_task_status_command.ts` | 22 |
| interface | `DeleteTaskAttachmentDTO` | `app/modules/tasks/actions/commands/delete_task_attachment_command.ts` | 11 |
| class | `DeleteTaskAttachmentCommand` | `app/modules/tasks/actions/commands/delete_task_attachment_command.ts` | 15 |
| class | `DeleteTaskCommand` | `app/modules/tasks/actions/commands/delete_task_command.ts` | 38 |
| interface | `DeleteTaskCommentDTO` | `app/modules/tasks/actions/commands/delete_task_comment_command.ts` | 11 |
| class | `DeleteTaskCommentCommand` | `app/modules/tasks/actions/commands/delete_task_comment_command.ts` | 15 |
| class | `DeleteTaskStatusCommand` | `app/modules/tasks/actions/commands/delete_task_status_command.ts` | 28 |
| interface | `DeleteTaskSubmissionEvidenceDTO` | `app/modules/tasks/actions/commands/delete_task_submission_evidence_command.ts` | 11 |
| class | `DeleteTaskSubmissionEvidenceCommand` | `app/modules/tasks/actions/commands/delete_task_submission_evidence_command.ts` | 15 |
| interface | `PatchTaskStatusBoardPocInput` | `app/modules/tasks/actions/commands/patch_task_status_board_poc_command.ts` | 8 |
| interface | `PatchTaskStatusBoardPocResult` | `app/modules/tasks/actions/commands/patch_task_status_board_poc_command.ts` | 14 |
| class | `PatchTaskStatusBoardPocCommand` | `app/modules/tasks/actions/commands/patch_task_status_board_poc_command.ts` | 25 |
| class | `ProcessApplicationCommand` | `app/modules/tasks/actions/commands/process_application_command.ts` | 30 |
| interface | `RevokeTaskAccessDTO` | `app/modules/tasks/actions/commands/revoke_task_access_command.ts` | 30 |
| class | `RevokeTaskAccessCommand` | `app/modules/tasks/actions/commands/revoke_task_access_command.ts` | 64 |
| interface | `TaskSubmissionEvidenceInput` | `app/modules/tasks/actions/commands/submit_task_submission_command.ts` | 24 |
| interface | `SubmitTaskSubmissionDTO` | `app/modules/tasks/actions/commands/submit_task_submission_command.ts` | 40 |
| interface | `TaskSubmissionResult` | `app/modules/tasks/actions/commands/submit_task_submission_command.ts` | 53 |
| class | `SubmitTaskSubmissionCommand` | `app/modules/tasks/actions/commands/submit_task_submission_command.ts` | 100 |
| interface | `TaskCompletionAccessTask` | `app/modules/tasks/actions/commands/task_completion_package_access.ts` | 9 |
| function | `requireTaskActionUser` | `app/modules/tasks/actions/commands/task_completion_package_access.ts` | 16 |
| function | `assertHttpUrl` | `app/modules/tasks/actions/commands/task_completion_package_access.ts` | 68 |
| class | `UpdateTaskCommand` | `app/modules/tasks/actions/commands/update_task_command.ts` | 44 |
| class | `UpdateTaskSortOrderCommand` | `app/modules/tasks/actions/commands/update_task_sort_order_command.ts` | 36 |
| class | `UpdateTaskStatusCommand` | `app/modules/tasks/actions/commands/update_task_status_command.ts` | 52 |
| class | `UpdateTaskStatusDefinitionCommand` | `app/modules/tasks/actions/commands/update_task_status_definition_command.ts` | 26 |
| class | `UpdateTaskTimeCommand` | `app/modules/tasks/actions/commands/update_task_time_command.ts` | 38 |
| class | `UpdateWorkflowCommand` | `app/modules/tasks/actions/commands/update_workflow_command.ts` | 26 |
| class | `WithdrawApplicationCommand` | `app/modules/tasks/actions/commands/withdraw_application_command.ts` | 20 |
| class | `AssignTaskDTO` | `app/modules/tasks/actions/dtos/request/assign_task_dto.ts` | 17 |
| interface | `CreateTaskCoreInput` | `app/modules/tasks/actions/dtos/request/create_task_dto.ts` | 11 |
| interface | `CreateTaskSpecificationInput` | `app/modules/tasks/actions/dtos/request/create_task_dto.ts` | 27 |
| class | `CreateTaskDTO` | `app/modules/tasks/actions/dtos/request/create_task_dto.ts` | 65 |
| interface | `RequiredSkillInput` | `app/modules/tasks/actions/dtos/request/create_task_dto_state_builder.ts` | 6 |
| interface | `CreateTaskDTOInput` | `app/modules/tasks/actions/dtos/request/create_task_dto_state_builder.ts` | 11 |
| interface | `CreateTaskDTOState` | `app/modules/tasks/actions/dtos/request/create_task_dto_state_builder.ts` | 45 |
| function | `buildCreateTaskDTOState` | `app/modules/tasks/actions/dtos/request/create_task_dto_state_builder.ts` | 314 |
| class | `DeleteTaskDTO` | `app/modules/tasks/actions/dtos/request/delete_task_dto.ts` | 14 |
| class | `GetTaskDetailDTO` | `app/modules/tasks/actions/dtos/request/get_task_detail_dto.ts` | 18 |
| class | `GetTasksListDTO` | `app/modules/tasks/actions/dtos/request/get_tasks_list_dto.ts` | 206 |
| class | `ApplyForTaskDTO` | `app/modules/tasks/actions/dtos/request/task_application_dtos.ts` | 10 |
| class | `ProcessApplicationDTO` | `app/modules/tasks/actions/dtos/request/task_application_dtos.ts` | 52 |
| class | `WithdrawApplicationDTO` | `app/modules/tasks/actions/dtos/request/task_application_dtos.ts` | 97 |
| class | `GetTaskApplicationsDTO` | `app/modules/tasks/actions/dtos/request/task_application_dtos.ts` | 114 |
| class | `GetPublicTasksDTO` | `app/modules/tasks/actions/dtos/request/task_application_dtos.ts` | 152 |
| class | `UpdateTaskDTO` | `app/modules/tasks/actions/dtos/request/update_task_dto.ts` | 13 |
| interface | `UpdateTaskDTOInput` | `app/modules/tasks/actions/dtos/request/update_task_dto_payload_builder.ts` | 6 |
| interface | `UpdateTaskValidatedPayload` | `app/modules/tasks/actions/dtos/request/update_task_dto_payload_builder.ts` | 20 |
| interface | `UpdateTaskNormalizedPayload` | `app/modules/tasks/actions/dtos/request/update_task_dto_payload_builder.ts` | 24 |
| function | `buildUpdateTaskPayload` | `app/modules/tasks/actions/dtos/request/update_task_dto_payload_builder.ts` | 126 |
| class | `UpdateTaskStatusDTO` | `app/modules/tasks/actions/dtos/request/update_task_status_dto.ts` | 14 |
| class | `UpdateTaskTimeDTO` | `app/modules/tasks/actions/dtos/request/update_task_time_dto.ts` | 13 |
| interface | `TaskDetailResponseDTOProps` | `app/modules/tasks/actions/dtos/response/task_response_dtos.ts` | 10 |
| interface | `TaskListItemResponseDTOProps` | `app/modules/tasks/actions/dtos/response/task_response_dtos.ts` | 37 |
| interface | `TaskSummaryResponseDTOProps` | `app/modules/tasks/actions/dtos/response/task_response_dtos.ts` | 52 |
| class | `TaskDetailResponseDTO` | `app/modules/tasks/actions/dtos/response/task_response_dtos.ts` | 124 |
| class | `TaskListItemResponseDTO` | `app/modules/tasks/actions/dtos/response/task_response_dtos.ts` | 189 |
| class | `TaskSummaryResponseDTO` | `app/modules/tasks/actions/dtos/response/task_response_dtos.ts` | 230 |
| interface | `CommandHandler` | `app/modules/tasks/actions/interfaces.ts` | 7 |
| interface | `QueryHandler` | `app/modules/tasks/actions/interfaces.ts` | 22 |
| interface | `Command` | `app/modules/tasks/actions/interfaces.ts` | 36 |
| interface | `Query` | `app/modules/tasks/actions/interfaces.ts` | 43 |
| class | `TaskApplicationMapper` | `app/modules/tasks/actions/mapper/task_application_mapper.ts` | 21 |
| type | `TaskQueryRecord` | `app/modules/tasks/actions/mapper/task_query_output_mapper.ts` | 5 |
| type | `TaskListQueryRecord` | `app/modules/tasks/actions/mapper/task_query_output_mapper.ts` | 10 |
| function | `mapTaskDetailOutput` | `app/modules/tasks/actions/mapper/task_query_output_mapper.ts` | 40 |
| function | `mapTaskListOutput` | `app/modules/tasks/actions/mapper/task_query_output_mapper.ts` | 50 |
| interface | `CompleteAssignmentsForCompletedTaskInput` | `app/modules/tasks/actions/ports/task_assignment_command_repository_port.ts` | 4 |
| interface | `CompletedTaskAssignmentRecord` | `app/modules/tasks/actions/ports/task_assignment_command_repository_port.ts` | 10 |
| interface | `TaskAssignmentCommandRepositoryPort` | `app/modules/tasks/actions/ports/task_assignment_command_repository_port.ts` | 15 |
| interface | `TaskCachePort` | `app/modules/tasks/actions/ports/task_cache_port.ts` | 1 |
| interface | `TaskCommandRepositoryPort` | `app/modules/tasks/actions/ports/task_command_repository_port.ts` | 6 |
| interface | `TaskProjectOption` | `app/modules/tasks/actions/ports/task_external_dependencies.ts` | 4 |
| interface | `TaskUserOption` | `app/modules/tasks/actions/ports/task_external_dependencies.ts` | 9 |
| interface | `TaskUserIdentity` | `app/modules/tasks/actions/ports/task_external_dependencies.ts` | 15 |
| interface | `TaskSkillOption` | `app/modules/tasks/actions/ports/task_external_dependencies.ts` | 21 |
| interface | `TaskOrgReader` | `app/modules/tasks/actions/ports/task_external_dependencies.ts` | 26 |
| interface | `TaskProjectReader` | `app/modules/tasks/actions/ports/task_external_dependencies.ts` | 39 |
| interface | `TaskUserReader` | `app/modules/tasks/actions/ports/task_external_dependencies.ts` | 52 |
| interface | `TaskReviewReader` | `app/modules/tasks/actions/ports/task_external_dependencies.ts` | 68 |
| interface | `TaskSkillReader` | `app/modules/tasks/actions/ports/task_external_dependencies.ts` | 77 |
| interface | `TaskPermissionReader` | `app/modules/tasks/actions/ports/task_external_dependencies.ts` | 86 |
| interface | `TaskExternalDependencies` | `app/modules/tasks/actions/ports/task_external_dependencies.ts` | 102 |
| interface | `TaskPublicApiTaskSummary` | `app/modules/tasks/actions/ports/task_public_api_repository_port.ts` | 5 |
| interface | `TaskPublicApiCompletedAssignment` | `app/modules/tasks/actions/ports/task_public_api_repository_port.ts` | 13 |
| interface | `TaskPublicApiRepositoryPort` | `app/modules/tasks/actions/ports/task_public_api_repository_port.ts` | 19 |
| const | `taskPublicApiRepository` | `app/modules/tasks/actions/ports/task_public_api_repository_port_impl.ts` | 13 |
| interface | `TaskIdentityQueryRepositoryPort` | `app/modules/tasks/actions/ports/task_query_repository_port.ts` | 5 |
| interface | `TaskDetailQueryRepositoryPort` | `app/modules/tasks/actions/ports/task_query_repository_port.ts` | 12 |
| interface | `TaskStatusQueryRepositoryPort` | `app/modules/tasks/actions/ports/task_status_query_repository_port.ts` | 5 |
| class | `CheckTaskCreatePermissionQuery` | `app/modules/tasks/actions/queries/check_task_create_permission_query.ts` | 12 |
| interface | `GetApplicationMatchScoreDTO` | `app/modules/tasks/actions/queries/get_application_match_score_query.ts` | 41 |
| class | `GetApplicationMatchScoreQuery` | `app/modules/tasks/actions/queries/get_application_match_score_query.ts` | 46 |
| interface | `GetMyApplicationsInput` | `app/modules/tasks/actions/queries/get_my_applications_query.ts` | 6 |
| class | `GetMyApplicationsQuery` | `app/modules/tasks/actions/queries/get_my_applications_query.ts` | 18 |
| class | `GetPublicTasksQuery` | `app/modules/tasks/actions/queries/get_public_tasks_query.ts` | 22 |
| class | `GetTaskApplicationsQuery` | `app/modules/tasks/actions/queries/get_task_applications_query.ts` | 12 |
| interface | `GetTaskApplicationsRankingDTO` | `app/modules/tasks/actions/queries/get_task_applications_ranking_query.ts` | 7 |
| interface | `RankedApplication` | `app/modules/tasks/actions/queries/get_task_applications_ranking_query.ts` | 11 |
| class | `GetTaskApplicationsRankingQuery` | `app/modules/tasks/actions/queries/get_task_applications_ranking_query.ts` | 24 |
| interface | `GetTaskAuditLogsInput` | `app/modules/tasks/actions/queries/get_task_audit_logs_query.ts` | 8 |
| class | `GetTaskAuditLogsQuery` | `app/modules/tasks/actions/queries/get_task_audit_logs_query.ts` | 26 |
| interface | `GetTaskCreatePageInput` | `app/modules/tasks/actions/queries/get_task_create_page_query.ts` | 9 |
| interface | `GetTaskCreatePageResult` | `app/modules/tasks/actions/queries/get_task_create_page_query.ts` | 14 |
| class | `GetTaskCreatePageQuery` | `app/modules/tasks/actions/queries/get_task_create_page_query.ts` | 18 |
| interface | `TaskDetailResult` | `app/modules/tasks/actions/queries/get_task_detail_query.ts` | 25 |
| class | `GetTaskDetailQuery` | `app/modules/tasks/actions/queries/get_task_detail_query.ts` | 47 |
| interface | `TaskEditPageResult` | `app/modules/tasks/actions/queries/get_task_edit_page_query.ts` | 12 |
| class | `GetTaskEditPageQuery` | `app/modules/tasks/actions/queries/get_task_edit_page_query.ts` | 37 |
| class | `GetTaskMetadataQuery` | `app/modules/tasks/actions/queries/get_task_metadata_query.ts` | 25 |
| class | `GetTaskProjectsQuery` | `app/modules/tasks/actions/queries/get_task_projects_query.ts` | 6 |
| class | `GetTaskStatisticsQuery` | `app/modules/tasks/actions/queries/get_task_statistics_query.ts` | 30 |
| interface | `GetTaskStatusBoardPageResult` | `app/modules/tasks/actions/queries/get_task_status_board_page_query.ts` | 11 |
| class | `GetTaskStatusBoardPageQuery` | `app/modules/tasks/actions/queries/get_task_status_board_page_query.ts` | 22 |
| class | `GetTasksGroupedQuery` | `app/modules/tasks/actions/queries/get_tasks_grouped_query.ts` | 20 |
| interface | `GetTasksIndexPageInput` | `app/modules/tasks/actions/queries/get_tasks_index_page_query.ts` | 13 |
| interface | `GetTasksIndexPageResult` | `app/modules/tasks/actions/queries/get_tasks_index_page_query.ts` | 28 |
| class | `GetTasksIndexPageQuery` | `app/modules/tasks/actions/queries/get_tasks_index_page_query.ts` | 59 |
| class | `GetTasksListQuery` | `app/modules/tasks/actions/queries/get_tasks_list_query.ts` | 35 |
| interface | `TasksPageResult` | `app/modules/tasks/actions/queries/get_tasks_page_query.ts` | 10 |
| class | `GetTasksPageQuery` | `app/modules/tasks/actions/queries/get_tasks_page_query.ts` | 51 |
| class | `GetTasksTimelineQuery` | `app/modules/tasks/actions/queries/get_tasks_timeline_query.ts` | 21 |
| class | `GetUserTasksQuery` | `app/modules/tasks/actions/queries/get_user_tasks_query.ts` | 26 |
| class | `ListTaskStatusesQuery` | `app/modules/tasks/actions/queries/list_task_statuses_query.ts` | 7 |
| class | `ListWorkflowQuery` | `app/modules/tasks/actions/queries/list_workflow_query.ts` | 8 |
| class | `Result` | `app/modules/tasks/actions/result.ts` | 5 |
| interface | `TaskListPublicOptions` | `app/modules/tasks/actions/services/task_public_api.ts` | 22 |
| class | `TaskPublicApi` | `app/modules/tasks/actions/services/task_public_api.ts` | 35 |
| const | `taskPublicApi` | `app/modules/tasks/actions/services/task_public_api.ts` | 138 |
| class | `TaskRequirementVersionService` | `app/modules/tasks/actions/services/task_requirement_version_service.ts` | 11 |
| class | `TaskSkillRequirementService` | `app/modules/tasks/actions/services/task_skill_requirement_service.ts` | 52 |
| interface | `CreateTaskPersistencePayload` | `app/modules/tasks/actions/support/task_create_payload_builder.ts` | 11 |
| function | `buildCreateTaskPersistencePayload` | `app/modules/tasks/actions/support/task_create_payload_builder.ts` | 46 |
| interface | `CreateTaskPersistenceInput` | `app/modules/tasks/actions/support/task_create_persistence_support.ts` | 27 |
| interface | `CreateTaskPersistenceDependencies` | `app/modules/tasks/actions/support/task_create_persistence_support.ts` | 35 |
| type | `ResolvedCreateTaskStatus` | `app/modules/tasks/actions/support/task_create_preconditions.ts` | 17 |
| function | `buildTaskPermissionFilter` | `app/modules/tasks/actions/support/task_permission_filter_builder.ts` | 5 |
| function | `assertRequiredSkillsPresent` | `app/modules/tasks/actions/support/task_required_skill_persistence.ts` | 12 |
| function | `findInvalidRequiredSkill` | `app/modules/tasks/actions/support/task_required_skill_persistence.ts` | 18 |
| function | `buildTaskRequiredSkillRows` | `app/modules/tasks/actions/support/task_required_skill_persistence.ts` | 25 |
| interface | `TaskVersionSnapshotPayload` | `app/modules/tasks/actions/support/task_version_snapshot.ts` | 16 |
| function | `hasTaskVersionRelevantChanges` | `app/modules/tasks/actions/support/task_version_snapshot.ts` | 74 |
| function | `buildTaskVersionSnapshot` | `app/modules/tasks/actions/support/task_version_snapshot.ts` | 81 |
| interface | `TaskUpdateRepositoryPort` | `app/modules/tasks/actions/support/update_task_persistence_support.ts` | 26 |
| interface | `TaskVersionRepositoryPort` | `app/modules/tasks/actions/support/update_task_persistence_support.ts` | 38 |
| interface | `PersistedTaskUpdate` | `app/modules/tasks/actions/support/update_task_persistence_support.ts` | 61 |
| interface | `UpdateTaskPersistenceInput` | `app/modules/tasks/actions/support/update_task_persistence_support.ts` | 68 |
| interface | `UpdateTaskPersistenceDependencies` | `app/modules/tasks/actions/support/update_task_persistence_support.ts` | 77 |
| function | `buildTaskUpdateNotificationRequests` | `app/modules/tasks/actions/support/update_task_post_commit_support.ts` | 51 |
| interface | `TaskActionContext` | `app/modules/tasks/actions/task_action_context.ts` | 1 |
| interface | `AuthenticatedTaskActionContext` | `app/modules/tasks/actions/task_action_context.ts` | 8 |
| function | `makeSystemTaskActionContext` | `app/modules/tasks/actions/task_action_context.ts` | 12 |
| interface | `TaskActorContext` | `app/modules/tasks/application/context/task_actor_context.ts` | 1 |
| const | `TASK_PAGINATION` | `app/modules/tasks/application/dtos/common/task_pagination.ts` | 1 |
| interface | `TaskActor` | `app/modules/tasks/application/ports/task_actor_lookup.ts` | 1 |
| interface | `TaskActorLookup` | `app/modules/tasks/application/ports/task_actor_lookup.ts` | 8 |
| type | `TaskPublicEventV1` | `app/modules/tasks/application/ports/task_event_publisher.ts` | 8 |
| interface | `TaskEventPublisher` | `app/modules/tasks/application/ports/task_event_publisher.ts` | 14 |
| interface | `TaskOrganizationMembership` | `app/modules/tasks/application/ports/task_organization_membership.ts` | 1 |
| interface | `TaskOrganizationMembershipReader` | `app/modules/tasks/application/ports/task_organization_membership.ts` | 8 |
| interface | `TaskProjectAccessSnapshot` | `app/modules/tasks/application/ports/task_project_access.ts` | 1 |
| interface | `TaskProjectAccessReader` | `app/modules/tasks/application/ports/task_project_access.ts` | 8 |
| interface | `TaskReviewSessionCreatorInput` | `app/modules/tasks/application/ports/task_review_session_creator.ts` | 3 |
| interface | `TaskReviewSessionCreator` | `app/modules/tasks/application/ports/task_review_session_creator.ts` | 12 |
| class | `MonolithTaskOrgReader` | `app/modules/tasks/bootstrap/adapters/monolith_task_org_reader.ts` | 6 |
| class | `MonolithTaskPermissionReader` | `app/modules/tasks/bootstrap/adapters/monolith_task_permission_reader.ts` | 8 |
| class | `MonolithTaskProjectReader` | `app/modules/tasks/bootstrap/adapters/monolith_task_project_reader.ts` | 9 |
| class | `MonolithTaskReviewReader` | `app/modules/tasks/bootstrap/adapters/monolith_task_review_reader.ts` | 6 |
| class | `MonolithTaskSkillReader` | `app/modules/tasks/bootstrap/adapters/monolith_task_skill_reader.ts` | 9 |
| class | `MonolithTaskUserReader` | `app/modules/tasks/bootstrap/adapters/monolith_task_user_reader.ts` | 10 |
| function | `makeApplyForTaskCommand` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 35 |
| function | `makeProcessApplicationCommand` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 39 |
| function | `makeWithdrawApplicationCommand` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 43 |
| function | `makeBatchUpdateTaskStatusCommand` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 47 |
| function | `makeCreateTaskCommand` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 53 |
| function | `makeUpdateTaskCommand` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 57 |
| function | `makeAssignTaskCommand` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 61 |
| function | `makeDeleteTaskCommand` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 68 |
| function | `makeDeleteTaskStatusCommand` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 72 |
| function | `makePatchTaskStatusBoardPocCommand` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 76 |
| function | `makeRevokeTaskAccessCommand` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 82 |
| function | `makeUpdateTaskSortOrderCommand` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 89 |
| function | `makeUpdateTaskStatusCommand` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 95 |
| function | `makeUpdateTaskTimeCommand` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 99 |
| function | `getTaskPermissionReader` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 103 |
| function | `makeGetTaskDetailQuery` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 107 |
| function | `makeGetTaskCreatePageQuery` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 111 |
| function | `makeGetTaskEditPageQuery` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 115 |
| function | `makeGetTaskMetadataQuery` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 119 |
| function | `makeGetTaskProjectsQuery` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 123 |
| function | `makeGetTaskStatisticsQuery` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 127 |
| function | `makeGetTaskStatusBoardPageQuery` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 131 |
| function | `makeGetTasksGroupedQuery` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 137 |
| function | `makeGetTasksListQuery` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 141 |
| function | `makeGetTasksIndexPageQuery` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 145 |
| function | `makeGetTasksPageQuery` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 149 |
| function | `makeGetTasksTimelineQuery` | `app/modules/tasks/bootstrap/task_action_factory.ts` | 153 |
| const | `taskExternalDeps` | `app/modules/tasks/bootstrap/task_composition_root.ts` | 10 |
| enum | `TaskStatus` | `app/modules/tasks/constants/task_constants.ts` | 27 |
| enum | `TaskStatusCategory` | `app/modules/tasks/constants/task_constants.ts` | 49 |
| const | `DEFAULT_TASK_STATUSES` | `app/modules/tasks/constants/task_constants.ts` | 60 |
| const | `DEFAULT_WORKFLOW_TRANSITIONS` | `app/modules/tasks/constants/task_constants.ts` | 138 |
| const | `INCOMPLETE_TASK_STATUSES` | `app/modules/tasks/constants/task_constants.ts` | 163 |
| const | `TERMINAL_TASK_STATUSES` | `app/modules/tasks/constants/task_constants.ts` | 174 |
| const | `TERMINAL_STATUS_CATEGORIES` | `app/modules/tasks/constants/task_constants.ts` | 179 |
| enum | `TaskLabel` | `app/modules/tasks/constants/task_constants.ts` | 192 |
| enum | `TaskPriority` | `app/modules/tasks/constants/task_constants.ts` | 207 |
| enum | `TaskDifficulty` | `app/modules/tasks/constants/task_constants.ts` | 222 |
| enum | `TaskVisibility` | `app/modules/tasks/constants/task_constants.ts` | 237 |
| enum | `ApplicationStatus` | `app/modules/tasks/constants/task_constants.ts` | 251 |
| enum | `ApplicationSource` | `app/modules/tasks/constants/task_constants.ts` | 262 |
| enum | `AssignmentStatus` | `app/modules/tasks/constants/task_constants.ts` | 276 |
| enum | `AssignmentType` | `app/modules/tasks/constants/task_constants.ts` | 286 |
| class | `ApplyForTaskApiController` | `app/modules/tasks/controllers/apply_for_task_api_controller.ts` | 14 |
| class | `ApplyForTaskController` | `app/modules/tasks/controllers/apply_for_task_controller.ts` | 11 |
| class | `BatchUpdateTaskStatusController` | `app/modules/tasks/controllers/batch_update_task_status_controller.ts` | 12 |
| class | `CheckCreatePermissionController` | `app/modules/tasks/controllers/check_create_permission_controller.ts` | 10 |
| class | `CreateTaskController` | `app/modules/tasks/controllers/create_task_controller.ts` | 19 |
| class | `CreateTaskStatusController` | `app/modules/tasks/controllers/create_task_status_controller.ts` | 16 |
| class | `DeleteTaskController` | `app/modules/tasks/controllers/delete_task_controller.ts` | 14 |
| class | `DeleteTaskStatusController` | `app/modules/tasks/controllers/delete_task_status_controller.ts` | 16 |
| class | `EditTaskController` | `app/modules/tasks/controllers/edit_task_controller.ts` | 22 |
| class | `GetTaskAuditLogsController` | `app/modules/tasks/controllers/get_task_audit_logs_controller.ts` | 11 |
| class | `ListPublicTasksApiController` | `app/modules/tasks/controllers/list_public_tasks_api_controller.ts` | 13 |
| class | `ListPublicTasksController` | `app/modules/tasks/controllers/list_public_tasks_controller.ts` | 13 |
| class | `ListTaskApplicationsController` | `app/modules/tasks/controllers/list_task_applications_controller.ts` | 13 |
| class | `ListTaskStatusesController` | `app/modules/tasks/controllers/list_task_statuses_controller.ts` | 11 |
| class | `ListTasksController` | `app/modules/tasks/controllers/list_tasks_controller.ts` | 16 |
| class | `ListTasksGroupedController` | `app/modules/tasks/controllers/list_tasks_grouped_controller.ts` | 12 |
| class | `ListTasksTimelineController` | `app/modules/tasks/controllers/list_tasks_timeline_controller.ts` | 12 |
| class | `ListWorkflowController` | `app/modules/tasks/controllers/list_workflow_controller.ts` | 11 |
| const | `TASKS_DEFAULT_LIMIT` | `app/modules/tasks/controllers/mappers/request/shared.ts` | 7 |
| function | `toOptionalString` | `app/modules/tasks/controllers/mappers/request/shared.ts` | 13 |
| function | `toOptionalNullableString` | `app/modules/tasks/controllers/mappers/request/shared.ts` | 17 |
| function | `toPositiveNumber` | `app/modules/tasks/controllers/mappers/request/shared.ts` | 25 |
| function | `toTaskSortBy` | `app/modules/tasks/controllers/mappers/request/shared.ts` | 40 |
| function | `toSortOrder` | `app/modules/tasks/controllers/mappers/request/shared.ts` | 46 |
| function | `toOptionalNumericValue` | `app/modules/tasks/controllers/mappers/request/shared.ts` | 50 |
| function | `toOptionalStringArray` | `app/modules/tasks/controllers/mappers/request/shared.ts` | 63 |
| function | `toApplicationStatusFilter` | `app/modules/tasks/controllers/mappers/request/shared.ts` | 82 |
| function | `toPublicTaskSortBy` | `app/modules/tasks/controllers/mappers/request/shared.ts` | 88 |
| function | `toPublicTaskSortOrder` | `app/modules/tasks/controllers/mappers/request/shared.ts` | 94 |
| function | `toOptionalRecordArray` | `app/modules/tasks/controllers/mappers/request/shared.ts` | 98 |
| function | `buildGetTaskApplicationsDTO` | `app/modules/tasks/controllers/mappers/request/task_application_request_mapper.ts` | 54 |
| function | `buildGetPublicTasksDTO` | `app/modules/tasks/controllers/mappers/request/task_application_request_mapper.ts` | 71 |
| function | `buildGetMyApplicationsInput` | `app/modules/tasks/controllers/mappers/request/task_application_request_mapper.ts` | 91 |
| function | `buildGetTasksIndexPageInput` | `app/modules/tasks/controllers/mappers/request/task_request_mapper.ts` | 29 |
| function | `buildUpdateTaskStatusDTO` | `app/modules/tasks/controllers/mappers/request/task_request_mapper.ts` | 125 |
| function | `buildUpdateTaskTimeDTO` | `app/modules/tasks/controllers/mappers/request/task_request_mapper.ts` | 136 |
| function | `buildDeleteTaskDTO` | `app/modules/tasks/controllers/mappers/request/task_request_mapper.ts` | 147 |
| function | `buildPatchTaskStatusBoardPocInput` | `app/modules/tasks/controllers/mappers/request/task_request_mapper.ts` | 158 |
| function | `buildGetTaskAuditLogsInput` | `app/modules/tasks/controllers/mappers/request/task_request_mapper.ts` | 169 |
| function | `buildGetTaskDetailDTO` | `app/modules/tasks/controllers/mappers/request/task_request_mapper.ts` | 182 |
| function | `buildCreateTaskStatusDTO` | `app/modules/tasks/controllers/mappers/request/task_status_request_mapper.ts` | 67 |
| function | `buildOrganizationWorkflowCreateTaskStatusDTO` | `app/modules/tasks/controllers/mappers/request/task_status_request_mapper.ts` | 93 |
| function | `buildUpdateTaskStatusDefinitionDTO` | `app/modules/tasks/controllers/mappers/request/task_status_request_mapper.ts` | 104 |
| function | `buildDeleteTaskStatusDTO` | `app/modules/tasks/controllers/mappers/request/task_status_request_mapper.ts` | 127 |
| function | `buildUpdateWorkflowDTO` | `app/modules/tasks/controllers/mappers/request/task_status_request_mapper.ts` | 137 |
| function | `buildWithdrawApplicationDTO` | `app/modules/tasks/controllers/mappers/request/task_status_request_mapper.ts` | 151 |
| interface | `PublicTaskFiltersResponse` | `app/modules/tasks/controllers/mappers/response/public_task_response_mapper.ts` | 9 |
| function | `mapPublicTaskCollectionResponse` | `app/modules/tasks/controllers/mappers/response/public_task_response_mapper.ts` | 19 |
| function | `mapPublicTasksPageProps` | `app/modules/tasks/controllers/mappers/response/public_task_response_mapper.ts` | 25 |
| function | `mapPublicTasksApiBody` | `app/modules/tasks/controllers/mappers/response/public_task_response_mapper.ts` | 44 |
| type | `ResponseRecord` | `app/modules/tasks/controllers/mappers/response/shared.ts` | 1 |
| interface | `SerializableResponseRecord` | `app/modules/tasks/controllers/mappers/response/shared.ts` | 3 |
| interface | `PaginationMeta` | `app/modules/tasks/controllers/mappers/response/shared.ts` | 7 |
| interface | `PaginatedControllerResult` | `app/modules/tasks/controllers/mappers/response/shared.ts` | 14 |
| function | `serializeForResponse` | `app/modules/tasks/controllers/mappers/response/shared.ts` | 31 |
| function | `serializeCollectionForResponse` | `app/modules/tasks/controllers/mappers/response/shared.ts` | 41 |
| function | `mapApplyForTaskApiBody` | `app/modules/tasks/controllers/mappers/response/task_application_response_mapper.ts` | 101 |
| function | `mapTaskApplicationsPageProps` | `app/modules/tasks/controllers/mappers/response/task_application_response_mapper.ts` | 108 |
| function | `mapMyApplicationsPageProps` | `app/modules/tasks/controllers/mappers/response/task_application_response_mapper.ts` | 121 |
| interface | `TaskDetailPageResult` | `app/modules/tasks/controllers/mappers/response/task_response_mapper.ts` | 4 |
| interface | `TaskEditPageResult` | `app/modules/tasks/controllers/mappers/response/task_response_mapper.ts` | 21 |
| function | `mapTaskCreateApiBody` | `app/modules/tasks/controllers/mappers/response/task_response_mapper.ts` | 40 |
| function | `mapTaskUpdateApiBody` | `app/modules/tasks/controllers/mappers/response/task_response_mapper.ts` | 47 |
| function | `mapTaskStatusApiBody` | `app/modules/tasks/controllers/mappers/response/task_response_mapper.ts` | 54 |
| function | `mapTaskSortOrderApiBody` | `app/modules/tasks/controllers/mappers/response/task_response_mapper.ts` | 65 |
| function | `mapTaskDetailPageProps` | `app/modules/tasks/controllers/mappers/response/task_response_mapper.ts` | 72 |
| function | `mapScopedTaskDetailPageProps` | `app/modules/tasks/controllers/mappers/response/task_response_mapper.ts` | 80 |
| function | `mapTaskEditPageProps` | `app/modules/tasks/controllers/mappers/response/task_response_mapper.ts` | 91 |
| function | `mapTaskStatusDefinitionApiBody` | `app/modules/tasks/controllers/mappers/response/task_status_response_mapper.ts` | 4 |
| function | `mapTaskWorkflowApiBody` | `app/modules/tasks/controllers/mappers/response/task_status_response_mapper.ts` | 11 |
| function | `mapTaskStatusSuccessApiBody` | `app/modules/tasks/controllers/mappers/response/task_status_response_mapper.ts` | 18 |
| function | `mapTaskStatusMutationApiBody` | `app/modules/tasks/controllers/mappers/response/task_status_response_mapper.ts` | 22 |
| function | `mapTaskStatusDeleteApiBody` | `app/modules/tasks/controllers/mappers/response/task_status_response_mapper.ts` | 26 |
| function | `mapWorkflowUpdateApiBody` | `app/modules/tasks/controllers/mappers/response/task_status_response_mapper.ts` | 30 |
| function | `taskActorContextFromHttp` | `app/modules/tasks/controllers/mappers/task_actor_context_mapper.ts` | 6 |
| class | `MatchScoresController` | `app/modules/tasks/controllers/match_scores_controller.ts` | 7 |
| class | `MyApplicationsController` | `app/modules/tasks/controllers/my_applications_controller.ts` | 13 |
| class | `PatchTaskStatusBoardPocController` | `app/modules/tasks/controllers/patch_task_status_board_poc_controller.ts` | 14 |
| class | `ProcessApplicationController` | `app/modules/tasks/controllers/process_application_controller.ts` | 11 |
| class | `ShowTaskController` | `app/modules/tasks/controllers/show_task_controller.ts` | 14 |
| class | `ShowTaskStatusBoardController` | `app/modules/tasks/controllers/show_task_status_board_controller.ts` | 12 |
| class | `TaskSubmissionController` | `app/modules/tasks/controllers/task_submission_controller.ts` | 56 |
| class | `UpdateTaskSortOrderController` | `app/modules/tasks/controllers/update_task_sort_order_controller.ts` | 13 |
| class | `UpdateTaskStatusController` | `app/modules/tasks/controllers/update_task_status_controller.ts` | 15 |
| class | `UpdateTaskStatusDefinitionController` | `app/modules/tasks/controllers/update_task_status_definition_controller.ts` | 16 |
| class | `UpdateTaskTimeController` | `app/modules/tasks/controllers/update_task_time_controller.ts` | 12 |
| class | `UpdateWorkflowController` | `app/modules/tasks/controllers/update_workflow_controller.ts` | 16 |
| class | `AddTaskRequirementController` | `app/modules/tasks/controllers/v1/add_task_requirement_controller.ts` | 25 |
| class | `CreateTaskStatusController` | `app/modules/tasks/controllers/v1/create_task_status_controller.ts` | 27 |
| class | `DeleteTaskStatusController` | `app/modules/tasks/controllers/v1/delete_task_status_controller.ts` | 10 |
| class | `ListTaskRequirementVersionsController` | `app/modules/tasks/controllers/v1/list_task_requirement_versions_controller.ts` | 5 |
| class | `ListTaskRequirementsController` | `app/modules/tasks/controllers/v1/list_task_requirements_controller.ts` | 5 |
| class | `ListTaskStatusesController` | `app/modules/tasks/controllers/v1/list_task_statuses_controller.ts` | 8 |
| class | `PrefillTaskRequirementsFromRoleController` | `app/modules/tasks/controllers/v1/prefill_task_requirements_from_role_controller.ts` | 16 |
| class | `RemoveTaskRequirementController` | `app/modules/tasks/controllers/v1/remove_task_requirement_controller.ts` | 5 |
| class | `ShowTaskStatusController` | `app/modules/tasks/controllers/v1/show_task_status_controller.ts` | 9 |
| class | `UpdateTaskRequirementController` | `app/modules/tasks/controllers/v1/update_task_requirement_controller.ts` | 22 |
| class | `UpdateTaskStatusController` | `app/modules/tasks/controllers/v1/update_task_status_controller.ts` | 51 |
| class | `WithdrawApplicationController` | `app/modules/tasks/controllers/withdraw_application_controller.ts` | 11 |
| type | `TaskStatus` | `app/modules/tasks/domain/entities/task_entity.ts` | 9 |
| type | `TaskLabel` | `app/modules/tasks/domain/entities/task_entity.ts` | 10 |
| type | `TaskPriority` | `app/modules/tasks/domain/entities/task_entity.ts` | 11 |
| type | `TaskDifficulty` | `app/modules/tasks/domain/entities/task_entity.ts` | 12 |
| type | `TaskVisibility` | `app/modules/tasks/domain/entities/task_entity.ts` | 13 |
| interface | `TaskEntityProps` | `app/modules/tasks/domain/entities/task_entity.ts` | 15 |
| class | `TaskEntity` | `app/modules/tasks/domain/entities/task_entity.ts` | 43 |
| class | `TaskDomainMapper` | `app/modules/tasks/domain/mapper/task_domain_mapper.ts` | 18 |
| interface | `TaskRequiredSkill` | `app/modules/tasks/domain/match_formulas.ts` | 12 |
| interface | `TaskMatchInput` | `app/modules/tasks/domain/match_formulas.ts` | 19 |
| interface | `UserSkillInput` | `app/modules/tasks/domain/match_formulas.ts` | 26 |
| interface | `UserWorkHistoryInput` | `app/modules/tasks/domain/match_formulas.ts` | 32 |
| interface | `ApplicantMatchInput` | `app/modules/tasks/domain/match_formulas.ts` | 39 |
| interface | `MatchScoreResult` | `app/modules/tasks/domain/match_formulas.ts` | 45 |
| function | `calculateApplicantMatch` | `app/modules/tasks/domain/match_formulas.ts` | 55 |
| interface | `TaskRepository` | `app/modules/tasks/domain/repositories/task_repository_interface.ts` | 12 |
| const | `TaskOrgRole` | `app/modules/tasks/domain/role_contracts.ts` | 3 |
| const | `TaskProjectRole` | `app/modules/tasks/domain/role_contracts.ts` | 9 |
| const | `TaskSystemRole` | `app/modules/tasks/domain/role_contracts.ts` | 16 |
| function | `canApplyForTask` | `app/modules/tasks/domain/task_assignment_rules.ts` | 27 |
| function | `validateAssignee` | `app/modules/tasks/domain/task_assignment_rules.ts` | 64 |
| function | `canRevokeAssignment` | `app/modules/tasks/domain/task_assignment_rules.ts` | 93 |
| function | `validateBatchStatusUpdate` | `app/modules/tasks/domain/task_assignment_rules.ts` | 116 |
| function | `validateTaskCreationFields` | `app/modules/tasks/domain/task_assignment_rules.ts` | 148 |
| function | `canProcessApplication` | `app/modules/tasks/domain/task_assignment_rules.ts` | 185 |
| type | `SnapshotPayloadPolicyResult` | `app/modules/tasks/domain/task_assignment_snapshot_rules.ts` | 6 |
| function | `canCreateTaskAssignmentSnapshot` | `app/modules/tasks/domain/task_assignment_snapshot_rules.ts` | 8 |
| function | `validateTaskAssignmentSnapshotPayload` | `app/modules/tasks/domain/task_assignment_snapshot_rules.ts` | 38 |
| function | `canUpdateTask` | `app/modules/tasks/domain/task_permission_policy.ts` | 61 |
| function | `canUpdateTaskStatus` | `app/modules/tasks/domain/task_permission_policy.ts` | 76 |
| function | `canUpdateTaskTime` | `app/modules/tasks/domain/task_permission_policy.ts` | 87 |
| function | `canAssignTask` | `app/modules/tasks/domain/task_permission_policy.ts` | 102 |
| function | `canDeleteTask` | `app/modules/tasks/domain/task_permission_policy.ts` | 123 |
| function | `canRevokeTaskAccess` | `app/modules/tasks/domain/task_permission_policy.ts` | 148 |
| function | `canUpdateTaskFields` | `app/modules/tasks/domain/task_permission_policy.ts` | 166 |
| function | `canPermanentDeleteTask` | `app/modules/tasks/domain/task_permission_policy.ts` | 223 |
| function | `canViewTask` | `app/modules/tasks/domain/task_permission_policy.ts` | 240 |
| function | `canReorderTask` | `app/modules/tasks/domain/task_permission_policy.ts` | 251 |
| function | `resolveTaskCollectionReadScope` | `app/modules/tasks/domain/task_permission_policy.ts` | 257 |
| function | `calculateTaskPermissions` | `app/modules/tasks/domain/task_permission_policy.ts` | 282 |
| function | `canCreateTask` | `app/modules/tasks/domain/task_permission_policy.ts` | 311 |
| function | `canManageTaskStatusBoard` | `app/modules/tasks/domain/task_permission_policy.ts` | 321 |
| function | `canAccessTaskEditPage` | `app/modules/tasks/domain/task_permission_policy.ts` | 330 |
| interface | `TransitionContext` | `app/modules/tasks/domain/task_state_machine.ts` | 61 |
| function | `validateTransition` | `app/modules/tasks/domain/task_state_machine.ts` | 73 |
| function | `isTerminalStatus` | `app/modules/tasks/domain/task_state_machine.ts` | 110 |
| function | `getAllowedTransitions` | `app/modules/tasks/domain/task_state_machine.ts` | 118 |
| interface | `TaskStatusMirrorSource` | `app/modules/tasks/domain/task_status_mirror.ts` | 1 |
| function | `toLegacyTaskStatusMirror` | `app/modules/tasks/domain/task_status_mirror.ts` | 9 |
| function | `canEditStatus` | `app/modules/tasks/domain/task_status_rules.ts` | 28 |
| function | `canDeleteStatus` | `app/modules/tasks/domain/task_status_rules.ts` | 48 |
| function | `isValidSlug` | `app/modules/tasks/domain/task_status_rules.ts` | 67 |
| function | `isValidCategory` | `app/modules/tasks/domain/task_status_rules.ts` | 75 |
| interface | `WorkflowTransitionContext` | `app/modules/tasks/domain/task_status_rules.ts` | 83 |
| function | `validateWorkflowTransition` | `app/modules/tasks/domain/task_status_rules.ts` | 104 |
| function | `canEditTaskSubmission` | `app/modules/tasks/domain/task_submission_rules.ts` | 15 |
| function | `canSubmitTaskSubmission` | `app/modules/tasks/domain/task_submission_rules.ts` | 36 |
| function | `validateTaskSubmissionPayload` | `app/modules/tasks/domain/task_submission_rules.ts` | 61 |
| interface | `TaskPermissionContext` | `app/modules/tasks/domain/task_types.ts` | 16 |
| type | `TaskCollectionScopeFallback` | `app/modules/tasks/domain/task_types.ts` | 37 |
| interface | `TaskCollectionAccessContext` | `app/modules/tasks/domain/task_types.ts` | 39 |
| interface | `TaskCreatePermissionContext` | `app/modules/tasks/domain/task_types.ts` | 46 |
| type | `TaskCollectionReadScope` | `app/modules/tasks/domain/task_types.ts` | 53 |
| type | `UpdateFieldsResult` | `app/modules/tasks/domain/task_types.ts` | 64 |
| interface | `TaskCreatedEvent` | `app/modules/tasks/events/task_events.ts` | 2 |
| interface | `TaskFieldChange` | `app/modules/tasks/events/task_events.ts` | 9 |
| interface | `TaskUpdatedEvent` | `app/modules/tasks/events/task_events.ts` | 15 |
| interface | `TaskStatusChangedEvent` | `app/modules/tasks/events/task_events.ts` | 22 |
| interface | `TaskAssignmentCompletedEvent` | `app/modules/tasks/events/task_events.ts` | 32 |
| interface | `TaskAssignedEvent` | `app/modules/tasks/events/task_events.ts` | 38 |
| interface | `TaskAccessRevokedEvent` | `app/modules/tasks/events/task_events.ts` | 45 |
| interface | `TaskApplicationSubmittedEvent` | `app/modules/tasks/events/task_events.ts` | 52 |
| interface | `TaskApplicationReviewedEvent` | `app/modules/tasks/events/task_events.ts` | 60 |
| class | `TaskCacheInvalidator` | `app/modules/tasks/infra/cache/task_cache_invalidator.ts` | 4 |
| class | `TaskInfraMapper` | `app/modules/tasks/infra/mapper/task_infra_mapper.ts` | 31 |
| class | `Task` | `app/modules/tasks/infra/models/task.ts` | 39 |
| class | `TaskApplication` | `app/modules/tasks/infra/models/task_application.ts` | 21 |
| class | `TaskAssignment` | `app/modules/tasks/infra/models/task_assignment.ts` | 20 |
| class | `TaskAssignmentSnapshot` | `app/modules/tasks/infra/models/task_assignment_snapshot.ts` | 22 |
| class | `TaskAttachment` | `app/modules/tasks/infra/models/task_attachment.ts` | 10 |
| class | `TaskComment` | `app/modules/tasks/infra/models/task_comment.ts` | 10 |
| class | `TaskRequiredSkill` | `app/modules/tasks/infra/models/task_required_skill.ts` | 18 |
| type | `RequirementVersionReason` | `app/modules/tasks/infra/models/task_requirement_version.ts` | 7 |
| class | `TaskRequirementVersion` | `app/modules/tasks/infra/models/task_requirement_version.ts` | 15 |
| class | `TaskRequirementVersionItem` | `app/modules/tasks/infra/models/task_requirement_version_item.ts` | 6 |
| class | `TaskSelfAssessment` | `app/modules/tasks/infra/models/task_self_assessment.ts` | 10 |
| class | `TaskStatus` | `app/modules/tasks/infra/models/task_status.ts` | 7 |
| class | `TaskSubmission` | `app/modules/tasks/infra/models/task_submission.ts` | 12 |
| class | `TaskSubmissionEvidence` | `app/modules/tasks/infra/models/task_submission_evidence.ts` | 10 |
| class | `TaskVersion` | `app/modules/tasks/infra/models/task_version.ts` | 16 |
| class | `TaskWorkflowTransition` | `app/modules/tasks/infra/models/task_workflow_transition.ts` | 10 |
| const | `countIncompleteByProject` | `app/modules/tasks/infra/repositories/read/aggregate_queries.ts` | 13 |
| const | `getTasksSummaryByProject` | `app/modules/tasks/infra/repositories/read/aggregate_queries.ts` | 30 |
| const | `countByAssignees` | `app/modules/tasks/infra/repositories/read/aggregate_queries.ts` | 89 |
| const | `countByProjectIds` | `app/modules/tasks/infra/repositories/read/aggregate_queries.ts` | 116 |
| const | `countByTaskStatusId` | `app/modules/tasks/infra/repositories/read/aggregate_queries.ts` | 140 |
| const | `findActiveTaskIdentity` | `app/modules/tasks/infra/repositories/read/detail_queries.ts` | 11 |
| const | `findActiveOrFail` | `app/modules/tasks/infra/repositories/read/detail_queries.ts` | 22 |
| const | `findActiveOrFailAsRecord` | `app/modules/tasks/infra/repositories/read/detail_queries.ts` | 35 |
| const | `findActiveByIdsInOrganization` | `app/modules/tasks/infra/repositories/read/detail_queries.ts` | 43 |
| const | `findActiveByIdsInOrganizationAsRecords` | `app/modules/tasks/infra/repositories/read/detail_queries.ts` | 58 |
| const | `findByIdWithDetailRelations` | `app/modules/tasks/infra/repositories/read/detail_queries.ts` | 67 |
| const | `findByIdWithDetailRecord` | `app/modules/tasks/infra/repositories/read/detail_queries.ts` | 95 |
| const | `findByIdWithWriteRelations` | `app/modules/tasks/infra/repositories/read/detail_queries.ts` | 104 |
| const | `findByIdWithStatusRelations` | `app/modules/tasks/infra/repositories/read/detail_queries.ts` | 123 |
| const | `listPreviewByProject` | `app/modules/tasks/infra/repositories/read/detail_queries.ts` | 137 |
| const | `listPreviewByProjectAsRecords` | `app/modules/tasks/infra/repositories/read/detail_queries.ts` | 152 |
| const | `findRootTasksForKanban` | `app/modules/tasks/infra/repositories/read/list_queries.ts` | 20 |
| const | `findRootTasksForKanbanAsRecords` | `app/modules/tasks/infra/repositories/read/list_queries.ts` | 47 |
| const | `findTasksForTimeline` | `app/modules/tasks/infra/repositories/read/list_queries.ts` | 56 |
| const | `findTasksForTimelineAsRecords` | `app/modules/tasks/infra/repositories/read/list_queries.ts` | 77 |
| const | `paginateByOrganization` | `app/modules/tasks/infra/repositories/read/list_queries.ts` | 86 |
| const | `getListStatsByOrganization` | `app/modules/tasks/infra/repositories/read/list_queries.ts` | 166 |
| const | `paginateByUser` | `app/modules/tasks/infra/repositories/read/list_queries.ts` | 198 |
| const | `paginateByUserAsRecords` | `app/modules/tasks/infra/repositories/read/list_queries.ts` | 240 |
| const | `findRootTasksByOrganization` | `app/modules/tasks/infra/repositories/read/list_queries.ts` | 256 |
| const | `paginateOrganizationTasks` | `app/modules/tasks/infra/repositories/read/list_queries.ts` | 270 |
| const | `paginatePublicTasks` | `app/modules/tasks/infra/repositories/read/public_queries.ts` | 9 |
| const | `paginatePublicTasksAsRecords` | `app/modules/tasks/infra/repositories/read/public_queries.ts` | 113 |
| const | `LEGACY_TASK_STATUS` | `app/modules/tasks/infra/repositories/read/shared.ts` | 6 |
| const | `TERMINAL_TASK_STATUS_VALUES` | `app/modules/tasks/infra/repositories/read/shared.ts` | 13 |
| const | `STATUS_CATEGORY_SQL` | `app/modules/tasks/infra/repositories/read/shared.ts` | 18 |
| const | `getRecordField` | `app/modules/tasks/infra/repositories/read/shared.ts` | 24 |
| const | `getExtraField` | `app/modules/tasks/infra/repositories/read/shared.ts` | 31 |
| const | `toNumberValue` | `app/modules/tasks/infra/repositories/read/shared.ts` | 39 |
| type | `TaskPermissionFilter` | `app/modules/tasks/infra/repositories/read/shared.ts` | 50 |
| const | `applyPermissionFilter` | `app/modules/tasks/infra/repositories/read/shared.ts` | 56 |
| const | `baseQuery` | `app/modules/tasks/infra/repositories/read/shared.ts` | 77 |
| const | `getStatisticsByOrganization` | `app/modules/tasks/infra/repositories/read/statistics_queries.ts` | 138 |
| const | `taskDetailQueryRepository` | `app/modules/tasks/infra/repositories/read/task_detail_query_repository.ts` | 7 |
| const | `taskIdentityQueryRepository` | `app/modules/tasks/infra/repositories/read/task_identity_query_repository.ts` | 6 |
| const | `taskStatusQueryRepository` | `app/modules/tasks/infra/repositories/read/task_status_query_repository.ts` | 4 |
| class | `TaskRepositoryImpl` | `app/modules/tasks/infra/repositories/task_repository_impl.ts` | 16 |
| class | `TaskRequirementRepository` | `app/modules/tasks/infra/repositories/task_requirement_repository.ts` | 15 |
| class | `TaskStatusRepository` | `app/modules/tasks/infra/repositories/task_status_repository.ts` | 35 |
| const | `reassignByUser` | `app/modules/tasks/infra/repositories/write/task_aggregate_mutations.ts` | 11 |
| const | `unassignByUserInProjects` | `app/modules/tasks/infra/repositories/write/task_aggregate_mutations.ts` | 27 |
| const | `taskAssignmentCommandRepository` | `app/modules/tasks/infra/repositories/write/task_assignment_command_repository.ts` | 6 |
| const | `taskCommandRepository` | `app/modules/tasks/infra/repositories/write/task_command_repository.ts` | 7 |
| const | `lockForUpdate` | `app/modules/tasks/infra/repositories/write/task_mutations.ts` | 9 |
| const | `findActiveForUpdate` | `app/modules/tasks/infra/repositories/write/task_mutations.ts` | 16 |
| const | `findActiveForUpdateAsRecord` | `app/modules/tasks/infra/repositories/write/task_mutations.ts` | 22 |
| const | `updateTask` | `app/modules/tasks/infra/repositories/write/task_mutations.ts` | 35 |
| const | `create` | `app/modules/tasks/infra/repositories/write/task_mutations.ts` | 46 |
| const | `save` | `app/modules/tasks/infra/repositories/write/task_mutations.ts` | 53 |
| const | `hardDelete` | `app/modules/tasks/infra/repositories/write/task_mutations.ts` | 61 |
| const | `hardDeleteById` | `app/modules/tasks/infra/repositories/write/task_mutations.ts` | 72 |
| const | `taskAssignedV1Schema` | `app/modules/tasks/public_contracts/schemas/task_events_v1.schema.ts` | 3 |
| const | `taskAssignmentCompletedV1Schema` | `app/modules/tasks/public_contracts/schemas/task_events_v1.schema.ts` | 13 |
| interface | `ReassignOrUnassignTasksForRemovedMemberV1` | `app/modules/tasks/public_contracts/task_assignment_commands_v1.ts` | 1 |
| interface | `TaskAssignmentFactsV1` | `app/modules/tasks/public_contracts/task_assignment_facts_v1.ts` | 1 |
| interface | `TaskAssignedV1` | `app/modules/tasks/public_contracts/task_events_v1.ts` | 1 |
| interface | `TaskUnassignedV1` | `app/modules/tasks/public_contracts/task_events_v1.ts` | 11 |
| interface | `TaskStatusChangedV1` | `app/modules/tasks/public_contracts/task_events_v1.ts` | 21 |
| interface | `TaskAssignmentCompletedV1` | `app/modules/tasks/public_contracts/task_events_v1.ts` | 32 |
| class | `CreateTaskStatusDTO` | `app/modules/tasks/public_contracts/task_status_dtos.ts` | 5 |
| class | `UpdateTaskStatusDTO` | `app/modules/tasks/public_contracts/task_status_dtos.ts` | 86 |
| class | `DeleteTaskStatusDTO` | `app/modules/tasks/public_contracts/task_status_dtos.ts` | 180 |
| class | `UpdateWorkflowDTO` | `app/modules/tasks/public_contracts/task_status_dtos.ts` | 204 |
| type | `SerializedDateTime` | `app/modules/tasks/types/task_records.ts` | 2 |
| interface | `TaskRecord` | `app/modules/tasks/types/task_records.ts` | 4 |
| interface | `TaskIdentityRecord` | `app/modules/tasks/types/task_records.ts` | 59 |
| type | `TaskDetailRecord` | `app/modules/tasks/types/task_records.ts` | 64 |
| type | `TaskListRecord` | `app/modules/tasks/types/task_records.ts` | 65 |
| type | `TaskAuditValues` | `app/modules/tasks/types/task_records.ts` | 66 |
| type | `TaskDetailRelation` | `app/modules/tasks/types/task_records.ts` | 67 |
| interface | `CreateTaskRepositoryResult` | `app/modules/tasks/types/task_records.ts` | 69 |
| interface | `TaskStatusRecord` | `app/modules/tasks/types/task_records.ts` | 74 |
| interface | `TaskApplicationRecord` | `app/modules/tasks/types/task_records.ts` | 91 |
| interface | `PaginatedTaskApplicationRecords` | `app/modules/tasks/types/task_records.ts` | 109 |
| interface | `TaskWorkflowTransitionRecord` | `app/modules/tasks/types/task_records.ts` | 119 |
| interface | `TaskAssignmentWithDetailsRecord` | `app/modules/tasks/types/task_records.ts` | 130 |
| const | `taskIdRule` | `app/modules/tasks/validators/rules/database.ts` | 15 |
| const | `userIdRule` | `app/modules/tasks/validators/rules/database.ts` | 16 |
| const | `createTaskValidator` | `app/modules/tasks/validators/task.ts` | 11 |
| const | `createTaskRequestValidator` | `app/modules/tasks/validators/task.ts` | 29 |
| const | `updateTaskValidator` | `app/modules/tasks/validators/task.ts` | 72 |
| const | `updateTaskRequestValidator` | `app/modules/tasks/validators/task.ts` | 90 |
| const | `updateTaskStatusValidator` | `app/modules/tasks/validators/task.ts` | 108 |
| const | `updateTaskTimeValidator` | `app/modules/tasks/validators/task.ts` | 117 |
| const | `taskFilterValidator` | `app/modules/tasks/validators/task.ts` | 126 |
| const | `applyForTaskValidator` | `app/modules/tasks/validators/task.ts` | 143 |
| const | `applyForTaskRequestValidator` | `app/modules/tasks/validators/task.ts` | 155 |
| const | `processApplicationValidator` | `app/modules/tasks/validators/task.ts` | 167 |
| const | `processApplicationRequestValidator` | `app/modules/tasks/validators/task.ts` | 179 |
| const | `listTaskApplicationsValidator` | `app/modules/tasks/validators/task.ts` | 191 |
| const | `createTaskStatusValidator` | `app/modules/tasks/validators/task_status.ts` | 11 |
| const | `updateTaskStatusValidator` | `app/modules/tasks/validators/task_status.ts` | 34 |
| const | `updateWorkflowValidator` | `app/modules/tasks/validators/task_status.ts` | 59 |

## Import Evidence

### `app/modules/tasks/actions/base_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { CommandHandler } from './interfaces.js'
import { Result } from './result.js'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
```

### `app/modules/tasks/actions/base_query.ts`

```ts
import type { QueryHandler } from './interfaces.js'
import { Result } from './result.js'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
```

### `app/modules/tasks/actions/bootstrap/org_task_bootstrap.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { seedDefaultTaskStatuses } from '../commands/seed_default_task_statuses.js'
```

### `app/modules/tasks/actions/commands/add_task_submission_evidence_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import {
  assertHttpUrl,
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/commands/task_completion_package_access'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
```

### `app/modules/tasks/actions/commands/apply_for_task_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import { DateTime } from 'luxon'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { ApplyForTaskDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canApplyForTask } from '#modules/tasks/domain/task_assignment_rules'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import TaskApplicationRepository from '#modules/tasks/infra/repositories/task_application_repository'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'
import { ApplicationStatus } from '#modules/tasks/public_contracts/task_constants'
import type { TaskApplicationRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/commands/assign_task_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type AssignTaskDTO from '../dtos/request/assign_task_dto.js'
import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskPermissionContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { validateAssignee } from '#modules/tasks/domain/task_assignment_rules'
import { canAssignTask } from '#modules/tasks/domain/task_permission_policy'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'
import type { TaskRecord, TaskDetailRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/commands/batch_update_task_status_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { validateBatchStatusUpdate } from '#modules/tasks/domain/task_assignment_rules'
import { toLegacyTaskStatusMirror } from '#modules/tasks/domain/task_status_mirror'
import { validateWorkflowTransition } from '#modules/tasks/domain/task_status_rules'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import TaskStatusRepository from '#modules/tasks/infra/repositories/task_status_repository'
import TaskWorkflowTransitionRepository from '#modules/tasks/infra/repositories/task_workflow_transition_repository'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'
import type { TaskRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/commands/create_task_assignment_snapshot_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { canCreateTaskAssignmentSnapshot } from '#modules/tasks/domain/task_assignment_snapshot_rules'
```

### `app/modules/tasks/actions/commands/create_task_attachment_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/commands/task_completion_package_access'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
```

### `app/modules/tasks/actions/commands/create_task_command.ts`

```ts
import type CreateTaskDTO from '../dtos/request/create_task_dto.js'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { TaskDetailQueryRepositoryPort } from '#modules/tasks/actions/ports/task_query_repository_port'
import { persistTaskCreateWithinTransaction } from '#modules/tasks/actions/support/task_create_persistence_support'
import { runTaskCreatedPostCommitEffects } from '#modules/tasks/actions/support/task_create_post_commit'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { taskDetailQueryRepository } from '#modules/tasks/infra/repositories/read/task_detail_query_repository'
import type { TaskDetailRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/commands/create_task_comment_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/commands/task_completion_package_access'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
```

### `app/modules/tasks/actions/commands/create_task_status_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import type { CreateTaskStatusDTO } from '../dtos/request/task_status_dtos.js'
import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import TaskStatusRepository from '#modules/tasks/infra/repositories/task_status_repository'
import type { TaskStatusRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/commands/delete_task_attachment_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/commands/task_completion_package_access'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
```

### `app/modules/tasks/actions/commands/delete_task_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type DeleteTaskDTO from '../dtos/request/delete_task_dto.js'
import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { getErrorMessage } from '#modules/http/errors/error_utils'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskPermissionContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canDeleteTask, canPermanentDeleteTask } from '#modules/tasks/domain/task_permission_policy'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'
```

### `app/modules/tasks/actions/commands/delete_task_comment_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/commands/task_completion_package_access'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
```

### `app/modules/tasks/actions/commands/delete_task_status_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import type { DeleteTaskStatusDTO } from '../dtos/request/task_status_dtos.js'
import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canDeleteStatus } from '#modules/tasks/domain/task_status_rules'
import * as aggregateQueries from '#modules/tasks/infra/repositories/read/aggregate_queries'
import TaskStatusRepository from '#modules/tasks/infra/repositories/task_status_repository'
```

### `app/modules/tasks/actions/commands/delete_task_submission_evidence_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/commands/task_completion_package_access'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
```

### `app/modules/tasks/actions/commands/patch_task_status_board_poc_command.ts`

```ts
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskCollectionAccessContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canManageTaskStatusBoard } from '#modules/tasks/domain/task_permission_policy'
```

### `app/modules/tasks/actions/commands/process_application_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import { DateTime } from 'luxon'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { ProcessApplicationDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canProcessApplication } from '#modules/tasks/domain/task_assignment_rules'
import TaskApplicationRepository from '#modules/tasks/infra/repositories/task_application_repository'
import TaskAssignmentRepository from '#modules/tasks/infra/repositories/task_assignment_repository'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'
import { ApplicationStatus, AssignmentStatus } from '#modules/tasks/public_contracts/task_constants'
import type { TaskApplicationRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/commands/revoke_task_access_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import { projectPublicApi } from '#modules/projects/public_contracts/project_public_api'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskPermissionContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canRevokeAssignment } from '#modules/tasks/domain/task_assignment_rules'
import { canRevokeTaskAccess } from '#modules/tasks/domain/task_permission_policy'
import type { TaskAccessRevokedEvent } from '#modules/tasks/events/task_events'
import TaskAssignmentRepository from '#modules/tasks/infra/repositories/task_assignment_repository'
import { AssignmentStatus } from '#modules/tasks/public_contracts/task_constants'
import type { TaskAssignmentWithDetailsRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/commands/seed_default_task_statuses.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import TaskStatusRepository from '#modules/tasks/infra/repositories/task_status_repository'
import TaskWorkflowTransitionRepository from '#modules/tasks/infra/repositories/task_workflow_transition_repository'
import { DEFAULT_TASK_STATUSES, DEFAULT_WORKFLOW_TRANSITIONS } from '#modules/tasks/public_contracts/task_constants'
```

### `app/modules/tasks/actions/commands/submit_task_submission_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { TaskStatus, TaskStatusCategory } from '#modules/tasks/constants/task_constants'
import { canCreateTaskAssignmentSnapshot } from '#modules/tasks/domain/task_assignment_snapshot_rules'
import {
  canEditTaskSubmission,
  canSubmitTaskSubmission,
  validateTaskSubmissionPayload,
} from '#modules/tasks/domain/task_submission_rules'
```

### `app/modules/tasks/actions/commands/task_completion_package_access.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
```

### `app/modules/tasks/actions/commands/update_task_command.ts`

```ts
import type UpdateTaskDTO from '../dtos/request/update_task_dto.js'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { TaskDetailQueryRepositoryPort } from '#modules/tasks/actions/ports/task_query_repository_port'
import { persistTaskUpdateWithinTransaction } from '#modules/tasks/actions/support/update_task_persistence_support'
import { runUpdateTaskPostCommitEffects } from '#modules/tasks/actions/support/update_task_post_commit_support'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import type { TaskDetailRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/commands/update_task_sort_order_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import ValidationException from '#modules/http/exceptions/validation_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import {
  buildTaskCollectionAccessContext,
  buildTaskPermissionContext,
} from '#modules/tasks/actions/support/task_permission_context_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canReorderTask, canUpdateTaskStatus } from '#modules/tasks/domain/task_permission_policy'
import { toLegacyTaskStatusMirror } from '#modules/tasks/domain/task_status_mirror'
import { validateWorkflowTransition } from '#modules/tasks/domain/task_status_rules'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import TaskStatusRepository from '#modules/tasks/infra/repositories/task_status_repository'
import TaskWorkflowTransitionRepository from '#modules/tasks/infra/repositories/task_workflow_transition_repository'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'
import { TaskStatusCategory } from '#modules/tasks/public_contracts/task_constants'
import type { TaskDetailRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/commands/update_task_status_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type UpdateTaskStatusDTO from '../dtos/request/update_task_status_dto.js'
import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { notificationPublicApi, type NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskPermissionContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canUpdateTaskStatus } from '#modules/tasks/domain/task_permission_policy'
import { toLegacyTaskStatusMirror } from '#modules/tasks/domain/task_status_mirror'
import { validateWorkflowTransition } from '#modules/tasks/domain/task_status_rules'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import TaskStatusRepository from '#modules/tasks/infra/repositories/task_status_repository'
import TaskWorkflowTransitionRepository from '#modules/tasks/infra/repositories/task_workflow_transition_repository'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'
import type { TaskRecord, TaskDetailRecord, TaskStatusRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/commands/update_task_status_definition_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import type { UpdateTaskStatusDTO } from '../dtos/request/task_status_dtos.js'
import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canEditStatus } from '#modules/tasks/domain/task_status_rules'
import TaskStatusRepository from '#modules/tasks/infra/repositories/task_status_repository'
import type { TaskStatusRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/commands/update_task_time_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type UpdateTaskTimeDTO from '../dtos/request/update_task_time_dto.js'
import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskPermissionContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canUpdateTaskTime } from '#modules/tasks/domain/task_permission_policy'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'
import type { TaskRecord, TaskDetailRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/commands/update_workflow_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import type { UpdateWorkflowDTO } from '../dtos/request/task_status_dtos.js'
import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import ValidationException from '#modules/http/exceptions/validation_exception'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import TaskStatusRepository from '#modules/tasks/infra/repositories/task_status_repository'
import TaskWorkflowTransitionRepository from '#modules/tasks/infra/repositories/task_workflow_transition_repository'
import type { TaskWorkflowTransitionRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/commands/withdraw_application_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { WithdrawApplicationDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import TaskApplicationRepository from '#modules/tasks/infra/repositories/task_application_repository'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'
import { ApplicationStatus } from '#modules/tasks/public_contracts/task_constants'
```

### `app/modules/tasks/actions/dtos/request/assign_task_dto.ts`

```ts
import ValidationException from '#modules/http/exceptions/validation_exception'
```

### `app/modules/tasks/actions/dtos/request/create_task_dto.ts`

```ts
import { DateTime } from 'luxon'
import {
  buildCreateTaskDTOState,
  type CreateTaskDTOInput,
  type RequiredSkillInput,
} from './create_task_dto_state_builder.js'
import ValidationException from '#modules/http/exceptions/validation_exception'
```

### `app/modules/tasks/actions/dtos/request/create_task_dto_state_builder.ts`

```ts
import { DateTime } from 'luxon'
import ValidationException from '#modules/http/exceptions/validation_exception'
import { TaskLabel, TaskPriority } from '#modules/tasks/public_contracts/task_constants'
```

### `app/modules/tasks/actions/dtos/request/delete_task_dto.ts`

```ts
import ValidationException from '#modules/http/exceptions/validation_exception'
```

### `app/modules/tasks/actions/dtos/request/get_task_detail_dto.ts`

```ts
import ValidationException from '#modules/http/exceptions/validation_exception'
import { TASK_PAGINATION as PAGINATION } from '#modules/tasks/application/dtos/common/task_pagination'
```

### `app/modules/tasks/actions/dtos/request/get_tasks_list_dto.ts`

```ts
import ValidationException from '#modules/http/exceptions/validation_exception'
import { TASK_PAGINATION as PAGINATION } from '#modules/tasks/application/dtos/common/task_pagination'
```

### `app/modules/tasks/actions/dtos/request/task_application_dtos.ts`

```ts
import ValidationException from '#modules/http/exceptions/validation_exception'
import { TASK_PAGINATION as PAGINATION } from '#modules/tasks/application/dtos/common/task_pagination'
import type { ApplicationStatus } from '#modules/tasks/public_contracts/task_constants'
```

### `app/modules/tasks/actions/dtos/request/task_status_dtos.ts`

```ts
// no imports
```

### `app/modules/tasks/actions/dtos/request/update_task_dto.ts`

```ts
import type { DateTime } from 'luxon'
import {
  buildUpdateTaskPayload,
  type UpdateTaskDTOInput,
  type UpdateTaskValidatedPayload,
} from './update_task_dto_payload_builder.js'
```

### `app/modules/tasks/actions/dtos/request/update_task_dto_payload_builder.ts`

```ts
import { DateTime } from 'luxon'
import ValidationException from '#modules/http/exceptions/validation_exception'
import { TaskLabel, TaskPriority } from '#modules/tasks/public_contracts/task_constants'
```

### `app/modules/tasks/actions/dtos/request/update_task_status_dto.ts`

```ts
import ValidationException from '#modules/http/exceptions/validation_exception'
```

### `app/modules/tasks/actions/dtos/request/update_task_time_dto.ts`

```ts
import ValidationException from '#modules/http/exceptions/validation_exception'
```

### `app/modules/tasks/actions/dtos/response/task_response_dtos.ts`

```ts
import type { TaskEntity } from '#modules/tasks/domain/entities/task_entity'
```

### `app/modules/tasks/actions/interfaces.ts`

```ts
// no imports
```

### `app/modules/tasks/actions/listeners/task_completion_listener.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import type { TaskAssignmentCommandRepositoryPort } from '../ports/task_assignment_command_repository_port.js'
import loggerService from '#modules/logger/public_contracts/logger_service'
import type { TaskStatusChangedEvent } from '#modules/tasks/events/task_events'
import { taskAssignmentCommandRepository } from '#modules/tasks/infra/repositories/write/task_assignment_command_repository'
```

### `app/modules/tasks/actions/mapper/task_application_mapper.ts`

```ts
import type CreateTaskDTO from '../dtos/request/create_task_dto.js'
import type UpdateTaskDTO from '../dtos/request/update_task_dto.js'
import {
  TaskDetailResponseDTO,
  TaskListItemResponseDTO,
  TaskSummaryResponseDTO,
} from '../dtos/response/task_response_dtos.js'
import { type TaskEntity } from '#modules/tasks/domain/entities/task_entity'
```

### `app/modules/tasks/actions/mapper/task_query_output_mapper.ts`

```ts
// no imports
```

### `app/modules/tasks/actions/ports/task_assignment_command_repository_port.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
```

### `app/modules/tasks/actions/ports/task_cache_port.ts`

```ts
// no imports
```

### `app/modules/tasks/actions/ports/task_command_repository_port.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { CreateTaskPersistencePayload } from '#modules/tasks/actions/support/task_create_payload_builder'
import type { CreateTaskRepositoryResult } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/ports/task_external_dependencies.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
```

### `app/modules/tasks/actions/ports/task_public_api_repository_port.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { TaskDetailRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/ports/task_public_api_repository_port_impl.ts`

```ts
import type {
  TaskPublicApiRepositoryPort,
  TaskPublicApiTaskSummary,
} from './task_public_api_repository_port.js'
import { TaskInfraMapper } from '#modules/tasks/infra/mapper/task_infra_mapper'
import * as aggregateQueries from '#modules/tasks/infra/repositories/read/aggregate_queries'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import * as taskAssignmentQueries from '#modules/tasks/infra/repositories/read/task_assignment_queries'
import * as taskAggregateMutations from '#modules/tasks/infra/repositories/write/task_aggregate_mutations'
```

### `app/modules/tasks/actions/ports/task_query_repository_port.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { TaskDetailRecord, TaskDetailRelation, TaskIdentityRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/ports/task_status_query_repository_port.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { TaskStatusRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/public_api.ts`

```ts
// no imports
```

### `app/modules/tasks/actions/queries/check_task_create_permission_query.ts`

```ts
import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import type { TaskPermissionReader } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskCreatePermissionContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import { canCreateTask } from '#modules/tasks/domain/task_permission_policy'
```

### `app/modules/tasks/actions/queries/get_application_match_score_query.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import { calculateApplicantMatch, type MatchScoreResult } from '#modules/tasks/domain/match_formulas'
```

### `app/modules/tasks/actions/queries/get_my_applications_query.ts`

```ts
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import TaskApplicationRepository from '#modules/tasks/infra/repositories/task_application_repository'
import type { PaginatedTaskApplicationRecords } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/queries/get_public_tasks_query.ts`

```ts
import { BaseQuery } from '#modules/tasks/actions/base_query'
import type { GetPublicTasksDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import * as publicQueries from '#modules/tasks/infra/repositories/read/public_queries'
import type { TaskDetailRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/queries/get_task_applications_query.ts`

```ts
import { BaseQuery } from '#modules/tasks/actions/base_query'
import type { GetTaskApplicationsDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import TaskApplicationRepository from '#modules/tasks/infra/repositories/task_application_repository'
import type { PaginatedTaskApplicationRecords } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/queries/get_task_applications_ranking_query.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import { calculateApplicantMatch } from '#modules/tasks/domain/match_formulas'
```

### `app/modules/tasks/actions/queries/get_task_audit_logs_query.ts`

```ts
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import ValidationException from '#modules/http/exceptions/validation_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import { TASK_PAGINATION as PAGINATION } from '#modules/tasks/application/dtos/common/task_pagination'
```

### `app/modules/tasks/actions/queries/get_task_create_page_query.ts`

```ts
import CheckTaskCreatePermissionQuery from './check_task_create_permission_query.js'
import GetTaskMetadataQuery from './get_task_metadata_query.js'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
```

### `app/modules/tasks/actions/queries/get_task_detail_query.ts`

```ts
import type GetTaskDetailDTO from '../dtos/request/get_task_detail_dto.js'
import { mapTaskDetailOutput, type TaskQueryRecord } from '../mapper/task_query_output_mapper.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskPermissionContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { calculateTaskPermissions, canViewTask } from '#modules/tasks/domain/task_permission_policy'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import type { TaskDetailRecord, TaskDetailRelation } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/queries/get_task_edit_page_query.ts`

```ts
import GetTaskDetailDTO from '../dtos/request/get_task_detail_dto.js'
import type { TaskQueryRecord } from '../mapper/task_query_output_mapper.js'
import GetTaskDetailQuery from './get_task_detail_query.js'
import GetTaskMetadataQuery from './get_task_metadata_query.js'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canAccessTaskEditPage } from '#modules/tasks/domain/task_permission_policy'
```

### `app/modules/tasks/actions/queries/get_task_metadata_query.ts`

```ts
import GetTaskProjectsQuery from './get_task_projects_query.js'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import * as listQueries from '#modules/tasks/infra/repositories/read/list_queries'
import TaskStatusRepository from '#modules/tasks/infra/repositories/task_status_repository'
import { TaskLabel, TaskPriority } from '#modules/tasks/public_contracts/task_constants'
import { ProficiencyScaleRepository } from '#modules/skills/infra/repositories/proficiency_scale_repository'
```

### `app/modules/tasks/actions/queries/get_task_projects_query.ts`

```ts
import type { TaskProjectReader } from '#modules/tasks/actions/ports/task_external_dependencies'
```

### `app/modules/tasks/actions/queries/get_task_statistics_query.ts`

```ts
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskCollectionAccessContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import { buildTaskPermissionFilter } from '#modules/tasks/actions/support/task_permission_filter_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import type { TaskPermissionFilter } from '#modules/tasks/infra/repositories/read/shared'
import * as statisticsQueries from '#modules/tasks/infra/repositories/read/statistics_queries'
```

### `app/modules/tasks/actions/queries/get_task_status_board_page_query.ts`

```ts
import GetTasksListDTO from '../dtos/request/get_tasks_list_dto.js'
import GetTasksListQuery from './get_tasks_list_query.js'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
```

### `app/modules/tasks/actions/queries/get_tasks_grouped_query.ts`

```ts
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskCollectionAccessContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import { buildTaskPermissionFilter } from '#modules/tasks/actions/support/task_permission_filter_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import * as listQueries from '#modules/tasks/infra/repositories/read/list_queries'
import type { TaskPermissionFilter } from '#modules/tasks/infra/repositories/read/shared'
import TaskStatusRepository from '#modules/tasks/infra/repositories/task_status_repository'
import type { TaskDetailRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/queries/get_tasks_index_page_query.ts`

```ts
import GetTasksListDTO from '../dtos/request/get_tasks_list_dto.js'
import CheckTaskCreatePermissionQuery from './check_task_create_permission_query.js'
import GetTaskProjectsQuery from './get_task_projects_query.js'
import GetTasksPageQuery from './get_tasks_page_query.js'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
```

### `app/modules/tasks/actions/queries/get_tasks_list_query.ts`

```ts
import type GetTasksListDTO from '../dtos/request/get_tasks_list_dto.js'
import { mapTaskListOutput, type TaskListQueryRecord } from '../mapper/task_query_output_mapper.js'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskCollectionAccessContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import { buildTaskPermissionFilter } from '#modules/tasks/actions/support/task_permission_filter_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import * as listQueries from '#modules/tasks/infra/repositories/read/list_queries'
import type { TaskPermissionFilter } from '#modules/tasks/infra/repositories/read/shared'
```

### `app/modules/tasks/actions/queries/get_tasks_page_query.ts`

```ts
import type GetTasksListDTO from '../dtos/request/get_tasks_list_dto.js'
import type { TaskListQueryRecord } from '../mapper/task_query_output_mapper.js'
import GetTaskMetadataQuery from './get_task_metadata_query.js'
import GetTasksListQuery from './get_tasks_list_query.js'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
```

### `app/modules/tasks/actions/queries/get_tasks_timeline_query.ts`

```ts
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskCollectionAccessContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import { buildTaskPermissionFilter } from '#modules/tasks/actions/support/task_permission_filter_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import * as listQueries from '#modules/tasks/infra/repositories/read/list_queries'
import type { TaskPermissionFilter } from '#modules/tasks/infra/repositories/read/shared'
import type { TaskDetailRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/queries/get_user_tasks_query.ts`

```ts
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import ValidationException from '#modules/http/exceptions/validation_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import { TASK_PAGINATION as PAGINATION } from '#modules/tasks/application/dtos/common/task_pagination'
import * as listQueries from '#modules/tasks/infra/repositories/read/list_queries'
import type { TaskDetailRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/queries/list_task_statuses_query.ts`

```ts
import TaskStatusRepository from '#modules/tasks/infra/repositories/task_status_repository'
import type { TaskStatusRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/queries/list_workflow_query.ts`

```ts
import TaskWorkflowTransitionRepository from '#modules/tasks/infra/repositories/task_workflow_transition_repository'
import type { TaskWorkflowTransitionRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/result.ts`

```ts
// no imports
```

### `app/modules/tasks/actions/services/task_public_api.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import CreateTaskStatusCommand from '../commands/create_task_status_command.js'
import GetTasksListDTO from '../dtos/request/get_tasks_list_dto.js'
import type { CreateTaskStatusDTO } from '../dtos/request/task_status_dtos.js'
import type { TaskPublicApiRepositoryPort } from '../ports/task_public_api_repository_port.js'
import {
  taskPublicApiRepository,
} from '../ports/task_public_api_repository_port_impl.js'
import GetTasksIndexPageQuery, {
  type GetTasksIndexPageInput,
  type GetTasksIndexPageResult,
} from '../queries/get_tasks_index_page_query.js'
import GetTasksListQuery from '../queries/get_tasks_list_query.js'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import type { TaskStatusRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/services/task_requirement_version_service.ts`

```ts
import {
  TaskRequirementRepository,
  type TaskRequirementVersion,
  type RequirementVersionReason,
} from '#modules/tasks/infra/repositories/task_requirement_repository'
```

### `app/modules/tasks/actions/services/task_skill_requirement_service.ts`

```ts
import {
  TaskRequirementRepository,
  type TaskRequiredSkill,
} from '#modules/tasks/infra/repositories/task_requirement_repository'
import { skillPublicApi } from '#modules/skills/actions/services/skill_public_api'
```

### `app/modules/tasks/actions/support/task_create_payload_builder.ts`

```ts
import type { DateTime } from 'luxon'
import type CreateTaskDTO from '#modules/tasks/actions/dtos/request/create_task_dto'
import { toLegacyTaskStatusMirror } from '#modules/tasks/domain/task_status_mirror'
```

### `app/modules/tasks/actions/support/task_create_persistence_support.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi, type AuditLogData } from '#modules/audit/public_contracts/audit_log_writer'
import type CreateTaskDTO from '#modules/tasks/actions/dtos/request/create_task_dto'
import type { TaskCommandRepositoryPort } from '#modules/tasks/actions/ports/task_command_repository_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildCreateTaskPersistencePayload } from '#modules/tasks/actions/support/task_create_payload_builder'
import {
  ensureTaskCreationPreconditions,
  resolveTaskStatusForCreation,
} from '#modules/tasks/actions/support/task_create_preconditions'
import { persistTaskRequiredSkills } from '#modules/tasks/actions/support/task_required_skill_persistence'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { taskCommandRepository } from '#modules/tasks/infra/repositories/write/task_command_repository'
import type { TaskRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/support/task_create_post_commit.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type CreateTaskDTO from '#modules/tasks/actions/dtos/request/create_task_dto'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskUserReader } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { TaskRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/support/task_create_preconditions.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import type CreateTaskDTO from '#modules/tasks/actions/dtos/request/create_task_dto'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { TaskIdentityQueryRepositoryPort } from '#modules/tasks/actions/ports/task_query_repository_port'
import type { TaskStatusQueryRepositoryPort } from '#modules/tasks/actions/ports/task_status_query_repository_port'
import { buildTaskCreatePermissionContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import { validateTaskCreationFields } from '#modules/tasks/domain/task_assignment_rules'
import { canCreateTask } from '#modules/tasks/domain/task_permission_policy'
import { taskIdentityQueryRepository } from '#modules/tasks/infra/repositories/read/task_identity_query_repository'
import { taskStatusQueryRepository } from '#modules/tasks/infra/repositories/read/task_status_query_repository'
import type { TaskStatusRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/support/task_permission_context_builder.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { TaskPermissionReader } from '#modules/tasks/actions/ports/task_external_dependencies'
import type {
  TaskCollectionAccessContext,
  TaskCollectionScopeFallback,
  TaskCreatePermissionContext,
  TaskPermissionContext,
} from '#modules/tasks/domain/task_types'
import TaskAssignmentRepository from '#modules/tasks/infra/repositories/task_assignment_repository'
```

### `app/modules/tasks/actions/support/task_permission_filter_builder.ts`

```ts
import { resolveTaskCollectionReadScope } from '#modules/tasks/domain/task_permission_policy'
import type { TaskCollectionScopeFallback } from '#modules/tasks/domain/task_types'
import type { TaskPermissionFilter } from '#modules/tasks/infra/repositories/read/shared'
```

### `app/modules/tasks/actions/support/task_required_skill_persistence.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import type CreateTaskDTO from '#modules/tasks/actions/dtos/request/create_task_dto'
import type { TaskSkillReader } from '#modules/tasks/actions/ports/task_external_dependencies'
import TaskRequiredSkillRepository from '#modules/tasks/infra/repositories/task_required_skill_repository'
import { skillPublicApi } from '#modules/skills/actions/services/skill_public_api'
```

### `app/modules/tasks/actions/support/task_version_snapshot.ts`

```ts
// no imports
```

### `app/modules/tasks/actions/support/update_task_persistence_support.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type {
  TaskExternalDependencies,
  TaskOrgReader,
  TaskProjectReader,
  TaskUserReader,
} from '../ports/task_external_dependencies.js'
import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi, type AuditLogData } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'
import type UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'
import { buildTaskPermissionContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import {
  hasTaskVersionRelevantChanges,
} from '#modules/tasks/actions/support/task_version_snapshot'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { validateAssignee } from '#modules/tasks/domain/task_assignment_rules'
import { canUpdateTaskFields } from '#modules/tasks/domain/task_permission_policy'
import TaskVersionRepository from '#modules/tasks/infra/repositories/task_version_repository'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'
import type { TaskRecord } from '#modules/tasks/types/task_records'
```

### `app/modules/tasks/actions/support/update_task_post_commit_support.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import type { TaskUserReader } from '../ports/task_external_dependencies.js'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
```

### `app/modules/tasks/actions/task_action_context.ts`

```ts
// no imports
```

### `app/modules/tasks/controllers/apply_for_task_api_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildApplyForTaskDTO } from './mappers/request/task_application_request_mapper.js'
import { mapApplyForTaskApiBody } from './mappers/response/task_application_response_mapper.js'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { makeApplyForTaskCommand } from '#modules/tasks/bootstrap/task_action_factory'
```

### `app/modules/tasks/controllers/apply_for_task_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildApplyForTaskDTO } from './mappers/request/task_application_request_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { makeApplyForTaskCommand } from '#modules/tasks/bootstrap/task_action_factory'
```

### `app/modules/tasks/controllers/batch_update_task_status_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { makeBatchUpdateTaskStatusCommand } from '#modules/tasks/bootstrap/task_action_factory'
```

### `app/modules/tasks/controllers/check_create_permission_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import CheckTaskCreatePermissionQuery from '#modules/tasks/actions/queries/check_task_create_permission_query'
import { getTaskPermissionReader } from '#modules/tasks/bootstrap/task_action_factory'
```

### `app/modules/tasks/controllers/create_task_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildCreateTaskDTO } from './mappers/request/task_request_mapper.js'
import { mapTaskCreateApiBody } from './mappers/response/task_response_mapper.js'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import {
  makeCreateTaskCommand,
  makeGetTaskCreatePageQuery,
} from '#modules/tasks/bootstrap/task_action_factory'
```

### `app/modules/tasks/controllers/create_task_status_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildCreateTaskStatusDTO } from './mappers/request/task_status_request_mapper.js'
import { mapTaskStatusMutationApiBody } from './mappers/response/task_status_response_mapper.js'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import CreateTaskStatusCommand from '#modules/tasks/actions/commands/create_task_status_command'
```

### `app/modules/tasks/controllers/delete_task_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildDeleteTaskDTO } from './mappers/request/task_request_mapper.js'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { makeDeleteTaskCommand } from '#modules/tasks/bootstrap/task_action_factory'
```

### `app/modules/tasks/controllers/delete_task_status_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildDeleteTaskStatusDTO } from './mappers/request/task_status_request_mapper.js'
import { mapTaskStatusDeleteApiBody } from './mappers/response/task_status_response_mapper.js'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { makeDeleteTaskStatusCommand } from '#modules/tasks/bootstrap/task_action_factory'
```

### `app/modules/tasks/controllers/edit_task_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildUpdateTaskDTO } from './mappers/request/task_request_mapper.js'
import {
  mapTaskEditPageProps,
  mapTaskUpdateApiBody,
} from './mappers/response/task_response_mapper.js'
import { ErrorMessages, HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  makeGetTaskEditPageQuery,
  makeUpdateTaskCommand,
} from '#modules/tasks/bootstrap/task_action_factory'
```

### `app/modules/tasks/controllers/get_task_audit_logs_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildGetTaskAuditLogsInput } from './mappers/request/task_request_mapper.js'
import GetTaskAuditLogsQuery from '#modules/tasks/actions/queries/get_task_audit_logs_query'
```

### `app/modules/tasks/controllers/list_public_tasks_api_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildGetPublicTasksDTO } from './mappers/request/task_application_request_mapper.js'
import { mapPublicTasksApiBody } from './mappers/response/public_task_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetPublicTasksQuery from '#modules/tasks/actions/queries/get_public_tasks_query'
```

### `app/modules/tasks/controllers/list_public_tasks_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildGetPublicTasksDTO } from './mappers/request/task_application_request_mapper.js'
import { mapPublicTasksPageProps } from './mappers/response/public_task_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetPublicTasksQuery from '#modules/tasks/actions/queries/get_public_tasks_query'
```

### `app/modules/tasks/controllers/list_task_applications_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildGetTaskApplicationsDTO } from './mappers/request/task_application_request_mapper.js'
import { mapTaskApplicationsPageProps } from './mappers/response/task_application_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetTaskApplicationsQuery from '#modules/tasks/actions/queries/get_task_applications_query'
```

### `app/modules/tasks/controllers/list_task_statuses_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ListTaskStatusesQuery from '#modules/tasks/actions/queries/list_task_statuses_query'
```

### `app/modules/tasks/controllers/list_tasks_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildGetTasksIndexPageInput } from './mappers/request/task_request_mapper.js'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { makeGetTasksIndexPageQuery } from '#modules/tasks/bootstrap/task_action_factory'
```

### `app/modules/tasks/controllers/list_tasks_grouped_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { makeGetTasksGroupedQuery } from '#modules/tasks/bootstrap/task_action_factory'
```

### `app/modules/tasks/controllers/list_tasks_timeline_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { makeGetTasksTimelineQuery } from '#modules/tasks/bootstrap/task_action_factory'
```

### `app/modules/tasks/controllers/list_workflow_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ListWorkflowQuery from '#modules/tasks/actions/queries/list_workflow_query'
```

### `app/modules/tasks/controllers/mappers/request/shared.ts`

```ts
import ValidationException from '#modules/http/exceptions/validation_exception'
import type { GetPublicTasksDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import type { GetTasksIndexPageInput } from '#modules/tasks/actions/queries/get_tasks_index_page_query'
import { TASK_PAGINATION as PAGINATION } from '#modules/tasks/application/dtos/common/task_pagination'
import { ApplicationStatus } from '#modules/tasks/public_contracts/task_constants'
```

### `app/modules/tasks/controllers/mappers/request/task_application_request_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import {
  PAGINATION,
  toApplicationStatusFilter,
  toOptionalNumericValue,
  toOptionalString,
  toOptionalStringArray,
  toPositiveNumber,
  toPublicTaskSortBy,
  toPublicTaskSortOrder,
} from './shared.js'
import {
  ApplyForTaskDTO,
  GetPublicTasksDTO,
  GetTaskApplicationsDTO,
  ProcessApplicationDTO,
} from '#modules/tasks/actions/dtos/request/task_application_dtos'
import type { GetMyApplicationsInput } from '#modules/tasks/actions/queries/get_my_applications_query'
import {
  applyForTaskRequestValidator,
  processApplicationRequestValidator,
} from '#modules/tasks/validators/task'
```

### `app/modules/tasks/controllers/mappers/request/task_request_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import {
  PAGINATION,
  TASKS_DEFAULT_LIMIT,
  toOptionalNullableString,
  toOptionalNumericValue,
  toOptionalRecordArray,
  toOptionalString,
  toPositiveNumber,
  toSortOrder,
  toTaskSortBy,
} from './shared.js'
import type { PatchTaskStatusBoardPocInput } from '#modules/tasks/actions/commands/patch_task_status_board_poc_command'
import CreateTaskDTO from '#modules/tasks/actions/dtos/request/create_task_dto'
import DeleteTaskDTO from '#modules/tasks/actions/dtos/request/delete_task_dto'
import GetTaskDetailDTO from '#modules/tasks/actions/dtos/request/get_task_detail_dto'
import UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'
import UpdateTaskStatusDTO from '#modules/tasks/actions/dtos/request/update_task_status_dto'
import UpdateTaskTimeDTO from '#modules/tasks/actions/dtos/request/update_task_time_dto'
import type { GetTaskAuditLogsInput } from '#modules/tasks/actions/queries/get_task_audit_logs_query'
import type { GetTasksIndexPageInput } from '#modules/tasks/actions/queries/get_tasks_index_page_query'
import {
  createTaskRequestValidator,
  updateTaskRequestValidator,
} from '#modules/tasks/validators/task'
```

### `app/modules/tasks/controllers/mappers/request/task_status_request_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { WithdrawApplicationDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import {
  CreateTaskStatusDTO,
  DeleteTaskStatusDTO,
  UpdateTaskStatusDTO,
  UpdateWorkflowDTO,
} from '#modules/tasks/actions/dtos/request/task_status_dtos'
import { TaskStatusCategory } from '#modules/tasks/public_contracts/task_constants'
```

### `app/modules/tasks/controllers/mappers/response/public_task_response_mapper.ts`

```ts
import type { PaginationMeta, ResponseRecord, SerializableResponseRecord } from './shared.js'
import { serializeCollectionForResponse } from './shared.js'
```

### `app/modules/tasks/controllers/mappers/response/shared.ts`

```ts
// no imports
```

### `app/modules/tasks/controllers/mappers/response/task_application_response_mapper.ts`

```ts
import type { PaginationMeta, ResponseRecord, SerializableResponseRecord } from './shared.js'
import { serializeForResponse } from './shared.js'
```

### `app/modules/tasks/controllers/mappers/response/task_response_mapper.ts`

```ts
import type { ResponseRecord, SerializableResponseRecord } from './shared.js'
import { serializeForResponse } from './shared.js'
```

### `app/modules/tasks/controllers/mappers/response/task_status_response_mapper.ts`

```ts
import type { ResponseRecord, SerializableResponseRecord } from './shared.js'
import { serializeForResponse } from './shared.js'
```

### `app/modules/tasks/controllers/mappers/task_actor_context_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { TaskActorContext } from '#modules/tasks/application/context/task_actor_context'
```

### `app/modules/tasks/controllers/match_scores_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetApplicationMatchScoreQuery from '#modules/tasks/actions/queries/get_application_match_score_query'
import GetTaskApplicationsRankingQuery from '#modules/tasks/actions/queries/get_task_applications_ranking_query'
```

### `app/modules/tasks/controllers/my_applications_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildGetMyApplicationsInput } from './mappers/request/task_application_request_mapper.js'
import { mapMyApplicationsPageProps } from './mappers/response/task_application_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetMyApplicationsQuery from '#modules/tasks/actions/queries/get_my_applications_query'
```

### `app/modules/tasks/controllers/patch_task_status_board_poc_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildPatchTaskStatusBoardPocInput } from './mappers/request/task_request_mapper.js'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { makePatchTaskStatusBoardPocCommand } from '#modules/tasks/bootstrap/task_action_factory'
```

### `app/modules/tasks/controllers/process_application_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildProcessApplicationDTO } from './mappers/request/task_application_request_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { makeProcessApplicationCommand } from '#modules/tasks/bootstrap/task_action_factory'
```

### `app/modules/tasks/controllers/show_task_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildGetTaskDetailDTO } from './mappers/request/task_request_mapper.js'
import { mapTaskDetailPageProps } from './mappers/response/task_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { makeGetTaskDetailQuery } from '#modules/tasks/bootstrap/task_action_factory'
```

### `app/modules/tasks/controllers/show_task_status_board_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { makeGetTaskStatusBoardPageQuery } from '#modules/tasks/bootstrap/task_action_factory'
```

### `app/modules/tasks/controllers/task_command_initializers.ts`

```ts
// no imports
```

### `app/modules/tasks/controllers/task_submission_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import AddTaskSubmissionEvidenceCommand, {
  type AddTaskSubmissionEvidenceDTO,
} from '#modules/tasks/actions/commands/add_task_submission_evidence_command'
import CreateTaskAttachmentCommand, {
  type CreateTaskAttachmentDTO,
} from '#modules/tasks/actions/commands/create_task_attachment_command'
import CreateTaskCommentCommand, {
  type CreateTaskCommentDTO,
} from '#modules/tasks/actions/commands/create_task_comment_command'
import DeleteTaskAttachmentCommand from '#modules/tasks/actions/commands/delete_task_attachment_command'
import DeleteTaskCommentCommand from '#modules/tasks/actions/commands/delete_task_comment_command'
import DeleteTaskSubmissionEvidenceCommand from '#modules/tasks/actions/commands/delete_task_submission_evidence_command'
import SubmitTaskSubmissionCommand, {
  type SubmitTaskSubmissionDTO,
  type TaskSubmissionEvidenceInput,
} from '#modules/tasks/actions/commands/submit_task_submission_command'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/commands/task_completion_package_access'
```

### `app/modules/tasks/controllers/update_task_sort_order_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapTaskSortOrderApiBody } from './mappers/response/task_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import loggerService from '#modules/logger/public_contracts/logger_service'
import { makeUpdateTaskSortOrderCommand } from '#modules/tasks/bootstrap/task_action_factory'
```

### `app/modules/tasks/controllers/update_task_status_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildUpdateTaskStatusDTO } from './mappers/request/task_request_mapper.js'
import { mapTaskStatusApiBody } from './mappers/response/task_response_mapper.js'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { makeUpdateTaskStatusCommand } from '#modules/tasks/bootstrap/task_action_factory'
```

### `app/modules/tasks/controllers/update_task_status_definition_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildUpdateTaskStatusDefinitionDTO } from './mappers/request/task_status_request_mapper.js'
import { mapTaskStatusMutationApiBody } from './mappers/response/task_status_response_mapper.js'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UpdateTaskStatusDefinitionCommand from '#modules/tasks/actions/commands/update_task_status_definition_command'
```

### `app/modules/tasks/controllers/update_task_time_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildUpdateTaskTimeDTO } from './mappers/request/task_request_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { makeUpdateTaskTimeCommand } from '#modules/tasks/bootstrap/task_action_factory'
```

### `app/modules/tasks/controllers/update_workflow_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildUpdateWorkflowDTO } from './mappers/request/task_status_request_mapper.js'
import { mapWorkflowUpdateApiBody } from './mappers/response/task_status_response_mapper.js'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UpdateWorkflowCommand from '#modules/tasks/actions/commands/update_workflow_command'
```

### `app/modules/tasks/controllers/v1/add_task_requirement_controller.ts`

```ts
import vine from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'
import { TaskSkillRequirementService } from '#modules/tasks/actions/services/task_skill_requirement_service'
```

### `app/modules/tasks/controllers/v1/create_task_status_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { mapApiV1TaskStatusResponse } from '#modules/http/api_v1/response_mappers'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import CreateTaskStatusCommand from '#modules/tasks/actions/commands/create_task_status_command'
import { CreateTaskStatusDTO } from '#modules/tasks/public_contracts/task_status_dtos'
```

### `app/modules/tasks/controllers/v1/delete_task_status_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildDeleteTaskStatusDTO } from '../mappers/request/task_status_request_mapper.js'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { makeDeleteTaskStatusCommand } from '#modules/tasks/bootstrap/task_action_factory'
```

### `app/modules/tasks/controllers/v1/list_task_requirement_versions_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { TaskRequirementVersionService } from '#modules/tasks/actions/services/task_requirement_version_service'
```

### `app/modules/tasks/controllers/v1/list_task_requirements_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { TaskSkillRequirementService } from '#modules/tasks/actions/services/task_skill_requirement_service'
```

### `app/modules/tasks/controllers/v1/list_task_statuses_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { mapApiV1TaskStatusResponse } from '#modules/http/api_v1/response_mappers'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ListTaskStatusesQuery from '#modules/tasks/actions/queries/list_task_statuses_query'
```

### `app/modules/tasks/controllers/v1/prefill_task_requirements_from_role_controller.ts`

```ts
import vine from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'
import { TaskSkillRequirementService } from '#modules/tasks/actions/services/task_skill_requirement_service'
```

### `app/modules/tasks/controllers/v1/remove_task_requirement_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { TaskSkillRequirementService } from '#modules/tasks/actions/services/task_skill_requirement_service'
```

### `app/modules/tasks/controllers/v1/show_task_status_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { mapApiV1TaskStatusResponse } from '#modules/http/api_v1/response_mappers'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { taskStatusQueryRepository } from '#modules/tasks/infra/repositories/read/task_status_query_repository'
```

### `app/modules/tasks/controllers/v1/update_task_requirement_controller.ts`

```ts
import vine from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'
import { TaskSkillRequirementService } from '#modules/tasks/actions/services/task_skill_requirement_service'
```

### `app/modules/tasks/controllers/v1/update_task_status_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { mapApiV1TaskStatusResponse } from '#modules/http/api_v1/response_mappers'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UpdateTaskStatusDefinitionCommand from '#modules/tasks/actions/commands/update_task_status_definition_command'
import { UpdateTaskStatusDTO } from '#modules/tasks/public_contracts/task_status_dtos'
```

### `app/modules/tasks/controllers/withdraw_application_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildWithdrawApplicationDTO } from './mappers/request/task_status_request_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { makeWithdrawApplicationCommand } from '#modules/tasks/bootstrap/task_action_factory'
```
## Code Snippets

### `start/routes/tasks.ts`

```ts
import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { throttle } from '#start/limiter'

// Task use-case controllers
const ListTasksController = () => import('#modules/tasks/controllers/list_tasks_controller')
const CreateTaskController = () => import('#modules/tasks/controllers/create_task_controller')
const ShowTaskStatusBoardController = () =>
  import('#modules/tasks/controllers/show_task_status_board_controller')
const ShowTaskController = () => import('#modules/tasks/controllers/show_task_controller')
const EditTaskController = () => import('#modules/tasks/controllers/edit_task_controller')
const DeleteTaskController = () => import('#modules/tasks/controllers/delete_task_controller')
const UpdateTaskStatusController = () =>
  import('#modules/tasks/controllers/update_task_status_controller')
const UpdateTaskTimeController = () =>
  import('#modules/tasks/controllers/update_task_time_controller')
const GetTaskAuditLogsController = () =>
  import('#modules/tasks/controllers/get_task_audit_logs_controller')
const TaskSubmissionController = () =>
  import('#modules/tasks/controllers/task_submission_controller')
const MatchScoresController = () =>
  import('#modules/tasks/controllers/match_scores_controller')

// Task Application use-case controllers
const ListTaskApplicationsController = () =>
  import('#modules/tasks/controllers/list_task_applications_controller')
const ApplyForTaskController = () => import('#modules/tasks/controllers/apply_for_task_controller')
const ProcessApplicationController = () =>
  import('#modules/tasks/controllers/process_application_controller')
const WithdrawApplicationController = () =>
  import('#modules/tasks/controllers/withdraw_application_controller')
const MyApplicationsController = () =>
  import('#modules/tasks/controllers/my_applications_controller')
const ListPublicTasksController = () =>
  import('#modules/tasks/controllers/list_public_tasks_controller')
const ListPublicTasksApiController = () =>
  import('#modules/tasks/controllers/list_public_tasks_api_controller')
const ApplyForTaskApiController = () =>
  import('#modules/tasks/controllers/apply_for_task_api_controller')
const CheckCreatePermissionController = () =>
  import('#modules/tasks/controllers/check_create_permission_controller')
const ListTasksGroupedController = () =>
  import('#modules/tasks/controllers/list_tasks_grouped_controller')
const ListTasksTimelineController = () =>
  import('#modules/tasks/controllers/list_tasks_timeline_controller')
const UpdateTaskSortOrderController = () =>
  import('#modules/tasks/controllers/update_task_sort_order_controller')
const BatchUpdateTaskStatusController = () =>
  import('#modules/tasks/controllers/batch_update_task_status_controller')
const PatchTaskStatusBoardPocController = () =>
  import('#modules/tasks/controllers/patch_task_status_board_poc_controller')

// Task Status + Workflow controllers (Phase 4)
const ListTaskStatusesController = () =>
  import('#modules/tasks/controllers/list_task_statuses_controller')
const CreateTaskStatusController = () =>
  import('#modules/tasks/controllers/create_task_status_controller')
const UpdateTaskStatusDefinitionController = () =>
  import('#modules/tasks/controllers/update_task_status_definition_controller')
const DeleteTaskStatusController = () =>
  import('#modules/tasks/controllers/delete_task_status_controller')
const ListWorkflowController = () => import('#modules/tasks/controllers/list_workflow_controller')
const UpdateWorkflowController = () =>
  import('#modules/tasks/controllers/update_workflow_controller')

router
  .group(() => {
    // Tasks routes — use-case controllers
    router.get('/tasks', [ListTasksController, 'handle']).as('tasks.index')

    // API routes for task management views
    router
      .get('/api/tasks/check-create-permission', [CheckCreatePermissionController, 'handle'])
      .as('api.tasks.check_create_permission')
    router.get('/api/tasks/grouped', [ListTasksGroupedController, 'handle']).as('api.tasks.grouped')
    router
      .get('/api/tasks/timeline', [ListTasksTimelineController, 'handle'])
      .as('api.tasks.timeline')
    router
      .patch('/api/tasks/batch-status', [BatchUpdateTaskStatusController, 'handle'])
      .as('api.tasks.batch_status')
    router
      .patch('/api/tasks/status-board', [PatchTaskStatusBoardPocController, 'handle'])
      .as('api.tasks.status_board')
    router
      .patch('/api/tasks/:id/sort-order', [UpdateTaskSortOrderController, 'handle'])
      .as('api.tasks.sort_order')
    router
      .get('/api/tasks/:id/submission', [TaskSubmissionController, 'show'])
      .as('api.tasks.submission.show')
    router
      .post('/api/tasks/:id/submission', [TaskSubmissionController, 'saveDraft'])
      .as('api.tasks.submission.store')
    router
      .patch('/api/tasks/:id/submission', [TaskSubmissionController, 'saveDraft'])
      .as('api.tasks.submission.update')
    router
      .post('/api/tasks/:id/submission/submit', [TaskSubmissionController, 'submit'])
      .as('api.tasks.submission.submit')
    router
      .post('/api/tasks/:id/submission/lock', [TaskSubmissionController, 'lock'])
      .as('api.tasks.submission.lock')
    router
      .get('/api/task-submissions/:submissionId/evidences', [
        TaskSubmissionController,
        'listEvidences',
      ])
      .as('api.task_submissions.evidences.index')
    router
      .post('/api/task-submissions/:submissionId/evidences', [
        TaskSubmissionController,
        'addEvidence',
      ])
      .as('api.task_submissions.evidences.store')
    router
      .delete('/api/task-submissions/:submissionId/evidences/:evidenceId', [
        TaskSubmissionController,
        'deleteEvidence',
      ])
      .as('api.task_submissions.evidences.destroy')
    router
      .get('/api/tasks/:taskId/comments', [TaskSubmissionController, 'listComments'])
      .as('api.tasks.comments.index')
    router
      .post('/api/tasks/:taskId/comments', [TaskSubmissionController, 'createComment'])
      .as('api.tasks.comments.store')
    router
      .patch('/api/tasks/:taskId/comments/:commentId', [
        TaskSubmissionController,
        'updateComment',
      ])
      .as('api.tasks.comments.update')
    router
      .delete('/api/tasks/:taskId/comments/:commentId', [
        TaskSubmissionController,
        'deleteComment',
      ])
      .as('api.tasks.comments.destroy')
    router
      .get('/api/tasks/:taskId/attachments', [TaskSubmissionController, 'listAttachments'])
      .as('api.tasks.attachments.index')
    router
      .post('/api/tasks/:taskId/attachments', [TaskSubmissionController, 'createAttachment'])
      .as('api.tasks.attachments.store')
    router
      .delete('/api/tasks/:taskId/attachments/:attachmentId', [
        TaskSubmissionController,
        'deleteAttachment',
      ])
      .as('api.tasks.attachments.destroy')

    router.get('/tasks/create', [CreateTaskController, 'showForm']).as('tasks.create')
    router
      .get('/tasks/status-board', [ShowTaskStatusBoardController, 'handle'])
      .as('tasks.status_board')
    router.post('/tasks', [CreateTaskController, 'handle']).as('tasks.store')
    router.get('/tasks/:id', [ShowTaskController, 'handle']).as('tasks.show')
    router.get('/tasks/:id/edit', [EditTaskController, 'showForm']).as('tasks.edit')
    router.put('/tasks/:id', [EditTaskController, 'handle']).as('tasks.update')
    router
      .put('/tasks/:id/status', [UpdateTaskStatusController, 'handle'])
      .as('tasks.update.status')
    router.patch('/tasks/:id/time', [UpdateTaskTimeController, 'handle']).as('tasks.update.time')
    router.delete('/tasks/:id', [DeleteTaskController, 'handle']).as('tasks.destroy')
    // Audit logs routes for tasks
    router
      .get('/tasks/:id/audit-logs', [GetTaskAuditLogsController, 'handle'])
      .as('tasks.audit_logs')

    // Task Applications - for project owners
    router
      .get('/tasks/:taskId/applications', [ListTaskApplicationsController, 'handle'])
      .as('tasks.applications')
    router.post('/tasks/:taskId/apply', [ApplyForTaskController, 'handle']).as('tasks.apply')

    router
      .get('/api/tasks/:taskId/applications/:applicationId/match', [MatchScoresController, 'show'])
      .as('api.tasks.applications.match')
    router
      .get('/api/tasks/:taskId/applications/ranking', [MatchScoresController, 'ranking'])
      .as('api.tasks.applications.ranking')

    // Application processing
    router
      .post('/applications/:id/process', [ProcessApplicationController, 'handle'])
      .as('applications.process')
    router
      .post('/applications/:id/withdraw', [WithdrawApplicationController, 'handle'])
      .as('applications.withdraw')

    // My applications - for freelancers
    router.get('/my-applications', [MyApplicationsController, 'handle']).as('applications.mine')

    // ── Task Status CRUD (Phase 4) ──────────────────────────────────────
    router
      .get('/api/task-statuses', [ListTaskStatusesController, 'handle'])
      .as('api.task_statuses.index')
    router
      .post('/api/task-statuses', [CreateTaskStatusController, 'handle'])
      .as('api.task_statuses.store')
    router
      .put('/api/task-statuses/:id', [UpdateTaskStatusDefinitionController, 'handle'])
      .as('api.task_statuses.update')
    router
      .delete('/api/task-statuses/:id', [DeleteTaskStatusController, 'handle'])
      .as('api.task_statuses.destroy')

    // ── Workflow Transitions (Phase 4) ──────────────────────────────────
    router.get('/api/workflow', [ListWorkflowController, 'handle']).as('api.workflow.index')
    router.put('/api/workflow', [UpdateWorkflowController, 'handle']).as('api.workflow.update')
  })
  .use([middleware.auth(), middleware.requireOrg(), throttle])

// Marketplace routes - public tasks for freelancers
router
  .group(() => {
    router.get('/marketplace/tasks', [ListPublicTasksController, 'handle']).as('marketplace.tasks')
    router
      .get('/api/marketplace/tasks', [ListPublicTasksApiController, 'handle'])
      .as('api.marketplace.tasks')
    router
      .post('/api/tasks/:taskId/apply', [ApplyForTaskApiController, 'handle'])
      .as('api.tasks.apply')
  })
  .use([middleware.auth()])

```

### `app/modules/tasks/actions/commands/apply_for_task_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { ApplyForTaskDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canApplyForTask } from '#modules/tasks/domain/task_assignment_rules'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import TaskApplicationRepository from '#modules/tasks/infra/repositories/task_application_repository'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'
import { ApplicationStatus } from '#modules/tasks/public_contracts/task_constants'
import type { TaskApplicationRecord } from '#modules/tasks/types/task_records'

/**
 * ApplyForTaskCommand
 *
 * Allows a freelancer to apply for a public task.
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class ApplyForTaskCommand extends BaseCommand<
  ApplyForTaskDTO,
  TaskApplicationRecord
> {
  constructor(
    execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies,
    private cache: TaskCachePort
  ) {
    super(execCtx)
  }

  async handle(dto: ApplyForTaskDTO): Promise<TaskApplicationRecord> {
    const result = await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()
      await this.taskExternalDependencies.user.ensureActiveUser(userId, trx)

      // ── FETCH ──────────────────────────────────────────────────────────
      const task = await detailQueries.findActiveOrFailAsRecord(dto.task_id, trx)

      const existingApplication =
        await TaskApplicationRepository.findExistingNonWithdrawnByTaskAndApplicant(
          dto.task_id,
          userId,
          trx
        )

      // ── DECIDE (pure, sync) ────────────────────────────────────────────
      const applicationDeadline = task.application_deadline
      enforcePolicy(
        canApplyForTask({
          actorId: userId,
          taskCreatorId: task.creator_id,
          taskVisibility: task.task_visibility ?? '',
          isTaskAlreadyAssigned: task.assigned_to !== null,
          isApplicationDeadlinePassed:
            typeof applicationDeadline === 'string' &&
            new Date(applicationDeadline).getTime() <= DateTime.now().toMillis(),
          hasExistingApplication: !!existingApplication,
        })
      )

      // ── PERSIST ────────────────────────────────────────────────────────
      const application = await TaskApplicationRepository.create(
        {
          task_id: dto.task_id,
          applicant_id: userId,
          application_status: ApplicationStatus.PENDING,
          application_source: dto.application_source,
          message: dto.message,
          expected_rate: dto.expected_rate,
          portfolio_links: dto.portfolio_links,
        },
        trx
      )

      // Update task's application count
      await taskMutations.updateTask(
        dto.task_id,
        { external_applications_count: (task.external_applications_count ?? 0) + 1 },
        trx
      )

      // Log audit
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'apply_task',
          entity_type: 'task_application',
          entity_id: application.id,
          old_values: null,
          new_values: {
            task_id: dto.task_id,
            task_title: task.title,
            expected_rate: dto.expected_rate,
          },
        })
      }

      return {
        application,
        taskId: dto.task_id,
        applicationSubmittedEvent: {
          applicationId: application.id,
          taskId: dto.task_id,
          applicantId: userId,
          projectId: task.project_id ?? '',
          ownerId: task.creator_id,
        },
      }
    })

    await this.cache.invalidateAfterTaskApplicationChanged(result.taskId)
    void emitter.emit('task:application:submitted', result.applicationSubmittedEvent)

    return result.application
  }
}

```

### `app/modules/tasks/actions/commands/assign_task_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type AssignTaskDTO from '../dtos/request/assign_task_dto.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskPermissionContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { validateAssignee } from '#modules/tasks/domain/task_assignment_rules'
import { canAssignTask } from '#modules/tasks/domain/task_permission_policy'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'
import type { TaskRecord, TaskDetailRecord } from '#modules/tasks/types/task_records'

interface PersistedTaskAssignment {
  task: TaskRecord
  oldAssignedTo: string | null
}

/**
 * Command để giao task cho người dùng
 *
 * Business Rules:
 * - Assign/Reassign/Unassign
 * - User phải thuộc cùng organization hoặc là freelancer
 * - Notification gửi cho assignee mới (và có thể old assignee)
 * - Audit log đầy đủ
 *
 * Pattern: FETCH → DECIDE → PERSIST → POST-COMMIT
 */
export default class AssignTaskCommand {
  constructor(
    protected execCtx: TaskActionContext,
    private createNotification: NotificationCreator,
    private taskExternalDependencies: TaskExternalDependencies,
    private cache: TaskCachePort
  ) {}

  async execute(dto: AssignTaskDTO): Promise<TaskDetailRecord> {
    const userId = this.requireUserId()
    const assignmentResult = await this.persistAssignmentInTransaction(dto, userId)
    await this.runPostCommitEffects(assignmentResult, dto, userId)
    return await detailQueries.findByIdWithDetailRecord(assignmentResult.task.id)
  }

  private requireUserId(): string {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    return userId
  }

  private async loadTaskForAssignment(
    taskId: string,
    trx: TransactionClientContract
  ): Promise<TaskRecord> {
    return taskMutations.findActiveForUpdateAsRecord(taskId, trx)
  }

  private async ensureAssignmentPreconditions(
    userId: string,
    dto: AssignTaskDTO,
    task: TaskRecord,
    trx: TransactionClientContract
  ): Promise<void> {
    const permissionContext = await buildTaskPermissionContext(
      userId,
      task,
      trx,
      this.taskExternalDependencies.permission
    )
    enforcePolicy(canAssignTask(permissionContext))

    if (!dto.isAssigning() || dto.assigned_to === null) {
      return
    }

    const assignee = await this.taskExternalDependencies.user.findUserIdentity(
      dto.assigned_to,
      trx
    )
    if (!assignee) {
      throw new NotFoundException('Người được giao không tồn tại')
    }

    const isMember = await this.taskExternalDependencies.org.isApprovedMember(
      dto.assigned_to,
      task.organization_id,
      trx
    )
    const isFreelancer = await this.taskExternalDependencies.user.isFreelancer(
      dto.assigned_to,
      trx
    )

    enforcePolicy(
      validateAssignee({
        isOrgMember: isMember,
        isFreelancer,
        taskVisibility: task.task_visibility ?? 'public',
      })
    )
  }

  private async persistAssignment(
    task: TaskRecord,
    dto: AssignTaskDTO,
    userId: string,
    trx: TransactionClientContract
  ): Promise<PersistedTaskAssignment> {
    const oldAssignedTo = task.assigned_to
    const oldValues = { ...task }

    const updatedTask = await taskMutations.updateTask(
      task.id,
      {
        assigned_to: dto.assigned_to,
        updated_by: userId,
      },
      trx
    )

    await auditPublicApi.log(
      {
        user_id: userId,
        action: dto.isUnassigning() ? AuditAction.UNASSIGN : AuditAction.ASSIGN,
        entity_type: EntityType.TASK,
        entity_id: dto.task_id,
        old_values: oldValues,
        new_values: { ...updatedTask },
      },
      this.execCtx
    )

    return {
      task: updatedTask,
      oldAssignedTo,
    }
  }

  private async persistAssignmentInTransaction(
    dto: AssignTaskDTO,
    userId: string
  ): Promise<PersistedTaskAssignment> {
    const trx = await db.transaction()

    try {
      const task = await this.loadTaskForAssignment(dto.task_id, trx)
      await this.ensureAssignmentPreconditions(userId, dto, task, trx)
      const result = await this.persistAssignment(task, dto, userId, trx)
      await trx.commit()
      return result
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private async runPostCommitEffects(
    result: PersistedTaskAssignment,
    dto: AssignTaskDTO,
    userId: string
  ): Promise<void> {
    if (dto.isAssigning() && dto.assigned_to !== null) {
      void emitter.emit('task:assigned', {
        taskId: dto.task_id,
        assigneeId: dto.assigned_to,
        assignedBy: userId,
        assignmentType: 'assign',
      })
    }

    await this.cache.invalidateAfterTaskAssigned(dto.task_id)

    if (dto.shouldNotify()) {
      await this.sendAssignmentNotifications(result.task, userId, dto, result.oldAssignedTo)
    }
  }

  /**
   * Send notifications cho assignment
   */
  private async sendAssignmentNotifications(
    task: TaskRecord,
    assignerId: string,
    dto: AssignTaskDTO,
    oldAssignedTo: string | null
  ): Promise<void> {
    try {
      const assigner = await this.taskExternalDependencies.user.findUserIdentity(assignerId)
      if (!assigner) return

      const assignerName = assigner.username

      if (dto.isUnassigning() && oldAssignedTo && oldAssignedTo !== assigner.id) {
        const oldAssignee = await this.taskExternalDependencies.user.findUserIdentity(
          oldAssignedTo
        )
        if (oldAssignee) {
          await this.createNotification.handle({
            user_id: oldAssignee.id,
            title: 'Cập nhật nhiệm vụ',
            message: dto.getNotificationMessage(task.title, assignerName),
            type: BACKEND_NOTIFICATION_TYPES.TASK_UNASSIGNED,
            related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
            related_entity_id: task.id,
          })
        }
      }

      if (dto.isAssigning() && dto.assigned_to !== null && dto.assigned_to !== assigner.id) {
        const newAssignee = await this.taskExternalDependencies.user.findUserIdentity(
          dto.assigned_to
        )
        if (newAssignee) {
          await this.createNotification.handle({
            user_id: newAssignee.id,
            title: 'Bạn có nhiệm vụ mới',
            message: dto.getNotificationMessage(task.title, assignerName),
            type: BACKEND_NOTIFICATION_TYPES.TASK_ASSIGNED,
            related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
            related_entity_id: task.id,
          })
        }

        if (oldAssignedTo && oldAssignedTo !== dto.assigned_to && oldAssignedTo !== assigner.id) {
          const oldAssignee = await this.taskExternalDependencies.user.findUserIdentity(
            oldAssignedTo
          )
          if (oldAssignee) {
            await this.createNotification.handle({
              user_id: oldAssignee.id,
              title: 'Cập nhật nhiệm vụ',
              message: `${assignerName} đã chuyển nhiệm vụ "${task.title}" cho người khác`,
              type: BACKEND_NOTIFICATION_TYPES.TASK_REASSIGNED,
              related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
              related_entity_id: task.id,
            })
          }
        }
      }
    } catch (error) {
      this.logError('Failed to send assignment notifications', error)
    }
  }

  /**
   * Log error
   */
  private logError(message: string, error: unknown): void {
    loggerService.error(`[AssignTaskCommand] ${message}`, error)
  }

}

```

### `app/modules/tasks/actions/commands/batch_update_task_status_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { validateBatchStatusUpdate } from '#modules/tasks/domain/task_assignment_rules'
import { toLegacyTaskStatusMirror } from '#modules/tasks/domain/task_status_mirror'
import { validateWorkflowTransition } from '#modules/tasks/domain/task_status_rules'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import TaskStatusRepository from '#modules/tasks/infra/repositories/task_status_repository'
import TaskWorkflowTransitionRepository from '#modules/tasks/infra/repositories/task_workflow_transition_repository'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'
import type { TaskRecord } from '#modules/tasks/types/task_records'

/**
 * Command để batch update status cho nhiều tasks cùng lúc
 *
 * v4: Uses DB-driven workflow validation via task_workflow_transitions.
 * Accepts task_status_id (UUID) instead of status string.
 *
 * Used by: Multi-select → bulk status change
 *
 * Pattern: FETCH → DECIDE → PERSIST (per task)
 */
export default class BatchUpdateTaskStatusCommand {
  constructor(
    protected execCtx: TaskActionContext,
    private cache: TaskCachePort
  ) {}

  async execute(
    taskIds: string[],
    newTaskStatusId: string,
    organizationId: string
  ): Promise<{ updated: number; failed: string[] }> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    // Validate batch request via pure rule
    enforcePolicy(
      validateBatchStatusUpdate({
        taskCount: taskIds.length,
        newStatusId: newTaskStatusId,
        maxBatchSize: 50,
      })
    )

    const trx = await db.transaction()
    try {
      // Verify the target status exists and belongs to this org
      const newStatus = await TaskStatusRepository.findByIdAndOrgActive(
        newTaskStatusId,
        organizationId,
        trx
      )

      if (!newStatus) {
        throw new BusinessLogicException(
          'Trạng thái mới không tồn tại hoặc không thuộc tổ chức này'
        )
      }

      // ── FETCH ──────────────────────────────────────────────────────────
      const tasks = await detailQueries.findActiveByIdsInOrganizationAsRecords(
        taskIds,
        organizationId,
        trx
      )

      // Atomic mode: if any requested task is missing from organization scope, fail the whole batch.
      if (tasks.length !== taskIds.length) {
        const foundIds = new Set(tasks.map((task) => task.id))
        const missingIds = taskIds.filter((id) => !foundIds.has(id))
        throw new ConflictException(
          `Không thể cập nhật hàng loạt vì có task không hợp lệ hoặc ngoài phạm vi tổ chức: ${missingIds.join(', ')}`
        )
      }

      // ── DECIDE + PERSIST (per task) ────────────────────────────────────
      let updated = 0
      const eventsToEmit: { task: TaskRecord; oldStatus: string }[] = []
      const workflowTransitions = await TaskWorkflowTransitionRepository.findByOrganization(
        organizationId,
        trx
      )
      const workflowConfigured = workflowTransitions.length > 0

      for (const task of tasks) {
        const currentStatusId = task.task_status_id

        if (!currentStatusId) {
          throw new ConflictException(
            `Không thể cập nhật task ${task.id} vì thiếu task_status_id hợp lệ`
          )
        }

        const transitions = workflowTransitions.filter(
          (transition) => transition.from_status_id === currentStatusId
        )

        const matchingTransition = transitions.find((t) => t.to_status_id === newTaskStatusId)

        const result = validateWorkflowTransition({
          currentStatusId,
          newStatusId: newTaskStatusId,
          allowedTargetIds: transitions.map((t) => t.to_status_id),
          workflowConfigured,
          conditions: matchingTransition?.conditions ?? {},
          isAssigned: task.assigned_to !== null,
        })

        if (!result.allowed) {
          throw new ConflictException(
            `Không thể chuyển trạng thái task ${task.id} theo workflow hiện tại`
          )
        }

        if (newStatus.category === 'done') {
          const bypassTypes = [
            'research_spike',
            'poc',
            'prototype',
            'technical_writing',
            'documentation',
            'knowledge_transfer',
            'mentoring',
            'product_management',
          ]
          if (!(task.task_type && bypassTypes.includes(task.task_type))) {
            const submission = (await trx
              .from('task_submissions')
              .where('task_id', task.id)
              .whereIn('status', ['submitted', 'accepted_for_review', 'locked'])
              .first()) as Record<string, unknown> | null | undefined

            if (!submission) {
              throw new ConflictException(
                `Không thể chuyển trạng thái task ${task.id} sang DONE vì thiếu submission hợp lệ`
              )
            }
          }
        }

        const oldStatus = task.status
        const oldTaskStatusId = task.task_status_id
        
        const updatedTask = await taskMutations.updateTask(
          task.id,
          {
            task_status_id: newTaskStatusId,
            status: toLegacyTaskStatusMirror(newStatus),
            updated_by: userId,
          },
          trx
        )
        updated++

        // Queue event and emit after commit.
        if (oldTaskStatusId !== newTaskStatusId) {
          eventsToEmit.push({ task: updatedTask, oldStatus })
        }
      }

      await trx.commit()

      for (const event of eventsToEmit) {
        void emitter.emit('task:status:changed', {
          taskId: event.task.id,
          assignedTo: event.task.assigned_to,
          oldStatus: event.oldStatus,
          newStatusId: newTaskStatusId,
          newStatus: newStatus.slug,
          newStatusCategory: newStatus.category,
          changedBy: userId,
        })
      }

      await this.cache.invalidateAfterTaskCreated()
      for (const taskId of taskIds) {
        await this.cache.invalidateAfterTaskUpdated(taskId)
      }

      return { updated, failed: [] }
    } catch (error) {
      await trx.rollback()
      if (error instanceof ConflictException) {
        loggerService.warn('[BatchUpdateTaskStatusCommand] Conflict:', error.message)
      } else {
        loggerService.error('[BatchUpdateTaskStatusCommand] Error:', error)
      }
      throw error
    }
  }
}

```

### `app/modules/tasks/actions/commands/create_task_command.ts`

```ts
import type CreateTaskDTO from '../dtos/request/create_task_dto.js'

import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { TaskDetailQueryRepositoryPort } from '#modules/tasks/actions/ports/task_query_repository_port'
import { persistTaskCreateWithinTransaction } from '#modules/tasks/actions/support/task_create_persistence_support'
import { runTaskCreatedPostCommitEffects } from '#modules/tasks/actions/support/task_create_post_commit'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { taskDetailQueryRepository } from '#modules/tasks/infra/repositories/read/task_detail_query_repository'
import type { TaskDetailRecord } from '#modules/tasks/types/task_records'

interface CreateTaskCommandDependencies {
  persistTaskCreateWithinTransaction: typeof persistTaskCreateWithinTransaction
  runTaskCreatedPostCommitEffects: typeof runTaskCreatedPostCommitEffects
  taskRepository: TaskDetailQueryRepositoryPort
}

const defaultDependencies: CreateTaskCommandDependencies = {
  persistTaskCreateWithinTransaction,
  runTaskCreatedPostCommitEffects,
  taskRepository: taskDetailQueryRepository,
}

/**
 * Command để tạo task mới
 *
 * Business Rules:
 * - organization_id là bắt buộc (từ session)
 * - creator_id tự động set từ auth.user
 * - Notification gửi cho assignee nếu task được giao
 * - Audit log đầy đủ
 * - Transaction để ensure data consistency
 *
 * Permissions:
 * - User phải đăng nhập
 * - User phải thuộc organization
 * - Có thể thêm permission check (admin/member) nếu cần
 */
export default class CreateTaskCommand extends BaseCommand<CreateTaskDTO, TaskDetailRecord> {
  constructor(
    execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies,
    private createNotification: NotificationCreator,
    private cache: TaskCachePort,
    private dependencies: CreateTaskCommandDependencies = defaultDependencies
  ) {
    super(execCtx)
  }

  /**
   * Execute command để tạo task
   *
   * Di chuyển logic từ database procedure create_task:
   * 1. Check creator active
   * 2. Check org exists
   * 3. Check permission (admin/owner OR project_manager)
   * 4. Validate project thuộc org
   * 5. Validate status/label/priority exists
   * 6. Validate due_date not past
   */
  async handle(dto: CreateTaskDTO): Promise<TaskDetailRecord> {
    const userId = this.getCurrentUserId()
    const newTask = await this.executeInTransaction((trx) =>
      this.dependencies.persistTaskCreateWithinTransaction({
        execCtx: this.execCtx,
        dto,
        userId,
        trx,
        externalDependencies: this.taskExternalDependencies,
      })
    )
    await this.dependencies.runTaskCreatedPostCommitEffects(
      newTask,
      dto,
      userId,
      this.createNotification,
      this.taskExternalDependencies.user,
      this.cache
    )
    return await this.dependencies.taskRepository.findByIdWithDetailRecord(newTask.id)
  }

  async execute(dto: CreateTaskDTO): Promise<TaskDetailRecord> {
    return await this.handle(dto)
  }

}

```

### `app/modules/tasks/actions/commands/create_task_status_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'

import type { CreateTaskStatusDTO } from '../dtos/request/task_status_dtos.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import TaskStatusRepository from '#modules/tasks/infra/repositories/task_status_repository'
import type { TaskStatusRecord } from '#modules/tasks/types/task_records'

/**
 * Command: Create a new task status for an organization.
 *
 * Business rules:
 * - Slug must be unique within organization
 * - If is_default=true, unset other defaults
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class CreateTaskStatusCommand {
  constructor(protected execCtx: TaskActionContext) {}

  async execute(dto: CreateTaskStatusDTO): Promise<TaskStatusRecord> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const trx = await db.transaction()

    try {
      // ── FETCH ──────────────────────────────────────────────────────────
      const slugExists = await TaskStatusRepository.slugExists(
        dto.organization_id,
        dto.slug,
        undefined,
        trx
      )

      // ── DECIDE ─────────────────────────────────────────────────────────
      if (slugExists) {
        throw new ConflictException(`Slug '${dto.slug}' đã tồn tại trong tổ chức này`)
      }

      // ── PERSIST ────────────────────────────────────────────────────────
      const status = await TaskStatusRepository.create(
        {
          organization_id: dto.organization_id,
          name: dto.name,
          slug: dto.slug,
          category: dto.category,
          color: dto.color,
          icon: dto.icon ?? null,
          description: dto.description ?? null,
          sort_order: dto.sort_order,
          is_default: false,
          is_system: false,
        },
        trx
      )

      await auditPublicApi.log(
        {
          user_id: userId,
          action: AuditAction.CREATE,
          entity_type: EntityType.TASK_STATUS,
          entity_id: status.id,
          new_values: status,
        },
        this.execCtx
      )

      await trx.commit()
      return status
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}

```

### `app/modules/tasks/actions/commands/delete_task_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import type DeleteTaskDTO from '../dtos/request/delete_task_dto.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { getErrorMessage } from '#modules/http/errors/error_utils'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskPermissionContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canDeleteTask, canPermanentDeleteTask } from '#modules/tasks/domain/task_permission_policy'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'

/**
 * Command để xóa task
 *
 * Business Rules:
 * - Soft delete mặc định (set deleted_at)
 * - Hard delete chỉ dành cho Superadmin (optional feature)
 * - Không thể xóa task đã có actual hours (cần revoke trước)
 * - Không thể xóa task đã có review session
 * - Notify assignee và creator
 * - Audit log đầy đủ
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class DeleteTaskCommand {
  constructor(
    protected execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies,
    private createNotification: NotificationCreator,
    private cache: TaskCachePort
  ) {}

  /**
   * Execute command để xóa task
   */
  async execute(dto: DeleteTaskDTO): Promise<{ success: boolean; message: string }> {
    const userId = this.execCtx.userId
    if (!userId) {
      return {
        success: false,
        message: 'Bạn cần đăng nhập để thực hiện hành động này',
      }
    }

    const trx = await db.transaction()
    try {
      // ── FETCH ──────────────────────────────────────────────────────────
      const task = await taskMutations.findActiveForUpdateAsRecord(dto.task_id, trx)

      // ── DECIDE (pure, sync) ────────────────────────────────────────────
      const permissionContext = await buildTaskPermissionContext(
        userId,
        task,
        trx,
        this.taskExternalDependencies.permission
      )
      enforcePolicy(
        canDeleteTask({
          ...permissionContext,
          isActorOrgMember: permissionContext.actorOrgRole !== null,
        })
      )

      // Hard delete requires superadmin (pure rule)
      if (dto.isPermanentDelete()) {
        enforcePolicy(
          canPermanentDeleteTask({ actorSystemRole: permissionContext.actorSystemRole })
        )
      }

      // ── Business rule: không thể xóa task đã có actual hours ──────────
      if (task.actual_time && task.actual_time > 0) {
        throw new BusinessLogicException(
          'Không thể xóa task đã có actual hours. Cần revoke task trước khi xóa.'
        )
      }

      // ── Business rule: không thể xóa task đã có review session ────────
      const hasReviewSession = await this.taskExternalDependencies.review.hasAnyReviewForTask(
        task.id,
        trx
      )
      if (hasReviewSession) {
        throw new BusinessLogicException(
          'Không thể xóa task đã có review session. Cần xử lý review trước khi xóa.'
        )
      }

      // ── PERSIST ────────────────────────────────────────────────────────
      const taskData = { ...task }

      if (dto.isPermanentDelete()) {
        await taskMutations.hardDeleteById(dto.task_id, trx)
      } else {
        await taskMutations.updateTask(
          dto.task_id,
          { deleted_at: DateTime.now().toISO() },
          trx
        )
      }

      await auditPublicApi.log(
        {
          user_id: userId,
          action: dto.isPermanentDelete() ? AuditAction.HARD_DELETE : AuditAction.DELETE,
          entity_type: EntityType.TASK,
          entity_id: dto.task_id,
          old_values: taskData,
        },
        this.execCtx
      )

      await trx.commit()

      // Emit cache invalidation event
      void emitter.emit('cache:invalidate', {
        entityType: 'task',
        entityId: dto.task_id,
      })

      await this.cache.invalidateAfterTaskDeleted(dto.task_id)

      // Send notifications (after transaction)
      if (taskData.assigned_to && taskData.assigned_to !== userId) {
        await this.createNotification.handle({
          user_id: taskData.assigned_to,
          type: BACKEND_NOTIFICATION_TYPES.TASK_DELETED,
          title: 'Nhiệm vụ đã bị xóa',
          message: `Nhiệm vụ "${taskData.title}" đã bị xóa${dto.hasReason() ? ` (${dto.reason ?? ''})` : ''}`,
          related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
          related_entity_id: dto.task_id,
        })
      }

      if (taskData.creator_id !== userId && taskData.creator_id !== taskData.assigned_to) {
        await this.createNotification.handle({
          user_id: taskData.creator_id,
          type: BACKEND_NOTIFICATION_TYPES.TASK_DELETED,
          title: 'Nhiệm vụ đã bị xóa',
          message: `Nhiệm vụ "${taskData.title}" đã bị xóa${dto.hasReason() ? ` (${dto.reason ?? ''})` : ''}`,
          related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
          related_entity_id: dto.task_id,
        })
      }

      return {
        success: true,
        message: dto.isPermanentDelete()
          ? 'Nhiệm vụ đã được xóa vĩnh viễn'
          : 'Nhiệm vụ đã được xóa',
      }
    } catch (error: unknown) {
      await trx.rollback()
      loggerService.error('[DeleteTaskCommand] Error:', error)
      return {
        success: false,
        message: getErrorMessage(error, 'Có lỗi xảy ra khi xóa nhiệm vụ'),
      }
    }
  }
}

```

### `app/modules/tasks/actions/commands/delete_task_status_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'


import type { DeleteTaskStatusDTO } from '../dtos/request/task_status_dtos.js'


import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canDeleteStatus } from '#modules/tasks/domain/task_status_rules'
import * as aggregateQueries from '#modules/tasks/infra/repositories/read/aggregate_queries'
import TaskStatusRepository from '#modules/tasks/infra/repositories/task_status_repository'

/**
 * Command: Soft-delete a task status definition.
 *
 * Business rules:
 * - System statuses cannot be deleted
 * - Statuses with tasks assigned cannot be deleted
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class DeleteTaskStatusCommand {
  constructor(
    protected execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies
  ) {}

  async execute(dto: DeleteTaskStatusDTO): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const trx = await db.transaction()

    try {
      // ── FETCH ──────────────────────────────────────────────────────────
      const status = await TaskStatusRepository.findByIdAndOrgForUpdate(
        dto.status_id,
        dto.organization_id,
        trx
      )

      if (!status) {
        throw new NotFoundException('Trạng thái task không tồn tại')
      }

      // Count tasks using this status
      const count = await aggregateQueries.countByTaskStatusId(dto.status_id, trx)

      if (status.category === 'done' && count > 0) {
        if (
          await this.taskExternalDependencies.review.hasAnyReviewForTasksWithStatus(dto.status_id, trx)
        ) {
          throw new BusinessLogicException(
            'Không thể xóa trạng thái hoàn thành vì đã có task gắn review'
          )
        }
      }

      // ── DECIDE ─────────────────────────────────────────────────────────
      enforcePolicy(
        canDeleteStatus({
          isSystem: status.is_system,
          taskCount: count,
        })
      )

      // ── PERSIST (soft delete) ──────────────────────────────────────────
      await TaskStatusRepository.softDelete(status.id, status.organization_id, trx)

      await auditPublicApi.log(
        {
          user_id: userId,
          action: AuditAction.DELETE,
          entity_type: EntityType.TASK_STATUS,
          entity_id: status.id,
          old_values: { ...status },
        },
        this.execCtx
      )

      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}

```

### `app/modules/tasks/actions/commands/patch_task_status_board_poc_command.ts`

```ts
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskCollectionAccessContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canManageTaskStatusBoard } from '#modules/tasks/domain/task_permission_policy'

export interface PatchTaskStatusBoardPocInput {
  organizationId: string
  total?: number
  simulateConflict: boolean
}

export interface PatchTaskStatusBoardPocResult {
  status: 200 | 409
  body: {
    success: boolean
    message?: string
    data?: {
      acknowledged_total: number | null
    }
  }
}

export default class PatchTaskStatusBoardPocCommand {
  constructor(
    protected execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies
  ) {}

  async execute(input: PatchTaskStatusBoardPocInput): Promise<PatchTaskStatusBoardPocResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const accessContext = await buildTaskCollectionAccessContext(
      userId,
      input.organizationId,
      'none',
      undefined,
      this.taskExternalDependencies.permission
    )
    enforcePolicy(canManageTaskStatusBoard(accessContext))

    if (input.simulateConflict) {
      return {
        status: 409,
        body: {
          success: false,
          message: 'Conflict simulated for status board POC',
        },
      }
    }

    return {
      status: 200,
      body: {
        success: true,
        data: {
          acknowledged_total: typeof input.total === 'number' ? input.total : null,
        },
      },
    }
  }
}

```

### `app/modules/tasks/actions/commands/process_application_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { ProcessApplicationDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canProcessApplication } from '#modules/tasks/domain/task_assignment_rules'
import TaskApplicationRepository from '#modules/tasks/infra/repositories/task_application_repository'
import TaskAssignmentRepository from '#modules/tasks/infra/repositories/task_assignment_repository'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'
import { ApplicationStatus, AssignmentStatus } from '#modules/tasks/public_contracts/task_constants'
import type { TaskApplicationRecord } from '#modules/tasks/types/task_records'

/**
 * ProcessApplicationCommand
 *
 * Allows project owner/manager to approve or reject a task application.
 * On approval:
 * - Creates TaskAssignment record
 * - Updates task's assigned_to
 * - Notifies applicant
 * On rejection:
 * - Records rejection reason
 * - Notifies applicant
 */
export default class ProcessApplicationCommand extends BaseCommand<
  ProcessApplicationDTO,
  TaskApplicationRecord
> {
  constructor(
    execCtx: TaskActionContext,
    private cache: TaskCachePort
  ) {
    super(execCtx)
  }

  async handle(dto: ProcessApplicationDTO): Promise<TaskApplicationRecord> {
    const result = await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // Get application with task
      const application = await TaskApplicationRepository.findPendingByIdWithTaskAndApplicant(
        dto.application_id,
        trx
      )

      if (!application) {
        throw new NotFoundException('Application không tồn tại hoặc không còn chờ xử lý')
      }

      const task = application.task

      if (!task) {
        throw new NotFoundException('Application task context is missing')
      }

      // Verify user has permission (task creator)
      const existingActiveAssignment = await TaskAssignmentRepository.findActiveByTask(task.id, trx)

      enforcePolicy(
        canProcessApplication({
          actorId: userId,
          taskCreatorId: task.creator_id,
          action: dto.action,
          isTaskAlreadyAssigned: task.assigned_to !== null || existingActiveAssignment !== null,
        })
      )

      const oldStatus = application.application_status

      if (dto.action === 'approve') {
        await TaskApplicationRepository.updateStatus(
          application.id,
          {
            application_status: ApplicationStatus.APPROVED,
            reviewed_by: userId,
            reviewed_at: DateTime.now(),
          },
          trx
        )

        // Create assignment
        await TaskAssignmentRepository.create(
          {
            task_id: task.id,
            assignee_id: application.applicant_id,
            assigned_by: userId,
            assignment_type: dto.assignment_type,
            assignment_status: AssignmentStatus.ACTIVE,
            estimated_hours: dto.estimated_hours,
            progress_percentage: 0,
          },
          trx
        )

        // Update task assigned_to
        await taskMutations.updateTask(task.id, { assigned_to: application.applicant_id }, trx)

        // Reject other pending applications
        await TaskApplicationRepository.rejectOtherPendingByTask(
          task.id,
          application.id,
          userId,
          'Another applicant was selected',
          trx
        )
      } else {
        await TaskApplicationRepository.updateStatus(
          application.id,
          {
            application_status: ApplicationStatus.REJECTED,
            reviewed_by: userId,
            reviewed_at: DateTime.now(),
            rejection_reason: dto.rejection_reason,
          },
          trx
        )
      }

      // Log audit
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'process_application',
          entity_type: 'task_application',
          entity_id: application.id,
          old_values: { status: oldStatus },
          new_values: {
            status: application.application_status,
            action: dto.action,
            rejection_reason: dto.rejection_reason,
          },
        })
      }

      return {
        application: {
          ...application,
          application_status:
            dto.action === 'approve' ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED,
          reviewed_by: userId,
          rejection_reason:
            dto.action === 'reject' ? dto.rejection_reason : application.rejection_reason,
        },
        taskId: task.id,
        applicationReviewedEvent: {
          applicationId: application.id,
          taskId: task.id,
          applicantId: application.applicant_id,
          reviewedBy: userId,
          status: dto.action === 'approve' ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED,
        },
      }
    })

    await this.cache.invalidateAfterTaskApplicationChanged(result.taskId)
    void emitter.emit('task:application:reviewed', result.applicationReviewedEvent)

    return result.application
  }
}

```
