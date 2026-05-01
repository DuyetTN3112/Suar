# Task To Verified Accomplishment — Master Product And Technical Design

| Field           | Value                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Document Type   | Target product and technical design specification                                                                          |
| Status          | Draft for product approval                                                                                                 |
| Target State    | Proposed; không được đọc như runtime behavior hiện tại                                                                     |
| Audience        | Product owner, engineering, design, QA, reviewer-governance owner, data/search owner                                       |
| Owner           | Product + Engineering                                                                                                      |
| Last Updated    | 2026-08-01                                                                                                                 |
| Review Cycle    | Mỗi milestone triển khai hoặc khi Task, Review, Profile, Search contract thay đổi                                          |
| Purpose         | Chốt cách biến một Task đầy đủ, tự chứa thành công việc đã được xác minh và có thể trình bày/tìm kiếm trên Profile         |
| Source Of Truth | Quyết định sản phẩm được product owner nêu trong phiên 2026-08-01; runtime code, tests và canonical docs được dẫn ở mục 29 |
| Generated       | No                                                                                                                         |
| Stale Risk      | High cho tới khi được phê duyệt và promote vào canonical docs                                                              |

> Tài liệu này mô tả trạng thái đích. Những phần được ghi là `Current Fact` đã được đối chiếu với repository. Những phần được ghi là `Target Decision` hoặc `Proposed` chưa được coi là đã triển khai.

### Cách đọc

- Nếu chỉ có 5 phút: đọc mục 0, 2, 6, 37 và Appendix E.
- Product/Design: đọc mục 1–21 và 33–35.
- Engineering/Data/Search: đọc mục 7–32.
- QA/Governance: đọc mục 12–17, 21, 26–29 và 36–37.
- Muốn biết runtime hiện tại khác target ở đâu: đọc mục 30.
- Muốn bắt đầu implementation: đọc mục 31, sau đó tách requirement/test theo Phase.

Reader có thể dừng sau mục 21 nếu chỉ cần hiểu product behavior. Các mục 22 trở đi dành cho implementation, migration và verification.

## 0. Executive Decision

### Product correction — 2026-08-10 (authoritative)

Task completion and accomplishment governance are separate flows. The creator must put the needed
work definition in the Task before assignment: scope, expected output, acceptance criteria,
constraints/dependencies, assignee A and reviewer B. A only reads the brief, performs the work and
changes the Task status to completed. B then accepts or rejects the result.

A must not be required to create or submit a Completion Report, upload evidence or acknowledge a
report in order to move the Task to Done. Completion Report and evidence are optional governance
artifacts for a project/profile record. They may be collected after completion when policy needs
them, but they never gate assignment, completion status or the ordinary A → Done → B acceptance
flow. Any older section that describes them as an assignee completion gate is superseded by this
decision.

Suar không chỉ quản lý Task. Giá trị cốt lõi của Suar là biến công việc thật thành bằng chứng nghề nghiệp có thể kiểm chứng.

Chuỗi sản phẩm đích:

```text
Project Context
  → Work Package / Feature Context
  → Complete Task Specification
  → Structured Work & Evidence Contract
  → Assignment Snapshot
  → Assignee changes status to Done
  → Optional Completion Report / Evidence governance
  → Reviewer acceptance observations
  → Verified Work Accomplishment
  → Capability Signals
  → Profile + Talent Search
```

Quyết định trung tâm:

1. Một Task được giao trong Suar phải tự chứa đủ thông tin để assignee thực hiện mà không bắt buộc mở tài liệu bên ngoài.
2. Nội dung trong Suar phải đầy đủ tương đương toàn bộ phần tài liệu có liên quan trực tiếp tới Task.
3. External links vẫn được phép nhưng chỉ là `Supporting References`, không thay thế Task Specification.
4. Suar cố ý giữ lại `cognitive friction`: người tạo Task phải đọc, hiểu, tổ chức và xác nhận công việc mình giao.
5. Suar phải giảm `mechanical friction` bằng project inheritance, Work Package, template, clone, rich paste/upload và AI assistance có xác nhận.
6. Task requirement mô tả công việc và output kỳ vọng; nó không tự chứng minh user đã làm. Task có
   thể chuyển Done không cần Completion Report/evidence. Chỉ lớp governance tùy chọn cùng review
   đủ dữ liệu mới có thể tạo Verified Work Accomplishment.
7. Profile phải ưu tiên câu trả lời “người này đã được xác minh là làm được việc gì”, sau đó mới tổng hợp skill/capability level.
8. Mọi kết luận nghề nghiệp phải truy vết được tới đúng version Task Contract, trạng thái hoàn
   thành, và nếu có thì submission/evidence/review governance.

## 1. Vấn Đề Cần Giải Quyết

### 1.1 Vấn đề của Task authoring

Task hiện có thể có nhiều metadata nhưng vẫn mơ hồ vì:

- field nhiều không đồng nghĩa với context đầy đủ;
- thông tin quan trọng có thể chỉ nằm sau một external link;
- người tạo có thể giao Task khi chưa hiểu hết docs;
- description dài nhưng không tách được scope, deliverable, done criteria và evidence;
- dữ liệu dùng cho người thực hiện và dữ liệu dùng cho assessment chưa được tách rõ;
- project-level context chưa giảm đủ việc nhập lặp ở Task;
- UI chính chưa buộc author kiểm tra completeness theo thời điểm Assign.

### 1.2 Vấn đề của external documentation

Các công ty có thể lưu docs ở Notion, Confluence, Google Docs, Jira, Linear, GitHub, Figma, file PDF/Word/Excel, image, diagram hoặc công cụ nội bộ.

Suar không được phụ thuộc vào khả năng đọc các nguồn đó vì:

- authentication và authorization khác nhau;
- quyền truy cập có thể bị thu hồi;
- tài liệu có thể bị sửa, xóa hoặc đổi URL;
- nội dung có thể nằm trong image, table, embedded file, video hoặc comment;
- format và API không đồng nhất;
- tự động trích xuất có thể bỏ sót hoặc hiểu sai;
- recruiter hoặc reviewer tương lai có thể không được phép truy cập;
- sao chép tài liệu nội bộ có thể vi phạm privacy hoặc data policy.

Vì vậy, external document không phải canonical execution contract của Task trong Suar.

### 1.3 Vấn đề của Profile

Skill level trả lời “hệ thống ước lượng năng lực này ở mức nào”, nhưng không trả lời đủ:

- user đã thực hiện việc gì;
- họ là owner hay chỉ hỗ trợ;
- công việc ở context và scale nào;
- deliverable thực tế là gì;
- outcome nào đã đạt;
- evidence nào chứng minh;
- ai xác minh và confidence bao nhiêu.

Ví dụ `Backend L8` không đủ giúp recruiter biết user đã từng:

- thiết kế API cho một module nghiệp vụ;
- scale hoặc tối ưu database;
- debug production incident;
- thực hiện migration không downtime;
- chịu trách nhiệm technical decision trong một hệ thống thật.

### 1.4 Product outcome

Sau khi triển khai spec này:

- assignee đọc Task trong Suar là đủ để bắt đầu và biết thế nào là hoàn thành;
- Task mơ hồ bị phát hiện trước khi giao;
- docs mơ hồ bị buộc phải xem xét hoặc bổ sung;
- creator hiểu lại công việc thông qua quá trình cấu trúc Task;
- reviewer chấm đúng version, đúng scope và đúng evidence;
- Profile trình bày được các accomplishment cụ thể;
- recruiter tìm người theo loại công việc đã chứng minh, không chỉ theo skill label;
- sửa Task sau này không làm thay đổi lịch sử nghề nghiệp đã xác minh.

## 2. Decision Status

### 2.1 Đã thống nhất

| ID    | Decision                                                                             | Status          |
| ----- | ------------------------------------------------------------------------------------ | --------------- |
| D-001 | Task được giao phải tự chứa thông tin cần thiết trong Suar                           | Target Decision |
| D-002 | Mức đầy đủ phải tương đương phần docs liên quan trực tiếp, không chỉ là summary ngắn | Target Decision |
| D-003 | External link là supporting reference, không được thay thế nội dung cốt lõi          | Target Decision |
| D-004 | Creator phải chủ động đọc, hiểu, tổ chức và xác nhận Task                            | Target Decision |
| D-005 | Giữ cognitive friction, giảm mechanical friction                                     | Target Decision |
| D-006 | Task có lớp rich specification cho con người và lớp structured contract cho hệ thống | Target Decision |
| D-007 | Shared context phải được đặt ở Project/Work Package và kế thừa xuống Task            | Target Decision |
| D-008 | Requirement của Task không phải proof of work                                        | Target Decision |
| D-009 | Assignee chỉ chuyển trạng thái hoàn thành; Completion Report/evidence không gate Done     | Target Decision |
| D-010 | Completion Report/evidence là optional governance cho profile/review                    | Target Decision |
| D-011 | Verified Work Accomplishment là first-class profile entity                               | Target Decision |
| D-012 | Profile hiển thị demonstrated work trước skill-level analytics                           | Target Decision |
| D-013 | Assignment/review/profile phải dùng immutable versioned snapshots                        | Target Decision |

### 2.2 Đề xuất cần owner phê duyệt

| ID    | Proposal                                                                | Recommended Default                                             |
| ----- | ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| P-001 | Cho phép `Operational-only Task` không ảnh hưởng Profile                | Có, nhưng phải opt-out rõ và không được giả là evidence-bearing |
| P-002 | Evidence-enabled là mode mặc định cho công việc chuyên môn              | Không; optional governance, không gate workflow                 |
| P-003 | Cho phép AI map nội dung paste/upload vào structured fields             | Có, nhưng creator phải xác nhận                                 |
| P-004 | Cho phép retrospective reconstruction cho Task cũ                       | Có, nhưng gắn provenance và confidence thấp hơn                 |
| P-005 | Cho phép public-safe accomplishment summary được reviewer chỉnh wording | Có, reviewee phải biết nội dung được publish                    |

## 3. Scope

### 3.1 In scope

- Project Context và Work Package inheritance.
- Task rich specification và structured Work & Evidence Contract.
- Supporting references, attachments và rich content.
- Task readiness, validation và assignment gates.
- Task/contract versioning và change acknowledgement.
- Completion Report, evidence manifest và contributor attribution.
- Review observations, claim verification và dispute freeze.
- Verified Work Accomplishment lifecycle.
- Capability signal derivation.
- Profile information architecture.
- Talent Search và matching theo demonstrated work.
- Logical data model, proposed API surface, permissions và privacy.
- Backfill/migration cho Task, snapshots, user work history và profile cũ.
- Requirements, acceptance scenarios, metrics và rollout.

### 3.2 Out of scope

- Chọn cụ thể rich-text editor library.
- Thiết kế pixel-perfect cho mọi screen.
- Chốt physical database migration cuối cùng.
- Chốt search ranking weights cuối cùng.
- Tự động đồng bộ toàn bộ external document providers.
- Công khai raw private evidence cho recruiter.
- Dùng AI làm reviewer cuối cùng hoặc tự sinh verified claim không có human governance.

## 4. Actors

| Actor                    | Trách nhiệm chính                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Task Creator             | Viết hoặc tổ chức Task Specification; xác nhận scope, output, done criteria và reviewer B                 |
| Project Owner/Manager    | Quản trị Project Context, Work Package, policy và material change                                           |
| Assignee                 | Đọc contract, yêu cầu clarification, thực hiện và chuyển Task sang hoàn thành; không bắt buộc report/evidence |
| Contributor              | Khai báo phần đóng góp trong công việc nhiều người                                                          |
| Reviewer/Verifier        | Xác minh fulfillment, ownership, accomplishment claims và capability observations                           |
| Reviewee                 | Chấp nhận review hoặc mở dispute                                                                            |
| Organization Admin       | Quản trị policy, visibility, reviewer eligibility và escalation                                             |
| System Admin/Governance  | Giải quyết dispute và correction/revocation có audit                                                        |
| Recruiter/Hiring Manager | Tìm và đánh giá demonstrated work theo quyền được cấp                                                       |
| Suar System              | Validate, snapshot, project, aggregate, index và enforce governance; không tự thay thế human accountability |

## 5. Terminology

| Term                         | Definition                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Project Context              | Thông tin dùng chung trong Project: business, architecture, glossary, policies, stack, constraints và review defaults |
| Work Package                 | Context của một feature/initiative/epic có thể dùng chung cho nhiều Task                                              |
| Complete Task Specification  | Tài liệu rich, tự chứa, đủ chi tiết để con người hiểu và thực hiện Task                                               |
| Work Contract                | Phần structured mô tả action, scope, ownership, deliverables và done criteria                                         |
| Evidence Contract            | Phần structured mô tả evidence/governance tùy chọn, verification method, reviewer và capability assessment plan |
| Task Contract                | Tên chung của Work Contract + Evidence Contract tại một version                                                       |
| Supporting Reference         | URL/file/external artifact dùng để đọc thêm hoặc kiểm tra nguồn; không thay thế Task Contract                         |
| Assignment-ready             | Task đủ rõ để giao và bắt đầu làm                                                                                     |
| Evidence-ready               | Task đủ context và assessment plan để kết quả có thể ảnh hưởng Profile                                                |
| Assignment Snapshot          | Bản khóa của resolved Project/Work Package/Task context tại thời điểm assignment                                      |
| Completion Report            | Báo cáo governance tùy chọn về việc thực tế đã làm; không phải điều kiện Done                                      |
| Evidence Requirement         | Artifact governance có thể thu thập sau khi hoàn thành; không phải điều kiện trước khi làm                         |
| Evidence Item                | Artifact tùy chọn được lưu để review/profile governance                                                               |
| Review Observation           | Nhận định có rationale của reviewer về fulfillment, claim, ownership hoặc capability                                  |
| Verified Work Accomplishment | Kết luận có provenance về một việc cụ thể mà user đã thực hiện và được xác minh                                       |
| Capability Signal            | Tín hiệu năng lực được suy ra từ verified accomplishment/review, có context và confidence                             |
| Public-safe Summary          | Cách diễn đạt accomplishment không làm lộ dữ liệu nội bộ vượt quyền                                                   |
| Retrospective Reconstruction | Contract hoặc accomplishment được dựng lại sau khi công việc đã bắt đầu/hoàn thành                                    |

## 6. Product Principles

### 6.1 Self-contained execution

Assignee phải có thể trả lời các câu hỏi sau chỉ bằng dữ liệu được render trong Suar:

