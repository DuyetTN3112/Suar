# SUAR Plan V3.0 - Task -> Review -> Profile (Execution + Tracking)

> **Cập nhật 2026-03-28:**
> - Scope hiện tại của repo **không bao gồm** sửa migration/DDL vì schema SQL đã được chốt và import riêng.
> - Các mục `migration/backfill/feature flag rollout` trong file này nên hiểu là **checklist vận hành / production rollout**, không phải checklist sửa code bắt buộc ngay trong repo.
> - Phần còn lại đáng làm tiếp trong repo chủ yếu là: integration test end-to-end `task -> review -> confirm -> recalc -> snapshot`, cleanup legacy `tasks.status` khi business cho phép, và tài liệu rollout / rollback final.

## 1. Muc tieu
Muc tieu dot nay:
1. Hoan tat migration tu legacy status (`tasks.status`) sang status definition theo org (`tasks.task_status_id`).
2. Hoan tat review enrichment (overall metrics, evidences, self-assessment) va recalc pipeline.
3. Van hanh day du 5 he diem:
   - Score 1: Skill Level
   - Score 2: Skill Confidence
   - Score 3: Reviewer Credibility
   - Score 4: Performance Score
   - Score 5: Trust Score
4. Chot duong dan sang profile aggregate/snapshot de public profile co du lieu xac thuc.

## 2. Nguyen tac kien truc (bat buoc)
1. Controller chi parse request va goi action/query.
2. Action layer chi nhan `ExecutionContext`, khong nhan `HttpContext`.
3. Domain formulas/rules la pure functions, khong phu thuoc framework/db.
4. Infra/repository la noi duy nhat truy cap ORM/query.
5. Command pattern: Fetch -> Decide -> Persist.
6. Query pattern: Fetch -> Transform -> Return.

## 3. Hien trang da hoan thanh (cap nhat den 2026-03-25)

### 3.1 Task metadata + status migration groundwork
1. Da mo rong task metadata trong create flow:
   - `create_task_dto.ts`, `create_task_controller.ts`, `create_task_command.ts`.
2. Da ho tro transitional parsing:
   - nhan `task_status_id` uu tien.
   - legacy `status` van support cho backward compatibility.
3. Da bat dau dynamic status read:
   - `get_task_metadata_query.ts` lay status tu `task_statuses`.
   - `get_tasks_grouped_query.ts` group theo status definitions.
4. Da sua cac command status write de tranh loi CHECK legacy:
   - `update_task_status_command.ts`
   - `batch_update_task_status_command.ts`
   - `update_task_sort_order_command.ts`
   Legacy `tasks.status` hien ghi theo `category`, khong ghi custom slug.
5. Da nang cap event contract `task:status:changed`:
   - them `newStatusId` vao payload/event type.
6. Da refactor mot phan thong ke task sang status category co fallback:
   - `TaskRepository.countIncompleteByProject`
   - `TaskRepository.getTasksSummaryByProject`
   - `TaskRepository.getListStatsByOrganization`
   - `TaskRepository.getStatisticsByOrganization` (cac helper status-related)

### 3.2 Review enrichment
1. Da them overall metrics vao submit review:
   - `review_dtos.ts`
   - `submit_review_controller.ts`
   - `submit_skill_review_command.ts`
2. Da them evidence APIs:
   - command/query/controller + routes cho `review_evidences`.
3. Da them self-assessment APIs:
   - command/query/controller + routes cho `task_self_assessments`.

### 3.3 Scoring pipeline
1. Da them pure formulas trong domain:
   - `review_formulas.ts`, `review_types.ts`.
2. Da tao command recalc skill score (Score 1 + confidence input):
   - `recalculate_reviewee_skill_scores_command.ts`.
3. Da nang cap trust score command sang multi-signal v2:
   - `calculate_trust_score_command.ts`.
4. Da them performance score command (Score 4):
   - `calculate_performance_score_command.ts`.
