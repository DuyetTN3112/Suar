# Metric, Dashboard, Report, And Analysis Context

| Field | Value |
|---|---|
| Status | Active |
| Audience | Dev, QA, reviewer, manager, product/ops reader, on-call |
| Purpose | Giải thích metric/dashboard/report/analysis nào đã có mặt thật trong hệ thống hiện tại và metric nào chưa đủ evidence để nói như KPI hoàn chỉnh |
| Source of Truth | model, route, controller/query, tests, capability-model docs, SQL/schema evidence hiện tại |
| Last Reviewed | 2026-07-16 |
| Review Cycle | Khi metric formula, dashboard surface, analysis pipeline, hoặc reporting shape đổi |
| Owner | Engineering |
| Stale Risk | Cao |

## File Này Dùng Để Làm Gì

Mở file này khi bạn cần biết:

- hệ thống hiện đang đo cái gì thật
- dashboard nào có thật, dashboard nào mới chỉ có dấu vết bề mặt
- report-like output nào đang tồn tại
- pipeline phân tích nào là runtime behavior chứ không chỉ là ý tưởng

## Nếu Dùng File Này Để Viết Report Bên Ngoài Repo

Bạn có thể dùng file này để viết:

- phần metric/report/dashboard analysis
- phần giải thích các nhóm metric hiện có trong hệ thống
- phần nhận xét maturity của dashboard và reporting layer

Đây là file phù hợp để trả lời:

- hệ thống hiện đang đo cái gì thật
- metric nào là profile/review/marketplace/operational signal
- dashboard/report surfaces đang có tới mức nào

Bạn không nên dùng riêng file này để kết luận:

- toàn bộ KPI governance đã hoàn chỉnh
- mọi metric đều có owner, SLA, threshold, và business sign-off độc lập
- metric field tồn tại đồng nghĩa metric đã ổn định để dùng như KPI chính thức

Nếu cần nói chặt hơn về capability intent hoặc testing evidence, đọc thêm:

- `../01-business/capability-model-and-product-positioning.md`
- `../08-testing/test-case-matrix.md`
- `../12-evidence/source-register.md`

## Safe External Summary

Nếu cần một câu tóm tắt an toàn cho report, có thể dùng:

`Lớp metric và dashboard của Suar đã có nhiều tín hiệu runtime thật cho profile, review/governance, marketplace/matching, và moderation/operations; tuy vậy bộ docs cũng ghi rõ rằng KPI governance độc lập và metric ownership formal chưa được chứng minh đầy đủ như một hệ KPI hoàn chỉnh.`

## Nếu Bạn Chỉ Có 3 Phút

Chỉ cần nhớ bốn ý:

1. Suar có metric thật cho `profile/trust`, `review/governance`, `marketplace/matching`, và `dashboard/report-like output`.
2. Hệ thống đã có dashboard surfaces thật, không chỉ placeholder.
3. Tài liệu hiện chưa chứng minh đầy đủ `KPI owner`, `target threshold`, `refresh SLA`, hay `metric governance` độc lập.
4. Muốn debug nhanh thì tách bạch `metric field có thật` với `governance business quanh metric đó`.

## Điều Quan Trọng Phải Nói Rõ

Hệ thống hiện có nhiều metric và dashboard signal, nhưng bộ docs chưa cho thấy đầy đủ artifact kiểu:

- KPI glossary độc lập
- stakeholder sign-off
- refresh SLA
- ownership matrix cho từng metric

Nghĩa là:

- docs có thể nói metric field/surface/pipeline nào tồn tại
- nhưng không được giả vờ toàn bộ metric governance đã hoàn chỉnh

## Mental Model

Phần metric/report của Suar hiện có thể hiểu theo bốn lớp:

### 1. Profile And Capability Metrics

Đây là nhóm nói về năng lực, trust, credibility, performance, verified skill evidence.

### 2. Review And Governance Metrics

Đây là nhóm nói về quality score, timeliness, peer/manager completion, dispute and confirmation context.

### 3. Marketplace And Matching Metrics

Đây là nhóm nói về match score, ranking, sourcing signals, bookmark-like recruiter intent.

### 4. Operational Dashboard And Report-like Output

Đây là nhóm nói về dashboard pages, audit listing, queue/list/detail surfaces, notification feeds, moderation outputs.

## What Metrics Are Clearly Real

### Profile, Trust, Delivery

Các nhóm metric sau hiện đã được xác nhận ở mức domain/model/command:

- trust score
- reviewer credibility
- spider chart groups:
  - Technology
  - Engineering
  - Soft Skills
  - Delivery
