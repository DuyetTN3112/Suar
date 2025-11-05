# Document Coverage Matrix

| Field | Value |
|---|---|
| Status | Active |
| Audience | Maintainer, reviewer, doc owner, lead |
| Purpose | Cho biết concern nào đã có file chính thức trong taxonomy hiện tại và concern nào mới chỉ được cover một phần |
| Source of Truth | `docs/` hiện tại, verified docs structure, diagram inventory, code/migration evidence đã đối chiếu |
| Last Reviewed | 2026-07-19 |
| Review Cycle | Khi thêm/xóa/đổi file docs quan trọng hoặc đổi taxonomy |
| Owner | Engineering |
| Stale Risk | Cao |

## Mục đích

Tài liệu này giúp người đọc biết rất nhanh:

- concern mình đang tìm đã được cover chưa
- file nào đang mang phần giải thích chính cho concern đó
- concern nào chỉ mới được cover ở mức context vì hệ thống chưa có artifact nguồn độc lập

## Quy ước ngôn ngữ

- `docs/`: tài liệu narrative chính bằng tiếng Việt
- `docs/11-diagrams/`: diagram source giữ English
- taxonomy hiện tại không duy trì nhánh narrative English riêng

## Coverage Matrix

| Artifact yêu cầu | Trạng thái | File chính hiện tại | Ghi chú |
|---|---|---|---|
| BRD | Có | `docs/01-business/brd-prd-scope.md` | Chung file với PRD và Scope |
| Business Folder Guide | Có | `docs/01-business/README.md` | Điểm vào cho business/product docs |
| Capability Model / Product Positioning | Có | `docs/01-business/capability-model-and-product-positioning.md` | File riêng cho định vị và mental model cốt lõi |
| SRS | Có | `docs/02-requirements/srs.md` | File riêng |
| User Story | Có | `docs/02-requirements/user-story-use-case-business-rule.md` | Chung file với Use Case và Business Rule |
| Use Case | Có | `docs/02-requirements/user-story-use-case-business-rule.md` | Chung file |
| Business Rule | Có | `docs/02-requirements/user-story-use-case-business-rule.md` | Chung file |
| System Design Document | Có | `docs/03-architecture/architecture-overview.md` | File overview kỹ thuật chính trong taxonomy mới |
| Architecture Diagram | Có | `docs/03-architecture/architecture-diagram-catalog.md` | Danh mục tham chiếu `docs/11-diagrams/Architecture/*` |
| Database Design | Có | `docs/06-data/database-design-erd-data-dictionary.md` | Chung file với ERD và Data Dictionary |
| ERD | Có | `docs/06-data/database-design-erd-data-dictionary.md` | Trỏ tới `docs/11-diagrams/ERD/*` |
| API Specification | Có | `docs/06-data/api-specification.md` | File riêng |
| Sequence Diagram | Có | `docs/11-diagrams/sequence-flow-data-user-flows.md` | Trỏ tới `docs/11-diagrams/Sequence/*` |
| Flowchart | Có | `docs/11-diagrams/sequence-flow-data-user-flows.md` | Dùng `docs/11-diagrams/Action/*` và `docs/11-diagrams/Usecase/*` |
| Runbook | Có | `docs/09-operations/runbook-monitoring-maintenance.md` | Chung file với Monitoring và Maintenance |
| Monitoring Document | Có | `docs/09-operations/runbook-monitoring-maintenance.md` | Chung file |
| User Manual | Có | `docs/09-operations/user-manual-admin-guide-faq-training.md` | Chung file với Admin/FAQ/Training |
| Admin Guide | Có | `docs/09-operations/user-manual-admin-guide-faq-training.md` | Chung file |
| FAQ | Có | `docs/09-operations/user-manual-admin-guide-faq-training.md` | Chung file |
| Training Material | Có | `docs/09-operations/user-manual-admin-guide-faq-training.md` | Chung file |
| Project Plan | Có | `docs/10-project-management/project-plan-roadmap-risk-change-minutes.md` | Theo evidence hiện có trong hệ thống |
| Timeline / Roadmap | Có | `docs/10-project-management/project-plan-roadmap-risk-change-minutes.md` | Chung file |
| Meeting Minutes | Có | `docs/10-project-management/meeting-minutes-register.md` | File riêng, ghi rõ chưa có minutes source độc lập |
| Risk Log | Có | `docs/10-project-management/risk-log.md` | File riêng |
| Change Request | Có | `docs/10-project-management/change-request-register.md` | File riêng |
| Scope Document | Có | `docs/01-business/brd-prd-scope.md` | Chung file với BRD/PRD |
| Data Dictionary | Có | `docs/06-data/database-design-erd-data-dictionary.md` | Chung file |
| Metric Definition | Có | `docs/06-data/metric-dashboard-report-analysis.md` | Chung file |
| Dashboard Requirement | Có | `docs/06-data/metric-dashboard-report-analysis.md` | Chung file |
| Report Specification | Có | `docs/06-data/metric-dashboard-report-analysis.md` | Chung file |
| Analysis Report | Có | `docs/06-data/metric-dashboard-report-analysis.md` | Chung file |
| Data Flow Diagram | Có | `docs/11-diagrams/sequence-flow-data-user-flows.md` | Trỏ tới `docs/11-diagrams/DFD/*` |
| Product Requirement Document | Có | `docs/01-business/brd-prd-scope.md` | Chung file với BRD |
| Product Roadmap | Có | `docs/10-project-management/product-roadmap-artifact.md` | File riêng, chỉ ghi roadmap signals có evidence |
| Feature Specification | Có | `docs/01-business/feature-specification.md` | File riêng |
| User Flow | Có | `docs/11-diagrams/sequence-flow-data-user-flows.md` | Có thêm `docs/11-diagrams/UserFlow/*` |
| Wireframe / Prototype | Có | `docs/04-design/wireframe-prototype-inventory.md` | File riêng; ghi rõ chưa có original prototype artifact |
| Access Control Matrix | Có | `docs/07-security/access-control-security-privacy-audit.md` | Chung file |
| Security Requirement | Có | `docs/07-security/access-control-security-privacy-audit.md` | Chung file |
| Privacy Policy | Có | `docs/07-security/privacy-data-handling-context.md` | File riêng; không thay thế legal policy |
| Audit Log Document | Có | `docs/07-security/access-control-security-privacy-audit.md` | Chung file |
| Technical Documentation | Có | `docs/03-architecture/architecture-overview.md` | Dùng overview kỹ thuật chính |
| Source Code Guideline | Có | `docs/03-architecture/development-guidelines.md` | Chung file |
| Environment Information | Có | `docs/03-architecture/development-guidelines.md` | Chung file |
| Maintenance Guide | Có | `docs/09-operations/runbook-monitoring-maintenance.md` | Chung file |
| Documentation Writing Standard For AI | Có | `docs/DOCUMENTATION_WRITING_STANDARD_FOR_AI.md` | Official writing/governance standard cho agent và maintainer; không phải runtime evidence |
| Evidence Folder Guide | Có | `docs/12-evidence/README.md` | Điểm vào cho source/coverage/audit docs |
| Demo Audit Folder Guide | Có | `docs/demo-audit/README.md` | Giới hạn demo evidence theo ngày/context, không dùng làm product truth tổng quát |
| Testing Folder Guide | Có | `docs/08-testing/README.md` | Điểm vào cho evidence kiểm thử |
| Test Case Matrix | Bổ sung thêm | `docs/08-testing/test-case-matrix.md` | Evidence supplement |
| Profile Pipeline & Marketplace | Bổ sung thêm | `docs/01-business/features/profile_pipeline_and_marketplace.md` | Evidence supplement |
| Legacy Narrative Retirement Audit | Bổ sung thêm | `docs/12-evidence/legacy-source-retirement-audit.md` | Dùng khi muốn hiểu legacy root drafts đã được hấp thụ vào đâu và vì sao có thể xóa file gốc |
| Task Review Workflow Board | Có | `docs/01-business/features/review_dispute_and_governance.md` | Đã hấp thụ từ plan/spec mới hơn và đối chiếu với route, command, migration |
| Sprint Management / Sprint Backlog | Có | `docs/01-business/features/organization_and_project_workspace.md`, `docs/06-data/api-specification.md`, `docs/06-data/database-design-erd-data-dictionary.md` | Bao gồm Sprint Goal, sprint tab, sprint board, Product Backlog, task move vào/ra sprint |
| Sprint Review Governance | Có | `docs/01-business/features/review_dispute_and_governance.md`, `docs/06-data/database-design-erd-data-dictionary.md` | Bao gồm sprint review package, sprint close gate, sprint reverse board |
| Legacy Source Absorption | Có | `docs/12-evidence/legacy-source-retirement-audit.md`, `docs/01-business/capability-model-and-product-positioning.md` | 3 root narrative files đã được hấp thụ vào docs; file gốc có thể xóa sau khi không còn cần audit raw text |
| Working Document Promotion Policy | Có | `docs/12-evidence/working-document-promotion-policy.md` | Quy định cách chuyển draft, handoff, demo audit, plan, spec thành docs chính thức; scratch drafts không được cite |
| Frontend Workspace Surface Audit | Có | `docs/12-evidence/workstream-status-audit.md`, `docs/12-evidence/source-register.md` | Ghi route/page/test proof cho org talents, bookmarks, review boards, disputes, admin proficiency |
| Skill Taxonomy Four Categories | Có | `docs/01-business/capability-model-and-product-positioning.md`, `docs/01-business/features/profile_pipeline_and_marketplace.md`, `docs/06-data/database-design-erd-data-dictionary.md` | Canonical categories: `technology`, `engineering`, `soft_skill`, `delivery`; `technical` là legacy input, không phải persisted canonical mới |
| Enterprise Audit Event Store | Có | `docs/07-security/access-control-security-privacy-audit.md`, `docs/06-data/database-design-erd-data-dictionary.md`, `docs/12-evidence/source-register.md` | Bao gồm audit event metadata, `audit_event_scopes`, redaction helper, hash helper |

