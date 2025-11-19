# Design Navigation And Artifact Map

| Field | Value |
|---|---|
| Status | Active |
| Audience | Designer, frontend dev, reviewer, manager, cross-role reader |
| Purpose | Giúp người đọc hiểu “thiết kế” trong hệ thống này nằm ở đâu và nên đọc theo đường nào để không bị lạc giữa architecture, data, diagram, và implemented UI |
| Source of Truth | architecture docs, data docs, diagram corpus, implemented UI evidence hiện tại |
| Last Reviewed | 2026-07-10 |
| Review Cycle | Khi taxonomy thiết kế đổi hoặc hệ thống có thêm design artifact độc lập |
| Owner | Product design + engineering |
| Stale Risk | Cao |

## File Này Phải Giúp Bạn Làm Gì

Sau khi đọc file này, người đọc phải hiểu được:

- “design” trong hệ thống này không nằm trong một chỗ duy nhất
- đâu là system design
- đâu là data design
- đâu là behavior design
- đâu là UI evidence thật
- đâu là chỗ hệ thống hiện chưa có artifact độc lập

Nếu bạn đang:

- muốn hiểu “design” trong hệ thống này nằm ở đâu: đọc `Mental Model`
- muốn tìm artifact thiết kế gốc: đọc `Wireframe / Prototype Boundary`
- muốn biết implemented UI nên đối chiếu với docs nào: đọc `UI Evidence`

## Mental Model

Trong hệ thống này, “design” đang trải ra bốn lớp:

### 1. System Design

Trả lời:

- hệ thống chia module/layer ra sao
- boundary lớn nằm ở đâu

Đọc:

- `../03-architecture/architecture-overview.md`
- `../03-architecture/architecture-diagram-catalog.md`

### 2. Data Design

Trả lời:

- entity nào quan trọng
- dữ liệu đang được lưu theo slice nào
- ERD và data dictionary nằm ở đâu

Đọc:

- `../06-data/database-design-erd-data-dictionary.md`

### 3. Behavior Design

Trả lời:

- flow nghiệp vụ chính chạy ra sao
- request, state, data flow đi theo hướng nào

Đọc:

- `../11-diagrams/README.md`
- `../11-diagrams/sequence-flow-data-user-flows.md`

### 4. UI Evidence

Trả lời:

- màn hình nào có thật trong sản phẩm hiện tại
- implemented UI đang là nguồn trực quan mạnh nhất ở đâu

Đọc:

- `inertia/apps/{user,org,admin}/*`
- `inertia/bones/*`
- `./wireframe-prototype-inventory.md`

Một câu nhớ ngắn:

`Ở hệ thống này, design truth nằm nhiều ở docs + diagrams + implemented UI, không nằm trong một thư mục mockup riêng.`

## Nếu Dùng File Này Để Viết Report Bên Ngoài Repo

Bạn có thể dùng file này để viết:

- phần mô tả thiết kế tổng thể của hệ thống
- phần phân loại giữa system design, data design, behavior design, và UI evidence
- phần boundary nêu rõ Suar chưa có design handoff folder kiểu truyền thống

Bạn không nên dùng riêng file này để kết luận:

- Suar đã có đầy đủ Figma/prototype/wireframe pack độc lập
- mọi quyết định UI đều đã được ghi lại bằng artifact thiết kế riêng ngoài implemented UI

Nếu cần một câu tóm tắt an toàn:

`Thiết kế của Suar hiện được phân tách thành bốn lớp chính gồm thiết kế hệ thống, thiết kế dữ liệu, thiết kế hành vi, và bằng chứng UI đã triển khai; cấu trúc này giúp người đọc hiểu sản phẩm mà không cần phụ thuộc vào một thư mục mockup riêng.`

## Nếu Chỉ Cần Hiểu Nhanh

Đọc theo thứ tự:

1. `../03-architecture/architecture-overview.md`
2. `../11-diagrams/README.md`
3. `../06-data/database-design-erd-data-dictionary.md`
4. chỉ sau đó mới đọc `wireframe-prototype-inventory.md` nếu bạn đang tìm design artifact gốc

Nếu sau bước 3 bạn đã hiểu đủ để làm việc, dừng ở đó. Không phải ai cũng cần đi tiếp vào inventory artifact.

## Thiết Kế Hệ Thống Hiện Có

### System Design Document

File chính:

- `../03-architecture/architecture-overview.md`

Concern đang cover:

- modular monolith structure
- application/domain/infra layering
- org context
- auth/session
- persistence/cache
- review/dispute/profile pipeline

### Architecture Diagrams

File chỉ đường:

- `../03-architecture/architecture-diagram-catalog.md`

Diagram family:

- `docs/11-diagrams/Architecture/*`

Nếu người đọc chỉ cần bức tranh tổng thể, không cần mở toàn bộ corpus diagram.

## Thiết Kế Dữ Liệu Hiện Có

### Database Design / Data Dictionary

File chính:

- `../06-data/database-design-erd-data-dictionary.md`

Source nền:

- `schema/migration evidence`
- `database/schema.ts`

### ERD

Nguồn sơ đồ:

- `docs/11-diagrams/ERD/logical_erd_01_user_auth_skills.mmd`
- `docs/11-diagrams/ERD/logical_erd_02_org_project.mmd`
- `docs/11-diagrams/ERD/logical_erd_03_task_marketplace.mmd`
- `docs/11-diagrams/ERD/logical_erd_04_review_messaging.mmd`

Điểm reader nên nhớ:

- ERD ở hệ thống này đang nghiêng physical/domain-slice hơn là conceptual-only
- không phải một siêu ERD gom hết mọi bảng

## Thiết Kế Hành Vi Hiện Có

### Sequence

Nguồn:

- `docs/11-diagrams/Sequence/*`

Hợp khi:

- debug flow
- review request order
- giải thích “ai gọi ai trước”

### Action / Flow

Nguồn:

- `docs/11-diagrams/Action/*`

Hợp khi:

- cần hiểu flow nghiệp vụ ở mức business dễ nhìn hơn

### Data Flow

Nguồn:

- `docs/11-diagrams/DFD/*`

Hợp khi:

- cần nhìn data movement giữa process/store/external actor

### State

Nguồn:

- `docs/11-diagrams/State/*`

Hợp khi:

- cần hiểu transition, guard, lifecycle

## User Flow Và UI Boundary

### User Flow

Hệ thống có user-flow support ở:

- `../11-diagrams/sequence-flow-data-user-flows.md`
- `docs/11-diagrams/UserFlow/*`

### Wireframe / Prototype Boundary

Hệ thống hiện không có folder độc lập kiểu:

- Figma export
- low-fidelity wireframe board
- prototype HTML/PDF riêng

Điều đang có thật:

- implemented UI surfaces trong `inertia/apps/{user,org,admin}/*`
- generated/shared UI bones trong `inertia/bones/*`
- diagrams
- docs giải thích relationship giữa chúng

## Kết Luận Ngắn

Nếu bạn thấy “design” trong hệ thống này hơi khác các sản phẩm có team design handoff truyền thống, đó là chuyện bình thường.

Ở đây, design truth hiện đang nằm chủ yếu trong:

- architecture docs
- data docs
- behavior diagrams
- implemented UI

chứ không nằm trong một thư mục mockup riêng thật dày.

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. concern của mình thuộc system design, data design, behavior design, hay UI evidence
2. file hoặc diagram nào là điểm đọc tiếp theo đúng nhất
3. có thật sự cần đào sang wireframe/prototype boundary hay không
