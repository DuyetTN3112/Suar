# Handoff VI - Suar / data_train / Clawagent

## Current Answer

- Data chưa chạy external fine-tune/training job.
- `data_train` hiện có fixture/dev calibration bundles và runtime artifacts `READY`; nghĩa "trained" trong lượt này là bundle JSONL/contract đã validate và Clawagent runtime đọc được.
- Final-decision label gap đã hết trong dev runtime bundle: `uphold_review=1`, `adjust_score=1`, `request_re_review=2`, `dismiss_dispute=1`, `partially_accept=2`.
- AI-judgment gate đã `READY` bằng dev fixture dataset: `20` usable records, `ai_correct=10`, `ai_incorrect=10`, mỗi final decision có `4` admin-decision examples.
- Suar report flow hiện đã nối đủ:
  - user bấm report tranh chấp;
  - report vào admin queue;
  - Suar auto-queue AI evaluation;
  - non-test runtime POST sang Clawagent;
  - Clawagent async xử lý và callback;
  - Suar lưu result vào `ai_dispute_evaluations`;
  - admin thấy AI result/count để duyệt.
- Browser E2E now proves task-review board report UX reaches admin queue and shows `AI 1 runs`; production-path Clawagent POST/callback remains proven by backend integration + Clawagent runtime probes, because Playwright runs under `NODE_ENV=test`.
- Live-dev browser proof now also ran with Suar `NODE_ENV=development` on `suar_test` DB and real Clawagent on `127.0.0.1:8080`; the report POST reached Clawagent, Clawagent ran the LLM council, callback succeeded, Suar stored a completed AI evaluation, and admin detail UI showed the AI result.
- Admin queue classic now hides unreported `review_disputes`; only reported disputes appear in the admin queue, matching sprint/reverse/task behavior.
- AI auto-queue remains best-effort so report delivery is not rolled back, but skip/failure is now observable via platform warn events.

## Suar Evidence

- Auto queue helper: `app/modules/reviews/actions/support/ai_dispute_auto_queue.ts`
- Report commands call auto queue after report commit:
  - `report_review_dispute_command.ts`
  - `report_sprint_review_dispute_command.ts`
  - `report_sprint_reverse_review_workflow_command.ts`
  - `report_task_review_dispute_command.ts`
- Auto queue observability:
  - logs `review.dispute.ai_evaluation.auto_queue_skipped` when no automation actor is available;
  - logs `review.dispute.ai_evaluation.auto_queue_failed` when queueing throws unexpectedly;
  - still keeps report delivery successful.
- Clawagent trigger payload includes `source_type/source_id/callbackUrl`.
- Admin API list counts AI evaluations for classic, sprint, reverse, and task workflow disputes.
- Admin API list filters classic review disputes by `reported_to_admin_at` so unreported classic disputes do not appear in the admin queue.
- Admin detail returns `ai_evaluations`.
- Admin list UI shows `AI N lượt`.
- Admin detail resolve tab shows AI recommendation, summary, and confidence percentage so admin can weigh the AI result before issuing the final decision.
- Admin detail readiness now treats AI council as `READY` only when at least one AI evaluation is `completed`; `failed`, `queued`, or `processing` runs remain visible but do not mark the advisory layer ready.
- Admin filter tabs include `reported` and `ai_reviewing`.
- Production-path regression coverage now proves report actions trigger Clawagent for classic, sprint, sprint reverse, and task review workflow sources.
- Task-review board now renders the selected workflow detail/report panel on both user and org surfaces again, using the already-provided `detail` prop.

## Clawagent Evidence

- Public endpoint exists: `POST /api/public/disputes/arbitrate`.
- Clawagent accepts async callback flow and signs callback with `AI_CALLBACK_SECRET`.
- Fix added: runtime source packages (`task_review_workflow`, `sprint_review_dispute`, `sprint_reverse_review_workflow`) no longer require `case_file_id`.
- Classic `review_dispute` still requires `case_file_id`.
- New Clawagent regression: public arbitration accepts runtime source package with `case_file_id: null`.
- Local HTTP probes with mock LLM and callback sink verify:
  - classic Suar trigger package is accepted, processed async, and callback is sent with stable IDs;
  - runtime source package with `case_file_id: null` is accepted, processed async, and callback omits `case_file_id`.
- Live-dev Clawagent run loaded `7` eligible final-decision training records, ran three LLM turns, and sent callback successfully to `http://127.0.0.1:3334/api/public/ai-disputes/callback`.

## data_train Evidence

- Runtime bundle files exist:
  - `/home/tranngocduyet/Projects/data_train/processed/live_suar_sync/clawagent_training_bundle/clawagent_suar_training_data.jsonl`
  - `/home/tranngocduyet/Projects/data_train/processed/live_suar_sync/clawagent_training_bundle/clawagent_training_contract.json`
  - `/home/tranngocduyet/Projects/data_train/processed/live_suar_ai_judgment_sync/clawagent_ai_judgment_bundle/clawagent_suar_ai_judgment_data.jsonl`
  - `/home/tranngocduyet/Projects/data_train/processed/live_suar_ai_judgment_sync/clawagent_ai_judgment_bundle/clawagent_ai_judgment_contract.json`
- Combined final-decision generator now exists:
  - `/home/tranngocduyet/Projects/data_train/src/data_train/pipelines/build_combined_final_decision_dataset.py`
  - `/home/tranngocduyet/Projects/data_train/scripts/build_combined_final_decision_dataset.py`
