# reviews Backend Module

## Runtime Update 2026-06-07

Admin dispute detail now returns a unified investigation timeline sourced from:

- `audit_events` rows where `entity_type = 'review_dispute'`
- `review_dispute_comments`
- `review_dispute_evidences`
- `review_dispute_case_files`
- `ai_dispute_evaluations`

Commands now emitting missing audit events:

- `BuildReviewDisputeCaseFileCommand` -> `build_review_dispute_case_file`
- `StartAiDisputeEvaluationCommand` -> `queue_ai_dispute_evaluation`

Query/page surfaces:

- [app/modules/reviews/actions/queries/get_admin_review_dispute_detail_query.ts](/home/tranngocduyet/Projects/Suar/app/modules/reviews/actions/queries/get_admin_review_dispute_detail_query.ts)
- [inertia/pages/admin/disputes/show.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/admin/disputes/show.svelte)
- [app/modules/reviews/controllers/show_reverse_reviews_page_controller.ts](/home/tranngocduyet/Projects/Suar/app/modules/reviews/controllers/show_reverse_reviews_page_controller.ts)
- [inertia/pages/reviews/reverse-reviews.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/reviews/reverse-reviews.svelte)
- [inertia/pages/org/reverse-reviews.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/org/reverse-reviews.svelte)
- [inertia/pages/admin/reviews/reverse-reviews.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/admin/reviews/reverse-reviews.svelte)

### Kiến trúc lõi & Phân tích nghiệp vụ
- **Review Session**: Tự động kích hoạt khi task hoàn thành. Đánh giá chất lượng thực tế của contributor dựa trên rubric của từng required skill.
- **Evidence Verification**: Ghi nhận mức năng lực quan sát được (`observed_level_id`) và liên kết trực tiếp tới bằng chứng thực tế của task (`skill_review_evidence_links`).
- **Dispute Flow**: Người dùng có quyền tạo tranh chấp đối với đánh giá nhận được. Admin kiểm duyệt thông qua Case File snapshot (`dispute_case_files`) chứa toàn bộ thông tin lịch sử của task. AI Dispute Evaluation được trigger để đưa ra gợi ý giải quyết qua callback API bảo mật bằng chữ ký HMAC (`SHA256`).

## Module Path

```text
app/modules/reviews
```

## Folder And File Inventory

```text
./ README.md index.ts
actions/ base_command.ts base_query.ts interfaces.ts public_api.ts result.ts review_action_context.ts
actions/commands/ add_review_evidence_command.ts build_review_dispute_case_file_command.ts calculate_performance_score_command.ts calculate_spider_chart_command.ts calculate_trust_score_command.ts confirm_review_command.ts create_review_dispute_command.ts create_review_dispute_comment_command.ts create_review_dispute_evidence_command.ts create_review_session_command.ts detect_anomaly_command.ts process_ai_dispute_callback_command.ts recalculate_reviewee_skill_scores_command.ts resolve_flagged_review_command.ts resolve_review_dispute_command.ts respond_to_review_dispute_command.ts review_dispute_access.ts save_ai_dispute_feedback_command.ts start_ai_dispute_evaluation_command.ts submit_reverse_review_command.ts submit_skill_review_command.ts update_reviewer_credibility_command.ts upsert_task_self_assessment_command.ts
actions/dtos/request/ review_dtos.ts
actions/dtos/response/ review_response_dtos.ts
actions/listeners/ assignment_completion_listener.ts
actions/mapper/ review_application_mapper.ts
actions/ports/ review_cache_port.ts review_cache_port_impl.ts review_external_dependencies.ts review_external_dependencies_impl.ts review_session_command_repository_port.ts
actions/queries/ get_admin_review_dispute_detail_query.ts get_flagged_reviews_query.ts get_pending_reviews_query.ts get_review_evidences_query.ts get_review_session_query.ts get_review_show_page_query.ts get_task_self_assessment_query.ts get_user_reviews_query.ts list_admin_review_disputes_query.ts list_ai_dispute_evaluations_query.ts list_reverse_reviews_query.ts list_review_dispute_case_files_query.ts list_review_dispute_comments_query.ts list_review_dispute_evidences_query.ts
actions/services/ review_public_api.ts
application/context/ review_actor_context.ts
application/dtos/common/ review_pagination.ts
application/events/ .gitkeep
application/ports/ review_event_publisher.ts review_organization_relationship_reader.ts review_task_assignment_reader.ts review_user_profile_projection.ts
constants/ review_constants.ts
controllers/ add_review_evidence_controller.ts ai_dispute_callback_controller.ts build_review_dispute_case_file_controller.ts confirm_review_controller.ts create_reverse_review_controller.ts create_review_dispute_comment_controller.ts create_review_dispute_controller.ts create_review_dispute_evidence_controller.ts create_review_session_controller.ts get_review_evidences_controller.ts get_task_self_assessment_controller.ts list_admin_review_disputes_controller.ts list_ai_dispute_evaluations_controller.ts list_flagged_reviews_controller.ts list_pending_reviews_controller.ts list_reverse_reviews_controller.ts list_review_dispute_case_files_controller.ts list_review_dispute_comments_controller.ts list_review_dispute_evidences_controller.ts my_reviews_controller.ts resolve_flagged_review_controller.ts resolve_review_dispute_controller.ts respond_to_review_dispute_controller.ts show_admin_review_dispute_controller.ts show_reverse_reviews_page_controller.ts show_review_controller.ts show_user_dispute_controller.ts start_ai_dispute_evaluation_controller.ts submit_reverse_review_controller.ts submit_review_controller.ts upsert_task_self_assessment_controller.ts user_reviews_controller.ts
controllers/mappers/request/ review_request_mapper.ts shared.ts
controllers/mappers/response/ review_response_mapper.ts shared.ts
controllers/mappers/ review_actor_context_mapper.ts
domain/ ai_dispute_payload_builder.ts ai_dispute_rules.ts review_dispute_rules.ts review_formulas.ts review_policy.ts review_types.ts
domain/entities/ review_session_entity.ts skill_review_entity.ts
domain/mapper/ review_domain_mapper.ts
domain/repositories/ review_repository_interface.ts
events/ review_events.ts
infra/adapters/ .gitkeep
infra/mapper/ review_infra_mapper.ts
infra/models/ flagged_review.ts reverse_review.ts review_evidence.ts review_session.ts skill_review.ts
infra/repositories/ flagged_review_repository.ts reverse_review_repository.ts review_evidence_repository.ts review_metrics_repository.ts review_repository_barrel.ts review_repository_impl.ts review_session_repository.ts skill_review_repository.ts task_self_assessment_repository.ts
infra/repositories/read/ flagged_review_queries.ts flagged_review_repository.ts reverse_review_queries.ts reverse_review_repository.ts review_evidence_queries.ts review_evidence_repository.ts review_metrics_repository.ts review_session_queries.ts task_self_assessment_queries.ts
infra/repositories/write/ flagged_review_mutations.ts reverse_review_mutations.ts review_evidence_mutations.ts review_session_command_repository.ts review_session_mutations.ts task_self_assessment_mutations.ts
listeners/ review_listener.ts
public_contracts/ review_completed_v1.ts review_public_api.ts review_session_facts_v1.ts
public_contracts/schemas/ review_events_v1.schema.ts
types/ review_confirmation_entry.ts review_records.ts
validators/ review.ts
```

## Route Evidence

```text
start/routes/reviews.ts
```

## Symbol Evidence

