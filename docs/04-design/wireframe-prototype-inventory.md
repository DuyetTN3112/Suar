# Wireframe / Prototype Inventory

| Field | Value |
|---|---|
| Status | Active |
| Audience | Designer, frontend dev, manager, reviewer, anyone trying to find original UI artifacts |
| Purpose | Nói rõ hệ thống có hay không có wireframe/prototype gốc, để người đọc không mất thời gian tìm thứ không tồn tại |
| Source of Truth | đối chiếu trực tiếp giữa `docs/`, `docs/11-diagrams/`, `inertia/`, và các đường dẫn design liên quan |
| Last Reviewed | 2026-07-16 |
| Review Cycle | Khi team bắt đầu commit mockup/prototype artifact riêng hoặc đổi chiến lược lưu design handoff |
| Owner | Product design + engineering |
| Stale Risk | Trung bình |

## Câu Trả Lời Ngắn

Hệ thống hiện chưa có standalone wireframe/prototype artifact đủ mạnh để coi là design source of truth riêng.

## Đã Tìm Ở Đâu

Đã quét các vùng:

- `docs/`
- `docs/11-diagrams/`
- `inertia/`
- `.claude/`
- `.agents/`

## Chưa Thấy Gì

Chưa thấy artifact kiểu:

- wireframe board
- Figma export
- prototype HTML độc lập
- prototype PDF
- low-fidelity mockup set

## Hệ Thống Có Gì Thay Thế

### 1. Implemented UI Surfaces

Frontend hiện đã split sang `inertia/apps/{user,org,admin}`. Một số docs/plan cũ vẫn nhắc `inertia/pages/*`; đọc chúng như legacy path signal, không phải layout hiện hành.

Hệ thống có nhiều UI implementation thật trong:

- `inertia/apps/user/*`
- `inertia/apps/org/*`
- `inertia/apps/admin/*`
- `inertia/bones/*`
- shared route/page shells và view entrypoints liên quan

Implemented surfaces đã được audit trực tiếp trong đợt này gồm:

- `inertia/apps/user/modules/projects/components/project_sprint_panel.svelte`
- `inertia/apps/org/modules/projects/components/project_sprint_panel.svelte`
- `inertia/apps/user/modules/projects/show.svelte`
- `inertia/apps/org/modules/projects/show.svelte`
- `inertia/apps/user/modules/reviews/sprint-reverse-board.svelte`
- `inertia/apps/org/modules/reviews/sprint-reverse-board.svelte`

Điểm sprint frontend hiện tại:

- sprint management nằm trong project detail tab `Sprints`
- task board chỉ link sang sprint tab, không render full sprint management panel
- Sprint Goal hiện có input khi tạo sprint và hiển thị trên sprint card/board header khi có dữ liệu

### 2. Flow And User-Flow Support

Hệ thống có artifact hỗ trợ để hiểu UI flow:

- `docs/11-diagrams/Action/*`
- `docs/11-diagrams/Usecase/*`
- `docs/11-diagrams/UserFlow/*`
- `docs/11-diagrams/sequence-flow-data-user-flows.md`

## Nên Hiểu Điều Này Thế Nào

- implemented surface là bằng chứng UI runtime
- diagram là bằng chứng flow/structure
- nhưng hai thứ đó không tự động biến thành wireframe gốc

Nếu ai đó hỏi “Figma đâu”, câu trả lời trung thực hiện tại là: bộ tài liệu và mã nguồn hiện chưa cung cấp artifact đó như một nguồn độc lập.

## Nếu Dùng File Này Để Viết Report Bên Ngoài Repo

Bạn có thể dùng file này để viết:

- phần boundary về wireframe/prototype
- phần giải thích vì sao implemented UI được dùng như bằng chứng trực quan chính
- phần giới hạn của design handoff hiện tại

Một câu tóm tắt an toàn:

`Suar hiện chưa có bộ wireframe hoặc prototype độc lập được quản lý như nguồn sự thật thiết kế; thay vào đó, bằng chứng trực quan chính đến từ implemented UI và hệ thống diagram hỗ trợ.`

## Kết Luận

Concern `Wireframe / Prototype` hiện được cover ở mức:

- inventory
- implemented surface mapping
- flow/user-flow support

Nó chưa được cover ở mức original standalone design artifact.

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. hệ thống có hay không có wireframe/prototype artifact độc lập
2. implemented UI và diagram đang thay thế phần nào của design handoff
3. có cần quay lại design-system map hoặc diagram guide để đọc tiếp hay không
