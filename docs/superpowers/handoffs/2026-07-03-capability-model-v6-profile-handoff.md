# Capability Model V6 / Profile User Session Handoff

## Status

Completed for current profile UI scope

## Date

2026-07-03

## Why this handoff exists

Session dài, đã có nhiều vòng refactor nhỏ nối tiếp nhau quanh `profile user`. File này để session sau tiếp tục ngay, không phải lần lại toàn bộ chat hay audit lại từ đầu.

## Active objective

Tiếp tục áp dụng và kiểm chứng các ý đúng đã được hấp thụ vào [docs/01-business/capability-model-and-product-positioning.md](/home/tranngocduyet/Projects/Suar/docs/01-business/capability-model-and-product-positioning.md:1) lên profile user, ưu tiên:

- chart
- thông số / wording
- explainability
- tách `claim` vs `verified`
- giảm hiểu lầm giữa `capability`, `trust`, `coverage`, `evidence`

Không coi v6 là truth tuyệt đối. Hướng làm hiện tại là:

- check lại bằng code hiện có
- chỉ áp dụng phần nào hợp logic với data/runtime hiện tại
- ghi evidence rõ ở [2026-07-03-capability-model-v6-review.md](/home/tranngocduyet/Projects/Suar/docs/evidence/2026-07-03-capability-model-v6-review.md:1)

## Source docs worth reopening first

- [capability-model-and-product-positioning.md](/home/tranngocduyet/Projects/Suar/docs/01-business/capability-model-and-product-positioning.md:1)
- [profile_pipeline_and_marketplace.md](/home/tranngocduyet/Projects/Suar/docs/01-business/features/profile_pipeline_and_marketplace.md:1)
- [2026-07-03-capability-model-v6-review.md](/home/tranngocduyet/Projects/Suar/docs/evidence/2026-07-03-capability-model-v6-review.md:1)

## What is already landed

### 1. Profile chart semantics cleaned up

Files:

- [profile_spider_chart_card.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/profile/components/profile_spider_chart_card.svelte:1)
- [profile_skills_and_charts_section.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/profile/components/profile_skills_and_charts_section.svelte:1)
- [types.svelte.ts](/home/tranngocduyet/Projects/Suar/inertia/pages/profile/types.svelte.ts:1)
- [profile_chart_summary.ts](/home/tranngocduyet/Projects/Suar/inertia/pages/profile/profile_chart_summary.ts:1)

Behavior already true:

- imported/self-declared skills không tính vào verified average
- radar không render nếu chưa đủ reviewed points thật
- card tách:
  - `Highest verified`
  - `Most evidenced`
  - `Needs verification`
- card có:
  - `Confidence: ...`
  - `Category warnings`
- chart card giờ nhận `summary` shape từ parent
- summary generation đã được tách ra helper riêng

### 2. Overview semantics improved

File:

- [profile_overview_section.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/profile/components/profile_overview_section.svelte:1)

Behavior already true:

- top stats đã tách:
  - `Capability verified`
  - `Profile trust`
  - `Delivery reliability`
  - `Evidence coverage`
- `Capability verified` giờ đọc từ verified capability summary, không còn fallback sang trust/performance-derived score khi đã có reviewed skill evidence
- reviewed/coverage count ở overview giờ ưu tiên live `userSkills`, không còn để snapshot total verified skills đè lên rồi tạo mismatch kiểu `5/3 verified`
- nếu live `userSkills` tồn tại nhưng tất cả đều imported thì reviewed count vẫn giữ `0`, không fallback ngược sang snapshot verified totals
- overview watchlist hiện đã dùng shared helper để derive:
  - `Capability confidence: ...`
  - shared `warnings`
  - `Needs verification: ...`

### 3. Skill cards and snapshot explainability improved

Files:

- [profile_skills_and_charts_section.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/profile/components/profile_skills_and_charts_section.svelte:1)
- [profile_snapshot_panel.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/profile/components/profile_snapshot_panel.svelte:1)

Behavior already true:

- verified skill cards có:
  - evidence count
  - freshness
  - governance state
  - level meaning
  - scope expectation
  - next evidence hint
- snapshot panel có:
  - next-step guidance
  - evidence anchors
  - lightweight task `Scope signal`

## Current semantic architecture

### Shared summary helper

Main helper:

- [profile_chart_summary.ts](/home/tranngocduyet/Projects/Suar/inertia/pages/profile/profile_chart_summary.ts:1)

Current export:

- `buildProfileChartCardSummary(...)`

Current outputs:

