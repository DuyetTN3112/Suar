TÀI LIỆU HƯỚNG DẪN KIẾN TRÚC HỆ THỐNG SHADCNADMIN
(CQRS ACTION PATTERN VÀ QUY TẮC PHÂN TÁCH TRÁCH NHIỆM)

Ngày Cập Nhật: 18/10/2025
Phiên Bản: 1.0

---

## MỤC LỤC

1.  Tổng Quan Hệ Thống: ShadcnAdmin là gì?
2.  Kiến Trúc Cốt Lõi: CQRS Action Pattern
    *   Mục đích và Lợi ích
    *   Cơ chế "Hybrid CQRS với Manual Resolution"
3.  Vận Hành Hệ Thống: Các Thành Phần Chính
    *   Commands (Thao tác Ghi)
    *   Queries (Thao tác Đọc)
    *   DTOs (Đối Tượng Truyền Dữ Liệu)
    *   Controllers (Lớp Điều Phối Mỏng)
    *   Base Classes & Cross-cutting Concerns
4.  Quy Ước & Thực Hành Tốt Nhất
    *   Naming Conventions (Quy ước Đặt Tên)
    *   An Toàn Dữ Liệu & Hiệu Suất
5.  Tình Trạng Refactoring & Thành Tựu

---

## PHẦN I: TỔNG QUAN HỆ THỐNG: SHADCNADMIN LÀ GÌ?

ShadcnAdmin là một nền tảng quản lý doanh nghiệp toàn diện, được xây dựng dựa trên kiến trúc hiện đại nhằm tối ưu hóa hiệu suất và khả năng bảo trì.

### 1.1. Mục Đích Cốt Lõi

Hệ thống cung cấp một nền tảng quản lý đa năng cho doanh nghiệp, bao gồm các tính năng quản lý người dùng, quản lý tổ chức, quản lý dự án, quản lý công việc (tasks), và giao tiếp nội bộ theo thời gian thực.

Mục đích của việc áp dụng Action/Command Pattern và **CQRS** (Command Query Responsibility Segregation) là để tách biệt logic nghiệp vụ khỏi Controllers, tuân thủ nguyên tắc **SOLID**. Việc này giúp code **dễ đọc, dễ hiểu, dễ bảo trì (Maintainability)** và **dễ kiểm thử (Testability)**.

### 1.2. Công Nghệ và Kiến Trúc

Kiến trúc tổng thể của ShadcnAdmin là mô hình **MVC+**, với lớp **Actions** độc lập chứa logic nghiệp vụ.

*   **Backend:** **AdonisJS v6** (Framework), Lucid ORM (MySQL), Redis (Caching), VineJS (Validation).
*   **Frontend:** **React** và **Inertia.js**. Inertia.js đóng vai trò kết nối frontend và backend mà không cần API REST riêng biệt, mang lại trải nghiệm SPA (Single-page application).
*   **Thiết kế:** Sử dụng Shadcn UI/Tailwind CSS v4.

Các tính năng chính bao gồm: Quản lý người dùng, Quản lý tổ chức đa cấp, Quản lý công việc với theo dõi tiến độ, Hệ thống giao tiếp nội bộ thời gian thực.

### 1.3. Cấu Trúc Thư Mục Tiêu Chuẩn

Logic nghiệp vụ được tổ chức theo từng module và được phân tách rõ ràng theo nguyên tắc CQRS:

```
app/actions/{module}/ # Logic nghiệp vụ (CQRS)
├── commands/ # Thao tác Ghi (Commands)
├── queries/ # Thao tác Đọc (Queries)
└── dtos/ # Data Transfer Objects (Validation)
app/controllers/ # Điều phối (Thin Controllers)
app/models/ # Lucid ORM models
app/services/ # Shared services (cache, logging, etc.)
```

## PHẦN II: KIẾN TRÚC CỐT LÕI: CQRS ACTION PATTERN

### 2.1. CQRS là gì?

**CQRS (Command Query Responsibility Segregation)** là một mô hình kiến trúc tách biệt trách nhiệm giữa việc thay đổi trạng thái hệ thống (**Commands** - Write Operations) và việc lấy dữ liệu để hiển thị (**Queries** - Read Operations).