5. Da noi pipeline vao listener `review:confirmed`:
   - recalc reviewer credibility.
   - recalc reviewee skills.
   - recalc performance.
   - recalc trust.
6. Da sua emit event sau commit trong `confirm_review_command.ts` de tranh stale reads.
7. Da bo sung `scoring_version` trong trust/performance persistence de truy vet formula version.

### 3.4 Batch recalc
1. Da them command scheduler:
   - `commands/recalculate_review_scores.ts`.
2. Ho tro:
   - full recalc all reviewees.
   - recalc theo user.
   - recalc theo limit.

### 3.5 Profile snapshot runtime (phase C first cut)
1. Da them model snapshot:
   - `app/models/user_profile_snapshot.ts`.
2. Da them command publish snapshot:
   - `app/actions/users/commands/publish_user_profile_snapshot_command.ts`.
3. Da them queries snapshot:
   - `get_public_profile_snapshot_query.ts`
   - `get_current_profile_snapshot_query.ts`
4. Da them controllers + routes:
   - `POST /profile/snapshots/publish`
   - `GET /profile/snapshots/current`
   - `GET /profiles/:slug` (public)
5. Da gan `currentSnapshot` vao response cua `show_profile_controller.ts`.
6. Da wire profile aggregate runtime (phase C nang cao):
    - models:
       - `app/models/user_work_history.ts`
       - `app/models/user_performance_stat.ts`
       - `app/models/user_domain_expertise.ts`
    - commands:
       - `build_user_work_history_command.ts`
       - `upsert_user_performance_stats_command.ts`
       - `upsert_user_domain_expertise_command.ts`
       - `refresh_user_profile_aggregates_command.ts`
7. Da noi orchestration vao runtime:
    - `publish_user_profile_snapshot_command.ts` refresh aggregate truoc khi publish.
    - `review_listener.ts` refresh aggregate sau pipeline confirm review.
    - `commands/recalculate_review_scores.ts` refresh aggregate sau batch recalc scores.

## 4. Khoang trong con lai (critical)

### 4.1 Task status hard-cut chua xong
1. Nhieu thong ke/repository van group/count theo `status` string.
2. Chua chot migration script va report mismatch cho hard-cut.
3. Event payload `task:status:changed` chua co `newStatusId` (chi co slug/category).

### 4.2 Scoring persistence chua final
1. Score 4 dang persist tam vao `users.trust_data.performance_score`.
2. Runtime da upsert sang `user_performance_stats`, nhung van duy tri mirror trong `users.trust_data` de backward compatibility.
3. Da co `scoring_version` o trust/performance; con thieu strategy migration version cho storage aggregate final.

### 4.3 Profile aggregation runtime chua wire
1. Da co command aggregate chinh thuc build cho:
   - `user_work_history`
   - `user_performance_stats`
   - `user_domain_expertise`
2. Da wire publish snapshot de doc aggregate tables va build `work_highlights`, `performance_stats`, `domain_expertise`.
3. Da co API/query public profile snapshot theo slug.
4. Con lai:
   - toi uu cache invalidation cho history/access APIs khi publish lien tuc.
   - bo sung integration tests cho public token access va rotate/revoke.

### 3.6 Snapshot access management (moi cap nhat)
1. Da them query history:
   - `get_profile_snapshot_history_query.ts`.
2. Da them command quan ly truy cap snapshot:
   - `update_profile_snapshot_access_command.ts` (public/private + expires).
   - `rotate_profile_snapshot_share_link_command.ts` (rotate slug/token).
3. Da them controllers + routes:
   - `GET /profile/snapshots/history`
   - `PATCH /profile/snapshots/:id/access`
   - `POST /profile/snapshots/:id/rotate-link`
4. Da mo rong public query/controller:
   - `GET /profiles/:slug` ho tro optional `token`.
   - response public da sanitize, khong tra `shareable_token` va `data_hash`.