- Combined final-decision current manifest:
  - `/home/tranngocduyet/Projects/data_train/processed/admin_label_handoff_current/combined_fixture_final_decision/combined_final_decision_dataset_manifest.json`
  - status `READY`, primary train records `5`, fixture top-up records `2`, top-up labels `dismiss_dispute=1`, `uphold_review=1`.
- Runtime final-decision Clawagent bundle: status `READY`, eligible train records `7`, label counts cover all five Suar final decisions.
- Runtime AI-judgment Clawagent bundle: status `READY`, eligible records `20`, `ai_correct=10`, `ai_incorrect=10`.
- `training_status_dashboard.md`: status `READY`, label gap all `0`, AI-judgment `READY`, Clawagent runtime `READY`.
- `current_state_gate_snapshot.md`: status `READY`, blockers `none`.

## Verification

- Suar UI dispute/admin tests: `13 passed`.
- Admin dispute detail UI tests: `8 passed` across show + resolve tab after adding AI confidence visibility and failed-AI readiness regression.
- Suar report flow integration suite: `31 passed`.
- Classic review dispute integration file: `14 passed` after adding production-path auto-trigger, unreported-admin-queue regression, and missing-automation-actor observability regression.
- Sprint review dispute integration file: `6 passed` after adding production-path auto-trigger regression.
- Sprint reverse workflow integration file: `9 passed` after adding production-path auto-trigger regression.
- Task review workflow integration file: `7 passed`.
- Task review board browser E2E: `2 passed`; includes user report from board, admin queue visibility, and `AI 1 runs` badge.
- Task review board browser E2E now asserts stable workflow status text (`2/2 · disputed`, `2/2 · reported`) instead of transient flash messages.
- Task review workflow integration rerun: `7 passed`; includes production-path Clawagent auto-trigger stub.
- Live-dev Suar + real Clawagent browser run: `1 passed` for the report flow with `PORT=3334 E2E_REUSE_EXISTING_SERVER=true`; Clawagent callback log: `Callback sent successfully`.
- Live-dev DB evidence: latest `task_review_workflow` AI eval `completed`, `external_run_id` present, recommendation `request_re_review`, confidence `0.5500`, summary stored, admin detail UI showed overview `AI council completed` and resolve-tab AI support.
- AI dispute callback integration file: `16 passed`; covers completed/failed callbacks and sprint/reverse/task source transitions back to admin review states.
- Suar callback/admin read integration suite: `38 passed`.
- Suar admin audit logs suite: `8 passed`.
- Suar `svelte-check`: `0 errors`, `0 warnings`.
- Suar `tsc --noEmit`: passed.
- Suar targeted ESLint: passed.
- Suar `gitnexus detect-changes`: latest `changed=264`, `new=43`, `deleted=6`.
- data_train audit/dashboard/snapshot focused tests: `21 OK`.
- data_train combined/dashboard/runtime focused tests: `32 passed`.
- data_train full suite: `318 passed`.
- Suar classic report-flow integration rerun: `14 passed`; includes production-path auto-trigger and no-automation-actor skip logging.
- Clawagent `node --test server.test.cjs`: `27 passed`.
- Clawagent `node --test tests/dispute.test.cjs`: `3 passed`.
- Clawagent local HTTP probe, classic trigger: `node --test --test-name-pattern="public arbitration route accepts Suar trigger package and returns stable async IDs" server.test.cjs` passed.
- Clawagent local HTTP probe, runtime source trigger: `node --test --test-name-pattern="public arbitration route accepts runtime source packages without case files" server.test.cjs` passed; rerun passed after bundle refresh.
- Clawagent live health check passed while running `server.js` on `127.0.0.1:8080`: `GET /healthz` returned `200 {"ok":true,"service":"suar-dispute"}`.
- Env presence/alignment audit: `SUAR_DISPUTE_API_KEY MATCH`, `AI_CALLBACK_SECRET MATCH`, `SUAR_CALLBACK_ALLOWED_ORIGINS` includes the Suar callback origin, Suar uses default local Clawagent URL when `CLAWAGENT_API_URL` is unset.

## Caveats

- Live-dev manual-equivalent browser run with Suar + real Clawagent is now performed on `suar_test`. First attempt exposed `callbackUrl origin is not allowed`; rerun passed after starting Clawagent with `SUAR_CALLBACK_ALLOWED_ORIGINS` including `http://127.0.0.1:3334`.
- Normal Playwright config still runs `NODE_ENV=test`, so it proves report UX/admin queue/AI-eval count without calling Clawagent. Use development-mode reuse server when you specifically need real Clawagent callback proof.
- AI auto-queue is best-effort: if no system admin actor exists, or an unexpected queue error happens, report delivery still succeeds and AI queue may be skipped. Normal seeded/dev state has a superadmin; skipped/failed auto-queue attempts now produce platform warn events.
- Fixture/dev bundles are ready, not external fine-tuned model output and not production-scale balanced goldset.
- Final-decision and AI-judgment runtime gaps are covered with explicit fixture/dev top-up because there are no real users/admin labels yet.
- `data_train/TRAINING_DATA_SESSION_HANDOFF_VI.md` was missing in current filesystem state during this audit, so this file is the current handoff at the user-requested Suar path.
- Suar worktree is broad dirty/parallel; do not assume every changed file belongs to this workstream.