| Kind | Symbol | File | Line |
|---|---|---|---:|
| class | `AddReviewEvidenceCommand` | `app/modules/reviews/actions/commands/add_review_evidence_command.ts` | 23 |
| interface | `BuildReviewDisputeCaseFileDTO` | `app/modules/reviews/actions/commands/build_review_dispute_case_file_command.ts` | 10 |
| interface | `ReviewDisputeCaseFileResult` | `app/modules/reviews/actions/commands/build_review_dispute_case_file_command.ts` | 14 |
| class | `BuildReviewDisputeCaseFileCommand` | `app/modules/reviews/actions/commands/build_review_dispute_case_file_command.ts` | 91 |
| interface | `CalculatePerformanceScoreDTO` | `app/modules/reviews/actions/commands/calculate_performance_score_command.ts` | 11 |
| interface | `PerformanceScoreResult` | `app/modules/reviews/actions/commands/calculate_performance_score_command.ts` | 15 |
| class | `CalculatePerformanceScoreCommand` | `app/modules/reviews/actions/commands/calculate_performance_score_command.ts` | 55 |
| interface | `CalculateSpiderChartDTO` | `app/modules/reviews/actions/commands/calculate_spider_chart_command.ts` | 13 |
| interface | `SpiderChartResult` | `app/modules/reviews/actions/commands/calculate_spider_chart_command.ts` | 20 |
| class | `CalculateSpiderChartCommand` | `app/modules/reviews/actions/commands/calculate_spider_chart_command.ts` | 41 |
| interface | `CalculateTrustScoreDTO` | `app/modules/reviews/actions/commands/calculate_trust_score_command.ts` | 18 |
| interface | `TrustScoreResult` | `app/modules/reviews/actions/commands/calculate_trust_score_command.ts` | 25 |
| class | `CalculateTrustScoreCommand` | `app/modules/reviews/actions/commands/calculate_trust_score_command.ts` | 41 |
| class | `ConfirmReviewCommand` | `app/modules/reviews/actions/commands/confirm_review_command.ts` | 20 |
| interface | `CreateReviewDisputeDTO` | `app/modules/reviews/actions/commands/create_review_dispute_command.ts` | 15 |
| interface | `ReviewDisputeResult` | `app/modules/reviews/actions/commands/create_review_dispute_command.ts` | 23 |
| class | `CreateReviewDisputeCommand` | `app/modules/reviews/actions/commands/create_review_dispute_command.ts` | 50 |
| interface | `CreateReviewDisputeCommentDTO` | `app/modules/reviews/actions/commands/create_review_dispute_comment_command.ts` | 14 |
| interface | `ReviewDisputeCommentResult` | `app/modules/reviews/actions/commands/create_review_dispute_comment_command.ts` | 20 |
| class | `CreateReviewDisputeCommentCommand` | `app/modules/reviews/actions/commands/create_review_dispute_comment_command.ts` | 37 |
| interface | `CreateReviewDisputeEvidenceDTO` | `app/modules/reviews/actions/commands/create_review_dispute_evidence_command.ts` | 14 |
| interface | `ReviewDisputeEvidenceResult` | `app/modules/reviews/actions/commands/create_review_dispute_evidence_command.ts` | 22 |
| class | `CreateReviewDisputeEvidenceCommand` | `app/modules/reviews/actions/commands/create_review_dispute_evidence_command.ts` | 41 |
| class | `CreateReviewSessionCommand` | `app/modules/reviews/actions/commands/create_review_session_command.ts` | 19 |
| class | `DetectAnomalyCommand` | `app/modules/reviews/actions/commands/detect_anomaly_command.ts` | 42 |
| interface | `ProcessAiDisputeCallbackDTO` | `app/modules/reviews/actions/commands/process_ai_dispute_callback_command.ts` | 9 |
| interface | `ProcessCallbackResult` | `app/modules/reviews/actions/commands/process_ai_dispute_callback_command.ts` | 21 |
| class | `ProcessAiDisputeCallbackCommand` | `app/modules/reviews/actions/commands/process_ai_dispute_callback_command.ts` | 27 |
| interface | `RecalculateRevieweeSkillScoresDTO` | `app/modules/reviews/actions/commands/recalculate_reviewee_skill_scores_command.ts` | 16 |
| interface | `RecalculateRevieweeSkillScoresResult` | `app/modules/reviews/actions/commands/recalculate_reviewee_skill_scores_command.ts` | 20 |
| class | `RecalculateRevieweeSkillScoresCommand` | `app/modules/reviews/actions/commands/recalculate_reviewee_skill_scores_command.ts` | 75 |
| interface | `ResolveFlaggedReviewDTO` | `app/modules/reviews/actions/commands/resolve_flagged_review_command.ts` | 14 |
| class | `ResolveFlaggedReviewCommand` | `app/modules/reviews/actions/commands/resolve_flagged_review_command.ts` | 30 |
| interface | `ResolveReviewDisputeDTO` | `app/modules/reviews/actions/commands/resolve_review_dispute_command.ts` | 13 |
| class | `ResolveReviewDisputeCommand` | `app/modules/reviews/actions/commands/resolve_review_dispute_command.ts` | 34 |
| interface | `RespondToReviewDisputeDTO` | `app/modules/reviews/actions/commands/respond_to_review_dispute_command.ts` | 14 |
| interface | `ReviewDisputeResponseResult` | `app/modules/reviews/actions/commands/respond_to_review_dispute_command.ts` | 20 |
| class | `RespondToReviewDisputeCommand` | `app/modules/reviews/actions/commands/respond_to_review_dispute_command.ts` | 37 |
| type | `ReviewDisputeAuthorContext` | `app/modules/reviews/actions/commands/review_dispute_access.ts` | 5 |
| interface | `ReviewDisputeAccessContext` | `app/modules/reviews/actions/commands/review_dispute_access.ts` | 13 |
| interface | `SaveAiDisputeFeedbackDTO` | `app/modules/reviews/actions/commands/save_ai_dispute_feedback_command.ts` | 7 |
| interface | `AiDisputeFeedbackResult` | `app/modules/reviews/actions/commands/save_ai_dispute_feedback_command.ts` | 18 |
| class | `SaveAiDisputeFeedbackCommand` | `app/modules/reviews/actions/commands/save_ai_dispute_feedback_command.ts` | 31 |
| interface | `StartAiDisputeEvaluationDTO` | `app/modules/reviews/actions/commands/start_ai_dispute_evaluation_command.ts` | 12 |
| interface | `AiDisputeEvaluationResult` | `app/modules/reviews/actions/commands/start_ai_dispute_evaluation_command.ts` | 17 |
| class | `StartAiDisputeEvaluationCommand` | `app/modules/reviews/actions/commands/start_ai_dispute_evaluation_command.ts` | 65 |
| class | `SubmitReverseReviewCommand` | `app/modules/reviews/actions/commands/submit_reverse_review_command.ts` | 18 |
| class | `SubmitSkillReviewCommand` | `app/modules/reviews/actions/commands/submit_skill_review_command.ts` | 28 |
| interface | `UpdateReviewerCredibilityDTO` | `app/modules/reviews/actions/commands/update_reviewer_credibility_command.ts` | 14 |
| class | `UpdateReviewerCredibilityCommand` | `app/modules/reviews/actions/commands/update_reviewer_credibility_command.ts` | 25 |
| class | `UpsertTaskSelfAssessmentCommand` | `app/modules/reviews/actions/commands/upsert_task_self_assessment_command.ts` | 26 |
| class | `CreateReviewSessionDTO` | `app/modules/reviews/actions/dtos/request/review_dtos.ts` | 9 |
| class | `SubmitSkillReviewDTO` | `app/modules/reviews/actions/dtos/request/review_dtos.ts` | 32 |
| class | `ConfirmReviewDTO` | `app/modules/reviews/actions/dtos/request/review_dtos.ts` | 149 |
| class | `SubmitReverseReviewDTO` | `app/modules/reviews/actions/dtos/request/review_dtos.ts` | 172 |
| class | `GetReviewSessionDTO` | `app/modules/reviews/actions/dtos/request/review_dtos.ts` | 205 |
| class | `GetUserReviewsDTO` | `app/modules/reviews/actions/dtos/request/review_dtos.ts` | 216 |
| class | `AddReviewEvidenceDTO` | `app/modules/reviews/actions/dtos/request/review_dtos.ts` | 236 |
| class | `UpsertTaskSelfAssessmentDTO` | `app/modules/reviews/actions/dtos/request/review_dtos.ts` | 288 |
| interface | `ReviewSessionResponseDTO` | `app/modules/reviews/actions/dtos/response/review_response_dtos.ts` | 10 |
| interface | `SkillReviewResponseDTO` | `app/modules/reviews/actions/dtos/response/review_response_dtos.ts` | 26 |
| interface | `ReviewSummaryResponseDTO` | `app/modules/reviews/actions/dtos/response/review_response_dtos.ts` | 38 |
| interface | `CommandHandler` | `app/modules/reviews/actions/interfaces.ts` | 7 |
| interface | `QueryHandler` | `app/modules/reviews/actions/interfaces.ts` | 22 |
| interface | `Command` | `app/modules/reviews/actions/interfaces.ts` | 36 |
| interface | `Query` | `app/modules/reviews/actions/interfaces.ts` | 43 |
| class | `ReviewApplicationMapper` | `app/modules/reviews/actions/mapper/review_application_mapper.ts` | 16 |
| interface | `ReviewCachePort` | `app/modules/reviews/actions/ports/review_cache_port.ts` | 2 |
| const | `reviewCachePortImpl` | `app/modules/reviews/actions/ports/review_cache_port_impl.ts` | 11 |
| interface | `CompletedAssignmentInfo` | `app/modules/reviews/actions/ports/review_external_dependencies.ts` | 6 |
| interface | `ReviewUserAccountInfo` | `app/modules/reviews/actions/ports/review_external_dependencies.ts` | 12 |
| interface | `LifetimePerformanceStatsPayload` | `app/modules/reviews/actions/ports/review_external_dependencies.ts` | 17 |
| interface | `ReviewedSkillScorePayload` | `app/modules/reviews/actions/ports/review_external_dependencies.ts` | 26 |
| interface | `SpiderChartSkillPayload` | `app/modules/reviews/actions/ports/review_external_dependencies.ts` | 34 |
| interface | `PersistedSkillScoreResult` | `app/modules/reviews/actions/ports/review_external_dependencies.ts` | 39 |
| interface | `ReviewSkillInfo` | `app/modules/reviews/actions/ports/review_external_dependencies.ts` | 43 |
| interface | `ReviewTaskAssignmentReader` | `app/modules/reviews/actions/ports/review_external_dependencies.ts` | 48 |
| interface | `ReviewOrganizationReader` | `app/modules/reviews/actions/ports/review_external_dependencies.ts` | 55 |
| interface | `ReviewUserReaderWriter` | `app/modules/reviews/actions/ports/review_external_dependencies.ts` | 67 |
| interface | `ReviewUserSkillWriter` | `app/modules/reviews/actions/ports/review_external_dependencies.ts` | 92 |
| interface | `ReviewSkillReader` | `app/modules/reviews/actions/ports/review_external_dependencies.ts` | 108 |
| interface | `ReviewExternalDependencies` | `app/modules/reviews/actions/ports/review_external_dependencies.ts` | 117 |
| class | `InfraReviewTaskAssignmentReader` | `app/modules/reviews/actions/ports/review_external_dependencies_impl.ts` | 25 |
| class | `InfraReviewOrganizationReader` | `app/modules/reviews/actions/ports/review_external_dependencies_impl.ts` | 43 |
| class | `InfraReviewUserReaderWriter` | `app/modules/reviews/actions/ports/review_external_dependencies_impl.ts` | 60 |
| class | `InfraReviewUserSkillWriter` | `app/modules/reviews/actions/ports/review_external_dependencies_impl.ts` | 93 |
| class | `InfraReviewSkillReader` | `app/modules/reviews/actions/ports/review_external_dependencies_impl.ts` | 113 |
| const | `DefaultReviewDependencies` | `app/modules/reviews/actions/ports/review_external_dependencies_impl.ts` | 131 |
| interface | `CreateReviewSessionForCompletedAssignmentInput` | `app/modules/reviews/actions/ports/review_session_command_repository_port.ts` | 4 |
| interface | `ReviewSessionCommandRepositoryPort` | `app/modules/reviews/actions/ports/review_session_command_repository_port.ts` | 9 |
| interface | `GetAdminReviewDisputeDetailDTO` | `app/modules/reviews/actions/queries/get_admin_review_dispute_detail_query.ts` | 11 |
| interface | `GetAdminReviewDisputeDetailResult` | `app/modules/reviews/actions/queries/get_admin_review_dispute_detail_query.ts` | 15 |
| class | `GetAdminReviewDisputeDetailQuery` | `app/modules/reviews/actions/queries/get_admin_review_dispute_detail_query.ts` | 157 |
| class | `GetFlaggedReviewsQuery` | `app/modules/reviews/actions/queries/get_flagged_reviews_query.ts` | 27 |
| class | `GetPendingReviewsQuery` | `app/modules/reviews/actions/queries/get_pending_reviews_query.ts` | 25 |
| class | `GetReviewEvidencesQuery` | `app/modules/reviews/actions/queries/get_review_evidences_query.ts` | 7 |
| class | `GetReviewSessionQuery` | `app/modules/reviews/actions/queries/get_review_session_query.ts` | 11 |
| interface | `GetReviewShowPageResult` | `app/modules/reviews/actions/queries/get_review_show_page_query.ts` | 10 |
| class | `GetReviewShowPageQuery` | `app/modules/reviews/actions/queries/get_review_show_page_query.ts` | 17 |
| class | `GetTaskSelfAssessmentQuery` | `app/modules/reviews/actions/queries/get_task_self_assessment_query.ts` | 8 |
| class | `GetUserReviewsQuery` | `app/modules/reviews/actions/queries/get_user_reviews_query.ts` | 21 |
| interface | `ListAdminReviewDisputesDTO` | `app/modules/reviews/actions/queries/list_admin_review_disputes_query.ts` | 8 |
| interface | `AdminReviewDisputeListItem` | `app/modules/reviews/actions/queries/list_admin_review_disputes_query.ts` | 15 |
| interface | `ListAdminReviewDisputesResult` | `app/modules/reviews/actions/queries/list_admin_review_disputes_query.ts` | 38 |
| class | `ListAdminReviewDisputesQuery` | `app/modules/reviews/actions/queries/list_admin_review_disputes_query.ts` | 91 |
| interface | `ListAiDisputeEvaluationsDTO` | `app/modules/reviews/actions/queries/list_ai_dispute_evaluations_query.ts` | 10 |
| class | `ListAiDisputeEvaluationsQuery` | `app/modules/reviews/actions/queries/list_ai_dispute_evaluations_query.ts` | 54 |
| type | `ReverseReviewReadScope` | `app/modules/reviews/actions/queries/list_reverse_reviews_query.ts` | 7 |
| interface | `ListReverseReviewsDTO` | `app/modules/reviews/actions/queries/list_reverse_reviews_query.ts` | 9 |
| interface | `ReverseReviewReadResult` | `app/modules/reviews/actions/queries/list_reverse_reviews_query.ts` | 13 |
| class | `ListReverseReviewsQuery` | `app/modules/reviews/actions/queries/list_reverse_reviews_query.ts` | 59 |
| interface | `ListReviewDisputeCaseFilesDTO` | `app/modules/reviews/actions/queries/list_review_dispute_case_files_query.ts` | 9 |
| class | `ListReviewDisputeCaseFilesQuery` | `app/modules/reviews/actions/queries/list_review_dispute_case_files_query.ts` | 66 |
| interface | `ListReviewDisputeCommentsDTO` | `app/modules/reviews/actions/queries/list_review_dispute_comments_query.ts` | 11 |
| class | `ListReviewDisputeCommentsQuery` | `app/modules/reviews/actions/queries/list_review_dispute_comments_query.ts` | 23 |
| interface | `ListReviewDisputeEvidencesDTO` | `app/modules/reviews/actions/queries/list_review_dispute_evidences_query.ts` | 11 |
| class | `ListReviewDisputeEvidencesQuery` | `app/modules/reviews/actions/queries/list_review_dispute_evidences_query.ts` | 23 |
| class | `Result` | `app/modules/reviews/actions/result.ts` | 5 |
| interface | `ReviewActionContext` | `app/modules/reviews/actions/review_action_context.ts` | 1 |
| interface | `AuthenticatedReviewActionContext` | `app/modules/reviews/actions/review_action_context.ts` | 8 |
| function | `makeSystemReviewActionContext` | `app/modules/reviews/actions/review_action_context.ts` | 12 |
| class | `ReviewPublicApi` | `app/modules/reviews/actions/services/review_public_api.ts` | 6 |
| const | `reviewPublicApi` | `app/modules/reviews/actions/services/review_public_api.ts` | 30 |
| interface | `ReviewActorContext` | `app/modules/reviews/application/context/review_actor_context.ts` | 1 |
| const | `REVIEW_PAGINATION` | `app/modules/reviews/application/dtos/common/review_pagination.ts` | 1 |
| type | `ReviewPublicEventV1` | `app/modules/reviews/application/ports/review_event_publisher.ts` | 6 |
| interface | `ReviewEventPublisher` | `app/modules/reviews/application/ports/review_event_publisher.ts` | 8 |
| interface | `ReviewOrganizationRelationshipReader` | `app/modules/reviews/application/ports/review_organization_relationship_reader.ts` | 3 |
| interface | `ReviewTaskAssignmentSnapshot` | `app/modules/reviews/application/ports/review_task_assignment_reader.ts` | 1 |
| interface | `ReviewTaskAssignmentReader` | `app/modules/reviews/application/ports/review_task_assignment_reader.ts` | 10 |
| interface | `ReviewUserProfileProjectionInput` | `app/modules/reviews/application/ports/review_user_profile_projection.ts` | 1 |
| interface | `ReviewUserProfileProjection` | `app/modules/reviews/application/ports/review_user_profile_projection.ts` | 8 |
| enum | `ReviewSessionStatus` | `app/modules/reviews/constants/review_constants.ts` | 25 |
| enum | `FlaggedReviewStatus` | `app/modules/reviews/constants/review_constants.ts` | 40 |
| enum | `AnomalyFlagType` | `app/modules/reviews/constants/review_constants.ts` | 56 |
| enum | `AnomalySeverity` | `app/modules/reviews/constants/review_constants.ts` | 73 |
| enum | `ReviewerType` | `app/modules/reviews/constants/review_constants.ts` | 88 |
| enum | `ReverseReviewTargetType` | `app/modules/reviews/constants/review_constants.ts` | 101 |
| enum | `ReviewConfirmationAction` | `app/modules/reviews/constants/review_constants.ts` | 117 |
| const | `REVIEW_DEFAULTS` | `app/modules/reviews/constants/review_constants.ts` | 129 |
| class | `AddReviewEvidenceController` | `app/modules/reviews/controllers/add_review_evidence_controller.ts` | 13 |
| class | `AiDisputeCallbackController` | `app/modules/reviews/controllers/ai_dispute_callback_controller.ts` | 5 |
| class | `BuildReviewDisputeCaseFileController` | `app/modules/reviews/controllers/build_review_dispute_case_file_controller.ts` | 9 |
| class | `ConfirmReviewController` | `app/modules/reviews/controllers/confirm_review_controller.ts` | 11 |
| class | `CreateReverseReviewController` | `app/modules/reviews/controllers/create_reverse_review_controller.ts` | 10 |
| class | `CreateReviewDisputeCommentController` | `app/modules/reviews/controllers/create_review_dispute_comment_controller.ts` | 12 |
| class | `CreateReviewDisputeController` | `app/modules/reviews/controllers/create_review_dispute_controller.ts` | 10 |
| class | `CreateReviewDisputeEvidenceController` | `app/modules/reviews/controllers/create_review_dispute_evidence_controller.ts` | 9 |
| class | `CreateReviewSessionController` | `app/modules/reviews/controllers/create_review_session_controller.ts` | 14 |
| class | `GetReviewEvidencesController` | `app/modules/reviews/controllers/get_review_evidences_controller.ts` | 10 |
| class | `GetTaskSelfAssessmentController` | `app/modules/reviews/controllers/get_task_self_assessment_controller.ts` | 10 |
| class | `ListAdminReviewDisputesController` | `app/modules/reviews/controllers/list_admin_review_disputes_controller.ts` | 7 |
| class | `ListAiDisputeEvaluationsController` | `app/modules/reviews/controllers/list_ai_dispute_evaluations_controller.ts` | 9 |
| class | `ListFlaggedReviewsController` | `app/modules/reviews/controllers/list_flagged_reviews_controller.ts` | 14 |
| class | `ListPendingReviewsController` | `app/modules/reviews/controllers/list_pending_reviews_controller.ts` | 13 |
| class | `ListReverseReviewsController` | `app/modules/reviews/controllers/list_reverse_reviews_controller.ts` | 17 |
| class | `ListReviewDisputeCaseFilesController` | `app/modules/reviews/controllers/list_review_dispute_case_files_controller.ts` | 9 |
| class | `ListReviewDisputeCommentsController` | `app/modules/reviews/controllers/list_review_dispute_comments_controller.ts` | 9 |
| class | `ListReviewDisputeEvidencesController` | `app/modules/reviews/controllers/list_review_dispute_evidences_controller.ts` | 9 |
| function | `buildCreateReviewSessionDTO` | `app/modules/reviews/controllers/mappers/request/review_request_mapper.ts` | 61 |
| function | `buildGetUserReviewsDTO` | `app/modules/reviews/controllers/mappers/request/review_request_mapper.ts` | 74 |
| function | `buildPendingReviewsInput` | `app/modules/reviews/controllers/mappers/request/review_request_mapper.ts` | 84 |
| function | `buildGetReviewSessionDTO` | `app/modules/reviews/controllers/mappers/request/review_request_mapper.ts` | 88 |
| function | `buildSubmitSkillReviewDTO` | `app/modules/reviews/controllers/mappers/request/review_request_mapper.ts` | 92 |
| function | `buildConfirmReviewDTO` | `app/modules/reviews/controllers/mappers/request/review_request_mapper.ts` | 179 |
| function | `buildCreateReviewDisputeCommentDTO` | `app/modules/reviews/controllers/mappers/request/review_request_mapper.ts` | 194 |
| function | `buildCreateReviewDisputeDTO` | `app/modules/reviews/controllers/mappers/request/review_request_mapper.ts` | 209 |
| function | `buildRespondToReviewDisputeDTO` | `app/modules/reviews/controllers/mappers/request/review_request_mapper.ts` | 233 |
| function | `buildResolveReviewDisputeDTO` | `app/modules/reviews/controllers/mappers/request/review_request_mapper.ts` | 248 |
| function | `buildStartAiDisputeEvaluationDTO` | `app/modules/reviews/controllers/mappers/request/review_request_mapper.ts` | 273 |
| function | `buildAddReviewEvidenceDTO` | `app/modules/reviews/controllers/mappers/request/review_request_mapper.ts` | 283 |
| function | `buildSubmitReverseReviewDTO` | `app/modules/reviews/controllers/mappers/request/review_request_mapper.ts` | 296 |
| function | `buildUpsertTaskSelfAssessmentDTO` | `app/modules/reviews/controllers/mappers/request/review_request_mapper.ts` | 314 |
| function | `buildFlaggedReviewsInput` | `app/modules/reviews/controllers/mappers/request/review_request_mapper.ts` | 331 |
| function | `buildResolveFlaggedReviewDTO` | `app/modules/reviews/controllers/mappers/request/review_request_mapper.ts` | 338 |
| function | `throwInvalidInput` | `app/modules/reviews/controllers/mappers/request/shared.ts` | 5 |
| function | `toPositiveNumber` | `app/modules/reviews/controllers/mappers/request/shared.ts` | 9 |
| function | `toOptionalString` | `app/modules/reviews/controllers/mappers/request/shared.ts` | 24 |
| function | `toStringArray` | `app/modules/reviews/controllers/mappers/request/shared.ts` | 28 |
| function | `toOptionalStringArray` | `app/modules/reviews/controllers/mappers/request/shared.ts` | 42 |
| function | `toNumberOrUndefined` | `app/modules/reviews/controllers/mappers/request/shared.ts` | 50 |
| function | `toBoolean` | `app/modules/reviews/controllers/mappers/request/shared.ts` | 63 |
| function | `requireEnumValue` | `app/modules/reviews/controllers/mappers/request/shared.ts` | 76 |
| function | `mapMyReviewsPageProps` | `app/modules/reviews/controllers/mappers/response/review_response_mapper.ts` | 8 |
| function | `mapUserReviewsPageProps` | `app/modules/reviews/controllers/mappers/response/review_response_mapper.ts` | 17 |
| function | `mapPendingReviewsPageProps` | `app/modules/reviews/controllers/mappers/response/review_response_mapper.ts` | 28 |
| function | `mapShowReviewPageProps` | `app/modules/reviews/controllers/mappers/response/review_response_mapper.ts` | 37 |
| function | `mapCreateReviewSessionApiBody` | `app/modules/reviews/controllers/mappers/response/review_response_mapper.ts` | 52 |
| function | `mapReviewDataApiBody` | `app/modules/reviews/controllers/mappers/response/review_response_mapper.ts` | 61 |
| function | `mapReviewDisputeCommentApiBody` | `app/modules/reviews/controllers/mappers/response/review_response_mapper.ts` | 69 |
| function | `mapReviewCommentCollectionApiBody` | `app/modules/reviews/controllers/mappers/response/review_response_mapper.ts` | 78 |
| function | `mapReviewCollectionApiBody` | `app/modules/reviews/controllers/mappers/response/review_response_mapper.ts` | 87 |
| function | `mapFlaggedReviewsPageProps` | `app/modules/reviews/controllers/mappers/response/review_response_mapper.ts` | 96 |
| function | `mapReviewEvidenceCollectionApiBody` | `app/modules/reviews/controllers/mappers/response/review_response_mapper.ts` | 109 |
| function | `mapTaskSelfAssessmentApiBody` | `app/modules/reviews/controllers/mappers/response/review_response_mapper.ts` | 118 |
| type | `ResponseRecord` | `app/modules/reviews/controllers/mappers/response/shared.ts` | 1 |
| interface | `SerializableResponseRecord` | `app/modules/reviews/controllers/mappers/response/shared.ts` | 3 |
| interface | `PaginationMeta` | `app/modules/reviews/controllers/mappers/response/shared.ts` | 7 |
| interface | `PaginatedControllerResult` | `app/modules/reviews/controllers/mappers/response/shared.ts` | 14 |
| function | `serializeForResponse` | `app/modules/reviews/controllers/mappers/response/shared.ts` | 31 |
| function | `serializeCollectionForResponse` | `app/modules/reviews/controllers/mappers/response/shared.ts` | 41 |
| function | `reviewActorContextFromHttp` | `app/modules/reviews/controllers/mappers/review_actor_context_mapper.ts` | 6 |
| class | `MyReviewsController` | `app/modules/reviews/controllers/my_reviews_controller.ts` | 14 |
| class | `ResolveFlaggedReviewController` | `app/modules/reviews/controllers/resolve_flagged_review_controller.ts` | 11 |
| class | `ResolveReviewDisputeController` | `app/modules/reviews/controllers/resolve_review_dispute_controller.ts` | 10 |
| class | `RespondToReviewDisputeController` | `app/modules/reviews/controllers/respond_to_review_dispute_controller.ts` | 10 |
| class | `ShowAdminReviewDisputeController` | `app/modules/reviews/controllers/show_admin_review_dispute_controller.ts` | 9 |
| class | `ShowReverseReviewsPageController` | `app/modules/reviews/controllers/show_reverse_reviews_page_controller.ts` | 31 |
| class | `ShowReviewController` | `app/modules/reviews/controllers/show_review_controller.ts` | 11 |
| class | `ShowUserDisputeController` | `app/modules/reviews/controllers/show_user_dispute_controller.ts` | 48 |
| class | `StartAiDisputeEvaluationController` | `app/modules/reviews/controllers/start_ai_dispute_evaluation_controller.ts` | 10 |
| class | `SubmitReverseReviewController` | `app/modules/reviews/controllers/submit_reverse_review_controller.ts` | 11 |
| class | `SubmitReviewController` | `app/modules/reviews/controllers/submit_review_controller.ts` | 11 |
| class | `UpsertTaskSelfAssessmentController` | `app/modules/reviews/controllers/upsert_task_self_assessment_controller.ts` | 13 |
| class | `UserReviewsController` | `app/modules/reviews/controllers/user_reviews_controller.ts` | 13 |
| function | `buildAiDisputePayload` | `app/modules/reviews/domain/ai_dispute_payload_builder.ts` | 27 |
| function | `canStartAiDisputeEvaluation` | `app/modules/reviews/domain/ai_dispute_rules.ts` | 7 |
| type | `ReviewSessionStatus` | `app/modules/reviews/domain/entities/review_session_entity.ts` | 8 |
| interface | `ReviewConfirmationEntry` | `app/modules/reviews/domain/entities/review_session_entity.ts` | 10 |
| interface | `ReviewSessionEntityProps` | `app/modules/reviews/domain/entities/review_session_entity.ts` | 17 |
| class | `ReviewSessionEntity` | `app/modules/reviews/domain/entities/review_session_entity.ts` | 32 |
| type | `SkillReviewerType` | `app/modules/reviews/domain/entities/skill_review_entity.ts` | 8 |
| interface | `SkillReviewEntityProps` | `app/modules/reviews/domain/entities/skill_review_entity.ts` | 10 |
| class | `SkillReviewEntity` | `app/modules/reviews/domain/entities/skill_review_entity.ts` | 22 |
| class | `ReviewDomainMapper` | `app/modules/reviews/domain/mapper/review_domain_mapper.ts` | 20 |
| interface | `ReviewRepository` | `app/modules/reviews/domain/repositories/review_repository_interface.ts` | 13 |
| function | `isActiveReviewDisputeStatus` | `app/modules/reviews/domain/review_dispute_rules.ts` | 21 |
| function | `canOpenReviewDispute` | `app/modules/reviews/domain/review_dispute_rules.ts` | 25 |
| function | `canResolveReviewDispute` | `app/modules/reviews/domain/review_dispute_rules.ts` | 56 |
| function | `canCommentOnReviewDispute` | `app/modules/reviews/domain/review_dispute_rules.ts` | 85 |
| function | `canRespondToReviewDispute` | `app/modules/reviews/domain/review_dispute_rules.ts` | 105 |
| function | `canAddReviewDisputeEvidence` | `app/modules/reviews/domain/review_dispute_rules.ts` | 125 |
| function | `canTransitionDisputeStatus` | `app/modules/reviews/domain/review_dispute_rules.ts` | 150 |
| interface | `DisputeCaseFileData` | `app/modules/reviews/domain/review_dispute_rules.ts` | 163 |
| function | `computeDisputeCaseFileCompleteness` | `app/modules/reviews/domain/review_dispute_rules.ts` | 172 |
| function | `adjustCredibility` | `app/modules/reviews/domain/review_formulas.ts` | 40 |
| function | `calculateCredibilityScore` | `app/modules/reviews/domain/review_formulas.ts` | 55 |
| function | `calculateWeightedTrustScore` | `app/modules/reviews/domain/review_formulas.ts` | 76 |
| function | `calculateRawScore` | `app/modules/reviews/domain/review_formulas.ts` | 86 |
| function | `determineTier` | `app/modules/reviews/domain/review_formulas.ts` | 99 |
| function | `determineSessionStatus` | `app/modules/reviews/domain/review_formulas.ts` | 135 |
| function | `mapLevelCodeToNumber` | `app/modules/reviews/domain/review_formulas.ts` | 165 |
| function | `mapWeightedScoreToLevelCode` | `app/modules/reviews/domain/review_formulas.ts` | 169 |
| function | `calculateSkillWeightedScore` | `app/modules/reviews/domain/review_formulas.ts` | 180 |
| function | `calculateSkillConfidence` | `app/modules/reviews/domain/review_formulas.ts` | 201 |
| function | `calculatePerformanceScore` | `app/modules/reviews/domain/review_formulas.ts` | 214 |
| function | `calculateTrustScoreV2` | `app/modules/reviews/domain/review_formulas.ts` | 224 |
| function | `getLevelCodeFromPercentage` | `app/modules/reviews/domain/review_formulas.ts` | 250 |
| function | `canCreateReviewSession` | `app/modules/reviews/domain/review_policy.ts` | 26 |
| function | `canConfirmReview` | `app/modules/reviews/domain/review_policy.ts` | 53 |
| function | `resolveConfirmationCounters` | `app/modules/reviews/domain/review_policy.ts` | 84 |
| function | `canAccessReviewSession` | `app/modules/reviews/domain/review_policy.ts` | 108 |
| function | `canUpsertTaskSelfAssessment` | `app/modules/reviews/domain/review_policy.ts` | 117 |
| function | `canAddReviewEvidence` | `app/modules/reviews/domain/review_policy.ts` | 136 |
| interface | `TierResult` | `app/modules/reviews/domain/review_types.ts` | 11 |
| interface | `SkillWeightInput` | `app/modules/reviews/domain/review_types.ts` | 17 |
| interface | `SkillConfidenceInput` | `app/modules/reviews/domain/review_types.ts` | 24 |
| interface | `PerformanceScoreInput` | `app/modules/reviews/domain/review_types.ts` | 32 |
| interface | `TrustScoreInput` | `app/modules/reviews/domain/review_types.ts` | 39 |
| interface | `ReviewSubmittedEvent` | `app/modules/reviews/events/review_events.ts` | 2 |
| interface | `ReviewConfirmedEvent` | `app/modules/reviews/events/review_events.ts` | 10 |
| interface | `DisputeResolvedEvent` | `app/modules/reviews/events/review_events.ts` | 19 |
| class | `ReviewInfraMapper` | `app/modules/reviews/infra/mapper/review_infra_mapper.ts` | 18 |
| class | `FlaggedReview` | `app/modules/reviews/infra/models/flagged_review.ts` | 16 |
| class | `ReverseReview` | `app/modules/reviews/infra/models/reverse_review.ts` | 16 |
| class | `ReviewEvidence` | `app/modules/reviews/infra/models/review_evidence.ts` | 10 |
| class | `ReviewSession` | `app/modules/reviews/infra/models/review_session.ts` | 19 |
| class | `SkillReview` | `app/modules/reviews/infra/models/skill_review.ts` | 18 |
| const | `paginateWithRelations` | `app/modules/reviews/infra/repositories/read/flagged_review_queries.ts` | 9 |
| class | `FlaggedReviewRepository` | `app/modules/reviews/infra/repositories/read/flagged_review_repository.ts` | 11 |
| const | `findByUniqueScope` | `app/modules/reviews/infra/repositories/read/reverse_review_queries.ts` | 9 |
| class | `ReverseReviewRepository` | `app/modules/reviews/infra/repositories/read/reverse_review_repository.ts` | 7 |
| const | `listBySession` | `app/modules/reviews/infra/repositories/read/review_evidence_queries.ts` | 9 |
| class | `ReviewEvidenceRepository` | `app/modules/reviews/infra/repositories/read/review_evidence_repository.ts` | 7 |
| class | `ReviewMetricsRepository` | `app/modules/reviews/infra/repositories/read/review_metrics_repository.ts` | 4 |
| const | `paginatePendingForReviewer` | `app/modules/reviews/infra/repositories/read/review_session_queries.ts` | 10 |
| const | `findByIdWithRelations` | `app/modules/reviews/infra/repositories/read/review_session_queries.ts` | 34 |
| const | `paginateByReviewee` | `app/modules/reviews/infra/repositories/read/review_session_queries.ts` | 54 |
| const | `findById` | `app/modules/reviews/infra/repositories/read/review_session_queries.ts` | 80 |
| const | `findByIdWithAllowedStatuses` | `app/modules/reviews/infra/repositories/read/review_session_queries.ts` | 87 |
| const | `findByTaskAssignment` | `app/modules/reviews/infra/repositories/read/review_session_queries.ts` | 95 |
| const | `hasAnyForTask` | `app/modules/reviews/infra/repositories/read/review_session_queries.ts` | 102 |
| const | `countPendingForProject` | `app/modules/reviews/infra/repositories/read/review_session_queries.ts` | 115 |
| const | `hasAnyForTasksWithStatus` | `app/modules/reviews/infra/repositories/read/review_session_queries.ts` | 141 |
| const | `findByTaskAssignmentAndUser` | `app/modules/reviews/infra/repositories/read/task_self_assessment_queries.ts` | 9 |
| class | `ReviewRepositoryImpl` | `app/modules/reviews/infra/repositories/review_repository_impl.ts` | 17 |
| class | `ReviewSessionRepository` | `app/modules/reviews/infra/repositories/review_session_repository.ts` | 13 |
| class | `SkillReviewRepository` | `app/modules/reviews/infra/repositories/skill_review_repository.ts` | 38 |
| class | `TaskSelfAssessmentRepository` | `app/modules/reviews/infra/repositories/task_self_assessment_repository.ts` | 9 |
| const | `findByIdForUpdate` | `app/modules/reviews/infra/repositories/write/flagged_review_mutations.ts` | 9 |
| const | `create` | `app/modules/reviews/infra/repositories/write/flagged_review_mutations.ts` | 16 |
| const | `save` | `app/modules/reviews/infra/repositories/write/flagged_review_mutations.ts` | 23 |
| const | `create` | `app/modules/reviews/infra/repositories/write/reverse_review_mutations.ts` | 5 |
| const | `create` | `app/modules/reviews/infra/repositories/write/review_evidence_mutations.ts` | 5 |
| const | `reviewSessionCommandRepository` | `app/modules/reviews/infra/repositories/write/review_session_command_repository.ts` | 6 |
| const | `findCompletedForRevieweeForUpdate` | `app/modules/reviews/infra/repositories/write/review_session_mutations.ts` | 11 |
| const | `create` | `app/modules/reviews/infra/repositories/write/review_session_mutations.ts` | 24 |
| const | `createForCompletedAssignmentIfMissing` | `app/modules/reviews/infra/repositories/write/review_session_mutations.ts` | 31 |
| const | `save` | `app/modules/reviews/infra/repositories/write/review_session_mutations.ts` | 58 |
| const | `create` | `app/modules/reviews/infra/repositories/write/task_self_assessment_mutations.ts` | 5 |
| const | `save` | `app/modules/reviews/infra/repositories/write/task_self_assessment_mutations.ts` | 12 |
| interface | `ReviewSubmittedV1` | `app/modules/reviews/public_contracts/review_completed_v1.ts` | 1 |
| interface | `ReviewCompletedV1` | `app/modules/reviews/public_contracts/review_completed_v1.ts` | 10 |
| interface | `ReviewSessionFactsV1` | `app/modules/reviews/public_contracts/review_session_facts_v1.ts` | 1 |
| const | `reviewSubmittedV1Schema` | `app/modules/reviews/public_contracts/schemas/review_events_v1.schema.ts` | 3 |
| const | `reviewCompletedV1Schema` | `app/modules/reviews/public_contracts/schemas/review_events_v1.schema.ts` | 12 |
| interface | `ReviewConfirmationEntry` | `app/modules/reviews/types/review_confirmation_entry.ts` | 1 |
| interface | `ReviewSessionRecord` | `app/modules/reviews/types/review_records.ts` | 4 |
| interface | `SkillReviewRecord` | `app/modules/reviews/types/review_records.ts` | 24 |
| interface | `FlaggedReviewRecord` | `app/modules/reviews/types/review_records.ts` | 34 |
| interface | `ReverseReviewRecord` | `app/modules/reviews/types/review_records.ts` | 45 |
| interface | `ReviewEvidenceRecord` | `app/modules/reviews/types/review_records.ts` | 56 |
| interface | `TaskSelfAssessmentRecord` | `app/modules/reviews/types/review_records.ts` | 66 |
| const | `submitReviewValidator` | `app/modules/reviews/validators/review.ts` | 8 |
| const | `submitReverseReviewValidator` | `app/modules/reviews/validators/review.ts` | 24 |
| const | `resolveFlaggedReviewValidator` | `app/modules/reviews/validators/review.ts` | 37 |
| const | `confirmReviewValidator` | `app/modules/reviews/validators/review.ts` | 47 |