## Diagram Coverage

### Architecture

- `docs/11-diagrams/Architecture/*`

### Package / Module Structure

- `docs/11-diagrams/Package/*`

### Action / Flowchart-like Capability Views

- `docs/11-diagrams/Action/*`
- `docs/11-diagrams/Usecase/*`

### Sequence

- `docs/11-diagrams/Sequence/*`

### User Flow

- `docs/11-diagrams/UserFlow/*`

### Data Flow

- `docs/11-diagrams/DFD/*`

### ERD

- `docs/11-diagrams/ERD/*`

### State

- `docs/11-diagrams/State/*`

## Residual Notes

- Một số artifact nghiệp vụ như `Meeting Minutes`, `Privacy Policy`, `Wireframe / Prototype`, `Product Roadmap` chưa có nguồn độc lập trong bộ tài liệu hiện tại.
- Coverage của chúng hiện ở dạng context document có ghi rõ trạng thái evidence thiếu vắng, không có nội dung giả lập.
- Các plan/spec trong `docs/superpowers/*` chỉ là audit input. Khi nội dung của chúng đã đúng với code, phần đó phải được hấp thụ vào docs chính; không dẫn reader dùng plan/spec như tài liệu vận hành.
- Root-level scratch drafts không phải artifact coverage. Sau khi nội dung đã được promote vào docs chính, scratch file có thể xóa mà không mất source of truth.

