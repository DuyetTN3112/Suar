# Diagram Guide

| Field           | Value                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------ |
| Status          | Active                                                                                                             |
| Audience        | Bất kỳ ai cần nhìn hình là hiểu nhanh: new joiner, manager, developer, tester, DevOps                              |
| Purpose         | Định nghĩa diagram level cao/thấp, cách chọn diagram đúng, và quy tắc để diagram luôn dễ hiểu trong một khung nhìn |
| Source of Truth | `docs/11-diagrams/**/*.{mmd,bpmn,puml,dmn}`, verified code/schema/routes, documentation standards                  |
| Review Cycle    | Khi thêm diagram mới, đổi taxonomy diagram, module boundary, hoặc scope capability                                 |
| Owner           | Engineering                                                                                                        |
| Stale Risk      | Cao                                                                                                                |

Normative rules: [STANDARDS.md](STANDARDS.md). Narrative continuity:
[NARRATIVE-MAP.md](NARRATIVE-MAP.md). Rebuild and capability coverage:
[TRACEABILITY.md](TRACEABILITY.md).

## Main Principle

Diagram tồn tại để giúp người đọc hiểu nhanh hơn text.

Trong hệ thống này, diagram còn phải làm thêm một việc:

- giúp người ngoài dự án hiểu hệ thống ngay cả khi họ không được xem source code

Nếu người đọc phải:

- zoom nhiều lần
- kéo ngang dọc liên tục
- đoán level chi tiết
- đọc thêm 3 file khác mới hiểu hình đầu tiên

thì diagram đó thất bại.

## Nếu Diagram Và Docs Có Vẻ Lệch Nhau

Ưu tiên đọc theo thứ tự:

1. docs business/API/data đã được audit gần nhất
2. diagram có caveat hoặc runtime note ngay trong file
3. code/schema nếu bạn đang ở trong repo

Lý do:

- physical inventory chỉ liệt kê bảng đang phục vụ capability hiện hành
- shape đã bị rút khỏi sản phẩm phải biến mất khỏi diagram, không giữ làm “legacy appendix”
- compatibility field còn được runtime đọc/ghi có thể xuất hiện nhưng phải ghi rõ vai trò phụ
- `System Admin` và `User` là hai principal ở hai security realm; không vẽ một User cộng dồn System/Organization/Project role. Current shared `auth.user`/`users.system_role` transport phải được gắn nhãn `Partial migration debt`, không được trình bày như mô hình quyền đích
- `/org/disputes`, `/reviews/pending` và các review/history page cũ đã bị rút khỏi product; chúng không được giữ như legacy flow
- `/org/tasks*` là compatibility redirect vào Project Task Board, ngoại trừ workflow configuration/application surfaces được gọi đúng tên

## Điều Phải Biết Ngay

Toàn bộ diagram source đang sống dưới:

- `docs/11-diagrams/`

Nếu bạn còn thấy doc nào trỏ sang thư mục sơ đồ cũ ngoài `docs/11-diagrams/`, ưu tiên path trong `docs/11-diagrams/`.

### Cấu Trúc UML Activity Theo Domain

```text
Action/  # path tương thích; semantic family chính thức là UML Activity
├── 01-task-management/
├── 02-marketplace/
├── 03-review/
├── 04-project-delivery/
├── 05-organization/
├── 06-user-lifecycle/
├── 07-profile-skills/
├── 08-platform-support/
└── 09-search-observability/
```

Mỗi folder con chỉ chứa một nhóm UML Activity diagram liên quan. Riêng `01-task-management` đang dùng ba folder mức đọc dễ nhận biết: `overview`, `high-level`, `low-level`. Đọc theo đúng thứ tự đó.

Tên folder `Action/` được giữ để không làm gãy các path đã được trích dẫn rộng rãi; đây không phải một diagram type riêng của UML. Mỗi Activity diagram có source `.mmd` và preview `.png` cùng basename. Mở `Action/README.md` để xem gallery đầy đủ theo thứ tự overview → workflow → atomic detail khi cần.

Ví dụ thứ tự đọc nhóm task:

1. `Action/01-task-management/README.md`
2. `Action/01-task-management/overview/act_01_task_definition_overview.mmd`
3. `Action/01-task-management/overview/act_01_task_assignment_path_overview.mmd`
4. `Action/01-task-management/overview/act_01_task_operation_outcome_overview.mmd`
5. `Action/01-task-management/overview/act_01_task_cancellation_followup_overview.mmd`
6. `Action/01-task-management/high-level/act_01a_task_crud.mmd`
7. `Action/01-task-management/high-level/act_01b_task_workflow.mmd`
8. `Action/01-task-management/high-level/act_01c_task_assignment_rules.mmd`

