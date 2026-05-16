# Evidence Folder Guide

| Field | Value |
|---|---|
| Status | Active |
| Audience | Maintainer, reviewer, doc owner, lead, người cần audit bộ docs thay vì chỉ đọc nội dung sản phẩm |
| Purpose | Làm điểm vào cho nhóm evidence/audit docs để người đọc biết file nào dùng để kiểm chứng nguồn, coverage, legacy retirement, hay workstream status |
| Source of Truth | `docs/12-evidence/*`, verified docs structure, và cited system evidence |
| Last Reviewed | 2026-08-09 |
| Review Cycle | Khi taxonomy đổi, source hierarchy đổi, hoặc coverage/audit boundary đổi |
| Owner | Engineering |
| Stale Risk | Cao |

## Folder Này Dùng Để Làm Gì

Đây không phải nơi người mới nên mở đầu để hiểu sản phẩm.

Đây là nơi dùng khi bạn cần biết:

- docs này đang dựa vào nguồn nào
- coverage hiện đã kín tới đâu
- legacy narrative files đã được hấp thụ và giữ boundary an toàn chưa
- raw draft, handoff, demo audit, plan, và spec phải được promote như thế nào trước khi thành docs chính thức
- workstream/handoff/spec nào còn stale

## Filter/Search/Taxonomy release-closure pack — audited 2026-08-09

| Artifact | Use | Current status |
|---|---|---|
| [Release train registry](filter-search-release-train-2026-08-01.md) | Human-readable WP-00 applicability, ownership and release blockers | `[~]`; not a validator JSON manifest |
| [Platform implementation plan](../superpowers/plans/2026-08-01-filter-search-taxonomy-platform.md) | Canonical WP-00 implementation plan referenced by the release registry | supporting plan; not a machine-readable manifest |
| [Filter/Search/Taxonomy test matrix plan](../superpowers/plans/2026-08-01-filter-search-taxonomy-test-matrix.md) | Canonical `TC-FST-*` / `RP-FST-*` matrix and closure notes | supporting plan; matrix rows remain open |
| [Surface inventory](filter-surface-inventory-2026-08-01.md) | Inventory baseline and context boundary | `[ ]`; frozen hash is stale |
| [Filter/Search/Taxonomy audit](filter-search-taxonomy-audit-2026-08-08.md) | Audit trail and layered evidence notes | historical/supporting evidence |
| [Validation surface inventory](validation-surface-inventory-2026-08-09.md) | Current route/validation surface inventory | supporting evidence; not release closure |
| [Validator CLI](../../scripts/filtering/validate_filter_search_test_matrix.ts) | Machine-readable release-manifest schema and CLI gate | wrapper suite `17/17`; current release manifest path is still absent |
| [Runnable validator wrapper](../../app/modules/filtering/tests/backend/unit/filter_search_matrix_validator.spec.ts) | Japa-runnable wrapper that imports the fixture validator suite | authoritative targeted validator test path |

The release registry, implementation plan and test matrix deliberately distinguish documentation
status from executable closure. A green validator unit suite does not prove that the selected
product journeys have real UI, backend/audit, screenshot, accessibility, security, resilience and
reviewer artifacts. The current release remains open until those joins exist and are independently
reviewed; this index must not be read as a promotion decision.

Current manifest path for the Filter/Search/Taxonomy release: none. The files
`docs/12-evidence/test-matrix.json` and `docs/12-evidence/implementation-plan.json` remain legacy
non-manifest JSON and are kept only as negative validator inputs; they must not be relabeled as the
current release manifest.

Một câu nhớ ngắn:

`Folder này kiểm chứng docs. Nó không thay docs nghiệp vụ hay docs vận hành.`

## Nếu Bạn Đang Audit Bộ Docs Để Mang Ra Ngoài

Folder này là nơi kiểm tra xem bộ docs có đủ đáng tin để đứng độc lập hay chưa.

Bạn nên dùng nó để trả lời:

1. claim nào đang bám vào source nào
2. concern nào đã có file chính thức, concern nào mới chỉ được cover ở mức context
3. legacy file, handoff, spec, plan nào chỉ nên xem như tư liệu phụ

## Mở File Nào Khi Nào

Nếu bạn đang:

- muốn biết docs đang tin vào nguồn nào: mở `source-register.md`
- muốn biết AI/human phải viết docs theo chuẩn nào: mở `../DOCUMENTATION_WRITING_STANDARD_FOR_AI.md`
- muốn biết cách chuyển raw working docs thành docs chính thức: mở `working-document-promotion-policy.md`
- muốn biết concern nào đã có artifact chính thức: mở `document-coverage-matrix.md`
- muốn biết diagram coverage đang map ra sao: mở `diagram-coverage-matrix.md`
- muốn biết 3 narrative root files cũ đã được hấp thụ vào đâu và có thể xóa chưa: mở `legacy-source-retirement-audit.md`
- muốn biết handoff/spec/plan nào còn stale: mở `workstream-status-audit.md`

## Reading Pack Ngắn Nhất Cho Người Audit Docs

Nếu bạn đang kiểm tra xem cả folder `docs/` đã đủ đáng tin để mang ra ngoài chưa, đọc theo thứ tự:

1. `document-coverage-matrix.md`
2. `diagram-coverage-matrix.md`
3. `source-register.md`
4. `working-document-promotion-policy.md`
5. `workstream-status-audit.md`

Mục tiêu của pack này:

- biết concern nào đã có file chính thức
- biết diagram corpus đã đủ họ sơ đồ chính hay chưa
- biết docs đang bám vào source nào
- biết raw working docs nào chỉ là input, không phải truth
- biết chỗ nào còn historical/stale/unverified

## Điều Không Được Hiểu Sai

- có file audit không có nghĩa mọi claim trong docs đã đúng mãi mãi
- evidence docs giúp giảm đoán mò, nhưng vẫn phải cập nhật khi code/routes/tests đổi
- người đọc cuối thường không cần bắt đầu từ folder này trừ khi đang audit chính bộ docs

Một rule rất thực dụng:

- muốn hiểu sản phẩm: quay lại business/architecture/operations docs
- muốn kiểm tra docs có đủ tin hay chưa: ở lại folder này

## Điểm Đọc Tiếp Theo

- `../README.md`
- `../01-business/README.md`
- `../11-diagrams/README.md`

## Khi Nào Dừng Ở Folder Này

Dừng ở folder này khi bạn đã biết:

1. nguồn nào đang chống lưng cho claim bạn quan tâm
2. concern đó đã có file chính thức hay mới chỉ ở mức context
3. có cần quay lại business, architecture, data, operations, hay diagrams để đọc nội dung chính hay không