- external contributor rating (`external_contributor_rating`)
- external contributor completed tasks count (`external_contributor_completed_tasks_count`)
- performance metrics trong profile snapshot
- aggregate performance row trong `user_performance_stats`

Điểm reader nên nhớ:

- metric ở Suar không chỉ là count hoặc average thô
- L0-L14 capability level không nên đọc như score tuyệt đối hoặc trung bình cộng đơn giản
- imported/claim evidence không tự động ngang hàng verified/runtime-reviewed evidence
- disputed, fraud, superseded, hoặc stale evidence phải đi qua governance trước khi dùng làm capability conclusion chính
- capability model hiện hành cho thấy capability conclusion còn phụ thuộc:
  - task context
  - autonomy
  - complexity
  - evidence quality
  - reviewer judgement
  - confidence
  - dispute governance
- `performance_score` không chỉ nằm trong `users.trust_data` để tiện tương thích ngược, mà còn được upsert sang `user_performance_stats` như aggregate đọc-báo-cáo chi tiết hơn
- `trust_score` hiện lấy tín hiệu từ:
  - completed review sessions
  - review consistency giữa manager và peer
  - reviewer credibility
  - evidence coverage
  - volume + recency
  - organization signal

Nguồn:

- `app/modules/users/infra/models/user.ts`
- `app/modules/users/infra/models/user_profile_snapshot.ts`
- `app/modules/users/constants/user_constants.ts`
- `app/modules/reviews/actions/commands/calculate_spider_chart_command.ts`
- `app/modules/reviews/actions/commands/calculate_trust_score_command.ts`
- `app/modules/reviews/actions/commands/calculate_performance_score_command.ts`
- `app/modules/users/actions/commands/upsert_user_performance_stats_command.ts`
- `docs/01-business/capability-model-and-product-positioning.md`

### Review Metrics

`review_sessions` hiện cho thấy các input metric có cấu trúc như:

- `overall_quality_score`
- `delivery_timeliness`
- `requirement_adherence`
- `communication_quality`
- `code_quality_score`
- `proactiveness_score`
- `would_work_with_again`
- `manager_review_completed`
- `peer_reviews_count`
- `required_peer_reviews`
- `confirmations`
- `deadline`
- `completed_at`

Ý nghĩa:

- hệ thống đang lưu nhiều chiều đánh giá riêng
- không chỉ có một điểm tổng duy nhất

Nguồn:

- `app/modules/reviews/infra/models/review_session.ts`
- `schema/migration evidence`

### Marketplace And Matching Metrics

Các dấu vết mạnh hiện có:

- application match score
- ranked application list
- bookmark state trong talent directory
- talent search result set
- task-based talent ranking

Điểm reader nên nhớ:

- matching trong Suar là một lớp riêng, không chỉ là sort đơn giản của task/applicant list
- `match_score` hiện được tính từ ít nhất bốn nhóm dữ liệu:
  - task required skills
  - user verified skills
  - user work history
  - `users.trust_data.calculated_score`

Nguồn:

- `start/routes/tasks.ts`
- `start/routes/users.ts`
- `app/modules/tasks/actions/queries/get_application_match_score_query.ts`
- `app/modules/tasks/domain/match_formulas.ts`
- `app/modules/users/actions/queries/search_talents_query.ts`
- `docs/01-business/features/profile_pipeline_and_marketplace.md`
- `docs/01-business/capability-model-and-product-positioning.md`

### Aggregate Containers

Một phần metric không nằm ở cột scalar đơn lẻ mà ở container aggregate, ví dụ:

- `trust_data`
- `credibility_data`
- performance metrics container trong snapshot
- verified skills snapshot
- work highlights

Điều này quan trọng khi ai đó tìm metric trong DB mà không thấy hết trong một bảng phẳng.

Nguồn:

- `app/modules/users/infra/models/user.ts`
- `app/modules/users/infra/models/user_profile_snapshot.ts`

## Dashboard Surfaces

### Dashboard Nào Đã Có Thật

Các dashboard/page surfaces sau hiện đã được xác nhận:

- `inertia/apps/admin/modules/dashboards/index.svelte`
- `inertia/apps/admin/modules/dashboards/users.svelte`
- `inertia/apps/admin/modules/dashboards/operations.svelte`
- `inertia/apps/admin/modules/dashboards/subscriptions.svelte`
- `inertia/apps/org/modules/dashboard/index.svelte`

Kèm theo backend/query/controller tương ứng.

Routes đã thấy:

