# Design Folder Guide

| Field | Value |
|---|---|
| Status | Active |
| Audience | Designer, frontend dev, reviewer, manager, new joiner cần hiểu hình hài sản phẩm |
| Purpose | Giúp người đọc biết hệ thống hiện có design artifact gì thật, nên mở file nào trước, và giới hạn của phần design docs hiện tại |
| Source of Truth | `docs/04-design/*`, implemented UI evidence, related diagrams và architecture docs |
| Last Reviewed | 2026-07-10 |
| Review Cycle | Khi UI structure, design-system guidance, hoặc design artifact inventory đổi |
| Owner | Product design + engineering |
| Stale Risk | Trung bình đến cao |

## File Này Dùng Để Làm Gì

`docs/04-design/` không phải thư mục “mockup đẹp”.

Nó là nơi giúp người đọc hiểu:

- hệ thống hiện có design artifact gì
- artifact nào là implemented UI
- artifact nào là diagram hỗ trợ
- artifact nào hiện chưa có nguồn độc lập

## Nếu Bạn Đang Viết Report Hoặc Đọc Mà Không Có Code

Hãy đọc file này như một bản đồ trả lời ba câu:

1. thiết kế của Suar đang được thể hiện ở đâu
2. phần nào là implemented UI thật, phần nào là diagram hỗ trợ
3. phần nào chưa có design artifact độc lập nên không được mô tả quá tay

Nếu người đọc bên ngoài chỉ cầm folder `docs/` và `docs/11-diagrams/`, file này phải đủ để họ không mất thời gian đi tìm một thư mục mockup không tồn tại.

## Mở File Nào Khi Nào

### Cần hiểu thiết kế hệ thống, thiết kế dữ liệu, thiết kế hành vi đang nối với nhau ra sao

Mở:

- `./design-system.md`

### Cần biết hệ thống có wireframe/prototype gốc hay không

Mở:

- `./wireframe-prototype-inventory.md`

### Cần nhìn flow hoặc structure bằng hình

Mở:

- `../11-diagrams/README.md`
- `../11-diagrams/README.md`

## Điều Người Đọc Phải Biết Ngay

Hệ thống hiện nghiêng mạnh về:

- implemented UI thật trong `inertia/apps/{user,org,admin}/*`
- shared/generated UI bones trong `inertia/bones/*`
- diagram corpus trong `docs/11-diagrams/`
- docs giải thích relationship giữa các artifact này

Hệ thống hiện không mạnh ở:

- standalone Figma export
- low-fidelity wireframe board
- prototype artifact riêng được commit vào `docs/`

Nói cách khác:

- có nhiều thứ để hiểu sản phẩm
- nhưng không phải theo kiểu traditional design handoff folder

Một câu an toàn có thể dùng trong report:

`Thiết kế của Suar hiện được thể hiện chủ yếu qua implemented UI, docs kiến trúc, docs dữ liệu, và hệ thống diagram; bộ tài liệu cũng ghi rõ những design artifact độc lập hiện chưa tồn tại thay vì giả vờ chúng đã có.`

## Điểm Đọc Tiếp Theo

- `../03-architecture/architecture-overview.md`
- `../06-data/database-design-erd-data-dictionary.md`
- `../11-diagrams/README.md`

## Khi Nào Dừng Ở Folder Này

Dừng ở folder này khi bạn đã biết:

1. concern của mình nằm ở design-system map, implemented UI, hay wireframe/prototype boundary
2. file hoặc diagram nào là điểm đọc tiếp theo đúng nhất
3. có thật sự cần đào thêm sang inventory artifact hay không