## Import Evidence

### `app/modules/reviews/actions/base_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { CommandHandler } from './interfaces.js'
import { Result } from './result.js'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
```

### `app/modules/reviews/actions/base_query.ts`

```ts
import type { QueryHandler } from './interfaces.js'
import { Result } from './result.js'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
```

### `app/modules/reviews/actions/commands/add_review_evidence_command.ts`

```ts
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import { canAccessReviewSession, canAddReviewEvidence } from '#modules/reviews/domain/review_policy'
import ReviewEvidenceRepository from '#modules/reviews/infra/repositories/review_evidence_repository'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import SkillReviewRepository from '#modules/reviews/infra/repositories/skill_review_repository'
import type { ReviewEvidenceRecord } from '#modules/reviews/types/review_records'
```

### `app/modules/reviews/actions/commands/build_review_dispute_case_file_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { loadReviewDisputeComments } from '#modules/reviews/actions/commands/review_dispute_access'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { computeDisputeCaseFileCompleteness } from '#modules/reviews/domain/review_dispute_rules'
```

### `app/modules/reviews/actions/commands/calculate_performance_score_command.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import { DefaultReviewDependencies } from '../ports/review_external_dependencies_impl.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import { calculatePerformanceScore } from '#modules/reviews/domain/review_formulas'
import ReviewMetricsRepository from '#modules/reviews/infra/repositories/review_metrics_repository'
```

### `app/modules/reviews/actions/commands/calculate_spider_chart_command.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DefaultReviewDependencies } from '../ports/review_external_dependencies_impl.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import { getLevelCodeFromPercentage } from '#modules/reviews/domain/review_formulas'
import SkillReviewRepository from '#modules/reviews/infra/repositories/skill_review_repository'
```

### `app/modules/reviews/actions/commands/calculate_trust_score_command.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import { DefaultReviewDependencies } from '../ports/review_external_dependencies_impl.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import {
  calculateTrustScoreV2,
  determineTier,
  mapLevelCodeToNumber,
} from '#modules/reviews/domain/review_formulas'
import ReviewMetricsRepository from '#modules/reviews/infra/repositories/review_metrics_repository'
```

### `app/modules/reviews/actions/commands/confirm_review_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import { DateTime } from 'luxon'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { ConfirmReviewDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import SkillReviewRepository from '#modules/reviews/infra/repositories/skill_review_repository'
import type { ReviewConfirmationEntry } from '#modules/reviews/types/review_confirmation_entry'
```

### `app/modules/reviews/actions/commands/create_review_dispute_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  canOpenReviewDispute,
  isActiveReviewDisputeStatus,
} from '#modules/reviews/domain/review_dispute_rules'
```

### `app/modules/reviews/actions/commands/create_review_dispute_comment_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  loadReviewDisputeAccessContext,
  type ReviewDisputeAuthorContext,
} from '#modules/reviews/actions/commands/review_dispute_access'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { canCommentOnReviewDispute } from '#modules/reviews/domain/review_dispute_rules'
```

### `app/modules/reviews/actions/commands/create_review_dispute_evidence_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  loadReviewDisputeAccessContext,
  type ReviewDisputeAuthorContext,
} from '#modules/reviews/actions/commands/review_dispute_access'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { canAddReviewDisputeEvidence } from '#modules/reviews/domain/review_dispute_rules'
```

### `app/modules/reviews/actions/commands/create_review_session_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import { DefaultReviewDependencies } from '../ports/review_external_dependencies_impl.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { CreateReviewSessionDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import type { ReviewSessionRecord } from '#modules/reviews/types/review_records'
```

### `app/modules/reviews/actions/commands/detect_anomaly_command.ts`

```ts
import { DefaultReviewDependencies } from '../ports/review_external_dependencies_impl.js'
import loggerService from '#modules/logger/public_contracts/logger_service'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import { AnomalyFlagType, AnomalySeverity } from '#modules/reviews/constants/review_constants'
import FlaggedReviewRepository from '#modules/reviews/infra/repositories/flagged_review_repository'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import SkillReviewRepository from '#modules/reviews/infra/repositories/skill_review_repository'
import type { FlaggedReviewRecord, SkillReviewRecord } from '#modules/reviews/types/review_records'
```

### `app/modules/reviews/actions/commands/process_ai_dispute_callback_command.ts`

```ts
import crypto from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
```

### `app/modules/reviews/actions/commands/recalculate_reviewee_skill_scores_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import { DefaultReviewDependencies } from '../ports/review_external_dependencies_impl.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import {
  calculateSkillConfidence,
  calculateSkillWeightedScore,
  mapWeightedScoreToLevelCode,
} from '#modules/reviews/domain/review_formulas'
import ReviewMetricsRepository from '#modules/reviews/infra/repositories/review_metrics_repository'
```

### `app/modules/reviews/actions/commands/resolve_flagged_review_command.ts`

```ts
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import RecalculateRevieweeSkillScoresCommand from '#modules/reviews/actions/commands/recalculate_reviewee_skill_scores_command'
import FlaggedReviewRepository from '#modules/reviews/infra/repositories/flagged_review_repository'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import SkillReviewRepository from '#modules/reviews/infra/repositories/skill_review_repository'
import type { FlaggedReviewRecord } from '#modules/reviews/types/review_records'
```

### `app/modules/reviews/actions/commands/resolve_review_dispute_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ReviewDisputeResult } from '#modules/reviews/actions/commands/create_review_dispute_command'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { canResolveReviewDispute } from '#modules/reviews/domain/review_dispute_rules'
```

### `app/modules/reviews/actions/commands/respond_to_review_dispute_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  loadReviewDisputeAccessContext,
  type ReviewDisputeAuthorContext,
} from '#modules/reviews/actions/commands/review_dispute_access'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { canRespondToReviewDispute } from '#modules/reviews/domain/review_dispute_rules'
```

### `app/modules/reviews/actions/commands/review_dispute_access.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
```

### `app/modules/reviews/actions/commands/save_ai_dispute_feedback_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
```

### `app/modules/reviews/actions/commands/start_ai_dispute_evaluation_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { buildAiDisputePayload } from '#modules/reviews/domain/ai_dispute_payload_builder'
import { canStartAiDisputeEvaluation } from '#modules/reviews/domain/ai_dispute_rules'
```

### `app/modules/reviews/actions/commands/submit_reverse_review_command.ts`

```ts
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { SubmitReverseReviewDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import { REVIEW_DEFAULTS } from '#modules/reviews/constants/review_constants'
import ReverseReviewRepository from '#modules/reviews/infra/repositories/reverse_review_repository'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import type { ReverseReviewRecord } from '#modules/reviews/types/review_records'
```

### `app/modules/reviews/actions/commands/submit_skill_review_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import { DefaultReviewDependencies } from '../ports/review_external_dependencies_impl.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { SubmitSkillReviewDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import { ReviewSessionStatus } from '#modules/reviews/constants/review_constants'
import { determineSessionStatus } from '#modules/reviews/domain/review_formulas'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import SkillReviewRepository from '#modules/reviews/infra/repositories/skill_review_repository'
import type { SkillReviewRecord } from '#modules/reviews/types/review_records'
import { ProficiencyLevel } from '#modules/users/public_contracts/user_constants'
import { skillPublicApi } from '#modules/skills/actions/services/skill_public_api'
```

### `app/modules/reviews/actions/commands/update_reviewer_credibility_command.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import { DefaultReviewDependencies } from '../ports/review_external_dependencies_impl.js'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import { calculateCredibilityScore } from '#modules/reviews/domain/review_formulas'
import SkillReviewRepository from '#modules/reviews/infra/repositories/skill_review_repository'
```

### `app/modules/reviews/actions/commands/upsert_task_self_assessment_command.ts`

```ts
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import { canAccessReviewSession, canUpsertTaskSelfAssessment } from '#modules/reviews/domain/review_policy'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import TaskSelfAssessmentRepository from '#modules/reviews/infra/repositories/task_self_assessment_repository'
import type { TaskSelfAssessmentRecord } from '#modules/reviews/types/review_records'
```

### `app/modules/reviews/actions/dtos/request/review_dtos.ts`

```ts
import ValidationException from '#modules/http/exceptions/validation_exception'
import { REVIEW_PAGINATION as PAGINATION } from '#modules/reviews/application/dtos/common/review_pagination'
```

### `app/modules/reviews/actions/dtos/response/review_response_dtos.ts`

```ts
import type { ReviewConfirmationEntry } from '#modules/reviews/types/review_confirmation_entry'
```

### `app/modules/reviews/actions/interfaces.ts`

```ts
// no imports
```

### `app/modules/reviews/actions/listeners/assignment_completion_listener.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import type { ReviewSessionCommandRepositoryPort } from '../ports/review_session_command_repository_port.js'
import loggerService from '#modules/logger/public_contracts/logger_service'
import { reviewSessionCommandRepository } from '#modules/reviews/infra/repositories/write/review_session_command_repository'
import type { TaskAssignmentCompletedEvent } from '#modules/tasks/events/task_events'
```

### `app/modules/reviews/actions/mapper/review_application_mapper.ts`

```ts
import type {
  ReviewSessionResponseDTO,
  SkillReviewResponseDTO,
  ReviewSummaryResponseDTO,
} from '../dtos/response/review_response_dtos.js'
import type { ReviewSessionEntity } from '#modules/reviews/domain/entities/review_session_entity'
import type { SkillReviewEntity } from '#modules/reviews/domain/entities/skill_review_entity'
```

### `app/modules/reviews/actions/ports/review_cache_port.ts`

```ts
// no imports
```

### `app/modules/reviews/actions/ports/review_cache_port_impl.ts`

```ts
import type { ReviewCachePort } from './review_cache_port.js'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
```

### `app/modules/reviews/actions/ports/review_external_dependencies.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DateTime } from 'luxon'
import type { UserCredibilityData, UserTrustData } from '#modules/users/types/user_profile_data'
```

### `app/modules/reviews/actions/ports/review_external_dependencies_impl.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type {
  CompletedAssignmentInfo,
  LifetimePerformanceStatsPayload,
  PersistedSkillScoreResult,
  ReviewSkillInfo,
  ReviewSkillReader,
  ReviewedSkillScorePayload,
  ReviewExternalDependencies,
  ReviewOrganizationReader,
  ReviewTaskAssignmentReader,
  ReviewUserAccountInfo,
  ReviewUserReaderWriter,
  ReviewUserSkillWriter,
  SpiderChartSkillPayload,
} from './review_external_dependencies.js'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import { skillPublicApi } from '#modules/skills/public_contracts/skill_public_api'
import { taskPublicApi } from '#modules/tasks/public_contracts/task_public_api'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'
import type { UserCredibilityData, UserTrustData } from '#modules/users/types/user_profile_data'
```

### `app/modules/reviews/actions/ports/review_session_command_repository_port.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
```

### `app/modules/reviews/actions/public_api.ts`

```ts
// no imports
```

### `app/modules/reviews/actions/queries/get_admin_review_dispute_detail_query.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { loadReviewDisputeComments, loadReviewDisputeEvidences } from '#modules/reviews/actions/commands/review_dispute_access'
import ListAiDisputeEvaluationsQuery from '#modules/reviews/actions/queries/list_ai_dispute_evaluations_query'
import ListReviewDisputeCaseFilesQuery from '#modules/reviews/actions/queries/list_review_dispute_case_files_query'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
```

### `app/modules/reviews/actions/queries/get_flagged_reviews_query.ts`

```ts
import { BaseQuery } from '#modules/reviews/actions/base_query'
import FlaggedReviewRepository from '#modules/reviews/infra/repositories/flagged_review_repository'
import type { FlaggedReviewRecord } from '#modules/reviews/types/review_records'
```

### `app/modules/reviews/actions/queries/get_pending_reviews_query.ts`

```ts
import { BaseQuery } from '#modules/reviews/actions/base_query'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import type { ReviewSessionRecord } from '#modules/reviews/types/review_records'
```

### `app/modules/reviews/actions/queries/get_review_evidences_query.ts`

```ts
import ReviewEvidenceRepository from '#modules/reviews/infra/repositories/review_evidence_repository'
import type { ReviewEvidenceRecord } from '#modules/reviews/types/review_records'
```

### `app/modules/reviews/actions/queries/get_review_session_query.ts`

```ts
import { BaseQuery } from '#modules/reviews/actions/base_query'
import type { GetReviewSessionDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import type { ReviewSessionRecord } from '#modules/reviews/types/review_records'
```

### `app/modules/reviews/actions/queries/get_review_show_page_query.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import GetReviewSessionQuery from './get_review_session_query.js'
import { GetReviewSessionDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { skillPublicApi } from '#modules/skills/public_contracts/skill_public_api'
import { proficiencyLevelOptions } from '#modules/users/public_contracts/user_constants'
```

### `app/modules/reviews/actions/queries/get_task_self_assessment_query.ts`

```ts
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import TaskSelfAssessmentRepository from '#modules/reviews/infra/repositories/task_self_assessment_repository'
import type { TaskSelfAssessmentRecord } from '#modules/reviews/types/review_records'
```

### `app/modules/reviews/actions/queries/get_user_reviews_query.ts`

```ts
import { BaseQuery } from '#modules/reviews/actions/base_query'
import type { GetUserReviewsDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import type { ReviewSessionRecord } from '#modules/reviews/types/review_records'
```

### `app/modules/reviews/actions/queries/list_admin_review_disputes_query.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
```

### `app/modules/reviews/actions/queries/list_ai_dispute_evaluations_query.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { AiDisputeEvaluationResult } from '#modules/reviews/actions/commands/start_ai_dispute_evaluation_command'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type { buildAiDisputePayload } from '#modules/reviews/domain/ai_dispute_payload_builder'
```

### `app/modules/reviews/actions/queries/list_reverse_reviews_query.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
```

### `app/modules/reviews/actions/queries/list_review_dispute_case_files_query.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ReviewDisputeCaseFileResult } from '#modules/reviews/actions/commands/build_review_dispute_case_file_command'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
```

### `app/modules/reviews/actions/queries/list_review_dispute_comments_query.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  loadReviewDisputeAccessContext,
  loadReviewDisputeComments,
} from '#modules/reviews/actions/commands/review_dispute_access'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
```

### `app/modules/reviews/actions/queries/list_review_dispute_evidences_query.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  loadReviewDisputeAccessContext,
  loadReviewDisputeEvidences,
} from '#modules/reviews/actions/commands/review_dispute_access'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
```

### `app/modules/reviews/actions/result.ts`

```ts
// no imports
```

### `app/modules/reviews/actions/review_action_context.ts`

```ts
// no imports
```

### `app/modules/reviews/actions/services/review_public_api.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import ReviewEvidenceRepository from '#modules/reviews/infra/repositories/review_evidence_repository'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
```

### `app/modules/reviews/controllers/add_review_evidence_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildAddReviewEvidenceDTO } from './mappers/request/review_request_mapper.js'
import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import AddReviewEvidenceCommand from '#modules/reviews/actions/commands/add_review_evidence_command'
```

### `app/modules/reviews/controllers/ai_dispute_callback_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import ProcessAiDisputeCallbackCommand from '#modules/reviews/actions/commands/process_ai_dispute_callback_command'
```

### `app/modules/reviews/controllers/build_review_dispute_case_file_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BuildReviewDisputeCaseFileCommand from '#modules/reviews/actions/commands/build_review_dispute_case_file_command'
```

### `app/modules/reviews/controllers/confirm_review_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildConfirmReviewDTO } from './mappers/request/review_request_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ConfirmReviewCommand from '#modules/reviews/actions/commands/confirm_review_command'
```

### `app/modules/reviews/controllers/create_reverse_review_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildSubmitReverseReviewDTO } from './mappers/request/review_request_mapper.js'
import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import SubmitReverseReviewCommand from '#modules/reviews/actions/commands/submit_reverse_review_command'
```

### `app/modules/reviews/controllers/create_review_dispute_comment_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import {
  buildCreateReviewDisputeCommentDTO,
} from './mappers/request/review_request_mapper.js'
import { mapReviewDisputeCommentApiBody } from './mappers/response/review_response_mapper.js'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import CreateReviewDisputeCommentCommand from '#modules/reviews/actions/commands/create_review_dispute_comment_command'
```

### `app/modules/reviews/controllers/create_review_dispute_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildCreateReviewDisputeDTO } from './mappers/request/review_request_mapper.js'
import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import CreateReviewDisputeCommand from '#modules/reviews/actions/commands/create_review_dispute_command'
```

### `app/modules/reviews/controllers/create_review_dispute_evidence_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapReviewDisputeCommentApiBody } from './mappers/response/review_response_mapper.js'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import CreateReviewDisputeEvidenceCommand from '#modules/reviews/actions/commands/create_review_dispute_evidence_command'
```

### `app/modules/reviews/controllers/create_review_session_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildCreateReviewSessionDTO } from './mappers/request/review_request_mapper.js'
import { mapCreateReviewSessionApiBody } from './mappers/response/review_response_mapper.js'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import CreateReviewSessionCommand from '#modules/reviews/actions/commands/create_review_session_command'
```

### `app/modules/reviews/controllers/get_review_evidences_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapReviewEvidenceCollectionApiBody } from './mappers/response/review_response_mapper.js'
import GetReviewEvidencesQuery from '#modules/reviews/actions/queries/get_review_evidences_query'
```

### `app/modules/reviews/controllers/get_task_self_assessment_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapTaskSelfAssessmentApiBody } from './mappers/response/review_response_mapper.js'
import GetTaskSelfAssessmentQuery from '#modules/reviews/actions/queries/get_task_self_assessment_query'
```

### `app/modules/reviews/controllers/list_admin_review_disputes_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ListAdminReviewDisputesQuery from '#modules/reviews/actions/queries/list_admin_review_disputes_query'
```

### `app/modules/reviews/controllers/list_ai_dispute_evaluations_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapReviewCollectionApiBody } from './mappers/response/review_response_mapper.js'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ListAiDisputeEvaluationsQuery from '#modules/reviews/actions/queries/list_ai_dispute_evaluations_query'
```

### `app/modules/reviews/controllers/list_flagged_reviews_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildFlaggedReviewsInput } from './mappers/request/review_request_mapper.js'
import { mapFlaggedReviewsPageProps } from './mappers/response/review_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetFlaggedReviewsQuery from '#modules/reviews/actions/queries/get_flagged_reviews_query'
import { FlaggedReviewStatus } from '#modules/reviews/constants/review_constants'
```

### `app/modules/reviews/controllers/list_pending_reviews_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildPendingReviewsInput } from './mappers/request/review_request_mapper.js'
import { mapPendingReviewsPageProps } from './mappers/response/review_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetPendingReviewsQuery from '#modules/reviews/actions/queries/get_pending_reviews_query'
```

### `app/modules/reviews/controllers/list_reverse_reviews_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapReviewCollectionApiBody } from './mappers/response/review_response_mapper.js'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ListReverseReviewsQuery from '#modules/reviews/actions/queries/list_reverse_reviews_query'
import type { ReverseReviewReadScope } from '#modules/reviews/actions/queries/list_reverse_reviews_query'
```

### `app/modules/reviews/controllers/list_review_dispute_case_files_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapReviewCollectionApiBody } from './mappers/response/review_response_mapper.js'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ListReviewDisputeCaseFilesQuery from '#modules/reviews/actions/queries/list_review_dispute_case_files_query'
```

### `app/modules/reviews/controllers/list_review_dispute_comments_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapReviewCommentCollectionApiBody } from './mappers/response/review_response_mapper.js'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ListReviewDisputeCommentsQuery from '#modules/reviews/actions/queries/list_review_dispute_comments_query'
```

### `app/modules/reviews/controllers/list_review_dispute_evidences_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapReviewCommentCollectionApiBody } from './mappers/response/review_response_mapper.js'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ListReviewDisputeEvidencesQuery from '#modules/reviews/actions/queries/list_review_dispute_evidences_query'
```

### `app/modules/reviews/controllers/mappers/request/review_request_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import {
  PAGINATION,
  requireEnumValue,
  throwInvalidInput,
  toBoolean,
  toNumberOrUndefined,
  toOptionalString,
  toOptionalStringArray,
  toPositiveNumber,
} from './shared.js'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import type { CreateReviewDisputeDTO } from '#modules/reviews/actions/commands/create_review_dispute_command'
import type { CreateReviewDisputeCommentDTO } from '#modules/reviews/actions/commands/create_review_dispute_comment_command'
import type { ResolveFlaggedReviewDTO } from '#modules/reviews/actions/commands/resolve_flagged_review_command'
import type { ResolveReviewDisputeDTO } from '#modules/reviews/actions/commands/resolve_review_dispute_command'
import type { RespondToReviewDisputeDTO } from '#modules/reviews/actions/commands/respond_to_review_dispute_command'
import type { StartAiDisputeEvaluationDTO } from '#modules/reviews/actions/commands/start_ai_dispute_evaluation_command'
import {
  AddReviewEvidenceDTO,
  ConfirmReviewDTO,
  CreateReviewSessionDTO,
  GetReviewSessionDTO,
  GetUserReviewsDTO,
  SubmitReverseReviewDTO,
  SubmitSkillReviewDTO,
  UpsertTaskSelfAssessmentDTO,
} from '#modules/reviews/actions/dtos/request/review_dtos'
import {
  FlaggedReviewStatus,
  ReverseReviewTargetType,
  ReviewerType,
} from '#modules/reviews/constants/review_constants'
```

### `app/modules/reviews/controllers/mappers/request/shared.ts`

```ts
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { REVIEW_PAGINATION as PAGINATION } from '#modules/reviews/application/dtos/common/review_pagination'
```

### `app/modules/reviews/controllers/mappers/response/review_response_mapper.ts`

```ts
import type {
  ResponseRecord,
  SerializableResponseRecord,
  PaginatedControllerResult,
} from './shared.js'
import { serializeCollectionForResponse, serializeForResponse } from './shared.js'
```

### `app/modules/reviews/controllers/mappers/response/shared.ts`

```ts
// no imports
```

### `app/modules/reviews/controllers/mappers/review_actor_context_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ReviewActorContext } from '#modules/reviews/application/context/review_actor_context'
```

### `app/modules/reviews/controllers/my_reviews_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildGetUserReviewsDTO } from './mappers/request/review_request_mapper.js'
import { mapMyReviewsPageProps } from './mappers/response/review_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import GetUserReviewsQuery from '#modules/reviews/actions/queries/get_user_reviews_query'
```

### `app/modules/reviews/controllers/resolve_flagged_review_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildResolveFlaggedReviewDTO } from './mappers/request/review_request_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ResolveFlaggedReviewCommand from '#modules/reviews/actions/commands/resolve_flagged_review_command'
```

### `app/modules/reviews/controllers/resolve_review_dispute_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildResolveReviewDisputeDTO } from './mappers/request/review_request_mapper.js'
import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ResolveReviewDisputeCommand from '#modules/reviews/actions/commands/resolve_review_dispute_command'
```

### `app/modules/reviews/controllers/respond_to_review_dispute_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildRespondToReviewDisputeDTO } from './mappers/request/review_request_mapper.js'
import { mapReviewDisputeCommentApiBody } from './mappers/response/review_response_mapper.js'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import RespondToReviewDisputeCommand from '#modules/reviews/actions/commands/respond_to_review_dispute_command'
```

### `app/modules/reviews/controllers/show_admin_review_dispute_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetAdminReviewDisputeDetailQuery from '#modules/reviews/actions/queries/get_admin_review_dispute_detail_query'
```

### `app/modules/reviews/controllers/show_reverse_reviews_page_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ListReverseReviewsQuery from '#modules/reviews/actions/queries/list_reverse_reviews_query'
import type {
  ReverseReviewReadResult,
  ReverseReviewReadScope,
} from '#modules/reviews/actions/queries/list_reverse_reviews_query'
```

### `app/modules/reviews/controllers/show_review_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapShowReviewPageProps } from './mappers/response/review_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetReviewShowPageQuery from '#modules/reviews/actions/queries/get_review_show_page_query'
```

### `app/modules/reviews/controllers/show_user_dispute_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  loadReviewDisputeAccessContext,
  loadReviewDisputeComments,
  loadReviewDisputeEvidences,
} from '#modules/reviews/actions/commands/review_dispute_access'
```

### `app/modules/reviews/controllers/start_ai_dispute_evaluation_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildStartAiDisputeEvaluationDTO } from './mappers/request/review_request_mapper.js'
import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import StartAiDisputeEvaluationCommand from '#modules/reviews/actions/commands/start_ai_dispute_evaluation_command'
```

### `app/modules/reviews/controllers/submit_reverse_review_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildSubmitReverseReviewDTO } from './mappers/request/review_request_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import SubmitReverseReviewCommand from '#modules/reviews/actions/commands/submit_reverse_review_command'
```

### `app/modules/reviews/controllers/submit_review_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildSubmitSkillReviewDTO } from './mappers/request/review_request_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import SubmitSkillReviewCommand from '#modules/reviews/actions/commands/submit_skill_review_command'
```

### `app/modules/reviews/controllers/upsert_task_self_assessment_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildUpsertTaskSelfAssessmentDTO } from './mappers/request/review_request_mapper.js'
import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UpsertTaskSelfAssessmentCommand from '#modules/reviews/actions/commands/upsert_task_self_assessment_command'
```

### `app/modules/reviews/controllers/user_reviews_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildGetUserReviewsDTO } from './mappers/request/review_request_mapper.js'
import { mapUserReviewsPageProps } from './mappers/response/review_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetUserReviewsQuery from '#modules/reviews/actions/queries/get_user_reviews_query'
```
## Code Snippets

### `start/routes/reviews.ts`

```ts
import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { throttle } from '#start/limiter'