| Loại Thao Tác | Mục Đích | Đặc Điểm | Ví Dụ |
| :--- | :--- | :--- | :--- |
| **Commands (Write)** | Thay đổi trạng thái hệ thống. | Sử dụng **transactions**, ghi **audit logs**, không nên cache, có thể trigger side effects (notifications, events). | `RegisterUserCommand`, `UpdateProfileCommand`. |
| **Queries (Read)** | Lấy dữ liệu để hiển thị. | **KHÔNG** thay đổi state, **có thể được cache**, tối ưu cho performance, idempotent (gọi nhiều lần cho kết quả giống nhau). | `GetUsersListQuery`, `SearchTasksQuery`. |

Lợi ích của việc tách biệt này bao gồm: **Testability** cao hơn, **Maintainability** dễ dàng hơn, và khả năng **Scale** độc lập (ví dụ: tối ưu hóa database ghi và đọc riêng).

### 2.2. Cơ chế "Hybrid CQRS với Manual Resolution"

Dự án sử dụng **Hybrid CQRS với Manual Resolution**. Đây là một quyết định kiến trúc quan trọng để giải quyết các vấn đề về Dependency Injection (DI) của AdonisJS trong quá trình phát triển (hot reload).

*   **Vấn đề:** Việc sử dụng `@inject()` decorator trên các lớp Action và tham số của controller dẫn đến **"Double Decoration Conflict"**. Điều này gây ra lỗi `Cannot inject [Function: Object]` và làm cho chức năng Hot Reload (tự động tải lại code) không ổn định.
*   **Giải pháp (Manual Resolution):** Thay vì để IoC (Inversion of Control) container tự động tiêm dependencies bằng `@inject()`, chúng ta thực hiện **khởi tạo thủ công (Manual Instantiation)** các Commands và Queries trong Controllers.

**Nguyên tắc vàng:** **Manual Instantiation** (`new Class(ctx)`) **luôn được ưu tiên hơn** IoC container (`@inject()`) cho Actions.

Ví dụ về cách sử dụng trong Controller:

```typescript
// KHÔNG dùng @inject() decorator trong class Action hoặc constructor
// Controllers khởi tạo thủ công:
const command = new RegisterUserCommand(ctx) // Manual Instantiation
const user = await command.handle(dto)
```

## PHẦN III: VẬN HÀNH HỆ THỐNG: CÁC THÀNH PHẦN CHÍNH

### 3.1. DTOs (Data Transfer Objects)

DTOs là các object đơn giản được sử dụng để chuyển dữ liệu vào (Input) hoặc ra (Output) của Actions. Vai trò chính của DTO là **thực hiện xác thực dữ liệu đầu vào (Validation)**.

*   **Nguyên tắc:** Dữ liệu đầu vào phải được **Validate trong constructor** của DTO. Phương pháp này giúp hệ thống "thất bại nhanh" (fail-fast) nếu dữ liệu không hợp lệ.
*   **Thực hành tốt nhất:** Sử dụng `readonly` cho tất cả properties và giữ DTOs **immutable** (không có setters).
*   **Ví dụ:** `RegisterUserDTO` sẽ chứa logic kiểm tra độ dài mật khẩu (tối thiểu 8 ký tự, phải chứa chữ và số), định dạng email, và các ràng buộc khác.

### 3.2. Commands (Thao tác Ghi)

Commands là các lớp thực hiện logic nghiệp vụ thay đổi trạng thái hệ thống.

#### **3.2.1. Đặc điểm Cốt Lõi:**

1.  **Ghi Logic Nghiệp Vụ:** Commands chứa tất cả logic nghiệp vụ phức tạp liên quan đến thay đổi trạng thái.
2.  **Transactions:** Luôn sử dụng transactions (`executeInTransaction()` hoặc `db.transaction()`) cho các thao tác thay đổi nhiều tables để đảm bảo tính **nguyên tử (atomicity)** và tính nhất quán của dữ liệu.
3.  **Audit Logging:** Luôn gọi `logAudit()` cho các thao tác quan trọng (tạo, sửa, xóa) để theo dõi ai đã làm gì, khi nào, và giá trị cũ/mới là gì.
4.  **Permission Check:** Logic kiểm tra quyền truy cập (Role-based access control) phải được thực hiện trong Command, trước khi thực hiện thay đổi.
5.  **Cache Invalidation:** Sau khi thay đổi trạng thái thành công, Commands phải thực hiện **vô hiệu hóa cache (cache invalidation)** cho các Queries bị ảnh hưởng.

#### **3.2.2. Vận Hành:**

Các Commands hiện tại không kế thừa từ một BaseCommand do các lỗi kiến trúc đã được phát hiện trong quá trình refactoring (ví dụ: `AssignTaskCommand`).