1. Tại sao Task tồn tại?
2. Tôi phải làm chính xác điều gì?
3. Điều gì không thuộc phạm vi?
4. Tôi phải bàn giao những gì?
5. Khi nào được coi là hoàn thành?
6. Có constraint, dependency và environment nào?
7. Vai trò, ownership và autonomy của tôi là gì?
8. Tôi phải bàn giao output nào cho creator/reviewer?
9. Ai sẽ nghiệm thu và dùng phương pháp nào?
10. Nếu bật governance profile thì cần thêm dữ liệu tùy chọn nào?

Nếu bất kỳ câu hỏi critical nào chưa có câu trả lời, Task chưa đạt readiness tương ứng.

### 6.2 Relevant-document parity

`Đầy đủ ngang docs` có nghĩa:

- mọi requirement liên quan trực tiếp tới Task phải hiện diện trong resolved Suar brief;
- mọi MUST/SHALL, business rule, edge case, NFR và constraint có thể ảnh hưởng output phải được giữ lại;
- Task có thể rút gọn background không liên quan;
- wording có thể được viết lại, nhưng không làm mất ý nghĩa vận hành;
- thông tin dùng chung có thể được kế thừa từ Project/Work Package thay vì copy vào từng Task;
- Task detail phải render resolved view để người đọc không phải tự ghép nhiều lớp.

Nó không có nghĩa phải copy nguyên văn toàn bộ tài liệu Project hoặc giữ cùng số trang.

Nếu external docs đã chi tiết, creator phải đưa toàn bộ phần chi tiết có liên quan vào resolved Suar brief và đọc/xác nhận lại. Nếu external docs còn mơ hồ, Readiness Engine phải làm lộ phần thiếu để creator bổ sung Task, đồng thời tạo tín hiệu rằng docs gốc cần được xem xét lại.

Suar không bắt buộc phải chứng minh tự động rằng nội dung local bằng external docs. Automated comparison chỉ là optional assistance. Trách nhiệm bắt buộc là creator tạo và xác nhận một contract local đầy đủ; reviewer và assignee làm việc theo version đã khóa trong Suar.

### 6.3 Productive friction

Suar cố ý yêu cầu creator:

- đọc lại;
- chọn phần liên quan;
- diễn đạt rõ;
- phát hiện gap;
- xác nhận responsibility.

Suar không cố ý bắt creator:

- gõ lại text đã có;
- nhập lặp shared context;
- copy cùng acceptance policy vào hàng chục Task;
- điền field không liên quan tới loại công việc;
- gắn skill giả để thỏa một taxonomy cứng.

### 6.4 Evidence before profile

Task title, requirement, target level và expected outcome không được đưa thẳng lên Profile như fact đã đạt.

Profile-impacting output, khi governance được bật, chỉ được sinh từ:

- locked Task Contract;
- optional Completion Report;
- evidence;
- final review outcome;
- resolved dispute state;
- capability ceiling và governance rules.

### 6.5 Explainability and immutability

Mỗi accomplishment/capability signal phải trả lời được:

- derived from assignment nào;
- dùng contract version nào;
- dựa trên evidence nào;
- reviewer nào xác minh;
- wording nào đã được confirm;
- có dispute/correction/supersession nào;
- visibility nào đang áp dụng.

## 7. Information Architecture And Inheritance

### 7.1 Bốn lớp thông tin

| Layer              | Chứa gì                                    | Ví dụ                                                                    |
| ------------------ | ------------------------------------------ | ------------------------------------------------------------------------ |
| Project Context    | Context ổn định dùng chung                 | architecture, glossary, tech stack, security rules, review policy        |
| Work Package       | Context của feature/initiative             | pre-order flow, business rules, shared diagrams, integration boundary    |
| Task Specification | Phần việc cụ thể của assignee              | thiết kế API, scope endpoints, edge cases, deliverables                  |
| Task Contract      | Structured execution + assessment contract | action, ownership, done criteria, evidence, reviewer, capability ceiling |

### 7.2 Project Context

Project nên cho phép lưu và version:

- product/business overview;
- domain glossary;
- architecture và system boundaries;
- default tech stack và environments;
- security/compliance requirements;
- quality standards;
- Definition of Done chung;
- evidence policy;
- reviewer policy;
- role/capability templates;
- reusable acceptance/evidence templates;
- supporting references và attachments.

Task authoring may load a dedicated project-scoped selector contract at
`GET /api/v1/projects/:projectId/task-authoring-context`. It returns only the active Project
Context title/summary/version and active Work Package `id/key/title/summary` plus an active version
summary and its optional `projectContextVersionId`. Archived packages are omitted; a package with
no active version is represented explicitly and cannot be selected. The response must exclude actor
IDs, source provenance, content hashes, rich/structured internals, version tokens and raw taxonomy.
The endpoint must apply the existing project-view policy after tenant scoping: project owner,
creator, organization owner/admin and project members may read it; other organization members do
not receive the context catalog.
Selecting a package writes only the immutable authoring pins
`authoring.projectContextVersionId` and `authoring.workPackageVersionId`; it never copies or publishes
the private source payload.

Không phải mọi Project bắt buộc có tất cả mục. Readiness của Task chỉ kế thừa những phần được đánh dấu active và relevant.

Project-detail read surfaces may display the currently active Context version through a dedicated
privacy-safe projection. That projection may include the readable title, summary, sanitized rich
content/plain-text fallback, version number and privacy classification, but must exclude actor IDs,
source provenance, content hash, structured defaults and the internal `versionToken`. An opaque
`active_version_id` may be exposed only to an authorized editor as the optimistic-concurrency fence
for the next publication; it is not a public taxonomy/provenance field. This read surface does not
replace resolved Task Brief inheritance, assignment-time pinning, version history or conflict
handling; those remain governed by the Task/Work Package contracts below.

### 7.3 Work Package

Work Package là lớp tùy chọn giữa Project và Task, phù hợp cho:

- feature;
- epic;
- initiative;
- release slice;
- incident;
- migration;
- research package.

Work Package có thể chứa:

- problem/outcome;
- shared requirements;
- feature flow;
- shared edge cases;
- architecture decision;
- common deliverables;
- default reviewers;
- task type/capability templates.

### 7.4 Resolved Task View

Task detail phải render một resolved view gồm:

```text
Pinned Project Context version
  + Pinned Work Package version
  + Task-specific Specification
  + Task-specific Contract overrides/additions
  = Resolved Task Brief
```

Người thực hiện không phải tự mở ba màn hình rồi ghép context.

### 7.5 Precedence

Khi một giá trị tồn tại ở nhiều lớp:

1. Task-specific value có precedence cao nhất.
2. Work Package value đứng sau.
3. Project default đứng cuối.
4. Override critical policy phải có lý do và đủ permission.
5. Giá trị resolved phải hiển thị nguồn và version.
6. Assignment snapshot phải pin resolved value, không resolve động về sau.

### 7.6 Không được giấu critical information

Không chấp nhận các câu thay thế contract như:

- “Xem chi tiết trong Notion.”
- “Làm theo Figma.”
- “Follow ticket bên Jira.”
- “Theo docs đã gửi.”
- “Giống Task trước.”

Các reference đó vẫn được gắn, nhưng phần relevant requirements phải nằm trong resolved Suar brief.

## 8. Complete Task Specification

### 8.1 Hai representation bắt buộc

Một Task có hai representation liên kết:

1. `Complete Task Specification`: rich document tối ưu cho con người.
2. `Structured Work & Evidence Contract`: dữ liệu có cấu trúc tối ưu cho validation và review; phần evidence/profile governance là tùy chọn.

Một representation không thay thế representation còn lại.

### 8.2 Rich specification capabilities

Editor cần hỗ trợ tối thiểu:

- heading, paragraph, list và checklist;
- table;
- image và caption;
- diagram attachment/embed;
- code block;
- quote/callout;
- file attachment;
- internal entity link;
- external supporting reference;
- anchor/section link;
- version history;
- comment/clarification thread.

### 8.3 Accessibility and machine readability

- Critical requirement không được chỉ nằm trong image.
- Image/diagram critical phải có caption hoặc text summary.
- Table critical phải có header rõ.
- Video/audio critical phải có summary và timestamp liên quan.
- File attachment critical phải được mô tả phần nào cần đọc.
- Rich spec phải có plain-text/searchable representation.

### 8.4 Suggested specification sections

| Section              | Nội dung                                                         |
| -------------------- | ---------------------------------------------------------------- |
| Summary              | Một đoạn giải thích Task                                         |
| Background           | Context cần biết                                                 |
| Problem / Outcome    | Vấn đề và kết quả mong muốn                                      |
| Requirements         | Functional requirements                                          |
| Quality Requirements | Performance, reliability, security, accessibility, compatibility |
| Scope                | In scope                                                         |
| Out Of Scope         | Explicit exclusions                                              |
| Flows / Scenarios    | Happy path, alternate path, failure path                         |
| Edge Cases           | Boundary và exceptional cases                                    |
| Constraints          | Technical/business/time/compliance constraints                   |
| Dependencies         | Upstream/downstream, owner và readiness                          |
| Deliverables         | Output bắt buộc                                                  |
| Acceptance           | Điều kiện hoàn thành đo được                                     |
| Open Questions       | Câu hỏi chưa chốt và owner                                       |
| References           | Supporting links/files                                           |

Task type template quyết định section nào required hoặc optional.

## 9. Structured Work And Evidence Contract

### 9.1 Work Contract fields

| Field                      | Meaning                                                 | Assignment Gate                     |
| -------------------------- | ------------------------------------------------------- | ----------------------------------- |
| `action`                   | Thiết kế, triển khai, debug, tối ưu, migrate, review... | Required                            |
| `object`                   | API, service, database, UI flow, incident, pipeline...  | Required                            |
| `problem_statement`        | Vấn đề phải giải quyết                                  | Required                            |
| `desired_outcome`          | Kết quả mong muốn                                       | Required                            |
| `scope`                    | Phần phải làm                                           | Required                            |
| `out_of_scope`             | Phần không phải làm                                     | Required hoặc explicit “none”       |
| `deliverables`             | Output phải bàn giao                                    | Required                            |
| `acceptance_criteria`      | Tiêu chí hoàn thành                                     | Required                            |
| `quality_requirements`     | NFR liên quan                                           | Conditional                         |
| `constraints`              | Giới hạn                                                | Required hoặc explicit “none known” |
| `dependencies`             | Dependency, state, owner                                | Required hoặc explicit “none”       |
| `role_in_task`             | Vai trò thực hiện                                       | Required                            |
| `ownership_level`          | Support/contributor/primary owner/lead                  | Required                            |
| `autonomy_level`           | Mức tự chủ mong đợi                                     | Required for profile-impacting work |
| `collaboration_type`       | Individual/pair/team/cross-functional                   | Conditional                         |
| `environment`              | Local/staging/production/research...                    | Conditional                         |
| `complexity_context`       | Nguồn complexity                                        | Required for assessment ceiling     |
| `impact_scope`             | User/system/business impact dự kiến                     | Conditional                         |
| `estimated_users_affected` | Scale dự kiến                                           | Conditional                         |
| `due_date`                 | Mốc giao                                                | Theo project policy                 |

### 9.2 Evidence Contract fields

| Field                       | Meaning                                   | Evidence Gate                    |
| --------------------------- | ----------------------------------------- | -------------------------------- |
| `evidence_requirements`     | Artifact governance có thể thu thập sau Done | Optional; never Done gate       |
| `evidence_to_criterion_map` | Evidence nếu có, chứng minh criterion nào    | Optional                         |
| `verification_method`       | Cách B nghiệm thu; evidence chỉ hỗ trợ nếu có | Required for reviewer flow      |
| `verifier_policy`           | Ai/role nào đủ quyền nghiệm thu                | Required                         |
| `required_capabilities`     | Capability có thể quan sát nếu bật governance   | Optional                         |
| `minimum_level`             | Mức tối thiểu để nhận Task                | Optional/conditional             |
| `target_level`              | Mức performance mong đợi                  | Optional/conditional             |
| `assessment_ceiling`        | Mức cao nhất Task có thể chứng minh       | Optional for scored capability   |
| `observable_behaviours`     | Hành vi/decision reviewer cần quan sát    | Optional per assessed capability |
| `profile_eligibility`       | Có thể tác động profile không             | Optional                         |
| `privacy_classification`    | Private/internal/public-safe policy       | Required when governance enabled |

### 9.3 Capability selection

- Chỉ chọn capability thực sự được Task tạo cơ hội quan sát.
- Không ép mỗi Task phải có đủ Technology, Engineering, Soft Skill và Delivery.
- Một category không liên quan được phép không có requirement.
- Manual authoring phải phân biệt minimum, target và assessment ceiling.
- Target level không được tự động trở thành verified profile level.
- Capability template từ role/project chỉ là starter; creator phải xác nhận relevance.

### 9.4 Structured fields and rich spec consistency

Structured contract là normalized index của specification, không phải một summary tùy ý.

Trước khi Assign, creator phải xác nhận:

- structured fields không mâu thuẫn với rich specification;
- deliverables và acceptance bao phủ các requirement critical;
- mọi assessed capability có observable behaviour/evidence;
- mọi reference critical đã được đưa phần relevant vào Suar.

## 10. Supporting References And External Documents

### 10.1 Role

Supporting Reference phục vụ:

- xem tài liệu gốc;
- đọc lịch sử thảo luận;
- mở asset chuyên biệt;
- kiểm tra source;
- xem background không cần copy;
- liên kết workflow bên ngoài.

Nó không phục vụ:

- thay thế scope;
- thay thế acceptance;
- thay thế evidence plan;
- làm canonical contract duy nhất;
- làm prerequisite bắt buộc để hiểu Task.

File/image/diagram được upload, lưu, version và phân quyền ngay trong Suar có thể là một phần của Task Specification hoặc Evidence Item. Chỉ external file/link chưa được capture vào boundary của Suar mới luôn là Supporting Reference.

### 10.2 Reference metadata

Mỗi reference nên lưu:

- type/provider;
- URL hoặc internal object id;
- title;
- mô tả phần liên quan;
- access classification;
- added_by/added_at;
- optional external version/hash;
- optional archived copy nếu policy cho phép;
- relation: background, requirement source, design asset, delivery target, evidence.

### 10.3 Authenticated or unsupported sources

Nếu Suar không truy cập được:

- link vẫn được lưu;
- creator vẫn phải đưa nội dung relevant vào Suar;
- Suar không tuyên bố đã kiểm tra content equality;
- assignment/review không phụ thuộc vào việc fetch lại link.

