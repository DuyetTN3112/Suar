# Dark Theme + EN/VI i18n Audit

Date: 2026-07-19

## Fixed In This Slice

- Dark shell surfaces now use semantic tokens across user, org, and admin workspaces.
- Legacy light utility classes are dark-safe through workspace CSS compatibility rules.
- Settings surfaces no longer use light-only `bg-white` cards.
- Settings shell/copy is routed through EN/VI translation keys.
- Static language files are restricted to `en` and `vi`.
- Inertia document `<html lang>` follows the active locale.
- Date-fns formatting no longer hardcodes Vietnamese locale outside the shared locale helper.
- User/org/admin sidebar navigation now renders `titleKey` labels through `common.*` EN/VI resources instead of raw Vietnamese fallbacks; built-in role labels use EN/VI role resources.
- User settings dark-mode browser check confirms sidebar, top bar, body, and cards render dark with locale `en` and no Vietnamese sidebar labels.
- User/org/admin handled error pages (`require_organization`, `server_error`, `custom_error`, `not_found`, `forbidden`) now use semantic dark-safe surfaces and EN/VI common error-page keys.
- Admin audit log console hero, overview, trace context, event stream, investigation scope, payload diff, local pivots, active signal, selection snapshot, and investigation preset panels now use semantic card/border/muted tokens instead of white/slate light-only surfaces.
- User/org project index and project foundation form copy now route through EN/VI project keys.
- User/org task applications page copy now routes through EN/VI task keys, including status filters, ranking labels, toasts, candidate source labels, and submitted-date locale.
- User/org task edit page header, validation, summary cards, tabs, context labels, and placeholders now route through EN/VI task keys.
- User/org task create basic description helper now routes section headings, helper buttons, labels, and placeholders through EN/VI task keys.
- User/org task create metadata form now routes project/task-type/domain/problem/role/visibility/assignee/parent-task labels and operational visibility rules through EN/VI task keys.
- User/org task create contract tab, page summary cards, modal store validation/toasts, role prefill panel, contract presets, and work-area starters now route through EN/VI task keys.
- User/org marketplace task cards now route copy, application states/actions, difficulty labels, skill range labels, recommendation evidence labels, and date formatting through EN/VI task keys and locale-aware date formatting.
- User/org marketplace filters now route keyword, skill category, advanced filter labels, accepting-application state, difficulty, task type, verification, domain, role, and sort copy through EN/VI `task.marketplace_filters.*` keys.
- User/org task workflow status-management controllers now route create/delete/rename/reorder permission, validation, sync, success, and failure copy through EN/VI task keys.
- Admin disputes index now routes list, filters, status/outcome/source labels, resolution lane copy, count labels, and dates through EN/VI task keys with locale-aware date formatting.
- User/org pending sprint review package panels now route list, history, dispute, form, toast/error, status, role, and date copy through EN/VI task keys and semantic dark-safe surfaces.
- User/org project sprint panels now route sprint form, status, debt messaging, board actions, notifications, task counts, and dates through EN/VI project keys with dark-safe surfaces.
- User/org project skills tabs now route catalog filters, dialogs, toasts/errors, table headings, status labels, counters, and category labels through EN/VI project keys with dark-safe badge/table tokens.
- User/org organizations index pages now route shell title, hero, stats, filters, tabs, empty states, join/switch actions, and toast/error copy through EN/VI organization keys with dark-safe stat cards.
- User/org organization detail pages now route layout title, back link, metadata, member/project/review tabs, review governance labels, reviewer labels, comments, and dates through EN/VI organization keys with locale-aware date formatting.
- User/org profile snapshot panels now route snapshot form, access controls, history, feedback, and dates through EN/VI user keys with dark-safe card surfaces.
- User profile featured reviews now route review lanes, filters, sorting, status/kind labels, empty states, counts, cards, and dates through EN/VI user keys with dark-safe review cards.
- User/org profile overview cards now remove light-only white/color-mix surfaces; org profile available-date formatting uses the active document locale instead of hardcoded `vi-VN`.
- Admin dispute detail tabs now use semantic card/border/muted tokens instead of white/slate/amber/emerald/sky light-only surfaces.
- User/org review dispute detail shells and tabs now use semantic card/border/muted tokens instead of gradient white, white cards, and amber/emerald light-only surfaces.
- User/org project workspaces now remove remaining white/slate light-only surfaces from project list, details, roles, staffing, member, and candidate panels.
- User/org profile skill, chart, work-history, proficiency, and featured-review panels now remove remaining white/slate light-only surfaces.
- User/org task workspace surfaces now remove remaining white/slate/emerald light-only panels from task boards, applications, status board, skill requirements, skill dialogs, task skill field, and execution brief panels.
- User/org/admin review workspace surfaces now remove remaining white/slate/gradient and amber/emerald/rose `*-50` light-only panels from review boards, reverse reviews, sprint disputes, review cards, related comments, rating forms, confirmation panels, and pending sprint review packages.
- Admin audit log workspace tabs, server filters, and pagination controls now use semantic dark-safe card/primary/muted tokens.
- Remaining dashboard, user, organization, search, marketplace, applications, sprint, no-organization, admin dashboard, admin users, admin organizations, and admin QR code panels now remove remaining non-dark `bg-white`, slate, gradient, and white color-mix surfaces.
- User dashboard and org dashboard copy now route through EN/VI `user.dashboard.*` and `organization.dashboard.*` resources with synced dashboard subtrees.
- User/org my-applications pages now route status labels, header copy, notifications, table labels, empty states, proof labels, withdrawal copy, and dates through EN/VI `task.my_applications.*` keys with locale-aware date formatting.
- User/org marketplace task page shell copy now routes title, workspace eyebrow, totals, showing range, and empty state through EN/VI `task.marketplace_page.*` keys.
- User/org search header copy now routes headline, subtitle, metrics, match labels, placeholder, and search button through EN/VI `search_center.*` common keys.
- Admin users index/detail pages now route list filters, role/status labels, table/detail headings, account operations, buttons, and dates through EN/VI `user.admin_users.*` keys with locale-aware date formatting.
- User/org sprint review dispute detail pages now route room shell, comment/report feedback, status/context labels, discussion counts, escalation copy, and dates through EN/VI `task.sprint_review_disputes.*` keys with locale-aware date formatting.
- User/org/admin reverse-review page shells now route history/legacy/admin titles, tab labels, stat labels, empty states, status/kind labels, and dates through EN/VI `task.reverse_reviews.*` keys.
- User/org organization-required dialogs now route title, description, and action copy through EN/VI `organization.required_dialog.*` keys; icon surfaces use semantic `bg-muted` / `text-muted-foreground` tokens instead of slate-specific light/dark utility pairs.
- Org dispute index now routes filters, status/outcome labels, empty states, counts, fallback labels, and actions through EN/VI `task.disputes.org_index.*` plus shared dispute status/outcome keys.
- Admin organizations index/detail pages now route list filters, cards, empty states, detail labels, counts, owner metadata, and dates through EN/VI `organization.admin_organizations.*` keys with locale-aware date formatting.
- User/org project staffing helper, auto-fill panel, auto-fill result, role add dialog, and role candidate dialog copy now route through EN/VI `project.staffing.*`, `project.role_dialog.*`, and `project.role_candidates.*` keys.
- User/org project create workflow shells, staffing step, launch step, wizard labels, validation, setup blueprint labels/roles, and launch summaries now route through EN/VI `project.create_page.*` keys.
- User/org project detail, member, role, and role-skill workspace components now route stats, status labels, add-member dialog copy, role actions, confirm dialogs, toasts, skill labels, and empty states through EN/VI `project.details_tab.*`, `project.members_tab.*`, `project.member_card.*`, `project.roles_tab.*`, and `project.role_skill_dialog.*` keys.
- User/org project show shells, project detail modals, and org operating-model tab now route hero actions, review governance stats, confirm dialogs, sprint/operating model copy, modal labels, and update/delete toasts through EN/VI `project.show_page.*`, `project.detail_modal.*`, and `project.operating_model.*` keys.
- `buildAddUserSkillDTO` omits undefined optional payload fields so backend typecheck passes with `exactOptionalPropertyTypes`.
- Task create request mapping now preserves custom required skill names/categories through validation and DTO normalization, unblocking strict typecheck and existing task mapper unit coverage.
- Admin audit log read ops now reuse the audit module admin log types, so enterprise audit metadata fields exposed by the query stay aligned with the repository source-of-truth.