### Cấu Trúc Các Loại Diagram Khác

Mọi type đều dùng cùng quy ước: folder type không chứa diagram source trực tiếp; folder con là domain/layer liên quan; bên trong domain, mọi cặp source/preview (`.mmd/.png`, `.bpmn/.png`, `.puml/.png`, hoặc `.dmn/.png`) nằm trong `overview`, `high-level`, hoặc `low-level`. Folder rỗng có thể bỏ. Tên folder thể hiện mức đọc; DFD vẫn giữ Level 0–3 chính thức trong header source.

| Type            | Folder con                                                                                                                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BPMN`          | `01-marketplace`, `02-task-delivery-review`, `03-review-dispute`                                                                                                                                            |
| `Architecture`  | `01-system-architecture`                                                                                                                                                                                    |
| `Class`         | `01-core`, `02-task`, `03-review`, `04-platform-support`, `05-search`                                                                                                                                       |
| `Component`     | `01-system-structure`                                                                                                                                                                                       |
| `Communication` | `01-business-workflows`                                                                                                                                                                                     |
| `DFD`           | `00-system-overview`, `01-project-delivery`, `02-task`, `03-marketplace`, `04-review`, `05-organization`, `06-platform-support`, `07-search-observability`                                                  |
| `Deployment`    | `01-reference-topology`                                                                                                                                                                                     |
| `DMN`           | `01-marketplace`, `02-review-governance`                                                                                                                                                                    |
| `ERD`           | `00-conceptual-overview`, `01-user-auth-skills`, `02-organization-project`, `03-task-marketplace`, `04-review-governance`, `05-platform-support`                                                            |
| `Package`       | `01-overview`, `02-presentation-application`, `03-application-rules`, `04-domain-infrastructure`, `05-crosscutting`                                                                                         |
| `RichPicture`   | `01-system-context`                                                                                                                                                                                         |
| `Sequence`      | `01-auth-user-lifecycle`, `02-task-management`, `03-marketplace`, `04-review`, `05-organization-membership`, `08-project-management`, `09-profile-skills`, `10-search-observability`, `11-platform-support` |
| `State`         | `01-task`, `02-review`, `05-organization-membership`, `07-user-lifecycle`, `08-project`, `09-platform-support`                                                                                              |
| `Usecase`       | `01-auth-organization`, `02-task-project`, `03-marketplace-review`, `04-permissions`, `05-search-observability`                                                                                             |
| `UserFlow`      | `01-onboarding`, `02-marketplace`, `03-profile`, `04-task-delivery`, `05-project-delivery`, `06-review`, `07-organization`, `08-platform-support`, `09-search`, `10-administration`                         |

Mỗi type có gallery render đầy đủ:

- [BPMN](BPMN/README.md)
- [Activity (`Action/` compatibility path)](Action/README.md)
- [Architecture](Architecture/README.md)
- [Class](Class/README.md)
- [Component](Component/README.md)
- [Communication](Communication/README.md)
- [DFD](DFD/README.md)
- [Deployment](Deployment/README.md)
- [DMN](DMN/README.md)
- [ERD](ERD/README.md)
- [Package](Package/README.md)
- [RichPicture](RichPicture/README.md)
- [Sequence](Sequence/README.md)
- [State](State/README.md)
- [Usecase](Usecase/README.md)
- [UserFlow](UserFlow/README.md)

Mermaid `flowchart` cũng đã được dùng rộng rãi, nhưng nó là cú pháp render chứ không tự quyết định ngữ nghĩa của diagram. Xem [Flowchart notation index](Flowchart/README.md) để phân biệt flowchart tổng quát với Activity, User Flow, DFD, Use Case và các family khác đang cùng dùng cú pháp này.

### Quy Tắc Report-Fit

- Diagram dùng trong report có thể đặt trên trang A4 portrait hoặc landscape. Chọn orientation theo nội dung, không ép mọi hình thành landscape.
- Tỉ lệ `width:height` mục tiêu từ `0.75:1` đến `4:1`. Hình ngoài khoảng này phải review và thường phải tách nhỏ.
- Tiêu chí quyết định: chữ, nhãn và flow còn đọc được khi ảnh được fit vào đúng một trang ở mức `100%`, không cần zoom hoặc kéo ngang/dọc.
- Flow chính có thể đi trái → phải (`LR`) hoặc trên → dưới (`TB`). Nhánh chi tiết có thể rẽ thành đường chữ L nằm ngang khi cách đó giảm dây chéo và giao cắt.
- Sequence diagram giữ lifeline dọc và thời gian từ trên xuống. Muốn giảm chiều ngang phải tách scenario, không bẻ lifeline thành chữ L.
- Không xoay PNG sau khi render. Mọi thay đổi orientation phải nằm trong source `.mmd`, rồi render lại ảnh cùng basename.

### Sự Thật Scope Hiện Hành

- System realm chỉ có System Admin application dưới `/admin/*`; nó không có Personal/Organization/Project switcher hoặc admin-mode toggle.
- User realm có Personal, Organization Management và từng Project Workspace. Organization Management chỉ chứa governance, people/access, settings, audit và project portfolio.
- Mỗi Project Workspace có bốn board: task, task review, assigner review và work environment review.
- Board thứ năm là `/admin/disputes` trong System realm. User-realm participant không truy cập board này.
- Board là primary surface: list/history/inbox/detail được thể hiện bằng lane, filter, drawer/modal hoặc card room, không phải page song song.
- Generic conversation/chat đã bị loại khỏi product diagram catalog. Không dựng lại family `Conversation`, `Messaging`, hoặc state machine message chung dưới nhãn legacy.
- `task_review_messages` và `sprint_reverse_review_messages` là record phản hồi có kiểu trong review workflow hiện hành, không phải generic chat.
- Elasticsearch là runtime dependency thật của search: trả candidate ids/ranking khi được bật; PostgreSQL vẫn hydrate, authorize, giữ source of truth và cung cấp fallback.
- Docker Compose reference topology hiện có diagram riêng; nó là cấu hình có trong repository, không phải bằng chứng production deployment. Elasticsearch, OAuth và Clawagent phải được đọc như external/configurable dependencies, không phải container nội bộ.
- Adonis Drive local/public đã cấu hình, nhưng attachment binary-write path và named app-storage volume chưa hoàn chỉnh; diagram phải giữ trạng thái `Partial` cho concern này.
- Project staffing, project role/skill governance, sprint planning/board, task submission evidence, skill rubric, và health/observability đều đã có diagram coverage riêng.
- Mỗi diagram phải phân biệt `Implemented`, `Partial`, hoặc `Planned`; không dùng capability model roadmap để khẳng định runtime đã tồn tại.

## Nếu Bạn Chỉ Có 5 Phút

Đừng mở ngẫu nhiên một file `.mmd`.

Đọc theo thứ tự này:

1. `Architecture/01-system-architecture/overview/arch_01_system.mmd`
2. `Architecture/01-system-architecture/high-level/arch_10_realm_workspace_board_topology.mmd`
3. `Component/01-system-structure/overview/component_01_modular_monolith.puml`
4. `Architecture/01-system-architecture/high-level/arch_02_layer.mmd`
5. `Architecture/01-system-architecture/low-level/arch_02b_composition_boundary.mmd`
6. `Package/01-overview/overview/pkg_01_overview.mmd`
7. Activity overview đúng domain đang quan tâm; chỉ khi cần mới xuống sequence/state/ERD detail

Mục tiêu là hiểu đúng mức cần thiết, không phải đọc hết sơ đồ.

Rule rất quan trọng:

- `level` là level của mục đích đọc và độ chi tiết của file
- `family` chỉ là họ diagram như Architecture, Action, Sequence, ERD, State
- không được suy máy móc rằng mọi file cùng một family đều cùng level

Ví dụ:

- `Action/*/overview/*_overview.mmd` thường là level cao
- `Action/02-marketplace/high-level/act_02b_marketplace_apply.mmd` là level thấp hơn
- `Architecture/01-system-architecture/low-level/arch_02a_request_flow.mmd` vẫn là overview kỹ thuật, không phải detail tận field/query
- `ERD/*/{overview,high-level,low-level}/*` trong repo này đa số đang gần physical slice, nên gần level thấp hơn nếu so với architecture overview

## Nếu Bạn Chỉ Có Folder Zip Mang Ra Ngoài

Nếu bạn không có source code và chỉ được mang `docs/` cùng `docs/11-diagrams/` ra ngoài, hãy coi pack dưới đây là đường sống tối thiểu:

1. `Architecture/01-system-architecture/overview/arch_01_system.mmd`
2. `Architecture/01-system-architecture/high-level/arch_02_layer.mmd`
3. `Package/01-overview/overview/pkg_01_overview.mmd`
4. `Action/*/overview/*_overview.mmd` đúng domain đang trình bày
5. `Sequence/*/{overview,high-level,low-level}/*` đúng đúng một scenario tiêu biểu của chapter
6. `ERD/*/{overview,high-level,low-level}/*` đúng đúng một domain slice của chapter

Rule rất thực dụng:

- mỗi chapter chỉ nên có `1` high-level diagram mở đầu
- sau đó thêm tối đa `1-2` low-level diagrams để chứng minh flow hoặc data
- nếu cần hơn mức đó chỉ để người đọc hiểu chapter, thường là chapter đang chọn sai hình hoặc diagram đang quá tải

## Starter Packs Theo Mục Tiêu

### Nếu bạn là người mới hoàn toàn

Mở đúng 4 file này trước:

1. `Architecture/01-system-architecture/overview/arch_01_system.mmd`
2. `Component/01-system-structure/overview/component_01_modular_monolith.puml`
3. `Architecture/01-system-architecture/high-level/arch_02_layer.mmd`
4. một `Action/*/overview/*_overview.mmd` đúng domain bạn quan tâm

Đừng mở ngay:

- `Class/*/{overview,high-level,low-level}/*`
- `Sequence/*/{overview,high-level,low-level}/*`
- `State/*/{overview,high-level,low-level}/*`
- `ERD/*/{overview,high-level,low-level}/*`

Lý do:

- các file đó không dành cho bước hiểu bức tranh đầu tiên
- mở quá sớm rất dễ khiến người mới tưởng hệ thống phức tạp hơn mức thật cần hiểu

### Nếu bạn đang viết report hoặc đồ án

Đi theo pack này:

1. `Architecture/01-system-architecture/overview/arch_01_system.mmd`
2. `Architecture/01-system-architecture/high-level/arch_02_layer.mmd`
3. `Package/01-overview/overview/pkg_01_overview.mmd`
4. `Action/*/overview/*_overview.mmd` đúng chapter nghiệp vụ
5. `ERD/*/{overview,high-level,low-level}/*` đúng domain slice đang viết

Chỉ xuống `Sequence/*/{overview,high-level,low-level}/*` khi bạn cần:

- kể một flow tiêu biểu
- giải thích một scenario cụ thể
- chứng minh pipeline xử lý theo thời gian

### Nếu bạn đang chữa production incident

Đi theo pack này:

1. `Architecture/01-system-architecture/low-level/arch_02a_request_flow.mmd`
2. `Architecture/01-system-architecture/README.md`
3. action overview đúng domain lỗi
4. sequence hoặc state đúng concern

Nguyên tắc:

- đi từ overview sang detail
- không nhảy thẳng vào ERD nếu chưa biết đang nghi flow nào
- không nhảy thẳng vào class diagram nếu chưa biết đang nghi abstraction nào

## Diagram Levels

Điều cần nhớ trước khi đọc phần này:

- level cao/thấp không phải để chấm điểm diagram
- nó chỉ giúp bạn chọn đúng hình cho đúng câu hỏi
- mở sai level là nguyên nhân lớn nhất làm người đọc thấy diagram “khó hiểu”

### Level 0 — System Context

Trả lời hệ thống trao đổi gì với actor/hệ thống ngoài. Chỉ một system process; không chứa store hoặc implementation detail.

Ví dụ: `DFD/00-system-overview/overview/dfd_00_context.mmd`.

### Level 1 — Domain / Capability Overview

Trả lời hệ thống có những domain process nào và store/material dependency nào quan trọng. Dùng để chọn nhánh cần đọc tiếp; vẫn phải fit một trang.

Ví dụ: các complementary Level-1 frames dưới `DFD/00-system-overview/high-level/dfd_01a`--`dfd_01d`, architecture/package overview, action domain overview.

### Level 2 — Workflow / Concern Overview

Phân rã đúng một domain process thành vài workflow liên quan. Không đi xuống controller/repository/field. Nếu dây bắt đầu chạy xuyên canvas, tiếp tục tạo Level 3.

Ví dụ: `DFD/04-review/high-level/dfd_04a_review_submission.mmd`.

### Level 3 — Atomic Detail

Giải thích đúng một scenario/process với actor và store cục bộ. Đây là tầng dùng để chứng minh implementation, test hoặc data/state change; vẫn phải đọc được khi fit một trang.

Ví dụ: `DFD/04-review/low-level/dfd_04a1_open_session.mmd`, sequence một scenario, action/state detail đúng một concern.

Không bắt buộc mọi nhánh phải đủ bốn tầng. Có thể dừng ở Level 1 hoặc Level 2 nếu hình đã đủ rõ. Chỉ tạo tầng mới khi nó giảm tải nhận thức: tách concern, rút dây, bỏ giao cắt, hoặc làm chữ đọc được trong report.

Level thật được quyết định bằng câu hỏi: `người đọc cần system context, domain map, workflow map, hay đúng một atomic flow/state/data slice?`

## ERD Levels

ERD nên được hiểu theo ba level quen thuộc:

### ERD Level 1: Conceptual

Cho người cần hiểu domain lớn:

- nhóm entity chính
- domain boundary
- không cần cột chi tiết

### ERD Level 2: Logical

Cho người cần hiểu cấu trúc dữ liệu ở mức thiết kế:

- entity cụ thể hơn
- thuộc tính quan trọng
- quan hệ logic nếu cần cho mục tiêu file

### ERD Level 3: Physical

Cho người cần hiểu dữ liệu thực lưu trong hệ thống:

- table
- column
- constraint hoặc shape vật lý khi cần

Trong hệ thống này, ERD được chia thành conceptual overview, logical domain slice, và physical inventory. Logical overview chỉ dẫn đường sang các slice nhỏ hơn; physical inventory mới bám sát table/column hiện hành.

Điều này cũng có nghĩa:

- repo hiện chưa cố tạo một “siêu ERD toàn hệ thống” để thay cho mọi chapter
- nếu cần kể data cho report, nên chọn đúng `1` ERD slice tương ứng chapter thay vì cố nhét hết entity của toàn hệ thống vào một hình

## One Screen Rule

Mỗi diagram phải cố gắng để người đọc:

- nhìn toàn cảnh trong một khung hình
- nắm được ý chính trong vài giây
- không cần phóng to để đọc toàn bộ ý nghĩa

Nếu không đáp ứng được, phải:

1. tách overview và detail
2. tách theo capability
3. tách theo scenario
4. tách theo data slice

Không được giải quyết bằng cách nhồi thêm vào cùng một file.

## Scope Rules

### Overview Diagrams

- chỉ nên có `3-5` capability groups
- tránh routes, repositories, SQL, validators
- tập trung vào mental model và boundary
- nếu đang phải thêm step-level logic hoặc nhiều nhánh xử lý, đó là dấu hiệu phải tách sang detail diagram

### Detail Diagrams

- chỉ nên trả lời `1` concern chính
- tối đa `1` scenario chính và vài nhánh phụ thật sự cần thiết
- tránh nhét thêm overview wording kiểu “toàn hệ thống hoạt động ra sao”
- nếu một detail diagram bắt đầu phải giải thích hai capability lớn cùng lúc, hãy tách file

### Family-To-Level Heuristic

Dùng như rule ngón tay cái, không phải luật cứng:

- `Architecture/*/{overview,high-level,low-level}/*`, `Package/*/{overview,high-level,low-level}/*`, `RichPicture/*/{overview,high-level,low-level}/*`: thường là level cao
- `Action/*/overview/*_overview.mmd`, `DFD/00-system-overview/overview/dfd_00_context.mmd`, và các frame `DFD/00-system-overview/high-level/dfd_01a`--`dfd_01d`: thường là level cao
- detail `Action/*/{high-level,low-level}/*.mmd`, `Sequence/*/{overview,high-level,low-level}/*`, `State/*/{overview,high-level,low-level}/*`, `Communication/*/{overview,high-level,low-level}/*`, `Class/*/{overview,high-level,low-level}/*`: thường là level thấp
- `ERD/*/{overview,high-level,low-level}/*`: thường là level thấp hoặc trung gian tùy file, nhưng trong repo hiện tại nên đọc như low-level data slice trước

### Detail Diagrams

- đúng `1` flow hoặc `1` concern
- cho phép alternate branch nếu vẫn cùng scenario
- nếu thêm một branch lớn mới, tạo file mới
- detail diagram không được biến thành “toàn bộ subsystem trong một file”
- nếu người đọc phải zoom mới theo nổi flow chính, file đã quá tải

## Rules By Diagram Type

### Flowchart

- dùng cho process/algorithm tổng quát khi không cần semantics chặt hơn của BPMN, UML Activity, DFD hoặc State Machine
- keyword Mermaid `flowchart` chỉ là renderer; family và quy tắc trong folder mới quyết định ý nghĩa của source
- không nhân đôi một Activity/User Flow/DFD hiện có chỉ để tạo thêm bản sao mang nhãn Flowchart

### BPMN

- dùng cho business process có nhiều participant/responsibility và cần pool, message flow, event, task hoặc gateway chuẩn
- source of truth là BPMN 2.0 XML `.bpmn`; preview `.png` có cùng basename
- sequence flow chỉ chạy trong một participant; message flow chỉ chạy giữa các participant
- không dùng BPMN để kể controller/repository pipeline hoặc thay thế mọi Activity diagram
- coverage hiện có cho ba collaboration vật chất: marketplace assignment, task-delivery/review handoff, và review-dispute/human resolution

### Activity (`Action/`)

- `Action/` chính là UML Activity family; tên folder được giữ để không làm gãy path hiện hành
- dùng cho control flow theo action, decision/guard, fork/join và swimlane khi cần
- source Mermaid dùng `flowchart` để render vì Mermaid 11.16.0 chưa có Activity renderer riêng

### Component

- dùng UML Component khi câu hỏi là module/component nào sở hữu trách nhiệm và dependency/interface đi theo hướng nào
- source `.puml` phải dùng component notation, không biến thành package inventory hoặc runtime flow
- component trong modular monolith là logical source boundary; không được suy diễn thành microservice
- overview chỉ là entry map; core dependency, platform interface, event reaction và integration seam được tách thành các view riêng

### Deployment

- dùng UML Deployment cho node, execution environment, deployed artifact và communication path
- source `.puml` phải phân biệt repository reference topology với production runtime đã được quan sát
- khi chưa có production deployment, bắt buộc ghi `Partial` hoặc `Planned` và nêu rõ các node production chưa được chứng minh

### DMN

- dùng DMN cho business decision có input, output và rule table ổn định
- source of truth là OMG DMN XML `.dmn`; runtime TypeScript vẫn phải được ghi rõ nếu chưa có DMN engine
- Activity/BPMN mô tả flow; DMN chỉ tách phần quyết định ra khỏi flow đó
- coverage hiện có cho marketplace eligibility/processing và review confirmation/dispute governance

### Use Case

- chỉ actor và user goal
- không nhét DB schema hoặc controller chain

### Class

- giữ một abstraction level mỗi file
- domain class, ORM class, DTO/mapping class không nên trộn
- gần như luôn là level thấp
- không nên là diagram đầu tiên cho người mới hoặc external reader

### Sequence

- một interaction scenario mỗi file
- alternate branch được phép
- unrelated scenario phải tách
- đây là loại diagram rất hữu ích cho dev/test/on-call, nhưng không nên dùng để mở đầu chapter tổng quan

### State Machine (`State/`)

- states, events, transitions, guards
- side effects chỉ nên là ghi chú phụ ngắn
- nếu state diagram bắt đầu kể cả luồng dữ liệu, route, và actor UI, file đã sai level

### DFD

- external entity, process, data store, data flow
- không trộn controller hoặc repository internals

### ERD

- một domain slice mỗi file
- conceptual ERD chỉ giữ business entity và relationship
- logical ERD phải có identifier, thuộc tính quan trọng, cardinality và associative entity khi cần
- physical ERD phải bám actual table/column/constraint/FK
- file không có relationship phải gọi là inventory/data dictionary, không gọi là ERD
- nếu cần mô tả toàn bộ hệ thống dữ liệu, hãy dùng nhiều ERD slice thay vì một “mega ERD”

## Naming Rules

- overview giữ số index chính
- detail thêm hậu tố `a`, `b`, `c`
- tên file phải trả lời được: file này giải thích concern nào

## Retirement Rule

Khi một diagram cũ không còn giữ được:

- đúng level
- đúng concern
- đúng one-screen rule

thì không vá tiếp bằng cách thêm shape mới vào cùng file.

Phải làm một trong ba việc:

1. tách thành overview + detail
2. tách theo scenario
3. thay file cũ bằng file mới rồi cập nhật catalog/reference docs

## Recommended Reading Order

1. `Architecture/01-system-architecture/overview/arch_01_system.mmd`
2. `Architecture/01-system-architecture/high-level/arch_02_layer.mmd`
3. `Architecture/01-system-architecture/low-level/arch_02a_request_flow.mmd`
4. `Architecture/01-system-architecture/low-level/arch_02b_composition_boundary.mmd`
5. `Package/01-overview/overview/pkg_01_overview.mmd`
6. action overview đúng domain
7. sequence/state/ERD detail đúng concern

## Anti-Patterns Phải Tránh

Nếu gặp một diagram có các dấu hiệu sau, hãy xem đó là diagram cần refactor chứ không phải “người đọc chưa đủ giỏi”:

- một file vừa kể overview business, vừa kể route, vừa kể DB column detail
- một file có hơn một concern lớn không liên quan chặt với nhau
- muốn hiểu phải zoom liên tục hoặc kéo ngang dọc quá nhiều
- tên file không nói nổi nó giải thích concern nào
- phải mở thêm 3 diagram khác chỉ để hiểu diagram đầu tiên đang ở level nào

Mục tiêu của bộ diagram này không phải phô ra càng nhiều shape càng tốt.
Mục tiêu là giúp người đọc nhìn phát hiểu nhanh và hiểu đúng.

## Read By Situation

### New Joiner

Đọc:

- `Architecture/01-system-architecture/overview/arch_01_system.mmd`
- `Architecture/01-system-architecture/high-level/arch_10_realm_workspace_board_topology.mmd`
- `Architecture/01-system-architecture/high-level/arch_02_layer.mmd`
- `Package/01-overview/overview/pkg_01_overview.mmd`

### External Reader / Report Writer

Đọc:

- `docs/00-overview/external-reader-report-writing-guide.md`
- `Architecture/01-system-architecture/overview/arch_01_system.mmd`
- `Architecture/01-system-architecture/high-level/arch_02_layer.mmd`
- `Package/01-overview/overview/pkg_01_overview.mmd`
- ERD hoặc sequence đúng chapter đang viết

Nếu chapter đang nói về task delivery, submission, comment, attachment, hoặc completion proof:

- ưu tiên thêm `DFD/02-task/high-level/dfd_02c_task_completion_package.mmd` thay vì cố nhồi hết ý này vào workflow diagram.

Nếu chapter đang nói về review governance hiện tại:

- dùng `State/02-review/overview/state_02_review_session.mmd` cho core review-session lifecycle
- dùng `State/02-review/high-level/state_02b_task_review_workflow.mmd` cho task review board
- dùng `State/08-project/high-level/state_08b_project_sprint_review.mmd` cho sprint close/review-open gate
- dùng `State/02-review/high-level/state_02c_sprint_reverse_review_workflow.mmd` cho hai board assigner/environment sau sprint
- dùng `ERD/04-review-governance/README.md` để thấy bảng review workflow/package liên quan

Rule ngắn:

- tổng quan chương hệ thống: dùng high-level diagrams
- chương database: dùng ERD đúng domain slice
- chương flow nghiệp vụ: dùng action/sequence đúng concern

### Dev Đang Debug

Đọc:

- architecture hoặc package overview ngắn trước
- sau đó nhảy đúng sequence/state/ERD của concern đang lỗi

### Manager Or Executive

Đọc:

- architecture overview
- action overview theo domain

Tránh đưa manager vào sequence hoặc ERD nếu chưa thật sự cần.

### QA Or Reviewer

Đọc:

- action overview để hiểu flow nghiệp vụ
- sequence diagram đúng flow
- state diagram nếu concern có transition/guard

### Khi Production Đang Lỗi

Đọc:

1. architecture overview trước
2. action overview của domain đang lỗi
3. sequence hoặc state đúng flow đang nghi ngờ
4. ERD slice đúng domain nếu có dấu hiệu data/state mismatch

Không nên mở ERD hoặc class diagram trước khi chưa xác định lỗi nằm ở domain nào.

## Backend Context

- backend là modular monolith với CQRS use-case layer: Command/Query sở hữu complete intent;
  generic `services` bị cấm; collaborator dùng chung hai phía CQRS là precise action-root file,
  còn single-side collaborator thuộc `actions/commands|queries/internal`; tất cả đều không phải
  use-case entry point
- controller/listener gọi đúng một inbound capability; domain giữ decision; outbound port mô tả
  dependency; adapter giữ I/O; composition chỉ construct và inject
- cross-module access tuân thủ quy tắc Ports and Adapters: consumer sở hữu outbound ports (`actions/ports/outbound`), outer adapters nằm ở `app/composition`, và provider công bố `public_contracts`
- `support`, `serializers`, `builders`, `utils`, `actions/factories`, và runtime `user_activity`
  có production baseline bằng zero; Audit là canonical evidence
- module exception boundaries được đóng gói độc lập (`DomainException`, `ApplicationException`, `InfrastructureException`) theo audit `docs/12-evidence/exception-handling-enterprise-audit-2026-07-26.md` và kiểm tra tự động qua `scripts/check_exception_boundaries.mjs`
- frontend có 3 Inertia app (`user`, `org`, `admin`), nhưng security model chỉ có hai realm: `admin` thuộc System realm; `user` và `org` là hai workspace shell của User realm
- hệ thống test áp dụng ma trận 10 tầng (L1-L10) theo `docs/12-evidence/test-strategy.md`, được bảo vệ bằng `test_datastore_guard.ts` (kiểm tra an toàn DB/Redis/Elasticsearch port 9201) và `scripts/tests/assert_test_inventory.mjs`
- realtime transport sử dụng Transmit SSE (`start/transmit.ts`) và Redis PubSub cho Notification Center reliability
- review workflow tables mới là storage/index projection; diagram không nên vẽ chúng như DB-enforced source của toàn bộ business rule

## Reader Promise

Người đọc mở diagram vì họ muốn hiểu nhanh. Nên mỗi diagram phải trả lời rõ:

- purpose
- audience
- scope
- source of truth

Diagram tốt phải tự đứng được ở mức ý chính của chính nó.

Người đọc có thể cần mở thêm doc hoặc code để đào sâu, nhưng không được cần mở thêm 3 file khác chỉ để hiểu diagram đang nói gì.

Nếu một external reader không có code mà vẫn không hiểu diagram đang mô tả boundary hay flow nào, diagram đó chưa đạt.

Nếu không trả lời được bốn câu này, diagram chưa sẵn sàng để tin.

## Diagram Self-Check Before Shipping

Trước khi coi một diagram là đủ tốt để mang ra ngoài repo, tự hỏi 5 câu:

1. Người chưa biết code có nhìn 10 giây là nói đúng nó đang nói về domain hay concern nào không?
2. Người đọc có biết ngay đây là high-level hay low-level không?
3. Diagram có tự đứng được mà không bắt người đọc mở thêm 2-3 file khác chỉ để hiểu phạm vi của nó không?
4. Nếu đây là diagram low-level, nó có chỉ giữ đúng `1` flow hoặc `1` concern lớn không?
5. Nếu in hoặc chụp trong một khung hình, người đọc còn nắm được ý chính không?

Nếu có câu nào trả lời là `không`, hãy xem đó là diagram cần tách hoặc viết lại.

## Chọn Overview Và Detail Cho Report

Các ERD overview sau chỉ dùng để mở domain; không dùng thay cho mọi relationship detail:

- `ERD/01-user-auth-skills/overview/logical_erd_01_user_auth_skills.mmd`
- `ERD/02-organization-project/overview/logical_erd_02_org_project.mmd`
- `ERD/03-task-marketplace/overview/logical_erd_03_task_marketplace.mmd`
- `ERD/04-review-governance/README.md`
- `ERD/05-platform-support/README.md`

Rule chọn hình:

- mở overview đúng domain trước
- chọn đúng một file hậu tố `a`, `b`, `c`, ... cho concern của chapter
- chỉ dùng physical inventory trong chapter database hoặc appendix
- dùng action overview để kể nghiệp vụ; dùng action detail hoặc sequence để chứng minh đúng một scenario
- riêng review governance, Task Review Board, sprint review gate và lifecycle chung của Assigner/Environment Review Board có state diagram riêng; không dồn các lifecycle vào một hình

## What Not To Do

- Đừng mang một mega ERD ra ngoài rồi bắt người đọc tự chia domain trong đầu.
- Đừng mở đầu chapter bằng sequence, class, hoặc state detail khi người đọc còn chưa có mental model tổng quan.
- Đừng dùng một diagram để vừa kể business overview, vừa kể route, vừa kể DB column detail.
- Đừng xem việc “diagram đúng kỹ thuật” là đủ; nếu external reader vẫn không hiểu nhanh thì diagram đó vẫn chưa đạt.

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. concern của mình cần diagram level cao hay level thấp
2. loại diagram nào là đúng nhất cho câu hỏi hiện tại
3. lúc nào cần sang sequence-flow guide, architecture catalog, hay data docs để lấy thêm context