const ListPendingReviewsController = () =>
  import('#modules/reviews/controllers/list_pending_reviews_controller')
const ShowReviewController = () => import('#modules/reviews/controllers/show_review_controller')
const SubmitReviewController = () => import('#modules/reviews/controllers/submit_review_controller')
const ConfirmReviewController = () =>
  import('#modules/reviews/controllers/confirm_review_controller')
const MyReviewsController = () => import('#modules/reviews/controllers/my_reviews_controller')
const UserReviewsController = () => import('#modules/reviews/controllers/user_reviews_controller')
const CreateReviewSessionController = () =>
  import('#modules/reviews/controllers/create_review_session_controller')
const CreateReviewDisputeController = () =>
  import('#modules/reviews/controllers/create_review_dispute_controller')
const ListAdminReviewDisputesController = () =>
  import('#modules/reviews/controllers/list_admin_review_disputes_controller')
const CreateReviewDisputeCommentController = () =>
  import('#modules/reviews/controllers/create_review_dispute_comment_controller')
const CreateReviewDisputeEvidenceController = () =>
  import('#modules/reviews/controllers/create_review_dispute_evidence_controller')
const BuildReviewDisputeCaseFileController = () =>
  import('#modules/reviews/controllers/build_review_dispute_case_file_controller')
