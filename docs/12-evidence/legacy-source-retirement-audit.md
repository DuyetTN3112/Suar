# Legacy Source Retirement Audit

| Field | Value |
|---|---|
| Status | Active - deletion-ready |
| Audience | Maintainer, reviewer, doc owner, người cần hiểu boundary giữa docs hiện hành và legacy narrative files |
| Purpose | Ghi rõ 3 file narrative gốc nào đã được hấp thụ vào `docs/`, phần nào còn dùng được, phần nào bị xem là stale/roadmap, và vì sao file gốc có thể xóa sau promotion |
| Source of Truth | `docs/` hiện hành, code/routes/schema/tests đã đối chiếu, và raw legacy files chỉ như historical input cho audit này |
| Last Reviewed | 2026-07-16 |
| Review Cycle | Khi phát hiện `docs/` còn thiếu knowledge quan trọng hoặc khi boundary giữa docs chính và legacy sources thay đổi |
| Owner | Engineering + product |
| Stale Risk | Cao nếu reader nhầm legacy narrative thành source of truth hiện hành |

## File Này Dùng Để Làm Gì

Ba file dưới đây từng chứa rất nhiều knowledge narrative:

- `Suar_Capability_Model_v6_VI.md`
- `Suar_Project_Knowledge_Base_EN_v5.md`
- `Suar_Project_Knowledge_Base_VI_v4.md`

Nhưng từ thời điểm audit này trở đi, chúng không còn nên được xem là nơi người đọc cuối phải dựa vào để hiểu hệ thống.

Mục tiêu của file này là:

- chốt phần nào đã được hấp thụ vào taxonomy mới
- chốt phần nào chỉ còn giá trị lịch sử/tham khảo
- giảm rủi ro reader quay lại dùng file gốc như tài liệu vận hành hoặc onboarding chính

## Kết Luận Điều Hành

Ba file legacy trên hữu ích như:

- narrative nguồn để định hình product/capability model
- dấu vết tư duy chiến lược
- danh sách giả thuyết để audit với code/runtime

Chúng không còn phù hợp để giữ vai trò:

- source of truth chính
- điểm đọc bắt đầu cho người mới
- nơi docs hiện hành dẫn thẳng tới để giải thích khái niệm cốt lõi

Sau audit này, chúng chỉ còn vai trò:

- nguồn narrative lịch sử
- nguồn đối chiếu khi audit docs
- nơi tra cứu thêm khi cần hiểu evolution của product thinking

Chúng không còn là dependency để người đọc hiểu docs chính.

## Reconciliation 2026-07-16

Pass này làm rõ thêm một điểm quan trọng: ba file legacy không được tin 100%.

Lý do:

- `Suar_Project_Knowledge_Base_EN_v5.md` còn conflict marker kiểu `<<<<<<<`, `=======`, `>>>>>>>`.
- nhiều đoạn trong ba file là target narrative, product framing, hoặc spec intent của thời điểm cũ.
- repo hiện đã đi xa hơn ở review governance: có task review workflow board, sprint review packages, project sprint review gate, và sprint reverse review board.
- một số phần cũ nói đúng hướng nhưng sai tầng: ví dụ capability/trust model là mental model tốt, nhưng runtime truth phải đối chiếu với command/query/migration/test hiện tại.

Kết luận của pass này:

- durable context đã được hấp thụ vào docs chính.
- chi tiết stale hoặc chưa được chứng minh không được nâng lên thành fact.
- 3 root files có thể xóa mà không mất context cốt lõi nếu `docs/` hiện tại và audit trail này được giữ.

## Deletion Readiness 2026-07-16

Kết luận hiện tại: **ready to delete after absorption**.

Điều đó không có nghĩa mọi câu trong ba file legacy đều đúng. Nó nghĩa là:

- phần đúng, bền, và hữu ích đã có nơi mang chính trong `docs/`
- phần đúng một phần đã được hạ xuống thành caveat, roadmap, risk, hoặc mental model có boundary
- phần stale/conflict/unverified không được nâng lên thành runtime fact
- `docs/` chính không cần mở lại file gốc để giải thích product/capability/review/profile core concepts

Không xóa tự động trong pass này vì đây là quyết định repo hygiene của maintainer. Nhưng nếu maintainer xóa 3 file root sau pass này, docs chính vẫn giữ được knowledge đã promote.