Commands hiện được triển khai dưới dạng **Standalone Classes** với cơ chế tường minh:

*   Sử dụng `import db from '@adonisjs/lucid/services/db'` và xử lý transactions thủ công (`await db.transaction()`).
*   Truy cập người dùng hiện tại thông qua `this.ctx.auth.user!`.
*   Logic phức tạp nên được tách thành các `private methods` để tuân thủ SRP (Single Responsibility Principle).

### 3.3. Queries (Thao tác Đọc)

Queries là các lớp chỉ phục vụ mục đích lấy dữ liệu và không bao giờ thay đổi trạng thái hệ thống (Read-Only).

#### **3.3.1. Đặc điểm Cốt Lõi:**

1.  **Idempotent:** Gọi Query nhiều lần phải cho ra cùng một kết quả.
2.  **Caching:** Các Queries thường xuyên được gọi hoặc tốn kém về hiệu năng cần sử dụng **Redis Caching** thông qua helper `executeWithCache()`.
3.  **Permission Filtering:** Dữ liệu trả về phải được lọc theo quyền của người dùng (ví dụ: thành viên chỉ thấy tasks của mình, admin thấy tất cả tasks trong tổ chức).
4.  **Tối ưu hóa:** Queries được tối ưu cho tốc độ (ví dụ: sử dụng pagination, eager loading quan hệ).

#### **3.3.2. Cơ chế Caching:**

Queries sử dụng mô hình **Cache-Aside** với TTL (Time To Live) được xác định tùy theo mức độ thay đổi của dữ liệu.

| Loại Dữ Liệu | TTL Đề Xuất | Ví Dụ |
| :--- | :--- | :--- |
| **Volatile** | 2-3 phút | Logs, danh sách Tasks (thay đổi thường xuyên). |
| **Static** | 5-10 phút | Metadata (statuses, labels, priorities), chi tiết Task. |

Mỗi Query phải tạo một **Cache Key** duy nhất dựa trên tất cả các tham số đầu vào (như `page`, `limit`, `filters`, `user_id`) để tránh rò rỉ dữ liệu giữa các người dùng khác nhau.

### 3.4. Controllers (Lớp Điều Phối Mỏng - Thin Controllers)

Controllers trong kiến trúc này phải là **"Thin Controllers"** (Controller Mỏng).

**Mục đích:** Controllers chỉ đóng vai trò là **người điều phối (orchestrators)**, xử lý các mối quan tâm của HTTP (như lấy request, gọi Action, trả về response).

**Nguyên tắc:** **KHÔNG** được chứa logic nghiệp vụ.

**4 Bước Vận Hành Cơ Bản của Controller:**

1.  **Extract Data:** Lấy dữ liệu từ `ctx.request` (query params, body, files).
2.  **Build DTO:** Khởi tạo DTO từ dữ liệu request (`const dto = new RegisterUserDTO(request.all())`). Bước này thực hiện validation ngay lập tức.
3.  **Call Action:** Khởi tạo thủ công Command/Query và gọi phương thức `handle(dto)`.
4.  **Return Response:** Trả về kết quả (JSON, Inertia render, hoặc redirect).

**Lợi ích:** Controller Mỏng giúp **giảm Technical Debt**, tăng khả năng **Testability**, và dễ dàng hiểu mục đích của route. Sau khi refactoring, kích thước Controller đã giảm đáng kể (ví dụ: từ 206 dòng xuống 180 dòng trong Projects Module, nhưng **0%** logic nghiệp vụ).

### 3.5. Base Classes & Cross-cutting Concerns

Mặc dù các Commands/Queries hiện tại không kế thừa từ Base Classes do lỗi DI, chúng ta vẫn cần hiểu các tính năng mà kiến trúc này cung cấp.

| Lớp Base | Tính Năng Chính | Mục Đích |
| :--- | :--- | :--- |
| **BaseCommand** | **Transaction Management** | Đảm bảo tính nhất quán dữ liệu cho multi-table operations. |
| | **Audit Logging** | Ghi lại mọi thay đổi trạng thái quan trọng. |
| | Get Context Helpers | Lấy `Current User`, `Organization Context`. |
| **BaseQuery** | **Caching** | Hỗ trợ Redis caching với TTL. |
| | Cache Key Generation | Tạo key cache nhất quán. |

Các tính năng xuyên suốt (Cross-cutting concerns) như Logging, Rate Limiting, và Notifications được thực hiện bên trong Commands/Queries.

## PHẦN IV: QUY ƯỚC & THỰC HÀNH TỐT NHẤT