const ListReviewDisputeCaseFilesController = () =>
  import('#modules/reviews/controllers/list_review_dispute_case_files_controller')
const ListReviewDisputeCommentsController = () =>
  import('#modules/reviews/controllers/list_review_dispute_comments_controller')
const ListAiDisputeEvaluationsController = () =>
  import('#modules/reviews/controllers/list_ai_dispute_evaluations_controller')
const ListReviewDisputeEvidencesController = () =>
  import('#modules/reviews/controllers/list_review_dispute_evidences_controller')
const ResolveReviewDisputeController = () =>
  import('#modules/reviews/controllers/resolve_review_dispute_controller')
const ShowAdminReviewDisputeController = () =>
  import('#modules/reviews/controllers/show_admin_review_dispute_controller')
const ShowUserDisputeController = () =>
  import('#modules/reviews/controllers/show_user_dispute_controller')
const StartAiDisputeEvaluationController = () =>
  import('#modules/reviews/controllers/start_ai_dispute_evaluation_controller')

const SubmitReverseReviewController = () =>
  import('#modules/reviews/controllers/submit_reverse_review_controller')
const CreateReverseReviewController = () =>
  import('#modules/reviews/controllers/create_reverse_review_controller')
const ListReverseReviewsController = () =>
  import('#modules/reviews/controllers/list_reverse_reviews_controller')
const ShowReverseReviewsPageController = () =>
  import('#modules/reviews/controllers/show_reverse_reviews_page_controller')
const RespondToReviewDisputeController = () =>
  import('#modules/reviews/controllers/respond_to_review_dispute_controller')
const ListFlaggedReviewsController = () =>
  import('#modules/reviews/controllers/list_flagged_reviews_controller')
const ResolveFlaggedReviewController = () =>
  import('#modules/reviews/controllers/resolve_flagged_review_controller')
const AddReviewEvidenceController = () =>
  import('#modules/reviews/controllers/add_review_evidence_controller')
const UpsertTaskSelfAssessmentController = () =>
  import('#modules/reviews/controllers/upsert_task_self_assessment_controller')
const GetReviewEvidencesController = () =>
  import('#modules/reviews/controllers/get_review_evidences_controller')
const GetTaskSelfAssessmentController = () =>
  import('#modules/reviews/controllers/get_task_self_assessment_controller')

router
  .group(() => {
    // Review session routes
    router.get('/reviews/pending', [ListPendingReviewsController, 'handle']).as('reviews.pending')
    router.get('/reviews/:id', [ShowReviewController, 'handle']).as('reviews.show')
    router.post('/reviews/:id/submit', [SubmitReviewController, 'handle']).as('reviews.submit')
    router.post('/reviews/:id/confirm', [ConfirmReviewController, 'handle']).as('reviews.confirm')
    router.get('/reviews/disputes/:id', [ShowUserDisputeController, 'handle']).as('reviews.disputes.show')

    router
      .get('/reviews/:id/evidences', [GetReviewEvidencesController, 'handle'])
      .as('reviews.evidences.list')
    router
      .post('/reviews/:id/evidences', [AddReviewEvidenceController, 'handle'])
      .as('reviews.evidences.add')
    router
      .get('/reviews/:id/self-assessment', [GetTaskSelfAssessmentController, 'handle'])
      .as('reviews.self_assessment.get')
    router
      .post('/reviews/:id/self-assessment', [UpsertTaskSelfAssessmentController, 'handle'])
      .as('reviews.self_assessment.upsert')

    // Reverse review (reviewee rates reviewers)
    router
      .post('/reviews/:id/reverse', [SubmitReverseReviewController, 'handle'])
      .as('reviews.reverse')
    router
      .post('/api/review-sessions/:sessionId/reverse-reviews', [
        CreateReverseReviewController,
        'handle',
      ])
      .as('api.review_sessions.reverse_reviews.create')
    router
      .get('/api/me/reverse-reviews', [ListReverseReviewsController, 'handle'])
      .as('api.me.reverse_reviews.list')
    router
      .get('/api/org/reverse-reviews', [ListReverseReviewsController, 'handle'])
      .as('api.org.reverse_reviews.list')
    router
      .get('/api/admin/reverse-reviews', [ListReverseReviewsController, 'handle'])
      .as('api.admin.reverse_reviews.list')
    router
      .get('/reviews/reverse-reviews', [ShowReverseReviewsPageController, 'handle'])
      .as('reviews.reverse_reviews')
    router
      .get('/org/reverse-reviews', [ShowReverseReviewsPageController, 'handle'])
      .as('org.reverse_reviews')
    router
      .get('/admin/reverse-reviews', [ShowReverseReviewsPageController, 'handle'])
      .as('admin.reverse_reviews')
    router
      .post('/api/reviews/disputes', [CreateReviewDisputeController, 'handle'])
      .as('api.reviews.disputes.create')
    router
      .get('/api/reviews/disputes/:id/comments', [ListReviewDisputeCommentsController, 'handle'])
      .as('api.reviews.disputes.comments.list')
    router
      .post('/api/reviews/disputes/:id/comments', [CreateReviewDisputeCommentController, 'handle'])
      .as('api.reviews.disputes.comments.create')
    router
      .get('/api/reviews/disputes/:id/evidences', [ListReviewDisputeEvidencesController, 'handle'])
      .as('api.reviews.disputes.evidences.list')
    router
      .post('/api/reviews/disputes/:id/evidences', [CreateReviewDisputeEvidenceController, 'handle'])
      .as('api.reviews.disputes.evidences.create')
    router
      .post('/api/org/reviews/disputes/:id/respond', [RespondToReviewDisputeController, 'handle'])
      .as('api.org.reviews.disputes.respond')
    router
      .get('/api/admin/reviews/disputes', [ListAdminReviewDisputesController, 'handle'])
      .as('api.admin.reviews.disputes.list')
    router
      .get('/api/admin/reviews/disputes/:id', [ShowAdminReviewDisputeController, 'handle'])
      .as('api.admin.reviews.disputes.show')
    router
      .post('/api/admin/reviews/disputes/:id/resolve', [ResolveReviewDisputeController, 'handle'])
      .as('api.admin.reviews.disputes.resolve')
    router
      .get('/api/admin/reviews/disputes/:id/case-files', [ListReviewDisputeCaseFilesController, 'handle'])
      .as('api.admin.reviews.disputes.case_files.list')
    router
      .post('/api/admin/reviews/disputes/:id/case-files', [
        BuildReviewDisputeCaseFileController,
        'handle',
      ])
      .as('api.admin.reviews.disputes.case_files.create')
    router
      .get('/api/admin/reviews/disputes/:id/ai-evaluations', [
        ListAiDisputeEvaluationsController,
        'handle',
      ])
      .as('api.admin.reviews.disputes.ai_evaluations.list')
    router
      .post('/api/admin/reviews/disputes/:id/ai-evaluations', [
        StartAiDisputeEvaluationController,
        'handle',
      ])
      .as('api.admin.reviews.disputes.ai_evaluations.create')

    // My reviews (as reviewee)
    router.get('/my-reviews', [MyReviewsController, 'handle']).as('reviews.mine')

    // User reviews (public profile)
    router.get('/users/:id/reviews', [UserReviewsController, 'handle']).as('users.reviews')

    // Admin: Flagged reviews
    router
      .get('/admin/flagged-reviews', [ListFlaggedReviewsController, 'handle'])
      .as('admin.flagged_reviews')
    router
      .post('/admin/flagged-reviews/:id/resolve', [ResolveFlaggedReviewController, 'handle'])
      .as('admin.flagged_reviews.resolve')

    // API routes
    router
      .post('/api/reviews/sessions', [CreateReviewSessionController, 'handle'])
      .as('api.reviews.sessions.create')
  })
  .use([middleware.auth(), middleware.requireOrg(), throttle])

const AiDisputeCallbackController = () =>
  import('#modules/reviews/controllers/ai_dispute_callback_controller')