## File-By-File Retirement Decision

| Legacy file | Phần đã giữ | Docs chính đang mang | Phần không promote như fact | Quyết định |
|---|---|---|---|---|
| `Suar_Capability_Model_v6_VI.md` | L0-L14 là public conclusion, claim vs verified, level vs confidence, task context/evidence/governance, profile không phải bảng điểm đơn | `docs/01-business/capability-model-and-product-positioning.md`, `docs/01-business/features/profile_pipeline_and_marketplace.md`, `docs/06-data/metric-dashboard-report-analysis.md`, `docs/10-project-management/product-roadmap-artifact.md` | `skill_dimensions`, `user_skill_dimension_states`, capability overview radar mới, `ProfileAggregationService`, và schema/API v6 mới chỉ là direction nếu code chưa có table/API/UI tương ứng | Có thể xóa file gốc; audit trail ở file này |
| `Suar_Project_Knowledge_Base_EN_v5.md` | Product repositioning, six-layer model, research anchors, vocabulary, proficiency/rubric/evidence/review/dispute/matching/talent concepts, org/project/task UI separation, diagram/testing strategy | `docs/01-business/capability-model-and-product-positioning.md`, `docs/01-business/feature-specification.md`, `docs/01-business/features/organization_and_project_workspace.md`, `docs/01-business/features/search_talent_discovery_and_bookmarks.md`, `docs/01-business/features/review_dispute_and_governance.md`, `docs/08-testing/*`, `docs/11-diagrams/*`, `docs/12-evidence/document-coverage-matrix.md` | File còn conflict marker; các roadmap/UI/database implication cũ chỉ được dùng khi đã khớp route/model/schema/test hiện tại | Có thể xóa file gốc; không dùng làm source vì conflict marker |
| `Suar_Project_Knowledge_Base_VI_v4.md` | Bản tiếng Việt của product/capability vocabulary, task-as-evidence model, marketplace/talent/bookmark/reverse-review/admin/workspace framing | Các docs business/feature/data/evidence tương ứng trong taxonomy hiện tại | Một số priority/solo-project roadmap, interface architecture, task/reverse-review wording đã cũ hoặc đã được thay bằng org-shell/sprint-close/current workspace docs | Có thể xóa file gốc; phần còn đúng đã được hấp thụ |

## Mapping Hấp Thụ Chính