### 4.4 Testing + rollout chua dat DoD
1. Chua co bo test day du cho pipeline moi.
2. Chua chay soak test migration status tren data thuc.
3. Chua co runbook rollout/rollback cap production o muc final.

Cap nhat moi (2026-03-25):
1. Da bo sung integration tests cho:
   - task create flow theo contract moi `task_status_id`.
   - public profile snapshot query (public/private token/expired).
2. Da chay `npm run test:integration` va pass 172/172 tren moi truong hien tai.
3. Cac test moi la schema-aware de khong fail gia tren moi truong chua migrate day du bang/cot v5.

## 5. Ke hoach thuc thi tiep (phase-by-phase)

## Phase A - Chot status migration (uu tien cao nhat)
1. Refactor `task_repository.ts`:
   - thong ke/group by status theo `task_status_id` + map category.
   - giam dan dependency vao `status` string.
2. Nang cap event payload `task:status:changed`:
   - them `newStatusId`.
3. Tao migration/backfill script + report:
   - map 100% tasks co `task_status_id` hop le.
   - bao cao cac row fail mapping.
4. Them feature flags:
   - `task_status_v4_read`
   - `task_status_v4_write`
5. Muc tieu ket thuc phase:
   - command/query chinh khong con phu thuoc `status` de quyet dinh nghiep vu.

Tien do thuc te hien tai (Phase A):
1. Da xong event payload `newStatusId`.
2. Da xong refactor status metrics o repository theo category + fallback.
3. Da them command bao cao readiness backfill:
   - `node ace scheduler:validate-task-status-backfill`
   - ho tro scope theo `--organization-id=<uuid>`.
4. Con lai:
   - feature flags rollout.
   - migration/backfill script va rollout du lieu theo cohort.

Cap nhat moi (2026-03-25, cuoi ngay):
1. Da hard-cut them cac luong update/create task:
   - `create_task_dto.ts`/`create_task_controller.ts` bat buoc `task_status_id`.
   - `update_task_dto.ts` + `edit_task_controller.ts` bo nhan `status` update truc tiep.
   - `update_task_sort_order_command.ts`/controller bo fallback theo status slug.
2. Da doi metadata parentTasks sang `task_status_id`:
   - `get_task_metadata_query.ts`, `get_task_edit_page_query.ts`, `get_tasks_page_query.ts`.
3. SQL design file da chot huong hard-cut:
   - `docs/db/suar_postgresql_v3 copy.sql` set `task_status_id NOT NULL`, them FK, ghi ro `tasks.status` la legacy mirror.

## Phase B - Chot scoring persistence (production-grade)
1. Tao va wire runtime model/repository cho:
   - `user_performance_stats`.
2. Chuyen Score 4 tu JSONB tam thoi sang bang aggregate.
3. Them `scoring_version` vao noi luu score (trust/performance/skills metadata).
4. Cap nhat command recalc de write theo schema final.
5. Muc tieu ket thuc phase:
   - score khong con o tam state, co storage on dinh va audit duoc.

Tien do thuc te hien tai (Phase B):
1. Da persist Score 4 vao `user_performance_stats` trong `calculate_performance_score_command.ts`.
2. Van duy tri mirror vao `users.trust_data.performance_score` de backward compatibility.
3. Da bo sung `scoring_version` cho trust/performance.
4. Con lai:
   - can bo sung test integration cho score persistence va recalc pipeline end-to-end.

## Phase C - Profile aggregation + publish
1. Tao command pipeline:
   - snapshot task -> `user_work_history`.
   - aggregate -> `user_performance_stats` + `user_domain_expertise`.
   - publish -> `user_profile_snapshots`.
2. Tao queries/controllers:
   - lay current snapshot.
   - lay snapshot history.
   - lay public snapshot theo `shareable_slug`.
3. Muc tieu ket thuc phase:
   - co profile snapshot co the render doc lap voi raw review tables.