router
  .post('/api/public/ai-disputes/callback', [AiDisputeCallbackController, 'handle'])
  .as('api.public.ai_disputes.callback')
  .use([throttle])

router
  .post('/api/public/ai/dispute-evaluations/callback', [AiDisputeCallbackController, 'handle'])
  .as('api.public.ai.dispute_evaluations.callback.legacy')
  .use([throttle])

```

### `app/modules/reviews/actions/commands/add_review_evidence_command.ts`

```ts
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import { canAccessReviewSession, canAddReviewEvidence } from '#modules/reviews/domain/review_policy'
import ReviewEvidenceRepository from '#modules/reviews/infra/repositories/review_evidence_repository'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import SkillReviewRepository from '#modules/reviews/infra/repositories/skill_review_repository'
import type { ReviewEvidenceRecord } from '#modules/reviews/types/review_records'

interface AddReviewEvidenceInput {
  review_session_id: string
  evidence_type: string
  url: string | null
  title: string | null
  description: string | null
}

/**
 * AddReviewEvidenceCommand
 *
 * Allows review participants to attach evidences to a review session.
 */
export default class AddReviewEvidenceCommand extends BaseCommand<
  AddReviewEvidenceInput,
  ReviewEvidenceRecord
> {
  async handle(dto: AddReviewEvidenceInput): Promise<ReviewEvidenceRecord> {
    return await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      const session = await ReviewSessionRepository.findById(dto.review_session_id, trx)
      enforcePolicy(canAccessReviewSession({ sessionExists: !!session }))
      if (!session) {
        throw new Error('Review session must exist after policy enforcement')
      }

      const submittedReview = await SkillReviewRepository.findBySessionAndReviewer(
        dto.review_session_id,
        userId,
        trx
      )
      enforcePolicy(
        canAddReviewEvidence({
          actorId: userId,
          sessionRevieweeId: session.reviewee_id,
          hasSubmittedReview: !!submittedReview,
        })
      )

      const evidence = await ReviewEvidenceRepository.create(
        {
          review_session_id: dto.review_session_id,
          evidence_type: dto.evidence_type,
          url: dto.url,
          title: dto.title,
          description: dto.description,
          uploaded_by: userId,
        },
        trx
      )

      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'add_review_evidence',
          entity_type: 'review_session',
          entity_id: session.id,
          old_values: null,
          new_values: {
            evidence_id: evidence.id,
            evidence_type: evidence.evidence_type,
          },
        })
      }

      return evidence
    })
  }
}

```

### `app/modules/reviews/actions/commands/calculate_performance_score_command.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { DefaultReviewDependencies } from '../ports/review_external_dependencies_impl.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import { calculatePerformanceScore } from '#modules/reviews/domain/review_formulas'
import ReviewMetricsRepository from '#modules/reviews/infra/repositories/review_metrics_repository'

export interface CalculatePerformanceScoreDTO {
  userId: string
}

export interface PerformanceScoreResult {
  userId: string
  performanceScore: number
  qualityScore: number
  deliveryScore: number
  difficultyBonus: number
  consistencyScore: number
}

interface AssignmentPerformanceRow {
  id: string
  completed_at: string | Date | null
  actual_hours: number | string | null
  due_date: string | Date | null
  difficulty: string | null
}

interface QualityPerformanceRow {
  overall_quality_score: number | string
}

interface PerformanceMetrics {
  totalCompletedAssignments: number
  totalHoursWorked: number
  qualityScore: number
  qualityMean: number
  deliveryScore: number
  difficultyBonus: number
  consistencyScore: number
  performanceScore: number
}

/**
 * CalculatePerformanceScoreCommand
 *
 * Computes execution performance score (0-100) from completed assignments +
 * completed review sessions and stores results in both:
 * - users.trust_data (compat)
 * - user_performance_stats (source-of-truth aggregate)
 */
export default class CalculatePerformanceScoreCommand extends BaseCommand<
  CalculatePerformanceScoreDTO,
  PerformanceScoreResult
> {
  private static readonly PERFORMANCE_SCORING_VERSION = 'performance_v1'

  /**
   * Command flow:
   * 1. Load completion data from review metrics views.
   * 2. Derive aggregate performance signals.
   * 3. Persist compatibility data on users.trust_data.
   * 4. Upsert the source-of-truth user_performance_stats row.
   * 5. Emit audit trail and return the normalized result.
   */
  async handle(dto: CalculatePerformanceScoreDTO): Promise<PerformanceScoreResult> {
    return await this.executeInTransaction(async (trx) => {
      const { assignmentRows, qualityRows } = await this.loadPerformanceInputs(dto.userId, trx)
      const metrics = this.calculatePerformanceMetrics(assignmentRows, qualityRows)

      await this.persistUserTrustData(dto.userId, metrics, trx)
      await this.persistUserPerformanceStats(dto.userId, metrics, trx)
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'calculate_performance_score',
          entity_type: 'user',
          entity_id: dto.userId,
          old_values: null,
          new_values: {
            performance_score: metrics.performanceScore,
            quality_score: metrics.qualityScore,
            delivery_score: metrics.deliveryScore,
            difficulty_bonus: metrics.difficultyBonus,
            consistency_score: metrics.consistencyScore,
            total_completed_assignments: metrics.totalCompletedAssignments,
            scoring_version: CalculatePerformanceScoreCommand.PERFORMANCE_SCORING_VERSION,
          },
        })
      }

      return this.buildResult(dto.userId, metrics)
    })
  }

  private mapDifficultyWeight(difficulty: string | null): number {
    if (!difficulty) return 1.0

    switch (difficulty) {
      case 'expert':
        return 4.0
      case 'hard':
        return 2.5
      case 'medium':
        return 1.5
      case 'easy':
      default:
        return 1.0
    }
  }

  private async loadPerformanceInputs(
    userId: string,
    trx: TransactionClientContract
  ): Promise<{ assignmentRows: AssignmentPerformanceRow[]; qualityRows: QualityPerformanceRow[] }> {
    const assignmentRows = (await ReviewMetricsRepository.listCompletedAssignmentsForPerformance(
      userId,
      trx
    )) as AssignmentPerformanceRow[]

    const qualityRows = (await ReviewMetricsRepository.listCompletedSessionQualityRows(
      userId,
      trx
    )) as QualityPerformanceRow[]

    return { assignmentRows, qualityRows }
  }

  private calculatePerformanceMetrics(
    assignmentRows: AssignmentPerformanceRow[],
    qualityRows: QualityPerformanceRow[]
  ): PerformanceMetrics {
    const totalCompletedAssignments = assignmentRows.length
    const totalHoursWorked = assignmentRows.reduce((sum, item) => {
      const value = Number(item.actual_hours ?? 0)
      return sum + (Number.isFinite(value) ? value : 0)
    }, 0)

    let onTimeCount = 0
    let weightedDifficultyTotal = 0

    for (const assignment of assignmentRows) {
      weightedDifficultyTotal += this.mapDifficultyWeight(assignment.difficulty)

      if (!assignment.completed_at || !assignment.due_date) {
        continue
      }

      const completedAt =
        assignment.completed_at instanceof Date
          ? DateTime.fromJSDate(assignment.completed_at)
          : DateTime.fromISO(assignment.completed_at)

      const dueDate =
        assignment.due_date instanceof Date
          ? DateTime.fromJSDate(assignment.due_date)
          : DateTime.fromISO(assignment.due_date)

      if (completedAt.isValid && dueDate.isValid && completedAt.toMillis() <= dueDate.toMillis()) {
        onTimeCount += 1
      }
    }

    const deliveryScore =
      totalCompletedAssignments > 0 ? (onTimeCount / totalCompletedAssignments) * 100 : 0
    const difficultyBonus =
      totalCompletedAssignments > 0
        ? (weightedDifficultyTotal / totalCompletedAssignments / 4.0) * 100
        : 0

    const qualityValues = qualityRows
      .map((row) => Number(row.overall_quality_score))
      .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5)

    const qualitySum = qualityValues.reduce((sum, value) => sum + value, 0)
    const qualityMean = qualityValues.length > 0 ? qualitySum / qualityValues.length : 0
    const qualityScore = qualityValues.length > 0 ? (qualityMean / 5) * 100 : 0

    const qualityVariance =
      qualityValues.length > 0
        ? qualityValues.reduce((sum, value) => sum + (value - qualityMean) ** 2, 0) /
          qualityValues.length
        : 0

    const consistencyScore = Math.max(0, 100 - Math.sqrt(qualityVariance) * 25)
    const performanceScore = calculatePerformanceScore({
      qualityScore,
      deliveryScore,
      difficultyBonus,
      consistencyScore,
    })

    return {
      totalCompletedAssignments,
      totalHoursWorked,
      qualityScore,
      qualityMean,
      deliveryScore,
      difficultyBonus,
      consistencyScore,
      performanceScore,
    }
  }

  private async persistUserTrustData(
    userId: string,
    metrics: PerformanceMetrics,
    trx: TransactionClientContract
  ): Promise<void> {
    const calculatedAt = DateTime.now().toISO()

    await DefaultReviewDependencies.user.mergeTrustData(
      userId,
      {
        scoring_version: CalculatePerformanceScoreCommand.PERFORMANCE_SCORING_VERSION,
        performance_score: metrics.performanceScore,
        performance_breakdown: {
          quality_score: this.roundToTenth(metrics.qualityScore),
          delivery_score: this.roundToTenth(metrics.deliveryScore),
          difficulty_bonus: this.roundToTenth(metrics.difficultyBonus),
          consistency_score: this.roundToTenth(metrics.consistencyScore),
          calculated_at: calculatedAt,
        },
      },
      trx
    )
  }

  private async persistUserPerformanceStats(
    userId: string,
    metrics: PerformanceMetrics,
    trx: TransactionClientContract
  ): Promise<void> {
    await DefaultReviewDependencies.user.upsertLifetimePerformanceStats(
      userId,
      {
        totalCompletedAssignments: metrics.totalCompletedAssignments,
        totalHoursWorked: metrics.totalHoursWorked,
        qualityMean: metrics.qualityMean,
        deliveryScore: metrics.deliveryScore,
        performanceScore: metrics.performanceScore,
        calculatedAt: DateTime.now(),
      },
      trx
    )
  }

  private buildResult(userId: string, metrics: PerformanceMetrics): PerformanceScoreResult {
    return {
      userId,
      performanceScore: metrics.performanceScore,
      qualityScore: this.roundToTenth(metrics.qualityScore),
      deliveryScore: this.roundToTenth(metrics.deliveryScore),
      difficultyBonus: this.roundToTenth(metrics.difficultyBonus),
      consistencyScore: this.roundToTenth(metrics.consistencyScore),
    }
  }

  private roundToTenth(value: number): number {
    return Math.round(value * 10) / 10
  }
}

```

### `app/modules/reviews/actions/commands/calculate_spider_chart_command.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { DefaultReviewDependencies } from '../ports/review_external_dependencies_impl.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import { getLevelCodeFromPercentage } from '#modules/reviews/domain/review_formulas'
import SkillReviewRepository from '#modules/reviews/infra/repositories/skill_review_repository'

/**
 * DTO for CalculateSpiderChart
 */
export interface CalculateSpiderChartDTO {
  userId: string
}

/**
 * Result of spider chart calculation
 */
export interface SpiderChartResult {
  userId: string
  skillsCalculated: number
  totalReviews: number
}

/**
 * Command: Calculate Spider Chart Data for a User
 *
 * Di chuyển từ database procedure: calculate_spider_chart(p_user_id)
 *
 * v3: Spider chart data is now stored inline on user_skills table
 * (avg_percentage, level_code, last_calculated_at) instead of separate
 * user_spider_chart_data table.
 *
 * Business logic:
 * 1. Lấy tất cả skills có display_type = 'spider_chart' (soft_skill, delivery)
 * 2. Với mỗi skill, tính avg_percentage từ skill_reviews
 * 3. Xác định level tương ứng với avg_percentage
 * 4. Upsert vào user_skills
 */
export default class CalculateSpiderChartCommand extends BaseCommand<
  CalculateSpiderChartDTO,
  SpiderChartResult
> {
  async handle(dto: CalculateSpiderChartDTO): Promise<SpiderChartResult> {
    return await this.executeInTransaction(async (trx) => {
      // 1. Lấy tất cả skills có display_type = 'spider_chart'
      const skills = await this.getSpiderChartSkills(trx)

      let totalReviewsCount = 0

      // 2. Với mỗi skill, tính và upsert
      for (const skill of skills) {
        const { avgPercentage, totalReviews, levelCode } = await this.calculateSkillData(
          dto.userId,
          skill.id,
          trx
        )

        totalReviewsCount += totalReviews

        // 3. Upsert vào user_skills (v3: inline spider chart data)
        await this.upsertUserSkillData(
          dto.userId,
          skill.id,
          avgPercentage,
          levelCode,
          totalReviews,
          trx
        )
      }

      // 4. Log audit
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'calculate_spider_chart',
          entity_type: 'user_skill',
          entity_id: dto.userId,
          old_values: null,
          new_values: {
            skills_calculated: skills.length,
            total_reviews: totalReviewsCount,
          },
        })
      }

      return {
        userId: dto.userId,
        skillsCalculated: skills.length,
        totalReviews: totalReviewsCount,
      }
    })
  }

  /**
   * Lấy tất cả skills có display_type = 'spider_chart'
   */
  private async getSpiderChartSkills(
    trx: TransactionClientContract
  ): Promise<{ id: string }[]> {
    return DefaultReviewDependencies.skill.listSpiderChartSkillIds(trx)
  }

  /**
   * Tính average percentage và total reviews cho một skill
   * v3: uses review formula mapping instead of ProficiencyLevel.findByPercentageRange
   */
  private async calculateSkillData(
    userId: string,
    skillId: string,
    trx: TransactionClientContract
  ): Promise<{ avgPercentage: number; totalReviews: number; levelCode: string }> {
    // Tính average percentage từ skill_reviews → delegate to SkillReview
    const { avgPercentage, totalReviews } = await SkillReviewRepository.calculateSkillAvgPercentage(
      userId,
      skillId,
      trx
    )

    // v3: Tìm level tương ứng từ review formula
    const levelCode = getLevelCodeFromPercentage(avgPercentage)

    return { avgPercentage, totalReviews, levelCode }
  }

  /**
   * v3: Upsert vào user_skills table (replaces user_spider_chart_data)
   */
  private async upsertUserSkillData(
    userId: string,
    skillId: string,
    avgPercentage: number,
    levelCode: string,
    _totalReviews: number,
    trx: TransactionClientContract
  ): Promise<void> {
    await DefaultReviewDependencies.userSkill.upsertSpiderChartSkillData(
      userId,
      skillId,
      {
        avgPercentage,
        levelCode,
      },
      trx
    )
  }
}

