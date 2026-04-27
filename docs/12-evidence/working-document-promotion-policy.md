# Working Document Promotion Policy

| Field | Value |
|---|---|
| Status | Active |
| Audience | Maintainer, reviewer, doc owner, agent sửa docs |
| Purpose | Chốt cách chuyển hóa draft, handoff, demo audit, plan, và spec thành docs chính mà không biến raw notes thành source of truth |
| Source of Truth | `docs/` taxonomy hiện tại, code/routes/schema/tests/runtime evidence đã kiểm chứng |
| Last Reviewed | 2026-07-16 |
| Review Cycle | Khi thêm raw working docs, xóa draft, hoặc hấp thụ workstream mới vào docs chính |
| Owner | Engineering + product |
| Stale Risk | Cao nếu raw plan/spec/handoff bị đọc như tài liệu sản phẩm hiện hành |

## Mục đích

File này tồn tại để trả lời một câu hỏi rất cụ thể:

`Khi có draft, handoff, demo evidence, plan, hoặc spec, làm sao biến phần còn đúng thành tài liệu chính thức?`

Nguyên tắc ngắn:

- raw working document giúp tìm ý và câu hỏi cần kiểm chứng
- docs chính trong taxonomy `00-11` giải thích hệ thống cho người đọc cuối
- `docs/12-evidence` ghi audit trail, proof strength, caveat, và source hierarchy
- code, routes, migrations, commands, queries, frontend surface, và tests mới chốt runtime truth

## Folder Classification

| Folder / source group | Vai trò đúng | Không được dùng như |
|---|---|---|
| `docs/12-evidence/` | Audit/control docs chính thức về source, coverage, stale risk, proof strength | Thay thế business, architecture, API, operation docs |
| `docs/handovers/` | Session snapshot, risk note, điểm cần audit lại | Kết luận trạng thái hiện tại |
| `docs/demo-audit/` | Demo runbook và evidence theo ngày, hữu ích để chứng minh một rehearsal/demo path | Product truth tổng quát hoặc guarantee lâu dài |
| `docs/superpowers/handoffs/` | Handoff theo workflow implementation | Current-state docs |
| `docs/superpowers/plans/` | Implementation checklist, rollout intent, task breakdown | Bằng chứng rằng task đã hoàn tất |
| `docs/superpowers/specs/` | Target design hoặc target architecture | Bằng chứng runtime đã khớp target |
| `docs/superpowers/mockups/` | Design direction hoặc visual intent | UI implementation truth |
| Root-level legacy narrative docs | Historical product/capability/context input đã audit và hấp thụ | Source of truth lâu dài hoặc dependency cần giữ sau promotion |
| Root-level scratch drafts | Temporary thinking input | Citation, source register entry, hoặc public docs link |
| `docs/DOCUMENTATION_WRITING_STANDARD_FOR_AI.md` | Official writing/governance standard for docs work | Runtime/product evidence |

## Promotion Rule

Một raw document chỉ được chuyển thành official docs sau khi đi qua pipeline này:

1. Tách claim ra khỏi raw text.
2. Kiểm chứng claim bằng source hiện tại.
3. Nếu claim đúng, viết lại bằng ngôn ngữ docs chính và theo `docs/DOCUMENTATION_WRITING_STANDARD_FOR_AI.md`.
4. Nếu claim đúng một phần, chỉ promote phần verified và ghi caveat ở evidence docs.
5. Nếu claim là target tương lai, đưa vào roadmap/risk/backlog, không viết như runtime fact.
6. Nếu claim sai hoặc đã stale, giữ làm lịch sử hoặc bỏ.
7. Sau khi promote xong, raw scratch file có thể xóa mà không mất knowledge chính.
8. Với root-level legacy narrative docs, ghi audit trail trong `docs/12-evidence/legacy-source-retirement-audit.md`; sau đó file gốc có thể xóa mà docs chính không mất source of truth.

## Promotion Destinations

| Loại nội dung sau kiểm chứng | Nơi đưa vào |
|---|---|
| Business/product behavior | `docs/01-business/*` |
| Requirement, use case, business rule | `docs/02-requirements/*` |
| Architecture/module boundary | `docs/03-architecture/*` |
| UI surface hoặc prototype inventory | `docs/04-design/*` |
| API surface/governance | `docs/05-api/*`, `docs/06-data/api-specification.md` |
| Data model/schema/ERD | `docs/06-data/database-design-erd-data-dictionary.md`, `docs/11-diagrams/ERD/*` |
| Security/privacy/access | `docs/07-security/*` |
| Test/evidence matrix | `docs/08-testing/*` |
| Runbook/incident/manual | `docs/09-operations/*` |
| Roadmap/risk/change | `docs/10-project-management/*` |
| Flow/state/sequence diagram | `docs/11-diagrams/*` |
| Proof strength, stale risk, source hierarchy | `docs/12-evidence/*` |

## What Counts As Verification

Strong evidence:

- route binding
- controller/mapper/action/query/command hiện tại
- migration/schema/model hiện tại
- integration/contract/E2E/component test hiện tại
- frontend page/component hiện tại nếu claim chạm UI
- runtime command output hoặc fresh audit result

Weak evidence:

- old handoff
- unchecked plan checkbox
- spec target wording
- demo screenshot không kèm command/date/context
- root-level draft
- memory of a previous implementation

## Current Promotion Status

Các concern mới về task review board, sprint review package, sprint close gate, sprint reverse review board, sprint management, và Sprint Goal đã được promote vào docs chính sau khi đối chiếu code/migration/route/test hiện tại.

Official docs carrying those concerns:

- `docs/01-business/features/review_dispute_and_governance.md`
- `docs/01-business/features/organization_and_project_workspace.md`
- `docs/02-requirements/srs.md`
- `docs/02-requirements/user-story-use-case-business-rule.md`
- `docs/06-data/database-design-erd-data-dictionary.md`
- `docs/06-data/api-specification.md`
- `docs/08-testing/test-case-matrix.md`
- `docs/11-diagrams/State/state_02b_task_review_workflow.mmd`
- `docs/11-diagrams/State/state_02c_sprint_reverse_review_workflow.mmd`
- `docs/11-diagrams/State/state_08b_project_sprint_review.mmd`
- `docs/12-evidence/workstream-status-audit.md`

Điều này có nghĩa:

- raw plan/spec/draft có thể xóa hoặc giữ làm lịch sử
- reader không cần mở raw working docs để hiểu current behavior
- claim chính thức phải trỏ tới docs chính hoặc source evidence đã kiểm chứng, không trỏ tới draft

## Practical Rules

- Không cite root-level scratch drafts.
- Không đưa scratch draft vào source register.
- Không để docs chính phụ thuộc vào root-level legacy narrative docs sau khi chúng đã được hấp thụ.
- Không link plan/spec/handoff từ docs chính như thể đó là tài liệu vận hành.
- Khi phải nhắc plan/spec/handoff, ghi rõ `historical input`, `target state`, hoặc `partially stale`.
- Nếu demo-audit được dùng, luôn ghi date/context/command và không mở rộng kết luận ra ngoài demo path.
- Nếu workstream đã được promote, update folder README để reader đi tới docs chính trước.
- Khi AI agent viết/sửa/audit docs, đọc `docs/DOCUMENTATION_WRITING_STANDARD_FOR_AI.md` như style/governance standard trước; đọc file này như source-promotion policy.

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. raw document nào chỉ là input
2. claim phải được promote vào file chính nào
3. evidence nào đủ mạnh để biến draft thành docs chính thức