### 10.4 Optional assisted import

Suar có thể hỗ trợ:

```text
Paste/upload/authorized import
  → extract draft
  → map to specification sections and structured fields
  → flag missing/ambiguous/conflicting content
  → creator actively reviews and confirms
  → save canonical content in Suar
```

AI/import chỉ giảm thao tác; nó không được bỏ qua creator confirmation.

## 11. Task Authoring Experience

### 11.1 Authoring entry points

Suar có thể cung cấp nhiều cách bắt đầu, nhưng tất cả phải kết thúc ở cùng một Task Specification và Task Contract:

| Entry point                   | Khi nào dùng                   | Trách nhiệm creator                                        |
| ----------------------------- | ------------------------------ | ---------------------------------------------------------- |
| Blank Draft                   | Công việc mới, chưa có docs    | Viết specification và contract                             |
| Project/Work Package Template | Công việc theo pattern đã biết | Xác nhận inherited context và điền task-specific delta     |
| Clone Existing Task           | Công việc lặp lại              | Loại bỏ dữ liệu cũ, xác nhận scope/evidence mới            |
| Paste/Upload Existing Docs    | Docs đã đầy đủ ở nơi khác      | Review nội dung được đưa vào Suar, tổ chức lại và xác nhận |
| Optional Authorized Import    | Provider được hỗ trợ           | Review extraction; không được chỉ bấm import rồi Assign    |

Không có entry point `Link-only Evidence Task`.

### 11.2 Recommended authoring flow

1. Creator chọn Project và optional Work Package.
2. Creator tạo Draft với title.
3. Suar render Project/Work Package context sẽ được kế thừa.
4. Creator viết, paste, upload hoặc tổ chức Complete Task Specification.
5. Creator điền/xác nhận structured Work Contract.
6. Creator điền/xác nhận Evidence Contract.
7. Creator thêm supporting references.
8. Readiness Engine chỉ ra missing, ambiguity và conflict.
9. Creator sửa cho tới khi đạt gate.
10. Creator xem `Resolved Task Brief` giống như assignee sẽ thấy.
11. Creator xác nhận: “Tôi đã đọc và Task này phản ánh đúng công việc cần giao.”
12. Khi Assign, Suar tạo immutable assignment snapshot.
13. Assignee đọc và acknowledge trước khi bắt đầu.

### 11.3 Form organization

UI không nên là một trang dài với hàng chục field ngang hàng. Đề xuất:

| Area              | Mục tiêu                                            |
| ----------------- | --------------------------------------------------- |
| Overview          | Title, project, work package, type, assignee, dates |
| Specification     | Rich content đầy đủ                                 |
| Work Contract     | Action, scope, deliverables, acceptance, ownership  |
| Evidence Contract | Evidence, verification, reviewer, capabilities      |
| References        | Links/files và relation                             |
| Readiness         | Missing blockers, warnings, resolved preview        |
| Version History   | Snapshot và change log                              |

Advanced/conditional fields chỉ xuất hiện khi task type hoặc context cần chúng.

### 11.4 Active review instead of blind copy

Paste/import không được biến thành bypass. Creator phải:

- mở resolved preview;
- xử lý các section chưa map;
- xác nhận critical requirements;
- xác nhận deliverables/acceptance;
- xác nhận evidence plan;
- xử lý ambiguity;
- xác nhận contract version trước khi Assign.

Suar có thể yêu cầu một short-form restatement:

- “Assignee thực sự phải tạo ra output gì?”
- “Failure nào khiến Task chưa được coi là done?”
- “Evidence nào đủ để reviewer xác minh?”

Mục đích là kiểm tra sự hiểu, không phải bắt creator viết lại toàn bộ nội dung lần thứ hai.

### 11.5 Draft behavior

- Draft chỉ cần Project và title.
- Draft có thể chứa link-only trong lúc chuẩn bị.
- Draft không được hiển thị như Task đã sẵn sàng.
- Draft không được tạo capability/profile signal.
- Nếu đã chọn assignee nhưng contract chưa đủ, hệ thống lưu candidate assignee chứ chưa tạo active assignment.
- Autosave không được âm thầm chuyển readiness state.

## 12. Readiness Model And Gates

### 12.1 Readiness tách khỏi delivery status

`task_status_id` tiếp tục biểu diễn workflow delivery. Readiness là projection độc lập.

Không có Evidence Contract hoặc Completion Report nào được dùng làm điều kiện chuyển status sang
Done.

Không dùng cùng một field cho:

- Task đang ở cột nào trên board;
- Task có đủ rõ để Assign hay không;
- Task có đủ điều kiện tác động Profile hay không.

### 12.2 Work readiness states

| State                            | Meaning                           |
| -------------------------------- | --------------------------------- |
| `draft`                          | Chưa đủ để kiểm tra               |
| `needs_clarification`            | Có missing/conflict critical      |
| `ready_to_assign`                | Đủ execution context để giao      |
| `locked_at_assignment`           | Contract version đã được pin      |
| `change_pending_acknowledgement` | Có material change sau assignment |

### 12.3 Evidence readiness states

| State                  | Meaning                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `not_configured`       | Chưa bật governance evidence; vẫn có thể giao và hoàn thành Task |
| `not_applicable`       | Operational-only; không được dùng cho Profile              |
| `needs_clarification`  | Evidence/reviewer/capability plan chưa đủ                  |
| `evidence_ready`       | Đủ để có thể sinh profile evidence                         |
| `locked_at_assignment` | Evidence Contract version đã được pin                      |
| `retrospective`        | Được bổ sung sau thời điểm bắt đầu; confidence policy khác |
| `frozen`               | Dispute hoặc governance hold                               |
| `verified`             | Review cuối cùng cho phép projection                       |

### 12.4 Assignment-ready gate

Direct assignment bị block nếu thiếu một trong các nhóm:

- action/object;
- problem/outcome;
- relevant specification;
- scope/out-of-scope;
- deliverables;
- acceptance criteria;
- critical quality requirements;
- constraints/dependencies hoặc explicit “none known”;
- role/ownership;
- assignee;
- assignee and reviewer ownership are explicit; an acknowledgement is optional and must not block
  the assignee from doing the work or moving the Task to Done.

Suar phải hiển thị missing items cụ thể, không chỉ một percentage.

### 12.5 Optional evidence-ready gate

Chỉ profile-governance bị block nếu thiếu:

- Evidence Contract;
- evidence requirements;
- mapping evidence → acceptance criteria;
- verification method;
- eligible reviewer/verifier policy;
- assessed capabilities;
- observable behaviours;
- assessment ceiling cho capability được chấm level;
- privacy classification;
- full snapshot capability;
- không còn unresolved critical ambiguity.

### 12.6 Warning versus blocker

| Finding                                                             | Default severity                   |
| ------------------------------------------------------------------- | ---------------------------------- |
| Thiếu deliverable                                                   | Blocker                            |
| Thiếu acceptance criterion                                          | Blocker                            |
| Chỉ ghi “xem docs”                                                  | Blocker                            |
| Critical rule chỉ nằm trong image không có summary                  | Blocker                            |
| Không chọn reviewer cho explicitly enabled profile-governance Task   | Blocker cho governance/profile only |
| Capability không có observable behaviour                            | Blocker cho profile eligibility    |
| Dùng từ mơ hồ như “tốt”, “nhanh”, “ổn định” không có metric/context | Warning hoặc blocker theo template |
| Optional background thiếu                                           | Warning                            |
| Supporting link không truy cập được                                 | Warning nếu Task đã self-contained |
| Project default cũ                                                  | Warning hoặc blocker theo policy   |

### 12.7 Readiness calculation

Readiness phải ưu tiên deterministic rules:

- required field presence;
- required field semantic shape;
- dependency state;
- permission/reviewer eligibility;
- version availability;
- critical cross-field consistency.

AI có thể phát hiện ambiguity hoặc đề xuất gap, nhưng AI score không được là lý do duy nhất để block assignment.

## 13. Assignment, Acknowledgement And Change Control

### 13.1 Assignment snapshot

Khi assignment được tạo, snapshot phải chứa resolved values của:

- Complete Task Specification;
- Work Contract;
- Evidence Contract;
- Project Context version;
- Work Package version;
- required capability/rubric versions;
- supporting reference metadata;
- assignee, assigner, role và ownership;
- acceptance criteria;
- expected evidence;
- reviewer policy;
- readiness findings đã resolve;
- assignment-time taxonomy metadata for the Task: canonical assignments, free-form tags,
  taxonomy/enrichment versions, source revision, completeness and diagnostics;
- timestamps và author confirmations.

Không chỉ snapshot title/status/acceptance.

Taxonomy metadata is an internal, assignment-scoped provenance envelope. It is optional for legacy
snapshots and may be `null` when the authorized provider has no meaningful source state. Historical
accomplishment readers must use this pinned envelope instead of resolving the mutable Task metadata
again. Raw assignment provenance, source identifiers, evidence references, diagnostics and free-form
tags are not public disclosure fields; public/Profile/Search projections require a separate
term-level visibility allowlist and must emit only a public-safe vocabulary.

### 13.2 Assignee acknowledgement

Trước khi chuyển sang active work, assignee được xem:

- resolved brief;
- deliverables;
- acceptance;
- evidence expectations;
- ownership;
- reviewer;
- due date/dependencies.

Assignee có thể:

- acknowledge;
- request clarification;
- reject assignment theo policy;
- flag contradiction.

Acknowledge không có nghĩa assignee từ bỏ quyền dispute. Nó chỉ ghi nhận version đã được đọc.

### 13.3 Change classes

| Change class      | Ví dụ                                  | Rule                                                      |
| ----------------- | -------------------------------------- | --------------------------------------------------------- |
| Editorial         | typo, formatting                       | Tạo version/audit; không cần re-ack nếu meaning không đổi |
| Clarification     | thêm ví dụ không đổi scope             | Thông báo; creator quyết định cần re-ack                  |
| Material Scope    | thêm endpoint, thay output             | Bắt buộc new version + assignee acknowledgement           |
| Acceptance Change | thay done criteria/metric              | Bắt buộc new version + impact review                      |
| Evidence Change   | thêm artifact/reviewer                 | Bắt buộc new version; không áp dụng hồi tố bất công       |
| Ownership Change  | contributor thành owner hoặc ngược lại | Bắt buộc new version và governance check                  |
| Deadline/Priority | đổi due date/priority                  | Theo policy, ghi audit và thông báo                       |

### 13.4 Material change safeguards

- Không được sửa lịch sử snapshot.
- New version phải có reason và changed fields.
- Assignee phải biết impact tới effort, deadline và assessment.
- Evidence requirement mới không được áp dụng hồi tố nếu work đã hoàn thành, trừ khi assignee đồng ý.
- Reviewer chấm theo version effective cho khoảng work tương ứng.
- Nếu scope thay đổi lớn, system nên đề xuất split Task.

If an assignee's execution brief or acknowledgement request is based on a stale assignment
snapshot, the product must fail closed for the old contract: do not leave stale acknowledgement or
clarification controls actionable, do not present the old resolved contract as current, and expose
an accessible recovery action that reloads the authoritative brief. A stale `409` must not create an
optimistic acknowledgement/clarification state. Host-level reload may preserve drafts when the
surface supports it, but recovery must remain safe when it falls back to a full page reload.

For a material successor snapshot, the participant-facing brief should expose a safe diff summary
before the re-acknowledgement action: change class and changed field paths, plus an explicit marker
that the successor requires re-acknowledgement. It must not expose raw canonical envelopes, previous
snapshot identifiers, immutable hashes or internal provenance that is not needed to understand the
change. The old snapshot remains immutable and the acknowledgement action remains bound to the new
exact snapshot.

When the brief is mounted from a board or list modal, stale recovery must use a host callback that
reloads the selected task detail and updates the local task store. It must not request a `task`
partial from a board route that only returns `tasks`; direct detail/context hosts may continue to use
the task-only Inertia reload with preserved state and scroll.

### 13.5 External reference changes

External source thay đổi không tự động thay đổi contract.

Nếu Suar phát hiện version drift:

- tạo notification;
- hiển thị diff nếu có;
- creator quyết định cập nhật contract;
- material update đi qua change control;
- locked snapshot cũ vẫn giữ nguyên.

## 14. Execution And Clarification

### 14.1 Execution brief

Task detail của assignee phải tổ chức theo thứ tự hành động:

1. Why/Outcome.
2. What to do.
3. Scope/out-of-scope.
4. Deliverables.
5. Done criteria.
6. Constraints/dependencies.
7. Output cần bàn giao cho creator/reviewer.
8. Reviewer B và tiêu chí nghiệm thu.
9. Rich specification.
10. References.
11. Clarification/history.

Không đặt execution-critical fields trong một nhóm chung như “AI/dispute information”.

### 14.2 Clarification

Clarification thread cần hỗ trợ:

- câu hỏi gắn với section/criterion cụ thể;
- creator answer;
- quyết định answer chỉ là comment hay trở thành contract change;
- unresolved clarification indicator;
- lock/acknowledge nếu answer thay đổi meaning.

Chat/comment không tự động sửa contract.

### 14.3 Work tracking versus proof

Comment, status movement và time log là operational data. Status movement sang Done là hành động
hoàn thành của assignee, không cần report/evidence. Các dữ liệu này chỉ có thể hỗ trợ governance
evidence; chúng không tự động chứng minh accomplishment.

## 15. Completion Report

### 15.1 Purpose

Task Specification mô tả điều dự kiến và là nguồn chính để A thực hiện. Completion Report mô tả
điều thực tế đã xảy ra cho governance/profile khi được bật; nó là optional và không gate Done.

Không tạo accomplishment chỉ vì Task chuyển sang `done`.

### 15.2 Required completion fields

| Field                    | Meaning                                        |
| ------------------------ | ---------------------------------------------- |
| `work_performed`         | Những phần thực tế đã làm                      |
| `contribution_statement` | Phần đóng góp của user                         |
| `actual_role`            | Role thực tế                                   |
| `actual_ownership`       | Ownership thực tế                              |
| `key_decisions`          | Quyết định quan trọng và rationale             |
| `deliverables_manifest`  | Output thực tế và location                     |
| `criterion_results`      | Kết quả từng acceptance criterion              |
| `evidence_manifest`      | Evidence item map                              |
| `deviations`             | Khác biệt so với contract                      |
| `actual_outcomes`        | Outcome/metric thực tế                         |
| `impact_observed`        | Impact đã quan sát, không phải expected impact |
| `limitations`            | Giới hạn hoặc chưa giải quyết                  |
| `remaining_work`         | Follow-up còn lại                              |
| `collaborators`          | Người tham gia và phần đóng góp                |
| `public_claim_draft`     | Optional public-safe wording                   |