```

### `app/modules/reviews/actions/commands/calculate_trust_score_command.ts`

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { DefaultReviewDependencies } from '../ports/review_external_dependencies_impl.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import {
  calculateTrustScoreV2,
  determineTier,
  mapLevelCodeToNumber,
} from '#modules/reviews/domain/review_formulas'
import ReviewMetricsRepository from '#modules/reviews/infra/repositories/review_metrics_repository'

/**
 * DTO for CalculateTrustScore
 */
export interface CalculateTrustScoreDTO {
  userId: string
}

/**
 * Result of trust score calculation
 */
export interface TrustScoreResult {
  userId: string
  rawScore: number
  calculatedScore: number
  tierCode: string
  tierName: string
  totalVerifiedReviews: number
}

/**
 * Command: Calculate Trust Score for a User
 *
 * v3: Trust score stored as JSONB trust_data on users table.
 *
 * Pattern: FETCH → DECIDE (pure formulas) → PERSIST
 */
export default class CalculateTrustScoreCommand extends BaseCommand<
  CalculateTrustScoreDTO,
  TrustScoreResult
> {
  private static readonly TRUST_SCORING_VERSION = 'trust_v2'

  async handle(dto: CalculateTrustScoreDTO): Promise<TrustScoreResult> {
    return await this.executeInTransaction(async (trx) => {
      const fetched = await this.fetchTrustScoreData(dto.userId, trx)
      const computed = this.computeTrustScore(fetched)

      await this.persistTrustScore(dto.userId, computed, trx)
      await this.logTrustScoreAudit(dto.userId, computed)

      return {
        userId: dto.userId,
        rawScore: computed.rawScore,
        calculatedScore: computed.calculatedScore,
        tierCode: computed.tierCode,
        tierName: computed.tierName,
        totalVerifiedReviews: computed.totalVerifiedReviews,
      }
    })
  }

  private async fetchTrustScoreData(
    userId: string,
    trx: TransactionClientContract
  ): Promise<TrustScoreFetchResult> {
    const sessions = (await ReviewMetricsRepository.listCompletedSessionsForTrust(
      userId,
      trx
    )) as TrustScoreSessionRow[]

    const sessionIds = sessions.map((session) => session.id)

    const reviews = sessionIds.length
      ? ((await ReviewMetricsRepository.listSkillReviewTrustRows(
          sessionIds,
          trx
        )) as TrustScoreReviewRow[])
      : []

    const evidenceCountResult = sessionIds.length
      ? await ReviewMetricsRepository.countSessionsWithEvidence(sessionIds, trx)
      : [{ total: 0 }]

    const sessionsWithEvidence = Number(
      (evidenceCountResult[0] as TrustScoreEvidenceCountRow).total
    )

    const organizationIds = await DefaultReviewDependencies.organization.listOrganizationIdsByUser(
      userId,
      trx
    )

    let belongsToPartnerOrg = false
    if (organizationIds.length > 0) {
      belongsToPartnerOrg = await DefaultReviewDependencies.organization.hasAnyActivePartnerByIds(
        organizationIds,
        trx
      )
    }

    return {
      sessions,
      reviews,
      sessionsWithEvidence,
      organizationIds,
      belongsToPartnerOrg,
    }
  }

  private computeTrustScore(fetched: TrustScoreFetchResult): TrustScoreComputationResult {
    const totalCompletedSessions = fetched.sessions.length
    const totalReviews = fetched.reviews.length
    const recentSessions = this.countRecentSessions(fetched.sessions)
    const { reviewConsistency, reviewerCredibility } = this.calculateReviewSignals(fetched.reviews)

    const evidenceCoverage =
      totalCompletedSessions > 0 ? (fetched.sessionsWithEvidence / totalCompletedSessions) * 100 : 0
    const volumeScore = Math.min(100, totalCompletedSessions * 2)
    const recencyScore = Math.min(100, recentSessions * 10)
    const volumeRecency = (volumeScore + recencyScore) / 2
    const orgPartnerWeight = fetched.belongsToPartnerOrg
      ? 100
      : fetched.organizationIds.length > 0
        ? 70
        : 30

    const rawScore = calculateTrustScoreV2({
      reviewConsistency,
      reviewerCredibility,
      evidenceCoverage,
      orgPartnerWeight,
      volumeRecency,
    })

    const { tierCode, tierWeight, tierName } = determineTier(
      fetched.organizationIds.length > 0,
      fetched.belongsToPartnerOrg
    )

    // v2: org trust signal already contributes in orgPartnerWeight.
    // Keep `calculated_score` equal to raw score to avoid double weighting.
    const calculatedScore = rawScore

    return {
      rawScore,
      calculatedScore,
      tierCode,
      tierName,
      tierWeight,
      totalVerifiedReviews: totalReviews,
      scoringVersion: CalculateTrustScoreCommand.TRUST_SCORING_VERSION,
      signals: {
        reviewConsistency,
        reviewerCredibility,
        evidenceCoverage,
        orgPartnerWeight,
        volumeRecency,
      },
    }
  }

  private countRecentSessions(sessions: TrustScoreSessionRow[]): number {
    const recentCutoff = DateTime.now().minus({ days: 90 })

    return sessions.filter((session) => {
      const createdAt =
        session.created_at instanceof Date
          ? DateTime.fromJSDate(session.created_at)
          : DateTime.fromISO(session.created_at)

      return createdAt.isValid && createdAt.toMillis() >= recentCutoff.toMillis()
    }).length
  }

  private calculateReviewSignals(reviews: TrustScoreReviewRow[]): {
    reviewConsistency: number
    reviewerCredibility: number
  } {
    const reviewConsistencyBySession = new Map<
      string,
      { managerLevels: number[]; peerLevels: number[] }
    >()
    let reviewerCredibilityTotal = 0
    let reviewerCredibilityCount = 0

    for (const review of reviews) {
      const bucket = reviewConsistencyBySession.get(review.review_session_id) ?? {
        managerLevels: [],
        peerLevels: [],
      }

      const levelNum = mapLevelCodeToNumber(review.assigned_level_code)
      if (review.reviewer_type === 'manager') {
        bucket.managerLevels.push(levelNum)
      } else {
        bucket.peerLevels.push(levelNum)
      }
      reviewConsistencyBySession.set(review.review_session_id, bucket)

      reviewerCredibilityTotal += Number(review.reviewer_credibility_score)
      reviewerCredibilityCount += 1
    }

    const consistencyScores: number[] = []
    for (const bucket of reviewConsistencyBySession.values()) {
      if (bucket.managerLevels.length === 0 || bucket.peerLevels.length === 0) {
        continue
      }

      const managerAvg =
        bucket.managerLevels.reduce((sum, value) => sum + value, 0) / bucket.managerLevels.length
      const peerAvg =
        bucket.peerLevels.reduce((sum, value) => sum + value, 0) / bucket.peerLevels.length
      const delta = Math.abs(managerAvg - peerAvg)
      consistencyScores.push(Math.max(0, 100 - delta * 15))
    }

    const reviewConsistency =
      consistencyScores.length > 0
        ? consistencyScores.reduce((sum, value) => sum + value, 0) / consistencyScores.length
        : 50

    const reviewerCredibility =
      reviewerCredibilityCount > 0 ? reviewerCredibilityTotal / reviewerCredibilityCount : 50

    return { reviewConsistency, reviewerCredibility }
  }

  private async persistTrustScore(
    userId: string,
    computed: TrustScoreComputationResult,
    trx: TransactionClientContract
  ): Promise<void> {
    await DefaultReviewDependencies.user.mergeTrustData(
      userId,
      {
        current_tier_code: computed.tierCode,
        calculated_score: computed.calculatedScore,
        raw_score: computed.rawScore,
        total_verified_reviews: computed.totalVerifiedReviews,
        last_calculated_at: DateTime.now().toISO(),
        scoring_version: computed.scoringVersion,
      },
      trx
    )
  }

  private async logTrustScoreAudit(
    userId: string,
    computed: TrustScoreComputationResult
  ): Promise<void> {
    if (this.execCtx.userId) {
      await auditPublicApi.write(this.execCtx, {
        user_id: this.execCtx.userId,
        action: 'calculate_trust_score',
        entity_type: 'user',
        entity_id: userId,
        old_values: null,
        new_values: {
          raw_score: computed.rawScore,
          calculated_score: computed.calculatedScore,
          tier_code: computed.tierCode,
          tier_name: computed.tierName,
          total_reviews: computed.totalVerifiedReviews,
          v2_signals: {
            review_consistency: Math.round(computed.signals.reviewConsistency * 10) / 10,
            reviewer_credibility: Math.round(computed.signals.reviewerCredibility * 10) / 10,
            evidence_coverage: Math.round(computed.signals.evidenceCoverage * 10) / 10,
            org_partner_weight: computed.signals.orgPartnerWeight,
            volume_recency: Math.round(computed.signals.volumeRecency * 10) / 10,
            tier_weight: computed.tierWeight,
            scoring_version: computed.scoringVersion,
          },
        },
      })
    }
  }
}

interface TrustScoreSessionRow {
  id: string
  created_at: string | Date
}

interface TrustScoreReviewRow {
  review_session_id: string
  reviewer_type: 'manager' | 'peer'
  assigned_level_code: string
  reviewer_credibility_score: number | string
}

interface TrustScoreEvidenceCountRow {
  total: number | string
}

interface TrustScoreFetchResult {
  sessions: TrustScoreSessionRow[]
  reviews: TrustScoreReviewRow[]
  sessionsWithEvidence: number
  organizationIds: string[]
  belongsToPartnerOrg: boolean
}

interface TrustScoreComputationResult {
  rawScore: number
  calculatedScore: number
  tierCode: string
  tierName: string
  tierWeight: number
  totalVerifiedReviews: number
  scoringVersion: string
  signals: {
    reviewConsistency: number
    reviewerCredibility: number
    evidenceCoverage: number
    orgPartnerWeight: number
    volumeRecency: number
  }
}

```

### `app/modules/reviews/actions/commands/confirm_review_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { ConfirmReviewDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import SkillReviewRepository from '#modules/reviews/infra/repositories/skill_review_repository'
import type { ReviewConfirmationEntry } from '#modules/reviews/types/review_confirmation_entry'

/**
 * ConfirmReviewCommand
 *
 * Reviewee confirms or disputes the review results.
 * v3: Confirmation stored in review_sessions.confirmations JSONB array.
 * Credibility stored in users.credibility_data JSONB.
 */
export default class ConfirmReviewCommand extends BaseCommand<
  ConfirmReviewDTO,
  ReviewConfirmationEntry
> {
  async handle(dto: ConfirmReviewDTO): Promise<ReviewConfirmationEntry> {
    const result = await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // Get review session
      const session = await ReviewSessionRepository.findCompletedForRevieweeForUpdate(
        dto.review_session_id,
        userId,
        trx
      )

      if (!session) {
        throw new ConflictException('Review session không tồn tại hoặc không thể xác nhận')
      }

      // v3: Check if already confirmed in JSONB confirmations array
      const confirmations: ReviewConfirmationEntry[] = session.confirmations ?? []
      const existing = confirmations.find((c) => c.user_id === userId)

      if (existing) {
        throw new ConflictException('You have already confirmed or disputed this review')
      }

      // v3: Append to confirmations JSONB array
      const newConfirmation: ReviewConfirmationEntry = {
        user_id: userId,
        action: dto.action,
        dispute_reason: dto.dispute_reason ?? null,
        created_at: DateTime.now().toISO(),
      }
      confirmations.push(newConfirmation)
      session.confirmations = confirmations

      // Update session status if disputed
      if (dto.action === 'disputed') {
        session.status = 'disputed'

        const assignment = (await trx
          .from('task_assignments')
          .where('id', session.task_assignment_id)
          .first()) as { id: string; task_id: string } | undefined

        if (assignment) {
          await trx.table('review_disputes').insert({
            review_session_id: session.id,
            task_assignment_id: assignment.id,
            task_id: assignment.task_id,
            reviewee_id: session.reviewee_id,
            opened_by: userId,
            status: 'pending',
            dispute_reason: dto.dispute_reason?.trim() ?? 'No reason provided',
            requested_outcome: 'other',
          })
        }
      }

      await ReviewSessionRepository.save(session, trx)


      const skillReviews = await SkillReviewRepository.listBySession(session.id, trx)
      const reviewerIds = [...new Set(skillReviews.map((review) => review.reviewer_id))]

      // Log audit
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'confirm_review',
          entity_type: 'review_session',
          entity_id: session.id,
          old_values: null,
          new_values: {
            review_session_id: dto.review_session_id,
            action: dto.action,
            dispute_reason: dto.dispute_reason,
          },
        })
      }

      return {
        confirmation: newConfirmation,
        cachePattern: `review:session:${dto.review_session_id}`,
        reviewConfirmedEvent: {
          confirmationId: newConfirmation.user_id,
          reviewSessionId: dto.review_session_id,
          revieweeId: session.reviewee_id,
          reviewerIds,
          confirmedBy: userId,
          action: dto.action,
        },
      }
    })

    await cacheStore.deleteByPattern(result.cachePattern)
    await emitter.emit('review:confirmed', result.reviewConfirmedEvent)

    return result.confirmation
  }
}

```

### `app/modules/reviews/actions/commands/create_review_session_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'

import { DefaultReviewDependencies } from '../ports/review_external_dependencies_impl.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { CreateReviewSessionDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import type { ReviewSessionRecord } from '#modules/reviews/types/review_records'

/**
 * CreateReviewSessionCommand
 *
 * Creates a review session after a task assignment is completed.
 * This initiates the 360° review process.
 */
export default class CreateReviewSessionCommand extends BaseCommand<
  CreateReviewSessionDTO,
  ReviewSessionRecord
> {
  async handle(dto: CreateReviewSessionDTO): Promise<ReviewSessionRecord> {
    const result = await this.executeInTransaction(async (trx) => {
      // Verify task assignment exists and is completed
      const assignment = await DefaultReviewDependencies.taskAssignment.findCompletedAssignment(
        dto.task_assignment_id,
        trx
      )

      if (!assignment) {
        throw new BusinessLogicException('Task assignment phải tồn tại và đã hoàn thành')
      }

      if (assignment.assignee_id !== dto.reviewee_id) {
        throw new BusinessLogicException('Reviewee must match assignment assignee')
      }

      // Check if review session already exists
      const existing = await ReviewSessionRepository.findByTaskAssignment(
        dto.task_assignment_id,
        trx
      )

      if (existing) {
        throw new ConflictException('Review session already exists for this assignment')
      }

      // Create review session
      const session = await ReviewSessionRepository.create(
        {
          task_assignment_id: dto.task_assignment_id,
          reviewee_id: dto.reviewee_id,
          status: 'pending',
          manager_review_completed: false,
          peer_reviews_count: 0,
          required_peer_reviews: dto.required_peer_reviews,
        },
        trx
      )

      // Log audit
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'create',
          entity_type: 'review_session',
          entity_id: session.id,
          old_values: null,
          new_values: {
            task_assignment_id: dto.task_assignment_id,
            reviewee_id: dto.reviewee_id,
          },
        })
      }

      return {
        session,
        auditEvent: {
          userId: this.getCurrentUserId(),
          action: 'create',
          entityType: 'review_session',
          entityId: session.id,
          newValues: {
            task_assignment_id: dto.task_assignment_id,
            reviewee_id: dto.reviewee_id,
          },
        },
      }
    })

    void emitter.emit('audit:log', result.auditEvent)

    return result.session
  }
}

```

### `app/modules/reviews/actions/commands/detect_anomaly_command.ts`

```ts
import { DefaultReviewDependencies } from '../ports/review_external_dependencies_impl.js'

import loggerService from '#modules/logger/public_contracts/logger_service'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import { AnomalyFlagType, AnomalySeverity } from '#modules/reviews/constants/review_constants'
import FlaggedReviewRepository from '#modules/reviews/infra/repositories/flagged_review_repository'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import SkillReviewRepository from '#modules/reviews/infra/repositories/skill_review_repository'
import type { FlaggedReviewRecord, SkillReviewRecord } from '#modules/reviews/types/review_records'


/**
 * Anomaly detection result
 */
interface AnomalyDetection {
  flagType: string
  severity: string
  skillReviewId: string
  notes: string
}

interface DetectionContext {
  reviewSessionId: string
  reviewerId: string
  skillReviews: SkillReviewRecord[]
  session: { reviewee_id: string } | null
  reviewee: { createdAtMillis: number } | null
}

/**
 * DetectAnomalyCommand
 *
 * Automatic anomaly detection after each review submission.
 * Checks for 6 fraud patterns:
 *   1. sudden_spike: Skill increased >2 levels in 30 days
 *   2. mutual_high: Two users rate each other high >3 times
 *   3. bulk_same_level: Reviewer assigns same level to >80% of skills
 *   4. frequency_anomaly: Too many reviews in a short period
 *   5. new_account_high: Account <30 days receives ≥senior level
 *   6. ip_collusion: (placeholder — needs IP tracking data)
 */
export default class DetectAnomalyCommand extends BaseCommand<
  { reviewSessionId: string; reviewerId: string },
  FlaggedReviewRecord[]