### 4.1. Quy Ước Đặt Tên (Naming Conventions)

Quy ước đặt tên phải tuân thủ nghiêm ngặt nguyên tắc **User Intent** (Mục đích của người dùng), không chỉ là các thao tác CRUD (Create, Read, Update, Delete) cơ bản.

| Loại | Quy Ước Sai (❌) | Quy Ước Đúng (✅) | Giải Thích |
| :--- | :--- | :--- | :--- |
| **Commands** | `CreateUserCommand`, `UpdateTaskCommand`. | `RegisterUserCommand`, `UpdateUserProfileCommand`, `AssignTaskCommand`, `ApproveUserCommand`, `SuspendCommand`. | Phản ánh chính xác hành động nghiệp vụ. |
| **Queries** | `UserList`, `FindTask`. | `GetUsersListQuery`, `SearchTasksQuery`, `GetTaskDetailQuery`, `ListOrganizationsQuery`. | Sử dụng prefix `Get, Search, Find, List`. |

### 4.2. An Toàn Dữ Liệu và Hiệu Suất

Hệ thống đã triển khai các biện pháp bảo mật và tối ưu hiệu suất như sau:

#### **4.2.1. Bảo Mật và Xác Thực (Auth Module)**

Module Auth là khu vực có ưu tiên cao nhất do các lỗ hổng nghiêm trọng đã được phát hiện và khắc phục.

*   **Fixed Critical Bug:** Đã sửa lỗi so sánh mật khẩu bằng văn bản thuần (Plain Text Password Comparison). Hiện tại, hệ thống sử dụng **Hash service** để xác minh mật khẩu (ví dụ: Argon2).
*   **Rate Limiting:** Đã thêm giới hạn tần suất truy cập cho các endpoint quan trọng: Login (10 lần/15 phút) và Password Reset (3 requests/giờ) để ngăn chặn tấn công brute force.
*   **Password Strength:** Yêu cầu mật khẩu tối thiểu 8 ký tự, phải chứa chữ và số.
*   **Development Mode:** Có thể tắt hash mật khẩu bằng cách đặt cờ `USE_PASSWORD_HASH = false` trong môi trường Dev để tăng tốc độ lặp lại và dễ debug.

#### **4.2.2. Xử lý Dữ Liệu**

*   **Soft Delete:** Áp dụng soft delete (`deleted_at`) cho các thực thể quan trọng (ví dụ: Task, Organization) để bảo vệ dữ liệu và cho phép phục hồi.
*   **Row Locking:** Sử dụng `forUpdate()` trong Commands (ví dụ: `UpdateTaskCommand`) để tránh race conditions khi nhiều người dùng cùng lúc cố gắng sửa một bản ghi.
*   **Stored Procedures:** Các Commands có khả năng tích hợp với stored procedures hiện có trong DB (ví dụ: `ChangeUserRoleCommand` sử dụng `change_user_role_with_permission`). Tuy nhiên, khuyến nghị chung là thay thế bằng Lucid ORM và Transactions để tăng tính di động (database agnostic) và khả năng kiểm thử.

## PHẦN V: TÌNH TRẠNG REFACTORING VÀ THÀNH TỰU

Dự án đã hoàn thành thành công việc refactoring **6 modules chính** theo mô hình CQRS.

### 5.1. Các Module Đã Hoàn Thành (Thống kê ngày 18/10/2025)

| Module | Số DTOs | Số Commands (Write) | Số Queries (Read) | Tổng Files CQRS | Ghi Chú |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tasks** | 8 | 6 | 6 | 20 | Phức tạp nhất (Time Tracking, Subtasks, Versioning). |
| **Organizations** | 11 | 10 | 6 | 27 | Quản lý đa tổ chức, 16 legacy files đã xóa. |
| **Projects** | 5 | 5 | 3 | 13 | Thay thế 3 Stored Procedures bằng ORM. |
| **Conversations** | 10 | 7 | 3 | 20 | Hỗ trợ Dual Recall Scopes, tích hợp Stored Procedures. |
| **Users** | 6 | 4 | 2 | 12 | Hoàn thành Admin Operations (Approve, Change Role). |
| **Auth** | 5 | 5 | 0 | 10 | Khắc phục lỗ hổng mật khẩu nghiêm trọng. |
| **TOTAL** | **45** | **37** | **20** | **102** | Toàn bộ 6 module cốt lõi đã chuyển sang CQRS. |

### 5.2. Lợi Ích Cụ Thể Sau Khi Refactor