| Legacy topic | Nguồn gốc chính | Đã hấp thụ vào đâu | Trạng thái |
|---|---|---|---|
| Product repositioning: competency evidence engine | KB v5 EN, KB v4 VI | `docs/01-business/capability-model-and-product-positioning.md` | absorbed |
| Mô hình 6 lớp | KB v5 EN, KB v4 VI | `docs/01-business/capability-model-and-product-positioning.md` | absorbed |
| Từ vựng skill / competency / evidence / confidence | KB v5 EN, KB v4 VI | `docs/01-business/capability-model-and-product-positioning.md` | absorbed |
| Vì sao task không phải đích cuối | KB v5 EN, KB v4 VI | `docs/01-business/capability-model-and-product-positioning.md`, `docs/01-business/brd-prd-scope.md` | absorbed |
| Task Contract / task clarity / fair assessment | KB v5 EN, KB v4 VI, Capability v6 VI | `docs/01-business/feature-specification.md`, `docs/01-business/features/task_workflow_and_submission.md`, `docs/06-data/database-design-erd-data-dictionary.md`, `docs/11-diagrams/Action/01-task-management/README.md` | absorbed as task context fields/rules, not standalone artifact |
| Profile pipeline, trust, talent sourcing, matching | KB v5 EN, Capability v6 VI | `docs/01-business/features/profile_pipeline_and_marketplace.md`, `docs/06-data/metric-dashboard-report-analysis.md` | absorbed |
| Cách hiểu `L0-L14` không phải score tuyệt đối | Capability v6 VI, KB v5 EN | `docs/01-business/capability-model-and-product-positioning.md`, `docs/10-project-management/risk-log.md` | absorbed |
| `claim` vs `verified`, `level` vs `confidence`, `capability` vs `trust` | Capability v6 VI | `docs/01-business/capability-model-and-product-positioning.md` | absorbed |
| Roadmap signal từ evolution của repo | KB v5 EN | `docs/10-project-management/project-plan-roadmap-risk-change-minutes.md`, `docs/10-project-management/product-roadmap-artifact.md` | absorbed |
| Governance/change/risk context | KB v5 EN | `docs/10-project-management/*` liên quan | absorbed |
| Diagram reading order và level guidance | user objective + docs refactor | `docs/11-diagrams/README.md`, `docs/03-architecture/architecture-diagram-catalog.md` | absorbed |
| Task review workflow board | specs/plans mới + runtime code | `docs/01-business/features/review_dispute_and_governance.md`, `docs/06-data/database-design-erd-data-dictionary.md`, `docs/11-diagrams/State/02-review/high-level/state_02b_task_review_workflow.mmd` | absorbed |
| Sprint review package + sprint close gate | specs/plans mới + runtime code | `docs/01-business/features/review_dispute_and_governance.md`, `docs/06-data/database-design-erd-data-dictionary.md`, `docs/11-diagrams/State/08-project/high-level/state_08b_project_sprint_review.mmd` | absorbed |
| Sprint reverse review board | specs/plans mới + runtime code | `docs/01-business/features/review_dispute_and_governance.md`, `docs/11-diagrams/State/02-review/high-level/state_02c_sprint_reverse_review_workflow.mmd` | absorbed |
| Review workflow storage tables | migration/runtime code | `docs/06-data/database-design-erd-data-dictionary.md`, `docs/11-diagrams/ERD/04-review-governance/README.md` | absorbed |
| Current frontend/workspace split | repo structure + routes + Inertia pages | `README.md`, `docs/03-architecture/architecture-overview.md`, `docs/12-evidence/workstream-status-audit.md` | absorbed |
| Org talent directory/bookmarks UI | KB marketplace/talent narrative + runtime code | `docs/01-business/features/search_talent_discovery_and_bookmarks.md`, `docs/01-business/features/profile_pipeline_and_marketplace.md`, `docs/12-evidence/workstream-status-audit.md` | absorbed |
| Diagram and testing architecture | KB v5 EN late update | `docs/11-diagrams/README.md`, `docs/12-evidence/diagram-coverage-matrix.md`, `docs/08-testing/README.md`, `docs/08-testing/test-case-matrix.md`, `docs/08-testing/behavior-matrices/*` | absorbed-current with layer caveats |

## Deep Absorption Audit 2026-07-16

| Source cluster | Durable context kept | Official docs carrying it | Current evidence / status |
|---|---|---|---|
| Product repositioning and six-layer capability engine | Suar is a competency evidence engine, not only a task board | `docs/01-business/capability-model-and-product-positioning.md`, `README.md` | absorbed-current |
| Research anchors like SFIA/e-CF/CIPD/SHRM/O*NET | Useful rationale for language and framing | `docs/01-business/capability-model-and-product-positioning.md` | absorbed-as-rationale, not runtime rule |
| `L0-L14`, rubric, level/confidence vocabulary | Public ladder and vocabulary survive, but not every descriptor is runtime-enforced | `docs/01-business/capability-model-and-product-positioning.md`, `docs/09-operations/user-manual-admin-guide-faq-training.md` | absorbed-current with caveat |
| Task as assessment opportunity | Task contract, task context, evidence, and review pipeline remain core | `docs/01-business/feature-specification.md`, `docs/01-business/features/review_dispute_and_governance.md` | absorbed-current |
| Evidence quality, review observations, self-assessment | Review is evidence-backed and challengeable | `docs/01-business/features/review_dispute_and_governance.md`, `docs/06-data/database-design-erd-data-dictionary.md` | absorbed-current |
| Profile aggregation, confidence, trust | Kept as mental model; no simple average or one-number truth | `docs/01-business/capability-model-and-product-positioning.md`, `docs/06-data/metric-dashboard-report-analysis.md` | absorbed-current with boundary |
| Growth trajectory, decay, skill graph | Valuable product direction, but not proven as current runtime | `docs/10-project-management/product-roadmap-artifact.md`, `docs/10-project-management/risk-log.md` | absorbed-as-roadmap |
| Marketplace, talent directory, bookmarks, staffing | Org-scoped talent discovery and shortlist now exist in frontend and backend | `docs/01-business/features/search_talent_discovery_and_bookmarks.md`, `docs/01-business/features/profile_pipeline_and_marketplace.md`, `docs/12-evidence/workstream-status-audit.md` | absorbed-current |
| Review dispute, AI governance, reverse review | Traditional review/dispute remains; task-level reverse create is deprecated; sprint-close flow is current | `docs/01-business/features/review_dispute_and_governance.md`, `docs/11-diagrams/State/*/{overview,high-level,low-level}/*review*.mmd` | absorbed-current with stale claims rejected |
| Sprint planning and Sprint Goal | Sprint is now a project workspace planning boundary, not only a review artifact | `docs/01-business/features/organization_and_project_workspace.md`, `docs/06-data/database-design-erd-data-dictionary.md`, `docs/11-diagrams/ERD/*/{overview,high-level,low-level}/*02*`, `docs/11-diagrams/Class/01-core/high-level/cls_01b_org_project_core.mmd` | absorbed-current |
| Anti-gaming, anomaly, admin governance | Kept only where commands/routes/tests exist or as risk direction | `docs/07-security/access-control-security-privacy-audit.md`, `docs/10-project-management/risk-log.md` | partial-current |
| Frontend workspace split | Current truth is `inertia/apps/{user,org,admin}`, not old flat `inertia/pages` | `README.md`, `docs/04-design/wireframe-prototype-inventory.md`, `docs/12-evidence/source-register.md` | absorbed-current |
| Diagrams and test strategy | Diagram pack and testing matrices are official docs now | `docs/11-diagrams/README.md`, `docs/08-testing/*`, `docs/12-evidence/document-coverage-matrix.md` | absorbed-current |