> {
  async handle(input: {
    reviewSessionId: string
    reviewerId: string
  }): Promise<FlaggedReviewRecord[]> {
    let flaggedReviews: FlaggedReviewRecord[] = []

    try {
      const detectionContext = await this.loadDetectionContext(
        input.reviewSessionId,
        input.reviewerId
      )
      const anomalies = await this.detectAnomalies(detectionContext)
      flaggedReviews = await this.persistFlags(anomalies)
      if (flaggedReviews.length > 0) {
        loggerService.warn('Anomalies detected in review', {
          reviewSessionId: input.reviewSessionId,
          reviewerId: input.reviewerId,
          anomalyCount: flaggedReviews.length,
          types: anomalies.map((a) => a.flagType),
        })
      }
    } catch (error) {
      loggerService.error('DetectAnomalyCommand failed', {
        reviewSessionId: input.reviewSessionId,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return flaggedReviews
  }

  private async loadDetectionContext(
    reviewSessionId: string,
    reviewerId: string
  ): Promise<DetectionContext> {
    const skillReviews = await SkillReviewRepository.listBySessionAndReviewer(
      reviewSessionId,
      reviewerId
    )

    if (skillReviews.length === 0) {
      return {
        reviewSessionId,
        reviewerId,
        skillReviews,
        session: null,
        reviewee: null,
      }
    }

    const session = await ReviewSessionRepository.findById(reviewSessionId)
    if (!session) {
      return {
        reviewSessionId,
        reviewerId,
        skillReviews,
        session: null,
        reviewee: null,
      }
    }

    const reviewee = await DefaultReviewDependencies.user.findAccountInfo(session.reviewee_id)

    return {
      reviewSessionId,
      reviewerId,
      skillReviews,
      session,
      reviewee,
    }
  }

  private async detectAnomalies(context: DetectionContext): Promise<AnomalyDetection[]> {
    if (context.skillReviews.length === 0 || !context.session) {
      return []
    }

    const [bulkSame, newAccountHigh, mutualHigh] = await Promise.all([
      Promise.resolve(this.checkBulkSameLevel(context.skillReviews)),
      Promise.resolve(this.checkNewAccountHigh(context)),
      this.checkMutualHigh(context),
    ])

    return [...bulkSame, ...newAccountHigh, ...mutualHigh]
  }

  /**
   * Pattern 3: bulk_same_level — Reviewer assigns same level to >80% of skills
   */
  private checkBulkSameLevel(skillReviews: SkillReviewRecord[]): AnomalyDetection[] {
    if (skillReviews.length < 3) return []

    const levelCounts: Record<string, number> = {}
    for (const review of skillReviews) {
      const level = review.assigned_level_code
      levelCounts[level] = (levelCounts[level] ?? 0) + 1
    }

    const maxCount = Math.max(...Object.values(levelCounts))
    const ratio = maxCount / skillReviews.length

    if (ratio > 0.8) {
      const dominantLevel =
        Object.entries(levelCounts).find(([, count]) => count === maxCount)?.[0] ?? 'unknown'
      const firstReview = skillReviews[0]
      if (!firstReview) {
        return []
      }

      return [
        {
          flagType: AnomalyFlagType.BULK_SAME_LEVEL,
          severity: ratio === 1.0 ? AnomalySeverity.HIGH : AnomalySeverity.MEDIUM,
          skillReviewId: firstReview.id,
          notes: `Reviewer assigned "${dominantLevel}" to ${maxCount}/${skillReviews.length} skills (${Math.round(ratio * 100)}%)`,
        },
      ]
    }

    return []
  }

  /**
   * Pattern 5: new_account_high — Account <30 days receives ≥senior level
   */
  private checkNewAccountHigh(context: DetectionContext): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = []

    const reviewee = context.reviewee
    if (!reviewee) return anomalies

    const accountAgeDays = Math.floor(
      (Date.now() - reviewee.createdAtMillis) / (1000 * 60 * 60 * 24)
    )

    if (accountAgeDays < 30) {
      const highLevels = ['senior', 'lead', 'principal', 'expert', 'master']
      for (const review of context.skillReviews) {
        if (highLevels.includes(review.assigned_level_code)) {
          anomalies.push({
            flagType: AnomalyFlagType.NEW_ACCOUNT_HIGH,
            severity: AnomalySeverity.HIGH,
            skillReviewId: review.id,
            notes: `Account is ${accountAgeDays} days old but received "${review.assigned_level_code}" level`,
          })
        }
      }
    }

    return anomalies
  }

  /**
   * Pattern 2: mutual_high — Two users rate each other high >3 times
   */
  private async checkMutualHigh(context: DetectionContext): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = []

    const session = context.session
    if (!session) return anomalies

    const revieweeId = session.reviewee_id

    // Count times the reviewee has also reviewed the reviewer with high scores
    const mutualCount = await SkillReviewRepository.countCompletedHighReviewsBetweenUsers(
      revieweeId,
      context.reviewerId
    )

    if (mutualCount >= 3) {
      const firstReview = context.skillReviews[0]
      if (firstReview) {
        anomalies.push({
          flagType: AnomalyFlagType.MUTUAL_HIGH,
          severity: AnomalySeverity.HIGH,
          skillReviewId: firstReview.id,
          notes: `Mutual high rating detected: ${mutualCount} reverse high-level reviews found between these users`,
        })
      }
    }

    return anomalies
  }

  private async persistFlags(anomalies: AnomalyDetection[]): Promise<FlaggedReviewRecord[]> {
    const flaggedReviews: FlaggedReviewRecord[] = []

    for (const anomaly of anomalies) {
      const flagged = await FlaggedReviewRepository.create({
        skill_review_id: anomaly.skillReviewId,
        flag_type: anomaly.flagType,
        severity: anomaly.severity,
        status: 'pending',
        notes: anomaly.notes,
      })
      flaggedReviews.push(flagged)
    }

    return flaggedReviews
  }
}

```

### `app/modules/reviews/actions/commands/recalculate_reviewee_skill_scores_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { DefaultReviewDependencies } from '../ports/review_external_dependencies_impl.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import {
  calculateSkillConfidence,
  calculateSkillWeightedScore,
  mapWeightedScoreToLevelCode,
} from '#modules/reviews/domain/review_formulas'
import ReviewMetricsRepository from '#modules/reviews/infra/repositories/review_metrics_repository'

export interface RecalculateRevieweeSkillScoresDTO {
  userId: string
}

export interface RecalculateRevieweeSkillScoresResult {
  userId: string
  skillsUpdated: number
}

interface ReviewSkillRow {
  skill_id: string
  review_session_id: string
  reviewer_type: 'manager' | 'peer'
  assigned_level_code: string
  reviewer_credibility_score: number | string
  created_at: string | Date
}

interface EvidenceCountRow {
  skill_id: string
  total: number | string
}

interface SkillScoreUpdatedEventPayload {
  userId: string
  skillId: string
  oldScore: number | null
  newScore: number
}

interface LoadedSkillReviews {
  reviews: ReviewSkillRow[]
  evidenceBySkill: Map<string, number>
}

interface ComputedSkillScore {
  weightedScore: number
  levelCode: string
  avgPercentage: number
  confidence: number
  mostRecentReviewAt: DateTime | null
}

interface RecalculateRevieweeSkillScoresTxResult {
  userId: string
  skillsUpdated: number
  events: SkillScoreUpdatedEventPayload[]
}

interface PersistedUserSkillResult {
  oldScore: number | null
}

/**
 * RecalculateRevieweeSkillScoresCommand
 *
 * Recomputes reviewed skill levels for a user from completed review sessions
 * using weighted formulas (reviewer type, credibility, recency).
 */
export default class RecalculateRevieweeSkillScoresCommand extends BaseCommand<
  RecalculateRevieweeSkillScoresDTO,
  RecalculateRevieweeSkillScoresResult
> {
  private toCredibilityScore(value: number | string): number {
    return typeof value === 'number' ? value : Number(value)
  }

  private toMonthsAgo(value: string | Date): number {
    if (value instanceof Date) {
      return Math.max(0, DateTime.now().diff(DateTime.fromJSDate(value), 'months').months)
    }

    const parsed = DateTime.fromISO(value)
    if (parsed.isValid) {
      return Math.max(0, DateTime.now().diff(parsed, 'months').months)
    }

    return 0
  }

  private toDateTime(value: string | Date): DateTime {
    if (value instanceof Date) {
      return DateTime.fromJSDate(value)
    }

    const parsed = DateTime.fromISO(value)
    return parsed.isValid ? parsed : DateTime.now()
  }

  async handle(
    dto: RecalculateRevieweeSkillScoresDTO
  ): Promise<RecalculateRevieweeSkillScoresResult> {
    const result = await this.executeInTransaction(
      async (trx): Promise<RecalculateRevieweeSkillScoresTxResult> => {
        const loaded = await this.loadSkillReviews(dto.userId, trx)

        if (loaded.reviews.length === 0) {
          return {
            userId: dto.userId,
            skillsUpdated: 0,
            events: [],
          }
        }

        const groupedReviews = this.groupReviewsBySkill(loaded.reviews)
        const events: SkillScoreUpdatedEventPayload[] = []
        let skillsUpdated = 0

        for (const [skillId, reviews] of groupedReviews.entries()) {
          const computed = this.computeSkillScore(reviews, loaded.evidenceBySkill.get(skillId) ?? 0)
          const persisted = await this.persistUserSkill(dto.userId, skillId, reviews, computed, trx)

          events.push({
            userId: dto.userId,
            skillId,
            oldScore: persisted.oldScore,
            newScore: computed.avgPercentage,
          })

          await this.logSkillRecalculationAudit(dto.userId, skillId, reviews.length, computed)

          skillsUpdated += 1
        }

        return {
          userId: dto.userId,
          skillsUpdated,
          events,
        }
      }
    )

    for (const eventPayload of result.events) {
      void emitter.emit('skill:score:updated', eventPayload)
    }

    return {
      userId: result.userId,
      skillsUpdated: result.skillsUpdated,
    }
  }

  private async loadSkillReviews(
    userId: string,
    trx: TransactionClientContract
  ): Promise<LoadedSkillReviews> {
    const reviews = (await ReviewMetricsRepository.listCompletedSkillReviewRowsByReviewee(
      userId,
      trx
    )) as unknown as ReviewSkillRow[]

    if (reviews.length === 0) {
      return { reviews, evidenceBySkill: new Map<string, number>() }
    }

    const evidenceRows = (await ReviewMetricsRepository.listEvidenceCountsBySkill(
      userId,
      trx
    )) as unknown as EvidenceCountRow[]

    const evidenceBySkill = new Map<string, number>()
    for (const row of evidenceRows) {
      evidenceBySkill.set(row.skill_id, Number(row.total))
    }

    return { reviews, evidenceBySkill }
  }

  private groupReviewsBySkill(reviews: ReviewSkillRow[]): Map<string, ReviewSkillRow[]> {
    const grouped = new Map<string, ReviewSkillRow[]>()

    for (const review of reviews) {
      const list = grouped.get(review.skill_id) ?? []
      list.push(review)
      grouped.set(review.skill_id, list)
    }

    return grouped
  }

  private computeSkillScore(reviews: ReviewSkillRow[], evidenceCount: number): ComputedSkillScore {
    const weightedScore = calculateSkillWeightedScore(
      reviews.map((review) => ({
        levelCode: review.assigned_level_code,
        reviewerType: review.reviewer_type,
        reviewerCredibilityScore: this.toCredibilityScore(review.reviewer_credibility_score),
        monthsAgo: this.toMonthsAgo(review.created_at),
      }))
    )

    const levelCode = mapWeightedScoreToLevelCode(weightedScore)
    const avgPercentage = Math.max(0, Math.min(100, ((weightedScore - 1) / 7) * 100))
    const confidence = calculateSkillConfidence({
      reviewCount: reviews.length,
      hasManager: reviews.some((review) => review.reviewer_type === 'manager'),
      hasPeer: reviews.some((review) => review.reviewer_type === 'peer'),
      evidenceCount,
      reviewerCredibilityAverage:
        reviews.reduce(
          (sum, review) => sum + this.toCredibilityScore(review.reviewer_credibility_score),
          0
        ) / reviews.length,
    })

    const mostRecentReviewAt =
      reviews
        .map((review) => this.toDateTime(review.created_at))
        .sort((a, b) => b.toMillis() - a.toMillis())[0] ?? null

    return {
      weightedScore,
      levelCode,
      avgPercentage: Math.round(avgPercentage * 10) / 10,
      confidence,
      mostRecentReviewAt,
    }
  }

  private async persistUserSkill(
    userId: string,
    skillId: string,
    reviews: ReviewSkillRow[],
    computed: ComputedSkillScore,
    trx: TransactionClientContract
  ): Promise<PersistedUserSkillResult> {
    const roundedAverage = computed.avgPercentage

    return DefaultReviewDependencies.userSkill.upsertReviewedSkillScore(
      userId,
      skillId,
      {
        levelCode: computed.levelCode,
        totalReviews: reviews.length,
        avgScore: roundedAverage,
        avgPercentage: roundedAverage,
        lastReviewedAt: computed.mostRecentReviewAt,
      },
      trx
    )
  }

  private async logSkillRecalculationAudit(
    userId: string,
    skillId: string,
    totalReviews: number,
    computed: ComputedSkillScore
  ): Promise<void> {
    if (this.execCtx.userId) {
      await auditPublicApi.write(this.execCtx, {
        user_id: this.execCtx.userId,
        action: 'recalculate_user_skill_score',
        entity_type: 'user_skill',
        entity_id: userId,
        old_values: null,
        new_values: {
          skill_id: skillId,
          weighted_score: Math.round(computed.weightedScore * 100) / 100,
          avg_percentage: computed.avgPercentage,
          confidence_score: computed.confidence,
          total_reviews: totalReviews,
        },
      })
    }
  }
}

```

### `app/modules/reviews/actions/commands/resolve_flagged_review_command.ts`

```ts
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import RecalculateRevieweeSkillScoresCommand from '#modules/reviews/actions/commands/recalculate_reviewee_skill_scores_command'
import FlaggedReviewRepository from '#modules/reviews/infra/repositories/flagged_review_repository'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import SkillReviewRepository from '#modules/reviews/infra/repositories/skill_review_repository'
import type { FlaggedReviewRecord } from '#modules/reviews/types/review_records'

/**
 * ResolveFlaggedReviewDTO
 */
export interface ResolveFlaggedReviewDTO {
  flagged_review_id: string
  action: 'dismissed' | 'confirmed'
  notes: string | null
}

/**
 * ResolveFlaggedReviewCommand
 *
 * Admin resolves a flagged review (dismiss or confirm the anomaly).
 * Khi confirm fraud:
 *   - Đánh dấu skill_review là fraud
 *   - Recalculate reviewee skill scores (loại bỏ review fraud)
 *   - Recalculate reviewer credibility
 *   - Audit log đầy đủ
 */
export default class ResolveFlaggedReviewCommand extends BaseCommand<
  ResolveFlaggedReviewDTO,
  FlaggedReviewRecord
> {
  async handle(dto: ResolveFlaggedReviewDTO): Promise<FlaggedReviewRecord> {
    const result = await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      const flaggedReview = await FlaggedReviewRepository.findByIdForUpdate(
        dto.flagged_review_id,
        trx
      )

      if (!flaggedReview) {
        throw new BusinessLogicException('Flagged review không tồn tại')
      }

      if (flaggedReview.status !== 'pending') {
        throw new BusinessLogicException('This flagged review has already been resolved')
      }

      const validActions: ResolveFlaggedReviewDTO['action'][] = ['dismissed', 'confirmed']
      if (!validActions.includes(dto.action)) {
        throw new BusinessLogicException('Action must be "dismissed" or "confirmed')
      }

      flaggedReview.status = dto.action
      flaggedReview.reviewed_by = userId
      const luxonModule = await import('luxon')
      flaggedReview.reviewed_at = luxonModule.DateTime.now()
      if (dto.notes) {
        flaggedReview.notes = dto.notes
      }

      await FlaggedReviewRepository.save(flaggedReview, trx)

      // ── Fraud confirmed: rollback skill scores ────────────────────────
      if (dto.action === 'confirmed') {
        await this.rollbackFraudulentReview(flaggedReview.skill_review_id, trx)
      }

      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'resolve_flagged_review',
          entity_type: 'flagged_review',
          entity_id: flaggedReview.id,
          old_values: null,
          new_values: {
            action: dto.action,
            notes: dto.notes,
          },
        })
      }

      return {
        flaggedReview,
        cachePattern: 'flagged:*',
      }
    })

    await cacheStore.deleteByPattern(result.cachePattern)
    return result.flaggedReview
  }

  /**
   * Rollback fraudulent review:
   * 1. Đánh dấu skill_review là fraud
   * 2. Recalculate reviewee skill scores
   */
  private async rollbackFraudulentReview(
    skillReviewId: string,
    trx: import('@adonisjs/lucid/types/database').TransactionClientContract
  ): Promise<void> {
    // 1. Load skill review
    const skillReview = await SkillReviewRepository.findByIdForUpdate(skillReviewId, trx)
    if (!skillReview) {
      return
    }

    // 2. Đánh dấu skill review là fraud
    skillReview.is_fraud = true
    await SkillReviewRepository.save(skillReview, trx)

    // 3. Load review session để tìm reviewee
    const session = await ReviewSessionRepository.findById(skillReview.review_session_id, trx)
    if (!session) {
      return
    }

    // 4. Recalculate reviewee skill scores (sẽ exclude fraud reviews)
    const recalcCommand = new RecalculateRevieweeSkillScoresCommand(this.execCtx)
    await recalcCommand.handle({ userId: session.reviewee_id })
  }
}

```