- `GET /admin`
- `GET /admin/dashboards/users`
- `GET /admin/dashboards/operations`
- `GET /admin/dashboards/subscriptions`
- `GET /org`

Ý nghĩa:

- đây không còn là dashboard placeholder backend-only
- repo đã có user-facing/admin-facing dashboard surfaces thật

### Dashboard Đang Hiển Thị Cái Gì Thật

Không nên mô tả dashboard bằng những từ rất rộng như “BI hoàn chỉnh” hoặc “executive analytics suite”.

Theo code hiện tại, các stat được query và render khá cụ thể:

#### Admin Dashboard

`GET /admin` và `GET /api/admin/dashboard` hiện lấy:

- users:
  - `total`
  - `active`
  - `suspended`
  - `new_this_month`
- organizations:
  - `total`
  - `new_this_month`
- projects:
  - `total`
  - `active`
  - `completed`
- tasks:
  - `total`
  - `in_progress`
  - `completed`
- subscriptions:
  - `total`
  - `active`
  - `expiring_soon`
  - `pro`
  - `promax`
- moderation:
  - `pending_flagged_reviews`

Lưu ý:

- `promax` trên admin dashboard hiện map từ bucket `enterprise` ở backend query, nên nếu thấy tên gọi lệch giữa UI và repo thì đây là khác biệt tương thích/ngôn ngữ hiển thị, chưa đủ bằng chứng để kết luận là hai business plan khác nhau

#### Organization Dashboard

`GET /org` hiện lấy:

- members:
  - `total`: chỉ tính membership `approved`
  - `by_role`: breakdown `org_owner`, `org_admin`, `org_member`
  - `pending_invitations`: membership `pending` có `invited_by`
  - `reviewed_members`: approved members có ít nhất một `user_skills.source = 'reviewed'`
  - `imported_only_members`: approved members có skill imported nhưng chưa có reviewed skill
  - `under_dispute_members`: approved members đang có review dispute active
- projects:
  - `total`
  - `active`
  - `completed`
- tasks:
  - `total`
  - `in_progress`
  - `completed`
  - `overdue`: `due_date < now` và chưa thuộc terminal status category

Điểm rất quan trọng:

- org dashboard hiện là operational workspace dashboard, không phải executive reporting warehouse
- nhiều stat là count operational theo rule runtime hiện tại, không phải KPI đã qua sign-off business độc lập

Nguồn:

- `start/routes/admin.ts`
- `start/routes/organizations_current.ts`
- `inertia/apps/admin/modules/dashboards/index.svelte`
- `inertia/apps/admin/modules/dashboards/*.svelte`
- `inertia/apps/org/modules/dashboard/index.svelte`
- `app/modules/admin/controllers/dashboard_controller.ts`
- `app/modules/admin/actions/dashboard/get_dashboard_stats_query.ts`
- `app/modules/organizations/controllers/current/dashboard_controller.ts`
- `app/modules/organizations/actions/current/dashboard/get_organization_dashboard_stats_query.ts`
- `app/modules/organizations/infra/current/repositories/organization_member_repository.ts`
- `app/modules/organizations/infra/current/repositories/organization_project_repository.ts`
- `app/modules/organizations/infra/current/repositories/organization_task_repository.ts`

### Điều Dashboard Docs Chưa Được Phép Nói Quá Tay

Chưa thấy artifact độc lập xác nhận:

- KPI owner
- target threshold
- refresh SLA
- sign-off governance

Vì vậy dashboard ở đây nên được hiểu là:

- surface có thật
- metric signals có thật
- governance business đầy đủ thì chưa có bằng chứng độc lập

## Report-like Output

Hiện tại hệ thống có nhiều output mang tính report/list/detail hơn là “report export” truyền thống:

- audit log listing
- flagged review listing
- reverse review listing
- pending approval users
- notifications list
- task applications ranking
- talent search result
- project members list
- dispute queue
- dispute detail
- case file list
- AI evaluation list

Điểm reader nên nhớ:

- bằng chứng hiện mạnh ở page props, JSON list/detail, và paginated output
- chưa thấy report contract kiểu CSV/PDF/export spec độc lập

Nguồn:

- `start/routes/reviews.ts`
- `start/routes/users.ts`
- `start/routes/tasks.ts`
- `start/routes/notifications.ts`
- `start/routes/admin.ts`
- `app/modules/http/api_v1/response_mappers.ts`

## Analysis Pipelines Đáng Tin

### Những Tuyến Đã Có Dấu Vết Rõ

Hệ thống và knowledge base hiện xác nhận các tuyến phân tích sau:

- profile recalculation sau review confirmation
- trust score calculation
- performance score calculation
- user skill recalculation + spider/profile cache invalidation
- anomaly detection cho review
- match score calculation cho task applications
- reviewer credibility context
- confidence-aware capability conclusion

### Caveat Quan Trọng

Repo có `CalculateSpiderChartCommand`, nhưng từ luồng `review:confirmed` hiện tại, bằng chứng mạnh hơn là:

- `RecalculateRevieweeSkillScoresCommand` cập nhật `user_skills`
- `CalculatePerformanceScoreCommand` ghi cả `users.trust_data` lẫn `user_performance_stats`
- `RefreshUserProfileAggregatesCommand` tiếp tục build work history, upsert performance aggregate, và domain expertise
- `review_listener` và events liên quan invalidate cache `spider:*` / `skill_scores:*`

Nói cách khác:

- spider chart logic có thật
- nhưng docs không nên khẳng định sai command chain nếu evidence mạnh hơn cho thấy runtime đang đi đường khác
- đường đi runtime đáng tin hiện tại là:
  1. review confirmed hoặc dispute resolved
  2. recalculate reviewee skill scores
  3. recalculate performance score
  4. recalculate trust score
  5. refresh profile aggregates
  6. invalidate cache để profile/spider surfaces đọc lại dữ liệu mới

### Spider Chart Phải Hiểu Đúng

Reader rất dễ hiểu nhầm spider chart là một bảng riêng hoặc chỉ gồm soft skill.

Code hiện tại cho thấy:

- dữ liệu spider chart được đọc từ `user_skills`
- chỉ lấy skill có `display_type = 'spider_chart'`
- taxonomy canonical hiện có bốn nhóm:
  - `technology`
  - `engineering`
  - `soft_skill`
  - `delivery`
- legacy text/notes có thể vẫn nhắc `technical`; không dùng nó làm category runtime mới
- cache TTL đang là 5 phút trong `GetSpiderChartDataQuery`

Vì vậy nếu viết report hoặc incident note, câu an toàn nên là:

`Spider chart của Suar là projection đọc từ user_skills và skill metadata, có cache ngắn hạn, không còn phụ thuộc vào một bảng spider riêng như mô hình cũ.`

Nguồn:

- `app/modules/reviews/actions/commands/recalculate_reviewee_skill_scores_command.ts`
- `app/modules/reviews/actions/commands/calculate_trust_score_command.ts`
- `app/modules/reviews/actions/commands/calculate_performance_score_command.ts`
- `app/modules/reviews/actions/commands/detect_anomaly_command.ts`
- `app/modules/reviews/listeners/review_listener.ts`
- `app/modules/reviews/actions/ports/review_cache_port_impl.ts`
- `app/modules/users/actions/queries/get_spider_chart_data_query.ts`
- `app/modules/users/actions/commands/refresh_user_profile_aggregates_command.ts`
- `app/modules/users/actions/commands/upsert_user_performance_stats_command.ts`
- `app/modules/marketplace/controllers/marketplace_match_scores_controller.ts`
- `app/modules/tasks/actions/queries/get_application_match_score_query.ts`
- `docs/01-business/capability-model-and-product-positioning.md`

### Test Evidence

Những test sau là bằng chứng mạnh rằng analysis logic không chỉ tồn tại trên giấy:

- `app/modules/reviews/tests/backend/integration/performance_score.spec.ts`
- `app/modules/reviews/tests/backend/integration/trust_score.spec.ts`
- `app/modules/reviews/tests/backend/integration/spider_chart.spec.ts`
- `app/modules/reviews/tests/backend/integration/detect_anomaly.spec.ts`
- `app/modules/tasks/tests/backend/integration/application_match_score.spec.ts`
- `inertia/apps/user/tests/e2e/tasks/match_score_explainability.spec.ts`
- `inertia/apps/user/tests/e2e/profile/profile_trust_explanation.spec.ts`

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. metric hoặc dashboard concern của mình thuộc nhóm nào
2. phần nào là runtime truth, phần nào mới chỉ có surface hoặc intent
3. lúc nào cần quay xuống route/model/query/test để verify sâu hơn

## What Is Still Missing

Chưa thấy artifact độc lập đủ mạnh cho các mục sau:

- metric glossary độc lập
- dashboard KPI sign-off artifact
- report export contract document
- periodic analysis report đã xuất bản

Điều này không làm metric/pipeline biến mất.

Nó chỉ có nghĩa docs phải trung thực:

- có runtime signal
- có code/test proof
- nhưng governance/reporting artifact độc lập vẫn còn thiếu