### 15.3 Criterion result

Mỗi acceptance criterion có:

- result: met, partially_met, not_met, not_applicable;
- explanation;
- evidence references;
- deviation approval nếu có;
- reviewer outcome.

### 15.4 Evidence manifest

Evidence Item nên có:

- type;
- title;
- description;
- URI/storage reference;
- version/commit/hash nếu có;
- created_at/captured_at;
- owner/contributors;
- related deliverables;
- evidence requirement references;
- related criterion;
- privacy classification;
- reviewer access state;
- retention state.

The normalized evidence manifest must retain all related deliverable IDs and evidence-requirement
IDs, not only the first deliverable. Legacy scalar projections may remain for compatibility, but
review and editor packages must use the complete arrays so one evidence item can support multiple
contract targets without losing provenance.

When a Completion Report is edited into a later immutable revision, the editor must preserve the
server-authoritative evidence attribution (`owner` and contributor identities) and all persisted
contributor claims by default. Replacing the current reporter's claim must not silently discard
other contributors or rewrite shared-evidence ownership. Adding/removing collaborators or correcting
attribution remains a governed product action and requires explicit policy, actor authorization,
audit record and reviewer-visible history; the preservation rule is not an implicit collaborator
editor.

### 15.5 Collaborative work

Một Task có nhiều người không được tạo cùng một accomplishment statement cho tất cả.

Mỗi contributor phải có:

- contribution statement riêng;
- role/ownership riêng;
- evidence mapping riêng hoặc shared evidence với attribution;
- reviewer confirmation riêng.

Reviewer packages may display these persisted attribution facts — contributor reference, role,
ownership, autonomy, claim status, contribution statement and evidence references — as read-only
review context. The display must not introduce a collaborator picker, identity-name projection,
consent assumption or attribution correction action; adding/removing/correcting contributors remains
subject to explicit authorization, audit and correction policy.

## 16. Review And Verification Model

### 16.1 Ba lớp review

Reviewer phải review ba concern riêng:

1. `Contract Fulfillment` — output có đạt acceptance không.
2. `Accomplishment Claims` — user thực sự đã làm và sở hữu phần nào.
3. `Capability Observations` — reviewer đã quan sát capability nào, trong context nào, tới ceiling nào.

Một overall score không thay thế ba lớp này.

### 16.2 Review package

Review UI/package phải dùng:

- locked assignment snapshot;
- effective contract version/change history;
- Completion Report;
- deliverables;
- evidence manifest;
- criterion mapping;
- clarification history;
- contributor attribution;
- reviewer eligibility context;
- prior dispute/correction state nếu có.

### 16.3 Claim review

Với từng accomplishment claim, reviewer có thể:

- confirm;
- confirm with wording refinement;
- narrow scope;
- lower ownership;
- mark partially verified;
- reject;
- request evidence;
- flag conflict;
- open/escalate dispute theo quyền.

Review phải lưu rationale, không chỉ status.

### 16.4 Capability observation

Mỗi observation tối thiểu gồm:

- capability id/name;
- observed behaviour;
- context;
- evidence references;
- reviewer;
- assigned level nếu rubric cho phép;
- assessment ceiling;
- confidence;
- positive/negative/neutral direction;
- applicability;
- rationale.

For a capability observation to use a final verification disposition (`confirm`, `refine`, `narrow`
or `partially_verify`), the runtime must require at least one accessible evidence reference and a
non-null confidence value. Draft and `request_evidence` observations may remain incomplete so the
reviewer can continue authoring. This is a data-presence invariant only: the product has not chosen
a numeric confidence threshold, quorum, tie-break, finalization authority or dispute/correction
policy here.

### 16.5 Review output

Final review output phải phân biệt:

- Task fulfillment result;
- verified claims;
- rejected/unverified claims;
- capability observations;
- quality/delivery metrics;
- public-safe wording state;
- profile eligibility;
- dispute/governance status.

The runtime must distinguish a read-only readiness projection from governed finalization. A
readiness result may expose current/stale observation identity and deterministic provenance,
report, claim, evidence-access/sufficiency, lifecycle and conflict blockers, but it must not grant
finalization authority by implication. Until the product decides reviewer quorum, conflict
tie-break, reviewee acceptance timing, correction authority and post-publication dispute behavior,
the result remains `finalizationAuthorized: false` with `policyStatus: not_evaluated`.

Native observation creation must also write a redacted, metadata-only audit receipt in the same
transaction as its initial observation revision. The receipt may retain IDs, immutable hashes,
reviewer role/type, disposition, evidence sufficiency and governance state, but must exclude
rationale, structured claim content, evidence URLs/storage locators and other private payloads.
An idempotent create retry must return the existing revision without duplicating the receipt. This
is persistence provenance, not finalization or quorum authority.

Governed accomplishment projection must also fence review observations to the authoritative anchor:
only the revision whose `revision_number` equals `review_observations.current_revision_number` may
be projected, and both the anchor and that revision must be `final`. A historical `final` revision
must not remain projectable after its observation is frozen, disputed, superseded or revoked. This
is a read-side consistency invariant; it does not choose correction, dispute-resolution or
finalization policy.

### 16.6 Dispute

- Unresolved dispute freeze accomplishment và profile-impacting signals.
- Existing public projection phải được marked/frozen theo policy nếu dispute mở sau publication.
- Resolution có thể confirm, correct, supersede hoặc revoke.
- Không xóa audit trail.

## 17. Verified Work Accomplishment

### 17.1 Definition

Verified Work Accomplishment là một kết luận có cấu trúc và provenance:

> User đã thực hiện một action cụ thể lên một object cụ thể, trong context và mức ownership xác định, tạo ra deliverables/outcomes được evidence và reviewer xác minh.

Nó không phải:

- Task row;
- Task title;
- self-declared portfolio item;
- skill score;
- review comment;
- organization/project membership.

### 17.2 Creation gate

This is a profile-governance gate, not a Task delivery gate. A Task may be marked Done before this
gate is evaluated. Completion Report/evidence are required only when the creator or organization
explicitly enables profile-governance for that Task; otherwise no accomplishment projection is
created.

Một accomplishment chỉ được tạo trạng thái `verified` khi:

- có assignment snapshot;
- contract version hợp lệ;
- có Completion Report;
- accomplishment claim được reviewer xác nhận;
- ownership/contribution được xác nhận;
- required evidence đủ hoặc reviewer ghi exception hợp lệ;
- review đã final;
- không có unresolved dispute;
- privacy/public wording đã được xử lý.

### 17.3 Lifecycle

| State                             | Meaning                                    |
| --------------------------------- | ------------------------------------------ |
| `candidate`                       | Được tạo từ Completion Report, chưa review |
| `under_review`                    | Reviewer đang xác minh                     |
| `verified`                        | Đủ điều kiện projection                    |
| `partially_verified`              | Chỉ một phần claim được xác minh           |
| `frozen`                          | Đang dispute/governance hold               |
| `superseded`                      | Có version/correction mới thay thế         |
| `revoked`                         | Governance kết luận không còn hợp lệ       |
| `private` / `internal` / `public` | Visibility dimension, không thay lifecycle |

### 17.4 Logical fields

| Group          | Fields                                                                |
| -------------- | --------------------------------------------------------------------- |
| Identity       | id, user_id, organization_id, project_id, task_id, task_assignment_id |
| Statement      | title, concise_statement, detailed_statement                          |
| Work semantics | action, object, task_type, problem_category                           |
| Context        | business_domain, system_area, environment, scale, constraints         |
| Responsibility | role, ownership, autonomy, collaboration                              |
| Difficulty     | complexity factors, novelty, risk                                     |
| Output         | deliverables, artifacts, key decisions                                |
| Result         | criterion outcomes, measurable outcomes, impact observed              |
| Technology     | tech stack, tools, standards                                          |
| Verification   | review id, reviewers, method, confidence, verified_at                 |
| Evidence       | evidence references and access metadata                               |
| Capability     | derived capability signal references                                  |
| Governance     | lifecycle, dispute, correction, supersession                          |
| Privacy        | classification, public-safe fields, redaction state                   |
| Provenance     | task/contract/completion/review version ids                           |

### 17.5 Example: API design

```text
Title:
Designed and implemented the pre-order module API

Action/Object:
Designed + implemented / REST API and domain contract

Role:
Primary owner

Context:
Pre-order order lifecycle; inventory reservation and payment integration

Deliverables:
OpenAPI specification, ADR, implementation PR, integration tests

Outcome:
Acceptance criteria met; error and idempotency flows verified

Verification:
Confirmed by Backend Lead and peer reviewer

Capabilities:
API design, domain modelling, backend implementation, integration testing
```

### 17.6 Other accomplishment shapes

Database scaling example:

> Diagnosed PostgreSQL query bottlenecks and redesigned indexing/query strategy for the reporting workload; verified through before/after query plans and load-test metrics.

Production debugging example:

> Led diagnosis of a production payment callback failure, isolated an idempotency race, delivered mitigation and regression tests, and documented the incident follow-up.

Các statement chỉ được dùng nếu actual Completion Report và review hỗ trợ đầy đủ action, ownership, context và outcome tương ứng.

## 18. Capability Signals

### 18.1 Derivation

Capability signals được sinh từ verified observations/accomplishments, không sinh trực tiếp từ Task requirement.

```text
Task requirement
  → observation opportunity
  → actual evidence
  → reviewer observation
  → governed capability signal
  → profile aggregate
```

### 18.2 Signal context

Signal phải giữ:

- capability;
- level/score nếu applicable;
- task ceiling;
- action/object context;
- role/ownership;
- complexity;
- evidence strength;
- reviewer credibility;
- recency;
- confidence;
- dispute state.

### 18.3 Aggregation constraints

- Target level không phải verified level.
- Task ceiling giới hạn signal.
- Một Task nhỏ không chứng minh expert level chỉ vì score cao.
- Repeated evidence có giá trị hơn một event đơn lẻ.
- Evidence yếu hoặc retrospective có weight thấp hơn.
- Disputed/revoked observations không cập nhật verified aggregate.
- Skill category charts là derived analytics, không thay accomplishment record.

## 19. Profile Information Architecture

### 19.1 Câu hỏi Profile phải trả lời

Profile cần cho recruiter/manager biết:

1. Người này đã được xác minh là làm được những loại công việc nào?
2. Họ đã làm trong context, scale và mức ownership nào?
3. Output và outcome là gì?
4. Evidence/review mạnh đến đâu?
5. Các work examples có lặp lại và còn mới không?
6. Từ đó capability profile tổng hợp là gì?

### 19.2 Recommended order

1. Professional summary grounded in verified work.
2. Demonstrated Work / Verified Accomplishments.
3. Capability inventory và confidence.
4. Evidence/review timeline.
5. Delivery/performance trends.
6. Organization/project experience.
7. Self-declared/imported information, tách nhãn rõ.

### 19.3 Accomplishment card

Card tối thiểu hiển thị:

- accomplishment statement;
- action/object;
- role/ownership;
- context/scale;
- deliverables;
- outcome;
- capabilities demonstrated;
- verification/confidence;
- completion date/recency;
- evidence availability;
- privacy-safe organization/project label;
- link tới detail nếu viewer được phép.

Không chỉ hiển thị task title, completion date và quality score.

### 19.4 Accomplishment detail

Theo quyền, detail có thể hiển thị:

- public-safe narrative;
- structured context;
- criterion/result summary;
- selected evidence metadata;
- reviewer roles;
- capability observations;
- version/provenance summary;
- dispute/correction notice.

Raw internal Task Specification không mặc định công khai.

### 19.5 Skill/capability presentation

Capability level vẫn quan trọng nhưng đứng sau demonstrated work.

Mỗi capability nên có:

- current verified state;
- confidence/coverage;
- recent accomplishments hỗ trợ;
- contexts đã chứng minh;
- ownership distribution;
- evidence count/recency;
- gap để tiến lên level tiếp theo.

## 20. Talent Search And Matching

### 20.1 Search intent

Recruiter phải có thể tìm:

- người đã thiết kế API;
- người đã scale/tối ưu database;
- người từng debug production incident;
- người từng lead migration;
- người có primary ownership trong domain cụ thể;
- người có repeated evidence ở context tương tự.

### 20.2 Searchable dimensions

| Dimension        | Examples                                                          |
| ---------------- | ----------------------------------------------------------------- |
| Action           | design, implement, debug, optimize, migrate, lead, review         |
| Object           | API, database, service, UI, pipeline, incident                    |
| Task Type        | feature development, architecture, incident response, performance |
| Domain           | commerce, fintech, healthcare, logistics                          |
| Problem Category | API design, scaling, reliability, data migration                  |
| Role/Ownership   | contributor, primary owner, lead                                  |
| Autonomy         | guided, independent, leads others                                 |
| Context/Scale    | production, high traffic, multi-service, regulated                |
| Technology       | PostgreSQL, Svelte, Node.js...                                    |
| Outcome          | latency reduced, incident resolved, migration completed           |
| Evidence         | code review, metrics, test report, design review                  |
| Verification     | reviewer type, confidence, dispute-free                           |
| Recency/Repeat   | recent and repeated demonstrations                                |

### 20.3 Ranking principles

Ranking ưu tiên:

1. Verified accomplishment semantic/context fit.
2. Action/object exactness.
3. Ownership and scale fit.
4. Evidence strength and confidence.
5. Repeated demonstrations.
6. Recency.
7. Capability aggregate.
8. Trust/delivery signals.

Không rank chủ yếu bằng title keyword hoặc self-declared skill.

### 20.4 Explainable result

Mỗi search/match result phải giải thích:

> Matched because the candidate has 2 verified API design accomplishments, including one as primary owner in an order workflow, supported by design review and implementation evidence.

### 20.5 Privacy boundary

Search index chỉ chứa fields được phép theo visibility. Private/internal accomplishment không được rò rỉ qua:

- autocomplete;
- facet counts;
- snippets;
- ranking;
- “matched because” explanation;
- public API.

## 21. Privacy, Confidentiality And Data Governance

### 21.1 Data layers