## Phase D - Test + rollout
1. Unit tests:
   - formulas edge cases.
   - status transition policy.
2. Integration tests:
   - end-to-end task -> review -> confirm -> recalc -> snapshot.
3. Rollout theo cohort:
   - org nho -> vua -> lon.
4. Monitor:
   - mismatch status mapping.
   - score anomaly spikes.
5. Muc tieu ket thuc phase:
   - dat DoD va san sang hard-cut legacy.

Tien do thuc te hien tai (Phase D):
1. Da cap nhat integration tests lien quan task status hard-cut va profile snapshot access.
2. Da xanh bo integration suite (`npm run test:integration` pass 172/172).
3. Con lai:
   - bo sung them integration test cho review recalc pipeline end-to-end.
   - hoan thien rollout checklist/rollback playbook production.

## 6. Backlog tac vu cu the (next execution list)

### Nhom 1 - Refactor task status (lam ngay)
1. Refactor `TaskRepository.getTasksSummaryByProject` sang `task_status_id` + category.
2. Refactor `TaskRepository.getListStatsByOrganization` sang status definition.
3. Refactor `TaskRepository.getStatisticsByOrganization` bo `where('status', 'done')`.
4. Them `newStatusId` vao `TaskStatusChangedEvent` + emitters.

### Nhom 2 - Scoring storage final
1. Tao model + repository cho `user_performance_stats` (neu chua co).
2. Tao command `upsert_user_performance_stats_command.ts`.
3. Cap nhat `calculate_performance_score_command.ts` de write bang aggregate.

### Nhom 3 - Snapshot pipeline
1. Tao command `build_user_work_history_command.ts`.
2. Tao command `publish_user_profile_snapshot_command.ts`.
3. Tao query `get_public_profile_snapshot_query.ts`.

### Nhom 4 - Tests
1. `tests/unit/formulas/review_formulas.spec.ts` (da bo sung test cho formulas v2).
2. `tests/integration/reviews/review_recalc_pipeline.spec.ts`.
3. `tests/integration/tasks/task_status_v4_transition.spec.ts`.

## 7. Definition of Done (ban cap nhat)
1. 100% task rows co `task_status_id` valid.
2. Luong nghiep vu chinh khong con can `tasks.status` de quyet dinh logic.
3. Review enrichment APIs hoat dong on dinh (evidence, self-assessment, overall metrics).
4. 5 he diem tinh va persist duoc theo storage final (khong tam thoi).
5. Co command recalc batch + test pass.
6. Co profile snapshot publish va query duoc theo slug.
7. Typecheck + lint + unit + integration pass.
8. Co rollout checklist va rollback playbook da dry-run.

## 8. Lenh van hanh va xac minh
1. `node ace scheduler:recalculate-review-scores`
2. `node ace scheduler:recalculate-review-scores --user-id=<uuid>`
3. `node ace scheduler:recalculate-review-scores --limit=200`
4. `node ace scheduler:validate-task-status-backfill`
5. `node ace scheduler:validate-task-status-backfill --organization-id=<uuid>`
6. `node ace scheduler:backfill-task-status-id --dry-run`
7. `node ace scheduler:backfill-task-status-id --organization-id=<uuid> --limit=500`
8. `npm run typecheck`
9. `npm run lint:backend`
10. `npm run test:unit`
11. `npm run test:integration`

## 9. Risk register (ngan gon)
1. Risk: ghi legacy status sai dinh dang (slug custom) -> vo CHECK.
   Mitigation: legacy column chi ghi `category`.
2. Risk: event emit truoc commit -> listener doc stale data.
   Mitigation: emit sau commit.
3. Risk: recalc batch lon gay lock/slow query.
   Mitigation: chay theo batch/cohort + rate limit scheduler.
4. Risk: thay doi formula lam score history nhay manh.
   Mitigation: them `scoring_version` + migration policy.