## Cách đọc bảng này

- `Có` nghĩa là người đọc đã có ít nhất một file usable để nắm concern đó trong bộ docs hiện tại.
- `Có` không tự động có nghĩa hệ thống đã có artifact quản trị gốc, độc lập, đúng mẫu truyền thống.
- Nếu cột `Ghi chú` nói rõ thiếu standalone artifact, hãy hiểu file hiện tại đang đóng vai trò giải thích và tổng hợp context, không phải bản ghi governance gốc.

## Verification Date Context

- verification boundary trong bộ docs hiện tại: `2026-07-19` cho skill taxonomy four-category và enterprise audit pass mới nhất
- diagram header target date: `2026-06-26`
- business docs review date: `2026-07-19` cho skill taxonomy, enterprise audit, và review-governance status audit; file không đổi vẫn giữ ngày riêng của nó
- root legacy narrative docs: deletion-ready after absorption; không dùng làm source of truth nếu chưa được hấp thụ vào `docs/`

## Supplemental Artifact Role

Các file supplement sau không phải điểm vào đầu tiên cho mọi người đọc, nhưng hữu ích khi cần đào sâu hơn:

- `docs/01-business/capability-model-and-product-positioning.md`
- `docs/08-testing/test-case-matrix.md`
- `docs/01-business/features/profile_pipeline_and_marketplace.md`
- `docs/12-evidence/legacy-source-retirement-audit.md`
- `docs/01-business/features/review_dispute_and_governance.md`
- `docs/06-data/database-design-erd-data-dictionary.md`

Chúng chủ yếu giúp:

- đào sâu phần coverage kiểm thử
- đào sâu pipeline profile, talent sourcing, ranking, bookmarks, reverse review

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. concern mình cần đã có file chính thức hay mới chỉ được cover ở mức context
2. file nào đang là nơi giải thích chính cần mở tiếp
3. có cần sang source register hoặc workstream audit để kiểm tra độ mạnh evidence hay không