## Verification

- `pnpm exec tsc --noEmit`: passed.
- `pnpm run svelte-check`: passed, 0 errors, 0 warnings.
- `pnpm exec vitest run inertia/apps/user/tests/shared/theme/dark_theme_source.test.ts inertia/apps/admin/tests/shared/i18n/admin_disputes_i18n_source.test.ts`: passed, 2 files, 15 tests.
- `pnpm exec vitest run inertia/apps/user/tests/shared/i18n/dashboard_i18n_source.test.ts inertia/apps/user/tests/shared/i18n/task_i18n_source.test.ts inertia/apps/user/tests/shared/i18n/search_i18n_source.test.ts inertia/apps/user/tests/shared/theme/dark_theme_source.test.ts`: passed, 4 files, 33 tests.
- `pnpm exec vitest run inertia/apps/user/tests/shared/i18n/task_i18n_source.test.ts inertia/apps/user/tests/shared/i18n/search_i18n_source.test.ts inertia/apps/user/tests/shared/i18n/dashboard_i18n_source.test.ts inertia/apps/admin/tests/shared/i18n/admin_users_i18n_source.test.ts inertia/apps/admin/tests/shared/i18n/admin_disputes_i18n_source.test.ts inertia/apps/user/tests/shared/theme/dark_theme_source.test.ts`: passed, 6 files, 39 tests.
- `pnpm exec vitest run inertia/apps/user/tests/shared/i18n/task_i18n_source.test.ts inertia/apps/user/tests/shared/i18n/organization_i18n_source.test.ts inertia/apps/user/tests/shared/i18n/search_i18n_source.test.ts inertia/apps/user/tests/shared/i18n/dashboard_i18n_source.test.ts inertia/apps/admin/tests/shared/i18n/admin_users_i18n_source.test.ts inertia/apps/admin/tests/shared/i18n/admin_organizations_i18n_source.test.ts inertia/apps/admin/tests/shared/i18n/admin_disputes_i18n_source.test.ts inertia/apps/user/tests/shared/theme/dark_theme_source.test.ts`: passed, 8 files, 50 tests.
- `pnpm exec vitest run inertia/apps/user/tests/shared/i18n/project_i18n_source.test.ts inertia/apps/user/tests/shared/i18n/task_i18n_source.test.ts inertia/apps/user/tests/shared/i18n/organization_i18n_source.test.ts inertia/apps/user/tests/shared/i18n/search_i18n_source.test.ts inertia/apps/user/tests/shared/i18n/dashboard_i18n_source.test.ts inertia/apps/admin/tests/shared/i18n/admin_users_i18n_source.test.ts inertia/apps/admin/tests/shared/i18n/admin_organizations_i18n_source.test.ts inertia/apps/admin/tests/shared/i18n/admin_disputes_i18n_source.test.ts inertia/apps/user/tests/shared/theme/dark_theme_source.test.ts`: passed, 9 files, 61 tests.
- Focused i18n/theme Vitest guards: 11 files passed, 49 tests passed.
- User settings dark Playwright smoke: locale `en`, `data-theme="dark"`, dark sidebar/card backgrounds, and no Vietnamese sidebar labels; screenshot saved at `test-results/e2e-visual/dark-theme-settings/settings-dark-after-nav-i18n.png`.
- Sidebar navigation source guard: user/org/admin sidebars render labels through `getNavLabel()` and synced EN/VI `common` resources.
- Admin audit log panel source scan: no `bg-white`, `bg-slate-50`, `bg-slate-100`, `border-slate-100/200`, light `text-slate-*`, low-tone `bg-*-50`, or gradient surfaces remain in the touched audit log panels.
- Handled error page source scan: no direct Vietnamese strings or slate/red light-only background/text classes remain in touched user/org/admin `require_organization`, `server_error`, `custom_error`, `not_found`, and `forbidden` pages outside EN/VI resources.
- Task create contract/preset/starter source scan: no direct Vietnamese strings remain in the touched user/org task create contract, role-prefill, preset, and starter files outside EN/VI resources.
- Marketplace task card source scan: no direct Vietnamese strings remain in the touched user/org marketplace task cards outside EN/VI resources.
- Marketplace filters source scan: no direct Vietnamese filter labels, difficulty/sort copy, or hardcoded category labels remain in touched user/org marketplace filters outside EN/VI resources.
- Admin disputes index source scan: no direct Vietnamese strings remain in the touched admin disputes list outside EN/VI resources.
- Admin users source scan: no direct Vietnamese list/detail labels or hardcoded `vi-VN` dates remain in touched admin user index/detail pages outside EN/VI resources.
- Sprint dispute detail source scan: no direct Vietnamese room/action/status copy, hardcoded `vi-VN` dates, or red/amber light-only alert tokens remain in touched user/org sprint dispute detail pages outside EN/VI resources.
- Reverse review page source scan: no direct Vietnamese shell/history/stat/status copy or hardcoded `vi-VN` dates remain in touched user/org/admin reverse review page shells outside EN/VI resources.
- Organization-required dialog source scan: no direct Vietnamese copy remains in touched user/org required-organization dialogs outside EN/VI resources.
- Org dispute index source scan: no direct Vietnamese filter/list/count copy remains in touched org dispute index outside EN/VI resources.
- Admin organizations source scan: no direct Vietnamese list/detail labels or hardcoded `vi-VN` dates remain in touched admin organization index/detail pages outside EN/VI resources.
- Project staffing/role source scan: no direct Vietnamese labels, toast fallbacks, action labels, or candidate state copy remains in touched user/org staffing helper, panel, result item, role add dialog, and role candidate dialog components outside EN/VI resources.
- Project create workflow source scan: no direct Vietnamese wizard, staffing, validation, blueprint, launch, or action copy remains in touched user/org create workflow files outside EN/VI resources.
- Project workspace details/members/roles source scan: no direct Vietnamese stats, labels, add-member dialog copy, role actions, confirm/toast copy, or role-skill dialog text remains in the touched user/org project workspace components outside EN/VI resources.
- Project show/modal/operating-model source scan: no direct Vietnamese hero action, review governance, confirm dialog, sprint, operating-model, detail modal, or update/delete toast copy remains in the touched user/org project show and modal files outside EN/VI resources.
- Pending sprint review package source scan: no direct Vietnamese strings, `bg-white`, or Vietnamese date hardcodes remain in the touched user/org package panels outside EN/VI resources.
- Project sprint panel source scan: no direct Vietnamese strings, `bg-white`, gradient light cards, or default-locale date formatting remain in the touched user/org sprint panels outside EN/VI resources.
- Project skills tab source scan: no direct Vietnamese strings, slate/light badge classes, or light table text tokens remain in the touched user/org skills tabs outside EN/VI resources.
- Organizations index source scan: no direct Vietnamese strings or `bg-white` remain in the touched user/org organization index pages outside EN/VI resources.
- Organizations show source scan: no direct Vietnamese strings, `bg-white`, or hardcoded shared `formatDate` usage remain in the touched user/org organization detail pages outside EN/VI resources.
- Profile snapshot/reviews source scan: no direct Vietnamese strings, `bg-white`, color-mix white cards, or Vietnamese date hardcodes remain in the touched profile snapshot/review components outside EN/VI resources.
- Profile overview source scan: no `bg-white`, white color-mix cards, or hardcoded `toLocaleDateString('vi-VN')` remain in the touched user/org overview components.
- Admin/user/org dispute detail source scan: no `bg-white`, `bg-slate-50`, amber/emerald/sky light borders, text amber/sky/emerald 900, or gradient white surfaces remain in the touched dispute detail files.
- Global module dark source scan: no non-dark `bg-white`, `bg-white/*`, `bg-slate-50/100/200/900`, `border-slate-100/200/700`, `text-slate-50/200/500/600/700/800/900`, `linear-gradient`, or white `color-mix(...)` surfaces remain in `inertia/apps/{user,org,admin}/modules/**/*.svelte`.
- Dashboard/my-applications/marketplace/search source guards: no direct Vietnamese copy remains in the touched user/org dashboard, applications, marketplace page shell, or search header files outside EN/VI resources.
- `pnpm exec vitest run inertia/apps/admin/tests/modules/disputes/index.test.ts`: passed, 6 tests.
- `pnpm exec vitest run inertia/apps/user/tests/modules/reviews/pending_sprint_review_packages.test.ts`: passed, 1 test.
- `pnpm exec vitest run inertia/apps/org/tests/modules/projects/project_sprint_panel.test.ts`: passed, 5 tests.
- `pnpm exec vitest run inertia/apps/user/tests/modules/profile/components/profile_snapshot_panel.test.ts`: passed, 1 test.
- `node --import=@poppinss/ts-exec bin/test.ts unit --files=app/modules/admin/tests/backend/unit/admin_read_controller_aliases.spec.ts`: passed, 2 tests.
- `node --import=@poppinss/ts-exec bin/test.ts integration --files=app/modules/admin/tests/backend/integration/audit_logs.spec.ts`: passed, 8 tests.
- `node --import=@poppinss/ts-exec bin/test.ts unit --files=app/modules/users/tests/backend/unit/user_controller_mappers.spec.ts`: passed, 2 tests.
- `node --import=@poppinss/ts-exec bin/test.ts unit --files=app/modules/tasks/tests/backend/unit/task_request_mapper.spec.ts`: passed, 10 tests.
- Edge render smoke for Inertia templates with and without `i18n`: passed.
- `gitnexus detect-changes`: latest focused run reported `changed 72`, `new 7`, `deleted 1`; existing worktree contains broad unrelated changes.

## Known Remaining i18n Work

Hardcoded Vietnamese strings remain outside the fixed shell/settings/sidebar-navigation/date-locale/handled-error-pages/project/task-applications/task-edit/task-create-basic/task-create-metadata/task-create-contract/marketplace-task-card/marketplace-filters/task-workflow-status/admin-disputes/admin-dispute-detail/user-org-review-dispute-detail/pending-sprint-review-package/sprint-dispute-detail/reverse-review-page/org-dispute-index/project-sprint-panel/project-skills-tab/project-staffing-role-components/project-create-workflow/project-workspace-details-members-roles/project-show-modal-operating-model/organizations-index/organizations-show/organization-required-dialog/admin-users/admin-organizations/profile-snapshot/profile-featured-reviews/profile-overview slice. Dark light-only module surfaces are now guarded globally by source scan. Re-run the i18n candidate scan for the next highest-priority UI files because translated fallbacks inside `t()` still count as candidate lines.

## Known Verification Caveat

`gitnexus detect-changes` cannot prove patch-only scope because the shared worktree already contains broad modified/untracked/deleted files.