- `chart_mode`
- `verified_average_score`
- `confidence_summary`
- `warnings`
- `strongest_verified_skill_name`
- `most_evidenced_skill_name`
- `most_evidenced_review_count`
- `needs_verification_names`

This helper is now used by:

- [profile_skills_and_charts_section.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/profile/components/profile_skills_and_charts_section.svelte:1)
- [profile_overview_section.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/profile/components/profile_overview_section.svelte:1)
- [profile_spider_chart_card.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/profile/components/profile_spider_chart_card.svelte:1)

### Current tests

- [profile_chart_summary.test.ts](/home/tranngocduyet/Projects/Suar/inertia/tests/component/profile/profile_chart_summary.test.ts:1)
- [profile_spider_chart_card.test.ts](/home/tranngocduyet/Projects/Suar/inertia/tests/component/profile/profile_spider_chart_card.test.ts:1)
- [profile_skills_and_charts_section.test.ts](/home/tranngocduyet/Projects/Suar/inertia/tests/component/profile/profile_skills_and_charts_section.test.ts:1)
- [profile_overview_section.test.ts](/home/tranngocduyet/Projects/Suar/inertia/tests/component/profile/profile_overview_section.test.ts:1)
- [profile_snapshot_panel.test.ts](/home/tranngocduyet/Projects/Suar/inertia/tests/component/profile/profile_snapshot_panel.test.ts:1)

## Most recent verified state

These commands passed at end of session:

```bash
pnpm exec vitest run \
  inertia/tests/component/profile/profile_chart_summary.test.ts \
  inertia/tests/component/profile/profile_spider_chart_card.test.ts \
  inertia/tests/component/profile/profile_skills_and_charts_section.test.ts \
  inertia/tests/component/profile/profile_overview_section.test.ts \
  inertia/tests/component/profile/profile_snapshot_panel.test.ts
```

```bash
npm run typecheck
```

Latest result:

- `5` test files passed
- `9` tests passed
- `svelte-check found 0 errors and 0 warnings`

## Important repo/process context

- Repo rất bẩn. Không revert unrelated changes.
- Dùng `pnpm`, `npm`, `rg` trực tiếp.
- GitNexus CLI/impact tools không xuất hiện callable trong session gần nhất, nên các vòng vừa qua đã fallback sang đọc code + test trực tiếp.

## Exact next best step

Không còn known concrete regression nào trong current profile UI scope đã audit.

Đã verify:

- chart semantics
- overview semantics
- claim vs verified separation
- capability vs trust vs coverage boundaries
- live `userSkills` priority over snapshot fallbacks
- wording drift nguy hiểm nhất giữa overview/chart/helper

Nếu mở session mới, hướng tiếp theo không còn là fix bug rõ ràng trong profile surface hiện tại mà là một trong hai hướng:

1. dừng ở đây và coi profile-v6 UI pass hiện tại là đủ cho current runtime truth
2. hoặc mở scope mới:
   - centralize thêm copy/constants nếu muốn giảm drift tiếp
   - đẩy semantics sâu hơn xuống backend/domain aggregates thay vì chỉ frontend helper
   - audit các surface ngoài profile user bằng cùng tiêu chí v6

Mục tiêu:

- giữ handoff/evidence doc bám đúng runtime đã verify
- chỉ mở thêm scope nếu muốn đi sâu hơn current profile UI surface

## Good files to open first next session

- [profile_chart_summary.ts](/home/tranngocduyet/Projects/Suar/inertia/pages/profile/profile_chart_summary.ts:1)
- [profile_overview_section.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/profile/components/profile_overview_section.svelte:1)
- [profile_spider_chart_card.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/profile/components/profile_spider_chart_card.svelte:1)
- [profile_skills_and_charts_section.svelte](/home/tranngocduyet/Projects/Suar/inertia/pages/profile/components/profile_skills_and_charts_section.svelte:1)
- [profile_overview_section.test.ts](/home/tranngocduyet/Projects/Suar/inertia/tests/component/profile/profile_overview_section.test.ts:1)
- [profile_chart_summary.test.ts](/home/tranngocduyet/Projects/Suar/inertia/tests/component/profile/profile_chart_summary.test.ts:1)
- [2026-07-03-capability-model-v6-review.md](/home/tranngocduyet/Projects/Suar/docs/evidence/2026-07-03-capability-model-v6-review.md:1)

## Suggested prompt for next session

```text
Mở file docs/superpowers/handoffs/2026-07-03-capability-model-v6-profile-handoff.md. Current profile UI scope đã được audit và verify xong; chỉ tiếp tục nếu muốn mở scope mới sang centralize thêm copy, backend/domain aggregates, hoặc surface khác ngoài profile user.
```