Việc chuyển đổi sang CQRS đã mang lại những cải tiến đáng kể, được đo lường qua các metrics chất lượng code:

| Metrics | Trước (Legacy) | Sau (CQRS) | Cải Thiện |
| :--- | :--- | :--- | :--- |
| **Business Logic trong Controller** | 40% - 60% | **0%** | **-100%** ✅. |
| **Khả năng Kiểm thử (Testability)** | 40% - 60% | **95%** | **+55%** đến **+137%** ✅. |
| **Khả năng Bảo trì (Maintainability)** | 50% | **95%** | **+90%** ✅. |
| **Lỗi Mật khẩu Plain Text** | CRITICAL 🔴 | FIXED ✅ | Security Rating tăng 50%. |
| **Vấn đề Hot Reload** | CRITICAL 🔴 | STABLE ✅ | Do áp dụng Manual Resolution. |
| **Performance (Queries)** | OK (No Caching) | EXCELLENT | **+40%** (do Redis Caching). |
| **Xóa Code Legacy** | Còn sót lại | **~1,760 dòng** đã xóa (chỉ Users & Orgs). | **Giảm Technical Debt** ✅ |

## PHẦN VI: HƯỚNG DẪN PHÁT TRIỂN (DEVELOPER GUIDE)

### 6.1. Nguyên Tắc Vàng Khi Code Actions Mới

Để đảm bảo tính ổn định và tuân thủ pattern **Hybrid CQRS với Manual Resolution**, nhà phát triển cần tuân thủ các quy tắc sau:

1.  **Không bao giờ sử dụng `@inject()` decorator** trên bất kỳ Action Class nào hoặc tham số constructor/method của Action.
2.  **Luôn khởi tạo thủ công** Commands/Queries trong Controller bằng `new Class(ctx)`.
3.  **Controller phải mỏng:** Chỉ xử lý DTO building, gọi Action, và trả về Response.
4.  **Validate trong DTO:** Luôn xác thực dữ liệu đầu vào trong constructor của DTO.
5.  **Commands là Read-Write:** Chỉ Commands được phép thay đổi DB; phải sử dụng **transactions** và **audit logging**.
6.  **Queries là Read-Only:** Queries không được phép thay đổi trạng thái, phải hỗ trợ **caching**.

### 6.2. Checklist Khi Tạo Action Mới

Khi tạo một Action mới, hãy sử dụng các checklist sau để đảm bảo tuân thủ tiêu chuẩn:

#### **6.2.1. Command Checklist (Thao tác Ghi)**

*   [ ] Tên Command phản ánh **User Intent** (không phải CRUD).
*   [ ] Có DTO rõ ràng với **validation tại constructor**.
*   [ ] Sử dụng `executeInTransaction()` hoặc `db.transaction()` cho các thao tác multi-table.
*   [ ] Gọi `logAudit()` cho các thao tác quan trọng (tạo, sửa, xóa).
*   [ ] **Kiểm tra Permissions** trước khi thực hiện logic nghiệp vụ.
*   [ ] Logic phức tạp đã được tách thành `private methods`.
*   [ ] **Vô hiệu hóa cache** cho các Queries bị ảnh hưởng.
*   [ ] Viết tests.

#### **6.2.2. Query Checklist (Thao tác Đọc)**

*   [ ] Tên Query bắt đầu với `Get/Search/Find/List`.
*   [ ] Có DTO rõ ràng.
*   [ ] Đảm bảo **KHÔNG thay đổi trạng thái** hệ thống.
*   [ ] Sử dụng caching (`executeWithCache()`) nếu phù hợp (cho các truy vấn thường xuyên hoặc tốn kém).
*   [ ] Query Building Logic đã được tách thành `private methods`.
*   [ ] Viết tests.

#### **6.2.3. Controller Checklist (Lớp Điều Phối)**

*   [ ] Controller thực sự **mỏng** (chỉ 5-15 dòng code cho mỗi route handler).
*   [ ] Không có **logic nghiệp vụ** trong controller.
*   [ ] Chỉ giữ lại các bước: Lấy data → Build DTO → Call Action → Trả Response.
*   [ ] Sử dụng các helper `private methods` để xây dựng DTO từ request.
*   [ ] Xử lý lỗi (try/catch) và trả về thông báo thân thiện với người dùng (tiếng Việt).

---

**Tài liệu này được tạo ra dựa trên tổng hợp các báo cáo phân tích, hướng dẫn refactoring và tóm tắt tiến độ từ ngày 18/10/2025**.