| Layer                                   | Default visibility                            |
| --------------------------------------- | --------------------------------------------- |
| Full Task Specification                 | Project/internal                              |
| External reference                      | Theo source + project policy                  |
| Assignment snapshot                     | Project/reviewer/governance                   |
| Completion Report                       | Project/reviewer/governance                   |
| Raw evidence                            | Restricted by evidence classification         |
| Verified accomplishment internal record | Owner + authorized org/governance             |
| Public-safe accomplishment              | Public only after explicit publication policy |
| Capability aggregate                    | Theo profile visibility                       |

### 21.2 Public-safe projection

Public projection có thể:

- ẩn organization/project name;
- tổng quát hóa system details;
- ẩn URL/commit/repository;
- làm tròn scale/metrics theo policy;
- hiển thị reviewer role thay vì identity;
- giữ verification status mà không lộ raw evidence.

Nó không được:

- bịa outcome để làm đẹp;
- thay đổi ownership;
- làm statement rộng hơn verified claim;
- công khai confidential details chỉ vì chúng có trong Task.

### 21.3 Publication responsibilities

- Organization policy xác định nội dung nào có thể rời boundary.
- User biết và kiểm soát public accomplishment trong giới hạn governance.
- Reviewer có thể xác nhận factual wording nhưng không tự công khai dữ liệu restricted.
- Redaction/public summary change phải có audit.

### 21.4 Retention and revocation

- Snapshot/evidence retention theo organization/data policy.
- Xóa raw evidence không tự động xóa audit metadata nếu policy cho phép giữ.
- Nếu evidence không còn accessible, Profile phải phản ánh evidence availability.
- Revoked accomplishment không được tiếp tục search/public projection.

## 22. Target Logical Data Model

### 22.1 Modeling rules

- Đây là logical model; physical migration cần impact analysis riêng.
- Existing entities được reuse khi semantics phù hợp.
- JSONB có thể dùng cho versioned snapshots, nhưng searchable/governed fields cần projection rõ.
- `user_work_history` là read model/projection, không phải canonical source of truth.
- Current mutable `tasks` row không được dùng để dựng lại historical accomplishment.
- Mọi profile-impacting fact phải có immutable provenance.
- Business invariants theo convention của project được enforce ở application/domain layer và tests.

### 22.2 Existing entities to retain or evolve

| Existing entity                | Target role                                                         |
| ------------------------------ | ------------------------------------------------------------------- |
| `projects`                     | Project identity và policy owner                                    |
| `tasks`                        | Current mutable working state                                       |
| `task_required_skills`         | Requirement/opportunity input; cần sửa semantics min/target/ceiling |
| `task_assignments`             | Assignment lifecycle                                                |
| `task_assignment_snapshots`    | Mở rộng thành full resolved assignment/submission snapshot          |
| `task_versions`                | Mở rộng hoặc supersede bằng version model đủ specification/contract |
| `task_submissions`             | Submission lifecycle; liên kết Completion Report                    |
| Evidence tables hiện có        | Reuse làm artifact/evidence store nếu support metadata cần thiết    |
| Review session/workflow tables | Governance lifecycle                                                |
| `user_work_history`            | Projection cho analytics/search migration, không làm canonical fact |
| `user_profile_snapshots`       | Published profile projection                                        |
| User skill/profile tables      | Capability aggregation projection                                   |

### 22.3 Proposed entities

| Entity                              | Purpose                                                  |
| ----------------------------------- | -------------------------------------------------------- |
| `project_context_versions`          | Versioned Project Context                                |
| `work_packages`                     | Feature/initiative grouping                              |
| `work_package_versions`             | Versioned shared specification/policy                    |
| `task_specification_versions`       | Rich self-contained Task Specification                   |
| `task_contract_versions`            | Structured Work & Evidence Contract                      |
| `task_supporting_references`        | External/internal reference metadata                     |
| `task_readiness_assessments`        | Deterministic blockers/warnings/result                   |
| `task_evidence_requirements`        | Evidence planned before work                             |
| `task_assignment_acknowledgements`  | Assignee acknowledgement per contract version            |
| `task_completion_reports`           | Actual work report                                       |
| `task_completion_claims`            | Per-user accomplishment candidate                        |
| `task_criterion_results`            | Completion/review result per criterion                   |
| `review_observations`               | Fulfillment, claim, ownership và capability observations |
| `verified_work_accomplishments`     | Canonical verified accomplishment                        |
| `accomplishment_evidence_links`     | Evidence mapping                                         |
| `accomplishment_capability_signals` | Capability signals derived from accomplishment           |
| `accomplishment_public_projections` | Optional versioned public-safe wording                   |

### 22.4 Project Context Version

Minimum logical fields:

- id;
- project_id;
- version_number;
- title/summary;
- rich_content;
- structured_defaults;
- active_from/retired_at;
- created_by/confirmed_by;
- change_reason;
- privacy_classification;
- content_hash;
- created_at.

### 22.5 Task Specification Version

Minimum logical fields:

- id;
- task_id;
- version_number;
- rich_content;
- plain_text_projection;
- section_index;
- project_context_version_id;
- work_package_version_id;
- author_id;
- confirmation_state;
- content_hash;
- change_class;
- change_reason;
- created_at.

### 22.6 Task Contract Version

Minimum logical fields:

- id;
- task_id;
- task_specification_version_id;
- version_number;
- work_contract;
- evidence_contract;
- resolved_contract;
- readiness_state;
- creator_confirmed_by/at;
- content_hash;
- change_class/reason;
- effective_from;
- created_at.

### 22.7 Completion Claim

Minimum logical fields:

- id;
- completion_report_id;
- user_id;
- action;
- object;
- proposed_title;
- proposed_statement;
- actual_role;
- actual_ownership;
- actual_autonomy;
- contribution_statement;
- deliverable_refs;
- criterion_result_refs;
- evidence_refs;
- outcome_data;
- public_claim_draft;
- status.

### 22.8 Review Observation

`review_observations` nên dùng discriminator `observation_type`:

- `contract_fulfillment`;
- `accomplishment_claim`;
- `ownership`;
- `capability`;
- `quality`;
- `delivery`.

Common fields:

- id;
- review/workflow/session id;
- task_assignment_id;
- subject_user_id;
- observation_type;
- target_ref;
- disposition;
- structured_value;
- rationale;
- evidence_refs;
- reviewer_id/type;
- confidence;
- assessment_ceiling;
- governance_state;
- created_at/finalized_at.

Reviewer authoring must treat evidence references as an allowlisted subset of the evidence package
for the selected claim: unrelated, restricted or unavailable evidence cannot be submitted as claim
support. The UI filters the authoring choices, but the production command/HTTP boundary must
revalidate the subset and reviewer access before persisting an observation.

### 22.9 Verified Work Accomplishment contract

```ts
interface VerifiedWorkAccomplishment {
  id: string
  userId: string
  organizationId: string | null
  projectId: string | null
  taskId: string
  taskAssignmentId: string

  title: string
  conciseStatement: string
  detailedStatement: string | null
  action: string
  object: string
  taskType: string | null
  businessDomain: string | null
  problemCategory: string | null

  role: string | null
  ownershipLevel: string
  autonomyLevel: string | null
  collaborationType: string | null
  context: Record<string, unknown>
  complexity: Record<string, unknown>
  deliverables: Array<Record<string, unknown>>
  outcomes: Array<Record<string, unknown>>
  technology: string[]

  verificationMethod: string
  confidence: number | null
  lifecycleState: string
  visibility: string
  verifiedAt: string | null

  provenance: {
    projectContextVersionId: string | null
    workPackageVersionId: string | null
    taskSpecificationVersionId: string
    taskContractVersionId: string
    assignmentSnapshotId: string
    completionReportId: string
    reviewWorkflowId: string
  }
}
```

### 22.10 Resolved Task Contract contract

```ts
interface ResolvedTaskContract {
  taskId: string
  versionId: string
  title: string
  specification: {
    richContent: unknown
    plainText: string
  }
  work: {
    action: string
    object: string
    problemStatement: string
    desiredOutcome: string
    scope: unknown[]
    outOfScope: unknown[]
    deliverables: unknown[]
    acceptanceCriteria: unknown[]
    qualityRequirements: unknown[]
    constraints: unknown[]
    dependencies: unknown[]
    roleInTask: string
    ownershipLevel: string
    autonomyLevel: string | null
    collaborationType: string | null
    environment: string | null
    impactScope: unknown
  }
  evidence: {
    requirements: unknown[]
    verificationMethod: string
    verifierPolicy: unknown
    capabilities: unknown[]
    profileEligibility: boolean
    privacyClassification: string
  }
  inheritedFrom: {
    projectContextVersionId: string | null
    workPackageVersionId: string | null
  }
  readiness: {
    assignmentReady: boolean
    evidenceReady: boolean
    blockers: unknown[]
    warnings: unknown[]
  }
}
```

## 23. Proposed API And Application Boundaries

### 23.1 Status

Các endpoint bên dưới là proposed contract shape, ngoại trừ những route được đánh dấu **implemented
as of 2026-08-10**. Final paths của phần còn lại phải được reconciled với route conventions hiện tại
trước implementation.

### 23.2 Project Context and Work Package

| Method | Proposed path                                        | Purpose                                              |
| ------ | ---------------------------------------------------- | ---------------------------------------------------- |
| POST   | `/api/v1/projects/:projectId/context/versions`       | Create Project Context version                       |
| GET    | `/api/v1/projects/:projectId/context/resolved`       | Read active resolved context                         |
| POST   | `/api/v1/projects/:projectId/work-packages`          | Create Work Package                                  |
| POST   | `/api/v1/work-packages/:id/versions`                 | Create Work Package version                          |
| GET    | `/api/v1/work-packages/:id/resolved`                 | Read resolved package                                |
| GET    | `/api/v1/projects/:projectId/task-authoring-context` | **Implemented:** privacy-safe selector/read contract |

### 23.3 Task authoring

| Method | Proposed path                           | Purpose                          |
| ------ | --------------------------------------- | -------------------------------- |
| POST   | `/api/v1/tasks/drafts`                  | Save minimal Draft               |
| PUT    | `/api/v1/tasks/:taskId/specification`   | Create new specification version |
| PUT    | `/api/v1/tasks/:taskId/contract`        | Create new contract version      |
| POST   | `/api/v1/tasks/:taskId/references`      | Add supporting reference         |
| GET    | `/api/v1/tasks/:taskId/resolved-brief`  | Render resolved brief            |
| POST   | `/api/v1/tasks/:taskId/readiness/check` | Run deterministic readiness      |
| POST   | `/api/v1/tasks/:taskId/confirm`         | Creator confirms version         |
| POST   | `/api/v1/tasks/:taskId/assign`          | Assign only if gates pass        |

### 23.4 Assignment and change control

| Method | Proposed path                                        | Purpose                           |
| ------ | ---------------------------------------------------- | --------------------------------- |
| POST   | `/api/v1/task-assignments/:id/acknowledge`           | Assignee acknowledges version     |
| POST   | `/api/v1/task-assignments/:id/request-clarification` | Raise contract clarification      |
| POST   | `/api/v1/tasks/:taskId/change-requests`              | Propose material contract change  |
| POST   | `/api/v1/task-change-requests/:id/accept`            | Assignee/authority accepts change |

### 23.5 Completion

| Method | Proposed path                                           | Purpose                                                                                               |
| ------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| POST   | `/api/v1/task-assignments/:id/completion-report/start`  | **Implemented:** assignee-only create/reuse of the canonical draft parent and exact snapshot identity |
| GET    | `/api/v1/task-assignments/:id/completion-report`        | **Implemented:** hydrate owner-scoped latest native report/facts                                      |
| POST   | `/api/v1/task-assignments/:id/completion-report`        | **Implemented:** save draft report through editor allowlist                                           |
| PUT    | `/api/v1/task-completion-reports/:id`                   | Update draft report                                                                                   |
| POST   | `/api/v1/task-completion-reports/:id/evidence`          | Attach/map evidence                                                                                   |
| POST   | `/api/v1/task-assignments/:id/completion-report/submit` | **Implemented:** submit native report for review after exact-snapshot acknowledgement                 |

### 23.6 Review and accomplishment