## Late-Section Absorption Notes

EN v5 có phần cuối riêng về workspace, admin console, diagrams, testing, và report evidence. Pass này đã kiểm tra riêng phần cuối đó.

Kết luận:

- workspace separation đã được giữ ở `docs/01-business/features/organization_and_project_workspace.md`, `docs/03-architecture/architecture-overview.md`, và `docs/04-design/wireframe-prototype-inventory.md`
- admin console, audit log, dispute moderation, rubric/proficiency governance đã được giữ ở `docs/01-business/feature-specification.md`, `docs/07-security/access-control-security-privacy-audit.md`, và admin/test evidence tương ứng
- diagram strategy đã chuyển sang `docs/11-diagrams/README.md` và `docs/12-evidence/diagram-coverage-matrix.md`
- testing strategy đã chuyển sang `docs/08-testing/README.md`, `docs/08-testing/test-case-matrix.md`, `docs/08-testing/hierarchical-test-case-decomposition.md`, và `docs/08-testing/behavior-matrices/*`
- "Task Contract" trong legacy docs không tồn tại như một standalone official artifact hiện hành; phần còn đúng đã được hấp thụ thành task context fields/rules như `acceptance_criteria`, `verification_method`, `expected_deliverables`, `minimum_level_id`, `target_level_id`, và `assessment_ceiling_level_id`

Không promote nguyên các priority table P0-P3/P4 từ legacy docs thành roadmap hiện hành. Nếu cần roadmap, dùng `docs/10-project-management/product-roadmap-artifact.md` vì file đó chỉ ghi roadmap signals có evidence hiện tại.

## Current Frontend Audit Notes

Đợt audit này không chỉ đọc backend.

Frontend surfaces hiện hành đã đối chiếu:

- org talent directory: `inertia/apps/org/modules/talents/index.svelte`, `show.svelte`
- org bookmarks: `inertia/apps/org/modules/bookmarks/index.svelte`
- Project Task Review Board: `inertia/apps/user/modules/reviews/task-board.svelte`
- Project Assigner/Environment Review Board: `inertia/apps/user/modules/reviews/sprint-reverse-board.svelte`
- Project Task Board: `inertia/apps/user/modules/tasks/index.svelte`
- sprint management panel: `inertia/apps/user/modules/projects/components/project_sprint_panel.svelte`, `inertia/apps/org/modules/projects/components/project_sprint_panel.svelte`
- admin proficiency: `inertia/apps/admin/modules/proficiency/*`
- System dispute board/card room: `inertia/apps/admin/modules/disputes/*`

Frontend caveats giữ lại:

- duplicate User/Org review pages, reviewer inbox và history/detail pages đã bị gỡ.
- System Admin là realm riêng và không có Organization/Project switcher.
- board filters, drawers và card rooms thay thế các page list/history/detail riêng.
- sprint management nằm trong project detail tab `Sprints`; task board chỉ link sang tab này.
- legacy `/marketplace/talents` và `/marketplace/bookmarks` redirect sang `/org/*`; docs không nên mô tả chúng như marketplace UI riêng.

## Những Gì Cố Ý Không Nâng Lên Thành Sự Thật Hiện Hành

### 1. Ý tưởng chiến lược chưa có evidence runtime đủ mạnh

Ví dụ:

- những phần mô tả product vision sâu hơn current implementation
- những logic profile/capability mong muốn nhưng query/API/runtime chưa expose đủ
- những diễn giải có tính “nên có” hơn là “đã có”

Trạng thái:

- giữ làm historical input
- không đưa vào docs chính như fact

### 2. Chi tiết quá sâu về descriptor hoặc API wording khi chưa chắc đồng bộ toàn repo

Một số đoạn trong Capability v6 và KB v5 đi rất sâu vào descriptor, runtime invariant, hay wording API.

Trạng thái:

- chỉ giữ phần mental model đã kiểm tra được với schema/model/query
- không bê nguyên từng claim sang docs chính nếu chưa scan đủ tất cả surfaces liên quan

### 3. Các đoạn dễ trở thành “truth by narrative”

Đây là loại đoạn đọc rất thuyết phục nhưng nếu code đổi thì người đọc dễ tin nhầm.

Trạng thái:

- ưu tiên hạ xuống thành:
  - explanation có boundary rõ
  - risk note
  - recommendation
  - hoặc bỏ hẳn nếu không còn cần

## Verification Notes

Audit hiện tại đã xác nhận:

- `docs/` không còn phụ thuộc trực tiếp vào 3 file legacy trên để người đọc hiểu product/capability/review governance
- các concept lõi được hấp thụ đã có đối chiếu với code/schema/tests ở mức đủ dùng cho docs narrative hiện hành
- `docs/12-evidence/source-register.md` đã coi legacy narrative chỉ là input cần hấp thụ, không còn là nguồn tham chiếu chính
- review-governance docs đã được cập nhật bằng code/migration evidence mới thay vì dựa vào spec/plan như source cuối

## Deletion Policy

Theo quyết định hiện tại, 3 file legacy này không cần giữ như source of truth.

Điều cần giữ đúng khi xóa:

1. `docs/` chính không phụ thuộc vào chúng để người đọc hiểu ý cốt lõi
2. mọi claim mới trong docs chính vẫn phải đối chiếu với code/runtime/tests hiện tại
3. nếu dùng chúng để bổ sung narrative, phải hấp thụ lại vào taxonomy hiện tại thay vì dẫn reader quay ngược ra root file
4. audit trail trong file này phải tiếp tục nêu rõ phần nào đã promote, phần nào stale, phần nào chỉ là roadmap

## How To Use These Files Safely

Nếu file gốc còn tồn tại:

1. Dùng chúng để tìm narrative, framing, vocabulary, hoặc historical context
2. Kiểm tra lại claim với code, routes, schema, tests, và docs hiện hành
3. Chuyển insight cần giữ vào `docs/` nếu nó thật sự còn đúng và hữu ích
4. Không dùng 3 file này như đường dẫn đọc chính cho new joiner, manager, dev, QA, DevOps, hoặc on-call responder

Nếu file gốc đã bị xóa:

1. Dùng file audit này để biết mapping hấp thụ
2. Dùng docs chính được liệt kê trong bảng trên để đọc content hiện hành
3. Không khôi phục file gốc chỉ để cite lại narrative cũ

## Final Policy

Sau audit này:

- 3 file legacy có thể xóa sau khi maintainer muốn dọn root repo
- `docs/` hiện hành mới là nơi người đọc cuối phải tin
- mọi knowledge mới phải cập nhật thẳng vào taxonomy hiện tại, không quay lại phụ thuộc vào narrative root files

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. legacy file nào còn giá trị lịch sử và phần nào đã được hấp thụ
2. phần nào cố ý không được nâng lên thành source of truth hiện hành
3. có cần sang source register hoặc docs chính để kiểm tra knowledge đã được hấp thụ ra sao hay không