| Method | Proposed path                                              | Purpose                                                                                                                     |
| ------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/task-completion-reports/:reportId/review-package` | **Implemented:** read a submitted report through assigned-reviewer/org-admin access and an explicit privacy-safe editor DTO |
| POST   | `/api/v1/task-review-workflows/:id/observations`           | Save structured observations                                                                                                |
| POST   | `/api/v1/task-review-workflows/:id/finalize`               | Finalize governed review                                                                                                    |
| GET    | `/api/v1/users/:id/accomplishments`                        | Read authorized accomplishments                                                                                             |
| GET    | `/api/v1/accomplishments/:id`                              | Read accomplishment detail                                                                                                  |
| POST   | `/api/v1/accomplishments/:id/publication`                  | Create/update public-safe projection                                                                                        |
| POST   | `/api/v1/accomplishments/:id/correction`                   | Governance correction/supersession                                                                                          |

### 23.7 API response rules

- Return readiness blockers as stable machine codes + human message.
- Return current/effective version ids.
- Completion Report start is assignee-only and locks the current assignment context before creating
  or reusing one assignment-scoped draft `task_submissions` parent. It returns only the parent ID,
  task/assignee identity, exact assignment snapshot identity, contract version ID, status and replay
  marker. Start does not require acknowledgement; submit-for-review remains the acknowledgement and
  clarification gate. It must not synthesize a compatibility parent from an unrelated legacy task.
- Native Completion Report Draft saves remain allowed for incomplete coverage, but submit-for-review
  must pin an acknowledged assignment snapshot. Pending/re-acknowledgement returns
  `TVA.COMPLETION.ASSIGNMENT_ACKNOWLEDGEMENT_REQUIRED`; an unresolved clarification returns
  `TVA.COMPLETION.ASSIGNMENT_CLARIFICATION_UNRESOLVED`.
- Native Completion Report hydration is owner-scoped and returns the immutable report revision with
  its criterion, evidence-manifest, contributor-claim and evidence-mapping facts through an explicit
  `suar.task_completion_report_editor.v1` allowlist; no native report is `data: null`, not a
  synthesized legacy summary. Raw canonical payload, persistence foreign keys, retention/tombstone
  metadata and request hashes are never serialized by this read boundary; malformed canonical data
  fails closed.
- Native Completion Report editor responses must not expose contributor `outcomeData`; it is an
  internal persistence field and is excluded by the backend allowlist as well as the frontend
  projection. The resolved-brief cache identity must include the mutable acknowledgement state so
  a successful acknowledgement cannot reuse a cached pending submit gate.
- Native Completion Review Package reads are submitted-only. The query loads a minimal immutable
  access identity before hydrating facts, requires the report/task/assignment identity to remain
  exact, and delegates reviewer access to the Reviews composition boundary. The assignee may read
  their submitted package; other actors require an active reviewer assignment or approved
  organization owner/admin authority, and self-review is denied. The response uses
  `suar.task_completion_review_package_editor.v1` and an explicit allowlist: reviewer-facing report,
  criterion, evidence-availability, claim, mapping and contract fields only. Canonical payloads,
  request hashes, raw persistence foreign keys, URI/storage locators, retention/tombstone metadata,
  and unknown/private contract fields never cross the HTTP boundary.
- The native task-review Inertia surface must not duplicate that package payload. When the server
  marks `reviewPackageAvailable`, the page projection carries only review session, assignment/report
  identity and governed observation history; the reviewer panel fetches the package endpoint and
  fail-closes while it is loading, denied, malformed or unavailable. The frontend normalizer must
  independently recheck report/task/assignment identity and project only fields required for reviewer
  authoring: exact assignment snapshot/contract, report facts, criterion expected-versus-actual
  results, claim attribution and evidence availability. Legacy context remains a compatibility path
  only when the native marker is absent.
- Native observation authoring must authorize against active reviewer assignments on the pinned review
  session whenever native assignment rows exist. A legacy workflow reviewer row cannot override a
  missing or waived native assignment, and the native assignment role is authoritative when the two
  sources disagree; legacy authorization is compatibility-only for sessions with no native
  assignment rows.
- Reject stale update with version conflict.
- Never silently merge material contract changes.
- Public endpoints return only public projection.
- Internal evidence URLs must not leak into unauthorized response.
- Profile/search responses include provenance summary, not raw restricted snapshot.

## 24. Permissions And Responsibilities

| Action                             |                    Creator |                    Assignee |                     Project Manager |                  Reviewer |          Org Admin |     System/Governance |
| ---------------------------------- | -------------------------: | --------------------------: | ----------------------------------: | ------------------------: | -----------------: | --------------------: |
| Save Draft                         |  Allowed by project policy |          No, unless creator |                             Allowed |                        No |    Policy override |            Audit only |
| Edit Specification pre-assignment  |                    Allowed |             Comment/clarify |                             Allowed |                        No |    Policy override |            Audit only |
| Confirm Task Contract              |      Allowed if authorized |                          No |                             Allowed |                        No |    Policy override |                    No |
| Assign                             |      If permission + gates |                          No |                             Allowed |                        No |    Policy override |                    No |
| Acknowledge assignment             |                         No |              Own assignment |                                  No |                        No |                 No |                    No |
| Submit Completion Report           |                         No | Own assignment/contribution |                                  No |                        No |                 No |                    No |
| Verify claim                       | No if conflict/self-review |              No self-review |                If eligible reviewer |               If assigned | Eligible by policy |            Escalation |
| Publish public-safe accomplishment |           Policy-dependent | Own profile consent/control | Policy approval for restricted info | Wording confirmation only | Policy enforcement | Correction/revocation |

The `Save Draft` row above refers to Task authoring ownership. Native Completion Report draft save
is a separate owner-scoped action: the assignee may save their own report draft, but cannot create a
synthetic legacy `task_submissions` parent or impersonate another reporter.
| Resolve dispute | No | Participant | Context provider | Participant | According to governance | Final authority |

Permission implementation phải follow organization/project boundary hiện có. Bảng này là target business policy, không thay route middleware hiện tại cho tới khi implemented.

## 25. AI Assistance Boundary

### 25.1 AI may

- map pasted/uploaded content into specification sections;
- suggest structured fields;
- identify vague language;
- identify likely missing edge cases/NFR;
- propose acceptance/evidence checklists;
- summarize a resolved brief;
- draft a public-safe accomplishment statement;
- suggest capability candidates;
- compare versions và highlight differences.

### 25.2 AI must not

- declare Task ready without deterministic gates;
- invent missing requirements;
- infer ownership as verified fact;
- create verified accomplishment without final human-governed review;
- expose restricted source content;
- silently change contract;
- copy target level into Profile;
- resolve dispute autonomously unless a separately approved governance policy permits advisory use.

### 25.3 Confirmation

Mọi AI-generated critical value phải lưu:

- generation source/context;
- confidence nếu available;
- confirmed_by/confirmed_at;
- edited value;
- model/tool metadata theo audit policy nếu cần.

## 26. Functional Requirements

| ID         | Requirement                                                                                                                                                | Priority | Verification                   |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------: | ------------------------------ |
| FR-TVA-001 | System shall allow authorized users to save a Draft with project and title only                                                                            |     Must | Integration + E2E              |
| FR-TVA-002 | System shall block direct assignment until Assignment-ready gates pass                                                                                     |     Must | Domain + integration + E2E     |
| FR-TVA-003 | System shall store a rich, self-contained Task Specification version                                                                                       |     Must | Integration                    |
| FR-TVA-004 | System shall store a structured Work Contract linked to the specification version                                                                          |     Must | Contract + integration         |
| FR-TVA-005 | System shall store an Evidence Contract for profile-eligible work                                                                                          |     Must | Contract + integration         |
| FR-TVA-006 | System shall treat external links/files as Supporting References unless allowed content is captured and versioned inside Suar as Specification or Evidence |     Must | Integration + UI               |
| FR-TVA-007 | System shall detect and block critical “link-only” task information                                                                                        |     Must | Domain + component/E2E         |
| FR-TVA-008 | System shall resolve and display pinned Project/Work Package context with Task-specific data                                                               |     Must | Integration + E2E              |
| FR-TVA-009 | System shall allow task-type templates without forcing irrelevant skill categories                                                                         |     Must | Domain + integration           |
| FR-TVA-010 | System shall represent minimum, target and assessment ceiling independently                                                                                |     Must | Contract + integration         |
| FR-TVA-011 | System shall produce explicit readiness blockers and warnings                                                                                              |     Must | Unit + API contract            |
| FR-TVA-012 | System shall snapshot the full resolved Task Contract at assignment                                                                                        |     Must | Integration                    |
| FR-TVA-013 | System shall require assignee acknowledgement for the assigned contract version                                                                            |     Must | Integration + E2E              |
| FR-TVA-014 | System shall version material changes and require re-acknowledgement                                                                                       |     Must | Domain + integration           |
| FR-TVA-015 | System shall collect a Completion Report describing actual work and contribution                                                                           |     Must | Contract + E2E                 |
| FR-TVA-016 | System shall map Evidence Items to deliverables and acceptance criteria                                                                                    |     Must | Integration                    |
| FR-TVA-017 | System shall support per-contributor claims for collaborative work                                                                                         |     Must | Integration                    |
| FR-TVA-018 | System shall let reviewers confirm/refine/narrow/reject individual claims with rationale                                                                   |     Must | Integration + E2E              |
| FR-TVA-019 | System shall store capability observations with evidence, context, ceiling and confidence                                                                  |     Must | Contract + integration         |
| FR-TVA-020 | System shall freeze profile projection while a relevant dispute is unresolved                                                                              |     Must | Integration + E2E              |
| FR-TVA-021 | System shall create Verified Work Accomplishment only after governance gates pass                                                                          |     Must | Domain + integration           |
| FR-TVA-022 | System shall preserve immutable provenance for every accomplishment                                                                                        |     Must | Integration + audit test       |
| FR-TVA-023 | System shall display verified accomplishments as a primary Profile section                                                                                 |     Must | Query + component + E2E        |
| FR-TVA-024 | System shall search/filter talent by verified work semantics and context                                                                                   |     Must | Search integration + E2E       |
| FR-TVA-025 | System shall prevent restricted accomplishment/evidence from leaking through search                                                                        |     Must | Security integration           |
| FR-TVA-026 | System shall support correction, supersession and revocation without deleting audit history                                                                |     Must | Domain + integration           |
| FR-TVA-027 | System shall distinguish self-declared/imported work from verified accomplishment                                                                          |     Must | Query + UI                     |
| FR-TVA-028 | System shall mark retrospective reconstruction and apply separate confidence policy                                                                        |   Should | Integration                    |
| FR-TVA-029 | System shall render critical image/diagram information with required text summary                                                                          |   Should | Component + accessibility test |
| FR-TVA-030 | System shall offer paste/upload/template assistance without bypassing creator confirmation                                                                 |   Should | Component + E2E                |

## 27. Business Rules

| ID         | Rule                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| BR-TVA-001 | Title + external link may be saved as Draft but may not be directly assigned                                  |
| BR-TVA-002 | A Task is self-contained only when critical execution information is available inside the resolved Suar brief |
| BR-TVA-003 | External source availability must not be required for normal execution/review of an assigned Task             |
| BR-TVA-004 | Shared information may be inherited only from a pinned, visible Project/Work Package version                  |
| BR-TVA-005 | Missing/ambiguous critical fields block readiness regardless of description length                            |
| BR-TVA-006 | Evidence/profile governance requires its evidence and verifier plan before it may affect Profile; it never gates Assign or Done |
| BR-TVA-007 | Task requirements describe opportunity/expectation, not achievement                                           |
| BR-TVA-008 | Target level must never be copied directly to verified Profile state                                          |
| BR-TVA-009 | Assessment ceiling limits capability observation impact                                                       |
| BR-TVA-010 | Current Task edits must not rewrite a historical assignment/accomplishment                                    |
| BR-TVA-011 | Material change after assignment creates a new version and requires acknowledgement                           |
| BR-TVA-012 | A completion claim without verified ownership cannot become a verified accomplishment                         |
| BR-TVA-013 | Collaborative Task evidence must preserve per-user attribution                                                |
| BR-TVA-014 | Unresolved dispute freezes related accomplishment/profile signals                                             |
| BR-TVA-015 | Public projection cannot be broader than the verified internal claim                                          |
| BR-TVA-016 | Private/internal data cannot leak through search counts, snippets or explanations                             |
| BR-TVA-017 | Retrospective reconstruction must remain distinguishable from pre-work locked contract evidence               |
| BR-TVA-018 | No relevant capability is required solely to satisfy a global four-category quota                             |

## 28. Non-Functional Requirements

| ID          | Quality        | Requirement                                                                                                 | Verification                    |
| ----------- | -------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------- |
| NFR-TVA-001 | Traceability   | 100% verified accomplishments reference assignment, contract, completion and review provenance ids          | Data audit                      |
| NFR-TVA-002 | Integrity      | Historical accomplishment output is unchanged when mutable Task fields are edited                           | Integration regression          |
| NFR-TVA-003 | Authorization  | Every specification, evidence and accomplishment read enforces org/project/profile visibility               | Security integration            |
| NFR-TVA-004 | Explainability | Every readiness blocker and profile match explanation uses stable reason codes                              | Contract test                   |
| NFR-TVA-005 | Accessibility  | Critical rich content has a text-equivalent representation                                                  | Accessibility test/manual audit |
| NFR-TVA-006 | Privacy        | Restricted source/evidence fields never enter public search index                                           | Index audit                     |
| NFR-TVA-007 | Auditability   | Material version, acknowledgement, review and publication events are auditable                              | Audit integration               |
| NFR-TVA-008 | Resilience     | Loss of access to a Supporting Reference does not make the locked Task Contract unreadable                  | Integration/manual              |
| NFR-TVA-009 | Consistency    | Profile/search projections are rebuildable from immutable facts                                             | Rebuild test                    |
| NFR-TVA-010 | Usability      | UI shows blockers at field/section level and preserves draft data                                           | Component + E2E                 |
| NFR-TVA-011 | Performance    | Concrete p95 targets for authoring/readiness/profile/search must be benchmarked and approved before rollout | Performance plan                |
| NFR-TVA-012 | Retention      | Snapshot/evidence retention and deletion behavior follows approved data policy                              | Policy + integration            |

## 29. Acceptance Scenarios

### TC-TVA-001 — Save link-only Draft

Given creator has a Project  
When creator enters title and an external link  
Then Draft is saved  
And readiness shows missing specification/contract blockers  
And no active assignment or profile eligibility is created.

### TC-TVA-002 — Block link-only assignment

Given a Draft says only “Implement API, see Notion”  
When creator attempts direct assignment  
Then assignment is rejected  
And missing scope, deliverables, acceptance and evidence are listed.

### TC-TVA-003 — Complete docs pasted into Suar

Given creator has detailed external documentation  
When creator pastes/uploads relevant content, confirms the structured contract and resolves readiness  
Then Task becomes Assignment-ready  
And the external link remains a Supporting Reference.

### TC-TVA-004 — Inaccessible external source

Given the Supporting Reference requires unavailable authentication  
And the resolved Task Brief is self-contained  
When assignee opens the Task  
Then all execution-critical content remains available  
And only the reference is marked inaccessible.

### TC-TVA-005 — Critical diagram without text

Given a required failure flow exists only in an image  
When readiness is checked  
Then the system requests a caption/text summary before Assignment-ready.

### TC-TVA-006 — Project inheritance

Given security and Definition of Done are active in a pinned Project Context  
When creator builds a Task  
Then resolved brief includes them without manual copy  
And assignment snapshot pins the exact context version.

### TC-TVA-007 — No artificial skill mix

Given an API design Task only observes Engineering and Technology capabilities  
When creator confirms Evidence Contract  
Then readiness does not require unrelated Soft Skill or Delivery entries.

### TC-TVA-008 — Material change

Given assignee acknowledged contract version 2  
When creator adds implementation scope to a design-only Task  
Then version 3 is created  
And work enters change-pending-acknowledgement  
And reviewer retains access to version 2 history.

### TC-TVA-009 — Assignee completes without a report

Given A has performed the Task  
When A changes Task status to done without a Completion Report/evidence  
Then the status change succeeds and B receives the acceptance flow  
And no Verified Work Accomplishment is created until optional governance/review is complete.

### TC-TVA-010 — Optional governance after Done

Given a Task is already done  
When creator enables optional governance and starts a Completion Report  
Then the report/evidence may be saved and reviewed without changing or gating Task status.

### TC-TVA-011 — Reviewer B accepts or rejects

Given B is assigned as reviewer for A's Task  
When B reviews the creator-defined acceptance criteria and output  
Then B can accept or reject the work independently of optional report/evidence governance.

### TC-TVA-012 — Reviewer narrows claim

Given user claims primary ownership of API design and implementation  
When reviewer verifies implementation but finds design was led by another person  
Then reviewer narrows the verified claim  
And Profile never displays primary API design ownership.

### TC-TVA-013 — Dispute freeze

Given an accomplishment candidate is disputed  
When Profile projection runs  
Then related accomplishment/capability signals remain frozen until resolution.

### TC-TVA-014 — Historical immutability

Given a verified accomplishment was produced from contract version 4  
When current Task title/domain/scope are edited  
Then rebuilding Profile yields the same historical accomplishment provenance and statement.

### TC-TVA-015 — Recruiter finds API designer

Given a user has a public verified API design accomplishment  
When recruiter searches “API design” with primary-owner filter  
Then user can match based on accomplishment semantics  
And result explains the supporting verified work.

### TC-TVA-016 — Recruiter finds production debugger

Given a user has a verified production incident debugging accomplishment  
When recruiter filters production + incident response  
Then match uses action, environment, ownership and evidence confidence rather than title alone.

### TC-TVA-017 — Privacy-safe search

Given an accomplishment is internal/private  
When an external recruiter searches matching terms  
Then candidate, facet count, snippet and explanation do not reveal the restricted accomplishment.

### TC-TVA-018 — Public summary cannot inflate claim

Given verified claim says “contributed to API implementation”  
When user drafts public text “led API architecture”  
Then publication is rejected or requires correction to stay within verified scope.

### TC-TVA-019 — Retrospective reconstruction

Given a legacy Task lacked locked Evidence Contract  
When authorized users reconstruct it from artifacts/review  
Then accomplishment is marked retrospective  
And confidence/provenance shows the limitation.

### TC-TVA-020 — Supporting link removal

Given an external document is later deleted  
When reviewer opens the locked review package  
Then Task Contract and locally retained allowed evidence metadata remain readable  
And source unavailability is shown without erasing provenance.

## 30. Current Runtime Audit And Gap Map

### 30.1 Audit status

Các fact trong mục này được kiểm tra trên repository snapshot ngày 2026-08-01. Chúng mô tả current state, không phải target.

### 30.2 Task authoring

| Current Fact                                                                                                                                                                                                             | Evidence                                                                                 | Gap                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Primary task modal builds payload with title, description, status, project, task type, verification, assignment metadata, required skills, acceptance, context, role, domain/problem, stack, learning objectives và tags | `inertia/apps/user/modules/tasks/components/modals/create_task_store.svelte.ts`          | Payload không gửi nhiều rich Task fields đã có ở model                             |
| Current validation requires title, status, project, required skills và acceptance criteria                                                                                                                               | Cùng file trên                                                                           | Chưa gate problem, scope, deliverables, constraints, evidence, reviewer, ownership |
| Task model đã có expected deliverables, measurable outcomes, impact, environment, collaboration, autonomy và context fields                                                                                              | `app/modules/tasks/infra/models/task.ts`                                                 | UI chính chưa capture/render chúng thành một contract đầy đủ                       |
| Backend persistence đang enforce skill requirement mix theo canonical categories                                                                                                                                         | `app/modules/tasks/actions/commands/internal/create_task_transaction.ts` và domain rules | Ép category có thể tạo irrelevant capability requirements                          |
| Rich Task Readiness UI tồn tại ở standalone flow cũ nhưng primary create path dùng board modal                                                                                                                           | Task UI/controller audit                                                                 | Readiness không nằm trên primary authoring surface                                 |

### 30.3 Snapshot and provenance

| Current Fact                                                                                                                                              | Evidence                                                                                 | Gap                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Submitted assignment snapshot lưu title, status, verification method, acceptance, type, difficulty, expected deliverables, org/project và required skills | `app/modules/tasks/actions/commands/submit_task_submission_command.ts`                   | Thiếu business domain, problem, role, autonomy, collaboration, stack, tags, outcomes, impact, environment, complexity và full specification |
| Task versions hiện không đại diện full Task Contract                                                                                                      | Current task version/snapshot implementation                                             | Không đủ để chấm lại đúng historical context                                                                                                |
| Completed assignment profile source joins mutable `tasks` row                                                                                             | `app/modules/tasks/infra/repositories/read/completed_assignment_profile_fact_queries.ts` | Rebuild có thể rewrite historical context sau Task edit                                                                                     |

### 30.4 Completion and review

| Current Fact                                                        | Evidence                                                                       | Gap                                                                                                    |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Submission flow có package/evidence và mở review workflow           | `docs/01-business/features/task_workflow_and_submission.md` + runtime commands | Chưa có first-class Completion Report với actual ownership, decisions, deviations và criterion results |
| Review có session/workflow, scores, evidences và dispute governance | Review module current runtime                                                  | Review facts dùng cho work history còn nông; thiếu structured accomplishment claim/rationale/context   |
| Confirmed review kích hoạt profile aggregate refresh                | Review/user listeners and commands                                             | Trigger có, nhưng projection đích vẫn skill-centric                                                    |

### 30.5 Profile and search

| Current Fact                                                                                                            | Evidence                                                                      | Gap                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `BuildUserWorkHistoryCommand` materialize task/domain/role/stack/outcome/quality/evidence data                          | `app/modules/users/actions/commands/build_user_work_history_command.ts`       | Nguồn assignment context hiện đến từ mutable Task; review facts thiếu claim/rationale                                             |
| `GetUserWorkHistoryQuery` hiện merge memberships với demonstrated/verified work, có self/public filtering và pagination | `app/modules/users/actions/queries/talent/get_user_work_history_query.ts`     | Public snapshot vẫn chủ yếu dùng legacy `work_highlights`; narrative, evidence/provenance và full public projection chưa hoàn tất |
| Profile snapshot có `work_highlights` với task metadata cơ bản                                                          | `app/modules/users/actions/commands/publish_user_profile_snapshot_command.ts` | Không có verified accomplishment narrative, output, outcome, evidence/provenance                                                  |
| Public snapshot UI chủ yếu render title, completion date và quality                                                     | `inertia/apps/user/modules/profile/public_snapshot.svelte`                    | Recruiter không biết user thực sự đã làm gì và ownership nào                                                                      |
| Talent filters có một số task/domain/problem/stack fields                                                               | Search/profile runtime                                                        | Matching chưa có first-class action/object/ownership/accomplishment confidence                                                    |

### 30.6 Test coverage

Current task/profile behavior matrices chủ yếu cover CRUD, project boundary, status, skill validation, submission, snapshot access và visibility.

Missing target coverage:

- self-contained specification;
- relevant-document parity;
- link-only assignment blocker;
- rich media text-equivalent;
- assignment/evidence readiness;
- full snapshot provenance;
- material change acknowledgement;
- completion claims;
- verified accomplishment;
- accomplishment-first Profile;
- action/object/ownership search;
- restricted accomplishment index leakage.

Relevant matrices:

- `docs/08-testing/behavior-matrices/tasks/create-update.md`
- `docs/08-testing/behavior-matrices/tasks/submission.md`
- `docs/08-testing/behavior-matrices/reviews/task-review.md`
- `docs/08-testing/behavior-matrices/users/profile-snapshot.md`

### 30.7 Documentation caveats

- Root `Suar_Project_Knowledge_Base_EN_v5.md` chứa conflict markers nên chỉ dùng như historical input đã được đối chiếu.
- Path `Suar_Project_Knowledge_Base_VI_4.md` được cung cấp nhưng không tồn tại trong repository snapshot.
- `Suar_Capability_Model_v6_VI.md` mô tả capability/profile depth tốt nhưng chưa có first-class Verified Work Accomplishment.
- FYP report mô tả evidence-linked profile chain nhưng implementation hiện chưa hiện thực đầy đủ accomplishment presentation/provenance.

## 31. Migration And Rollout Plan

### Phase 0 — Approve semantics before code

Deliverables:

- phê duyệt decisions/open questions trong spec;
- chốt terminology;
- chốt Evidence-enabled versus Operational-only policy;
- chốt task type/template taxonomy;
- chốt privacy/publication policy;
- chốt logical event/provenance model;
- chuyển FR/BR/TC cần thiết vào canonical SRS/test matrices.

Exit criteria:

- Product, engineering, design và QA đồng ý cùng một contract;
- không còn dùng “work history”, “evidence”, “skill” và “accomplishment” lẫn nghĩa.

### Phase 1 — Provenance and integrity foundation

Implement:

- full specification/contract versioning;
- full assignment/submission snapshots;
- immutable source readers;
- profile facts đọc snapshot thay vì current Task;
- version conflict/change audit;
- privacy classifications.

Exit criteria:

- Editing current Task không làm thay đổi historical projection.
- Snapshot chứa đủ data để review và reconstruct.
- Rebuild tests pass.

Không bắt đầu bằng Profile UI trước Phase 1. Nếu nguồn dữ liệu chưa đáng tin, giao diện đẹp chỉ khuếch đại claim sai.

### Phase 2 — Project Context, Work Package and authoring

Implement:

- versioned Project Context;
- optional Work Package;
- rich Task Specification;
- structured Work/Evidence Contract;
- templates/inheritance/resolved brief;
- primary modal/page replacement;
- deterministic readiness;
- removal of forced irrelevant category mix;
- creator confirmation.

Exit criteria:

- Link-only Task save được ở Draft nhưng không Assign;
- creator có thể reuse shared context;
- assignee xem resolved brief tự chứa;
- target behavior matrices pass.

### Phase 3 — Assignment acknowledgement and Completion Report

Implement:

- full assignment snapshot;
- assignee acknowledgement/clarification;
- material change workflow;
- Completion Report;
- criterion/evidence mapping;
- per-contributor claims.

Exit criteria:

- Review package phân biệt expected versus actual;
- collaborative attribution hoạt động;
- material change không overwrite lịch sử.

### Phase 4 — Review observations and accomplishment projection

Implement:

- structured review observations;
- claim/ownership review;
- capability observation context;
- Verified Work Accomplishment lifecycle;
- dispute freeze/correction/supersession/revocation;
- public-safe projection.

Exit criteria:

- Accomplishment chỉ được tạo sau governed review;
- mỗi record truy vết đầy đủ;
- disputed claim không cập nhật Profile.

### Phase 5 — Accomplishment-first Profile

Implement:

- demonstrated work section;
- accomplishment card/detail;
- supporting capability context;
- profile snapshot schema vNext;
- owner privacy/publication controls;
- compatibility rendering cho legacy skill profile.

Exit criteria:

- Recruiter có thể xác định action, ownership, context, output và verification từ Profile;
- private source không bị lộ;
- self-declared/imported/verified được phân biệt.

### Phase 6 — Talent Search and matching

Implement:

- accomplishment search document;
- action/object/domain/ownership/scale facets;
- explainable ranking;
- recency/repetition/confidence;
- privacy-safe indexing;
- benchmark corpus gồm API design, database scaling và production debugging.

Exit criteria:

- Search acceptance scenarios pass;
- restricted data leakage tests pass;
- benchmark cho thấy verified work fit tốt hơn title/skill-only baseline.

### Phase 7 — Legacy backfill and controlled rollout

Implement:

- feature flags;
- dual read/dual projection period nếu cần;
- classify legacy records;
- high-confidence backfill;
- retrospective workflow cho phần còn lại;
- monitoring, correction và rollback plan.

Exit criteria:

- Không mất current profile data.
- Legacy data không bị gọi sai là pre-work verified accomplishment.
- Rollback không phá immutable facts đã tạo.

## 32. Legacy Data Policy

### 32.1 Existing Tasks

Không tự động đánh dấu Task cũ là Evidence-ready.

Classification:

| Class                     | Condition                                          | Treatment                                      |
| ------------------------- | -------------------------------------------------- | ---------------------------------------------- |
| Legacy operational        | Chỉ có title/description/status                    | Giữ history; không tạo verified accomplishment |
| Partially reconstructable | Có submission/review/evidence nhưng contract thiếu | Cho retrospective reconstruction               |
| High-confidence candidate | Có đủ snapshot, evidence, review và attribution    | Backfill candidate, vẫn cần governance         |
| Ineligible                | Disputed, missing ownership hoặc evidence không đủ | Không project thành verified accomplishment    |

### 32.2 Existing skill/profile signals

- Không xóa hoặc hạ Profile đột ngột chỉ vì schema mới.
- Giữ source label hiện có.
- Chỉ gắn accomplishment support khi traceability đủ.
- Skill signal không có accomplishment backing vẫn hiển thị theo legacy/source class, không giả thành verified work.

### 32.3 Existing `user_work_history`

- Treat as projection/read model.
- Không dùng làm immutable source nếu row được dựng từ mutable Task.
- Rebuild mới phải dùng versioned assignment/completion/review facts.
- Backfill cần audit duplicate, privacy, ownership và current-task drift.

### 32.4 Retrospective confidence

Retrospective evidence cần phản ánh:

- contract được dựng sau thời điểm nào;
- source artifacts còn gì;
- reviewer có firsthand knowledge không;
- ownership được xác nhận bằng gì;
- phần nào chỉ là self-attested;
- confidence thấp hơn hoặc khác loại so với pre-work locked contract.

## 33. Product Metrics And Guardrails

### 33.1 Product success metrics

| Metric                                       | Why                                   |
| -------------------------------------------- | ------------------------------------- |
| Assignment-ready rate                        | Task được giao với contract đủ        |
| Clarification-before-start rate              | Suar phát hiện/sửa gap sớm            |
| Clarification-after-start rate               | Theo dõi ambiguity lọt qua gate       |
| Completion evidence coverage                 | Criterion có evidence mapping         |
| Verified claim rate                          | Candidate claims trở thành verified   |
| Claim correction/rejection rate              | Đo chất lượng creator/assignee claims |
| Accomplishments per active professional user | Profile value                         |
| Search success for work intents              | Recruiter tìm đúng demonstrated work  |
| Profile-to-evidence drill-down rate          | Người xem quan tâm proof              |
| Repeated-capability evidence rate            | Độ sâu, không chỉ một lần             |

### 33.2 Friction guardrails

Không chỉ tối ưu “time to create Task”. Cần tách:

- time spent typing/copying;
- time spent reading/thinking;
- number of inherited fields;
- number of irrelevant required fields;
- draft abandonment;
- readiness resolution time;
- clarification saved after assignment;
- template reuse.

Mục tiêu là giảm typing/repetition nhưng không làm mất active comprehension.

### 33.3 Trust guardrails

- public claim correction rate;
- dispute rate;
- ownership conflict rate;
- source/evidence unavailable rate;
- private index leak incidents;
- historical rebuild drift;
- reviewer concentration/reciprocity anomalies.

## 34. Risks And Trade-offs

| ID    | Risk                                    | Impact                 | Mitigation                                                                   |
| ----- | --------------------------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| R-001 | Creator ghét form dài                   | Adoption thấp          | Inheritance, templates, paste/upload, conditional sections; giữ confirmation |
| R-002 | Creator copy docs nhưng không đọc       | False completeness     | Active review, restatement, readiness warnings, assignee acknowledgement     |
| R-003 | Duplicate content diverges              | Chấm sai version       | Suar contract authoritative, version/change control, pinned context          |
| R-004 | Project Context quá lớn                 | Resolved brief khó đọc | Relevant pinning, section routing, task-type templates                       |
| R-005 | AI invents missing details              | Unsafe contract        | AI draft only, explicit confirmation, deterministic gates                    |
| R-006 | Too many fields become taxonomy prison  | Irrelevant data        | Conditional schema, custom sections, no four-category quota                  |
| R-007 | Evidence leaks confidential information | Legal/trust harm       | Classification, redaction, separate public projection, index controls        |
| R-008 | Reviewer rubber-stamps claims           | Weak profile trust     | Rationale/evidence requirement, credibility, anomaly detection               |
| R-009 | Collaborative work overclaims ownership | Misleading Profile     | Per-user claims and attribution review                                       |
| R-010 | Legacy backfill inflates history        | Credibility loss       | Retrospective labels, confidence policy, no automatic blanket migration      |
| R-011 | Profile becomes too verbose             | Recruiter cannot scan  | Concise cards + structured filters + drill-down                              |
| R-012 | Accomplishment taxonomy fragments       | Search quality poor    | Canonical action/object ontology + aliases + governance                      |
| R-013 | Full snapshot storage grows quickly     | Cost/retention risk    | Deduplication/version hashes, retention policy, selective binary storage     |
| R-014 | Material change workflow slows delivery | Teams bypass Suar      | Clear change classes; only material changes require re-ack                   |

## 35. Open Product Decisions

| ID    | Question                                                      | Recommended direction                                     | Owner                 |
| ----- | ------------------------------------------------------------- | --------------------------------------------------------- | --------------------- |
| O-001 | Có cho Operational-only Task không?                           | Có, explicit opt-out; không Profile impact                | Product               |
| O-002 | Evidence-enabled có mặc định không?                           | Có với professional work                                  | Product               |
| O-003 | Task nào bắt buộc Work Package?                               | Không bắt buộc; dùng khi shared feature context           | Product/Design        |
| O-004 | Creator và assignee có phải cùng confirm mọi material change? | Có                                                        | Product/Governance    |
| O-005 | Có cần second reviewer cho mọi accomplishment?                | Theo risk/ceiling; không hard-code một rule cho mọi Task  | Governance            |
| O-006 | Public accomplishment do user hay org phê duyệt?              | User controls publication; org controls disclosure policy | Product/Legal         |
| O-007 | Retrospective evidence tối đa ảnh hưởng Profile bao nhiêu?    | Separate confidence/weight policy                         | Capability/Governance |
| O-008 | Rich content binary retention ra sao?                         | Data-class based; cần security/ops spec                   | Security/Operations   |
| O-009 | Canonical action/object taxonomy owner là ai?                 | Product + search/capability governance                    | Product/Search        |
| O-010 | Exact performance SLO                                         | Benchmark trước khi phê duyệt                             | Engineering           |

## 36. Requirements Traceability

| Product Need                       | Decisions    | Requirements              | Acceptance Scenarios | Target Area                   |
| ---------------------------------- | ------------ | ------------------------- | -------------------- | ----------------------------- |
| Task tự chứa, không phụ thuộc link | D-001, D-003 | FR-TVA-002, 003, 006, 007 | TC-TVA-001–005       | Authoring/readiness           |
| Đầy đủ ngang phần docs liên quan   | D-002, D-006 | FR-TVA-003, 004, 008, 029 | TC-TVA-003, 005, 006 | Specification/inheritance     |
| Ép creator đọc và hiểu lại         | D-004, D-005 | FR-TVA-011, 030           | TC-TVA-002, 003      | Confirmation UX               |
| Giảm nhập lặp                      | D-005, D-007 | FR-TVA-008, 009, 030      | TC-TVA-006, 007      | Project/Work Package          |
| Historical truth không đổi         | D-012        | FR-TVA-012–014, 022       | TC-TVA-008, 014, 020 | Versioning/provenance         |
| Actual work thành proof            | D-008, D-009 | FR-TVA-015–021            | TC-TVA-009–013       | Completion/review             |
| Profile chứng minh việc đã làm     | D-010, D-011 | FR-TVA-021–024, 027       | TC-TVA-012, 015, 016 | Accomplishment/profile/search |
| Privacy-safe proof                 | D-012        | FR-TVA-025, 026           | TC-TVA-017, 018, 020 | Privacy/governance            |
| Legacy migration công bằng         | P-004        | FR-TVA-028                | TC-TVA-019           | Migration                     |

## 37. Definition Of Done For The Product Change

Spec implementation không được coi là complete chỉ vì tạo thêm fields hoặc Profile card.

Done khi:

- [ ] Canonical requirements và business rules đã được promote.
- [ ] Primary Task create/edit flow dùng Complete Specification + structured contract.
- [ ] Link-only Task không thể bypass assignment readiness.
- [ ] Project/Work Package inheritance giảm duplicate entry.
- [ ] Irrelevant four-category requirement không còn là global blocker.
- [ ] Full assignment snapshot và version provenance hoạt động.
- [ ] Assignee acknowledgement/material change flow hoạt động.
- [ ] Completion Report phân biệt expected và actual.
- [ ] Evidence map tới criterion/deliverable.
- [ ] Review xác minh claim, ownership và capability observation.
- [ ] Dispute freeze/correction/supersession hoạt động.
- [ ] Verified Work Accomplishment là canonical entity.
- [ ] Profile hiển thị demonstrated work trước skill analytics.
- [ ] Talent Search tìm theo action/object/context/ownership.
- [ ] Privacy-safe public projection và index isolation pass.
- [ ] Legacy data được label/backfill đúng.
- [ ] Unit, integration, contract, component, E2E, security và rebuild tests pass.
- [ ] Diagrams/data/API docs được cập nhật sau implementation.
- [ ] Metrics và rollback plan sẵn sàng.

## 38. Documentation Promotion Plan

File này ở `docs/superpowers/specs` nên là target design, không phải canonical runtime doc.

Sau khi product approval:

| Concern                                          | Promotion destination                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------ |
| Product positioning/principles                   | `docs/01-business/capability-model-and-product-positioning.md`                 |
| Task/review/profile feature narrative            | `docs/01-business/features/*`                                                  |
| Functional requirements/business rules/use cases | `docs/02-requirements/*`                                                       |
| Architecture/runtime boundaries                  | `docs/03-architecture/*`                                                       |
| UX/screens                                       | `docs/04-design/*`                                                             |
| API contract                                     | `docs/05-api/*` và `docs/06-data/api-specification.md` theo taxonomy hiện hành |
| Data model                                       | `docs/06-data/database-design-erd-data-dictionary.md`                          |
| Privacy/access                                   | `docs/07-security/*`                                                           |
| Tests                                            | `docs/08-testing/*`                                                            |
| Rollout/risk                                     | `docs/10-project-management/*`                                                 |
| Diagrams                                         | `docs/11-diagrams/*`                                                           |
| Source/gap audit                                 | `docs/12-evidence/*`                                                           |

Chỉ promote current behavior sau khi code/tests chứng minh implementation.

## 39. Related Sources

### Current canonical/supporting docs

- `docs/01-business/capability-model-and-product-positioning.md`
- `docs/01-business/features/task_workflow_and_submission.md`
- `docs/01-business/features/profile_pipeline_and_marketplace.md`
- `docs/01-business/features/organization_and_project_workspace.md`
- `docs/06-data/database-design-erd-data-dictionary.md`
- `docs/08-testing/behavior-matrices/tasks/create-update.md`
- `docs/08-testing/behavior-matrices/tasks/submission.md`
- `docs/08-testing/behavior-matrices/reviews/task-review.md`
- `docs/08-testing/behavior-matrices/users/profile-snapshot.md`
- `docs/12-evidence/working-document-promotion-policy.md`
- `docs/DOCUMENTATION_WRITING_STANDARD_FOR_AI.md`

### Historical inputs

- `Suar_Capability_Model_v6_VI.md`
- `Suar_Project_Knowledge_Base_EN_v5.md` — contains unresolved conflict markers; historical input only
- `/home/tranngocduyet/Projects/doantotnghiep/report/COMP1682 - Final Year Project.pdf`

### Runtime evidence anchors

- `inertia/apps/user/modules/tasks/components/modals/create_task_modal.svelte`
- `inertia/apps/user/modules/tasks/components/modals/create_task_store.svelte.ts`
- `app/modules/tasks/actions/dtos/request/create_task_dto.ts`
- `app/modules/tasks/actions/commands/create_task_command.ts`
- `app/modules/tasks/actions/commands/internal/create_task_transaction.ts`
- `app/modules/tasks/actions/commands/submit_task_submission_command.ts`
- `app/modules/tasks/infra/models/task.ts`
- `app/modules/tasks/infra/models/task_assignment_snapshot.ts`
- `app/modules/tasks/infra/repositories/read/completed_assignment_profile_fact_queries.ts`
- `app/modules/users/actions/commands/build_user_work_history_command.ts`
- `app/modules/users/actions/commands/publish_user_profile_snapshot_command.ts`
- `app/modules/users/actions/queries/get_user_work_history_query.ts`
- `inertia/apps/user/modules/profile/public_snapshot.svelte`
- Corresponding review, profile, search and behavior tests.

## Appendix A — Default Evidence-enabled Task Template

### A.1 Overview

- Project:
- Work Package:
- Title:
- Task type:
- Assignee:
- Due date:

### A.2 Summary

Giải thích ngắn Task này là gì và tại sao tồn tại.

### A.3 Problem And Desired Outcome

- Problem:
- Affected users/system:
- Desired outcome:
- Expected impact:

### A.4 Complete Specification

- Background:
- Requirements:
- Quality requirements:
- Happy path:
- Failure/alternate paths:
- Edge cases:
- Constraints:
- Dependencies:
- Relevant images/diagrams/tables with text explanation:

### A.5 Work Contract

- Action:
- Object:
- Scope:
- Out of scope:
- Deliverables:
- Acceptance criteria:
- Role:
- Ownership:
- Autonomy:
- Collaboration:
- Environment:
- Complexity:

### A.6 Evidence Contract

- Evidence requirements:
- Evidence-to-criterion map:
- Verification method:
- Reviewer/verifier:
- Capabilities:
- Observable behaviours:
- Minimum/target/assessment ceiling:
- Profile eligibility:
- Privacy classification:

### A.7 Supporting References

- Reference:
- Relation:
- Relevant section:
- Access note:

### A.8 Creator Confirmation

> Tôi đã đọc và xác nhận resolved Task Brief chứa đủ thông tin để assignee thực hiện và reviewer nghiệm thu. Completion Report/evidence chỉ được dùng nếu Task bật governance tùy chọn.

## Appendix B — Creator Completeness Checklist

- [ ] Assignee không phải mở external link mới biết phải làm gì.
- [ ] Background đủ để hiểu lý do.
- [ ] Action và object cụ thể.
- [ ] Scope/out-of-scope rõ.
- [ ] Deliverables có format/location kỳ vọng.
- [ ] Acceptance criteria kiểm chứng được.
- [ ] Edge cases/failure paths quan trọng đã có.
- [ ] NFR quan trọng đã có context/metric.
- [ ] Constraints và dependencies có owner/state.
- [ ] Role, ownership và autonomy rõ.
- [ ] Critical image/diagram có text explanation.
- [ ] Evidence requirement map tới acceptance.
- [ ] Reviewer/verifier hợp lệ.
- [ ] Chỉ capability quan sát được mới được chọn.
- [ ] Minimum, target và ceiling không bị đánh đồng.
- [ ] Privacy classification đúng.
- [ ] Resolved preview không có contradiction.
- [ ] Creator đã đọc và confirm version.

## Appendix C — Reviewer Checklist

- [ ] Đang review đúng contract version.
- [ ] Completion Report mô tả actual work.
- [ ] Deliverables có thể truy cập theo quyền.
- [ ] Mỗi criterion có result/evidence.
- [ ] Deviations được giải thích/phê duyệt.
- [ ] Contribution và ownership được xác minh.
- [ ] Claim wording không rộng hơn evidence.
- [ ] Capability observation có behaviour + context + evidence.
- [ ] Assigned level không vượt ceiling.
- [ ] Confidence phản ánh evidence/reviewer/context.
- [ ] Public-safe wording không lộ restricted data.
- [ ] Không còn unresolved dispute trước projection.

## Appendix D — Reader Validation Questions

Một reader mới phải trả lời đúng các câu sau chỉ từ spec:

1. Vì sao title + external link không đủ để Assign?
2. “Đầy đủ ngang docs” có bắt copy toàn bộ tài liệu không?
3. Project Context, Work Package, Task Specification và Task Contract khác nhau thế nào?
4. Vì sao Task có cả rich specification và structured contract?
5. Assignment-ready khác Evidence-ready thế nào?
6. Khi nào Task requirement trở thành verified accomplishment?
7. Material change sau assignment được xử lý ra sao?
8. Profile phải hiển thị gì để chứng minh user đã thiết kế API?
9. Search tìm người debug production bằng dữ liệu nào?
10. Vì sao current `user_work_history` chưa đủ làm canonical evidence source?
11. External docs có authentication được xử lý thế nào?
12. Dữ liệu private được ngăn rò rỉ qua Profile/Search ra sao?

## Appendix E — Short Product Statement

> Suar yêu cầu công việc được diễn đạt đầy đủ và tự chứa trong hệ thống, không phải để tạo thêm thủ tục, mà để biến việc giao Task thành một lần kiểm tra sự hiểu biết. Project Context, Work Package, template và authoring assistance giảm phần copy lặp; creator vẫn phải đọc, làm rõ và xác nhận. Khi công việc hoàn thành, Completion Report, evidence và governed review biến phần đóng góp thực tế thành Verified Work Accomplishment. Profile và Talent Search dùng accomplishment đó để chứng minh một người đã làm được việc gì, trong context và mức ownership nào.
