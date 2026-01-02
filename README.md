# SUAR — Nền tảng quản lý công việc & xác thực năng lực thực tế

---

## Suar là gì?

Hãy tưởng tượng bạn là một thành viên trong tổ chức hoặc một contributor bên ngoài. Bạn ghi vào hồ sơ rằng mình "giỏi React", "có 5 năm kinh nghiệm Node.js", "thành thạo thiết kế UI/UX". Nhưng ai tin bạn? Bạn tự viết, tự chấm, tự khen mình. Không ai kiểm chứng được.

**Suar ra đời để giải quyết chính xác vấn đề đó.**

Suar không chỉ là một công cụ quản lý công việc như Jira hay Trello. Nó là một hệ sinh thái hoàn chỉnh nơi **năng lực của bạn được xác thực bằng dữ liệu thực tế** — từ những công việc bạn đã làm, từ những đánh giá của quản lý và đồng nghiệp, từ những con số không thể bịa đặt.

Triết lý cốt lõi của Suar được tóm gọn trong một vòng lặp:

> **Làm việc → Được đánh giá → Hồ sơ đẹp hơn → Được chọn nhiều hơn → Làm thêm việc → Lại được đánh giá → Hồ sơ càng mạnh → ...**

Đó là vòng lặp tích cực. Càng làm tốt, hồ sơ càng sáng. Càng sáng, càng được tin tưởng. Và điều này áp dụng cho **mọi người dùng** trên hệ thống — không phân biệt bạn là thành viên trong tổ chức hay contributor bên ngoài. Ai cũng có hồ sơ, ai cũng được đánh giá, ai cũng có spider chart và điểm tin cậy.

Một người thuộc tổ chức A vẫn hoàn toàn có thể gửi đề xuất tham gia task công khai của tổ chức B qua Marketplace. Không có ranh giới cứng nhắc nào ngăn cản điều đó.

---

## Trạng thái repo hiện tại

Đây là những sự thật quan trọng nhất của hệ thống ở thời điểm hiện tại:

- **Chỉ có social login**: đăng nhập bằng Google hoặc GitHub. Không dùng Firebase, không có email/password flow truyền thống.
- **Có 3 bề mặt chính**:
  - `User workspace`: làm việc, gửi đề xuất tham gia task công khai, review, profile, notifications
  - `System Admin`: `/admin/*`
  - `Organization workspace`: `/org/*`
- **Subscription là của tài khoản người dùng**, không phải gói của organization. Hướng sản phẩm hiện tại là `Pro` và `Pro Max` cho **user account**.
- **Task workflow dùng `task_status_id` làm chuẩn**. Trường `status` chỉ còn mang vai trò legacy compatibility ở một số luồng.
- **Mỗi task bắt buộc thuộc đúng một project**. Quan hệ nghiệp vụ chuẩn là `organization -> project -> task`; không có luồng task đứng độc lập ở cấp organization.
- **Task creation hiện giàu metadata hơn trước**: required skills, acceptance criteria, verification method, task type, tech stack, learning objectives, domain tags...
- **Review flow hiện có nhiều lớp**: review session cũ, task review workflow board, sprint review packages, sprint reverse review board, dispute, case file, AI advisory callback, evidence, self-assessment, confirmation, anomaly detection.
- **Reverse review mới chạy ở mốc sprint-close**, không còn tạo mới ở cấp từng task review session. Task-level reverse review routes còn là compatibility/read-history surface.
- **Profile hiện có 4 spider charts**: `Technology`, `Engineering`, `Soft Skills`, `Delivery`, và có flow snapshot publish / history / public-private / rotate share link. Docs hiện coi chart này là runtime hiện tại, không phải capability model cuối cùng.
- **Notification, audit logs và user activity logs có boundary riêng** qua public API của từng module, không ghi trực tiếp từ listener vào repository.
- **Backend đã chuyển sang `app/modules/*`**. Boundary cross-module đi qua `public_contracts/*`, `actions/services/*`, bootstrap adapters, hoặc public API có kiểm soát trong từng module.
- **Frontend đã chuyển sang `inertia/apps/{user,org,admin}`**, không còn là một cây `inertia/pages` phẳng.
- **Boundary violations baseline**: `0`.
- **Test inventory hiện tại**: generated module inventory nằm ở `docs/test/generated/module_suite_matrix.md` và tách riêng `unit`, `integration`, `contract`, `component`, `E2E`. File count chỉ là inventory, không phải coverage/pass guarantee; `integration` pass không chứng minh `E2E` pass.

---

## Câu chuyện của một người dùng

### Chương 1: Bước chân vào Suar

Bạn mở trình duyệt, truy cập Suar. Không có form đăng ký dài dòng, không cần nhớ mật khẩu. Bạn chỉ cần nhấn **"Đăng nhập bằng Google"** hoặc **"Đăng nhập bằng GitHub"** — chỉ hai lựa chọn, đơn giản và an toàn. Suar không hỗ trợ đăng ký bằng email/mật khẩu truyền thống.

Lần đầu tiên đăng nhập, hệ thống tự động tạo tài khoản cho bạn. Bạn trở thành một **registered_user** — một người dùng bình thường. Tài khoản của bạn ở trạng thái **active** (hoạt động), sẵn sàng để khám phá.

Ngay lập tức, bạn thấy trang hồ sơ cá nhân của mình. Nó khá trống trải — chưa có gì cả. Hệ thống hiện một thanh tiến độ **"Hoàn thiện hồ sơ"** nhắc nhở bạn: hãy thêm ảnh đại diện, viết một đoạn giới thiệu bản thân (bio), điền số điện thoại, địa chỉ, múi giờ, ngôn ngữ ưa thích...

Trang hồ sơ hiển thị cho mọi người dùng: rating, số task đã hoàn thành, điểm tin cậy (trust score), các biểu đồ kỹ năng spider chart, review nổi bật và các chỉ số delivery. Với chính chủ hồ sơ, còn có thêm khu vực **publish snapshot** để đóng gói hồ sơ thành một phiên bản chia sẻ được. Tất cả ban đầu đều bằng 0 — chưa có gì để khoe. Nhưng điều đó sẽ thay đổi khi bạn bắt đầu làm việc.

### Chương 2: Kỹ năng — xương sống của mọi thứ

Phần kỹ năng (Skills) là linh hồn của Suar. Bạn có thể thêm các kỹ năng mình có vào hồ sơ. Hệ thống chia kỹ năng thành **4 nhóm canonical**:

- **Công nghệ (Technology):** React, TypeScript, Node.js, PostgreSQL, Docker... — ngôn ngữ, framework, runtime, database, tool, platform.
- **Kỹ thuật phần mềm (Engineering):** OOP, Design Patterns, Clean Code, API Design, System Design, Testing Strategy, Code Review, Design System.
- **Kỹ năng mềm (Soft Skills):** Giao tiếp, Lãnh đạo, Giải quyết vấn đề...
- **Thực thi (Delivery):** Planning, Estimation, Release, Risk Tracking, Documentation — đo lường cách bạn hoàn thành và bàn giao công việc.

Khi thêm một kỹ năng, hệ thống hiện ưu tiên ladder chi tiết **15 mức `L0` → `L14`** theo KB v5 và scale `system_default`:

| Mức canonical | Tên hiển thị    | Vai trò                                                       |
| ------------- | --------------- | ------------------------------------------------------------- |
| `L0`          | Unassessed      | Chưa có bằng chứng review đáng tin                            |
| `L1`          | Beginner        | Biết nền tảng rất cơ bản                                      |
| `L2`          | Elementary      | Làm được việc đơn giản khi có hướng dẫn                       |
| `L3`          | Junior Low      | Bắt đầu làm được task thật phạm vi nhỏ                        |
| `L4`          | Junior Solid    | Tự làm tốt task nhỏ rõ scope                                  |
| `L5`          | Junior High     | Gần chạm mức middle ở task vừa                                |
| `L6`          | Middle Low      | Tự xử lý task medium-complexity                               |
| `L7`          | Middle Solid    | Deliver ổn định, maintainable                                 |
| `L8`          | Middle High     | Xử lý ambiguity và dependency tốt                             |
| `L9`          | Senior Low      | Sở hữu task phức tạp có ảnh hưởng rộng hơn                    |
| `L10`         | Senior Solid    | Nâng chuẩn chất lượng, dẫn dắt solution area                  |
| `L11`         | Senior High     | Ảnh hưởng nhiều vùng, trade-off chiến lược                    |
| `L12`         | Lead            | Dẫn delivery và phối hợp nhiều người                          |
| `L13`         | Principal       | Định hình standard/architecture vượt 1 team                   |
| `L14`         | Expert / Master | Chuyên gia mức rất cao, bằng chứng lặp lại qua nhiều bối cảnh |

Các broad band cũ như `Junior`, `Middle`, `Senior`, `Lead` vẫn còn tồn tại ở một số flow compatibility, nhưng chúng không còn là mô hình mô tả chi tiết chính.

Nhưng đây mới chỉ là **tự khai báo** (source = `imported`). Kỹ năng tự khai báo có độ tin cậy bằng 0. Giá trị thật sự sẽ đến sau, khi người khác đánh giá bạn qua công việc thực tế — lúc đó kỹ năng sẽ chuyển source thành `reviewed` với dữ liệu từ đánh giá thật.

Kỹ năng được hiển thị dưới dạng **Spider Chart** (biểu đồ mạng nhện / biểu đồ radar). Hiện tại hồ sơ đã tách thành **4 chart riêng**:

- **Technology**
- **Engineering**
- **Soft Skills**
- **Delivery**

Mỗi chart phân biệt rõ: **đường liền** là dữ liệu đã được review (đáng tin), **đường đứt** là dữ liệu tự khai báo (chưa kiểm chứng).

### Chương 3: Tổ chức — ngôi nhà chung

Suar hoạt động theo mô hình **Tổ chức (Organization)**. Một tổ chức có thể là một công ty, một nhóm startup, một team dự án... Muốn bắt đầu làm việc trên Suar (tạo dự án, tạo task), bạn cần thuộc về ít nhất một tổ chức.

**Có hai cách để gia nhập:**

1. **Được mời (Invitation):** Chủ tổ chức hoặc admin tạo lời mời. Người được mời chấp nhận lời mời để gia nhập. _(Lưu ý: tính năng gửi lời mời qua email chưa được triển khai — hiện tại chỉ có luồng tạo invitation trong hệ thống.)_

2. **Tự gửi yêu cầu (Join Request):** Bạn tìm thấy một tổ chức, gửi yêu cầu gia nhập kèm lời nhắn. Admin hoặc chủ tổ chức sẽ duyệt: chấp nhận hoặc từ chối.

Cả hai cách đều phải qua bước **phê duyệt** — không ai có thể tự ý nhảy vào tổ chức của người khác.

Mỗi tổ chức có **3 vai trò:**

| Vai trò                   | Quyền hạn                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Chủ tổ chức (Owner)**   | Toàn quyền: quản lý thành viên, cài đặt, dự án, quy trình làm việc. Có thể chuyển quyền sở hữu cho người khác.       |
| **Quản trị viên (Admin)** | Mời/xóa thành viên, tạo dự án, duyệt yêu cầu gia nhập.                                                               |
| **Thành viên (Member)**   | Xem và tham gia các dự án mình được phân công, Marketplace task công khai, gửi đề xuất tham gia task, được đánh giá. |

> _Lưu ý về business model:_ Organization hiện **không** có gói đăng ký công khai riêng. Cơ chế subscription của Suar đang áp dụng cho **tài khoản người dùng** trên Marketplace.

Nếu bạn là thành viên của nhiều tổ chức? Không sao — Suar cho phép bạn **chuyển đổi** giữa các tổ chức. Hệ thống ghi nhớ tổ chức nào bạn đang làm việc (`current_organization_id`).

### Chương 4: Dự án và Công việc — trái tim của hệ thống

Cấu trúc làm việc của Suar là: **Tổ chức → Dự án → Công việc**.

- Một tổ chức có thể có một hoặc nhiều project
- Một project chỉ thuộc một tổ chức
- Một project có thể có một hoặc nhiều task
- Một task chỉ thuộc đúng một project

Bên trong mỗi tổ chức, bạn tạo các **Dự án (Project)**. Mỗi dự án có tên, mô tả, ngày bắt đầu, ngày kết thúc, và trạng thái (Chờ xử lý → Đang tiến hành → Hoàn thành / Hủy bỏ).

Dự án có các vai trò riêng:

| Vai trò                               | Quyền                                                                 |
| ------------------------------------- | --------------------------------------------------------------------- |
| **Chủ dự án (Project Owner)**         | Quản lý cài đặt, thành viên, xóa dự án                                |
| **Quản lý dự án (Project Manager)**   | Tạo/sửa/xóa task, giao task, quản lý trạng thái                       |
| **Thành viên dự án (Project Member)** | Xem task, thay đổi trạng thái task mình được giao, ghi nhận thời gian |
| **Người xem (Project Viewer)**        | Chỉ xem — không chỉnh sửa gì                                          |

Một tùy chọn quan trọng: **"Cho phép Contributor bên ngoài"** (Allow External Contributor). Khi bật tùy chọn này, các task trong dự án có thể xuất hiện trên Marketplace để người ngoài tổ chức gửi đề xuất tham gia.

Bên trong mỗi dự án chính là các **Công việc (Task)** — đây là đơn vị nhỏ nhất mà mọi thứ xoay quanh. Mỗi task chỉ được giao cho **một người duy nhất** — một người chịu trách nhiệm hoàn thành, và task luôn sống trong một project cụ thể.

Mỗi task có:

- **Tiêu đề** và **Mô tả** chi tiết
- **Workflow Status** qua `task_status_id` — task luôn nằm trong một trạng thái thuộc workflow của tổ chức
- **Nhãn (Label):** Bug, Feature, Enhancement, Documentation
- **Ưu tiên (Priority):** Thấp, Trung bình, Cao, Khẩn cấp
- **Độ khó (Difficulty):** Dễ, Trung bình, Khó, Chuyên gia
- **Người được giao (Assignee)** — chỉ một người
- **Hạn chót (Due date)** — UI khuyến khích nhập rõ; nếu bỏ trống thì backend có thể tự suy ra mốc mặc định cho một số flow
- **Thời gian ước tính (estimated_time)** và **thời gian thực tế (actual_time)** — tính bằng giờ
- **Task cha/con:** task có thể chia nhỏ thành subtask
- **Kỹ năng yêu cầu:** runtime hiện cần tối thiểu 1 skill cho từng nhóm `Technology`, `Engineering`, `Soft Skills`, `Delivery`; mỗi skill có level tối thiểu theo ladder chi tiết `L0` → `L14` thay vì chỉ 8 band rộng
- **Acceptance Criteria:** đầu ra nào được xem là đạt
- **Verification Method:** cách xác minh task đã hoàn thành đúng chưa
- **Task Type:** loại task để hệ thống hiểu ngữ cảnh công việc
- **Context Background / Tech Stack / Learning Objectives / Domain Tags:** metadata bổ sung để task rõ ràng hơn và dùng lại được cho review/profile
- **Tầm nhìn (Visibility):** Internal / External / All — quyết định task có hiện trên Marketplace không
- **Thứ tự sắp xếp (sort_order):** cho tính năng kéo thả trên Kanban/List view

Hệ thống lưu lại **toàn bộ lịch sử thay đổi** của mỗi task — ai thay đổi gì, lúc nào — đều được ghi lại.

### Chương 5: Quy trình làm việc

Giống như Jira hay Trello, Suar cho phép mỗi tổ chức tùy chỉnh quy trình trạng thái cho task. Đây là tính năng quen thuộc trong các công cụ quản lý dự án — mỗi tổ chức có thể thêm trạng thái mới, bớt luồng chuyển đổi, nhưng **không thể xóa 4 trạng thái hệ thống** (TODO, IN_PROGRESS, DONE, CANCELLED).

Mặc định, khi một tổ chức mới được tạo, hệ thống cung cấp sẵn **7 trạng thái**, thuộc **4 nhóm cố định:**

| Nhóm            | Trạng thái mặc định                         | Ý nghĩa                                                    |
| --------------- | ------------------------------------------- | ---------------------------------------------------------- |
| **TODO**        | TODO                                        | Chưa bắt đầu — mặc định cho task mới                       |
| **IN_PROGRESS** | IN_PROGRESS, DONE_DEV, IN_TESTING, REJECTED | Đang làm: triển khai, code xong, đang test, bị trả lại     |
| **DONE**        | DONE                                        | Hoàn thành — trạng thái cuối cùng, không chuyển đi đâu nữa |
| **CANCELLED**   | CANCELLED                                   | Hủy bỏ — có thể mở lại (reopen) về TODO                    |

Quy trình chuyển trạng thái mặc định:

```
TODO → IN_PROGRESS (bắt đầu làm, yêu cầu phải có người được giao)
TODO → CANCELLED (hủy bỏ)
IN_PROGRESS → DONE_DEV (code xong)
IN_PROGRESS → TODO (gỡ giao, quay về hàng đợi)
DONE_DEV → IN_TESTING (chuyển sang test)
DONE_DEV → IN_PROGRESS (cần sửa lại)
IN_TESTING → DONE (test qua → HOÀN THÀNH → TỰ ĐỘNG tạo phiên đánh giá!)
IN_TESTING → REJECTED (test fail → trả lại)
REJECTED → IN_PROGRESS (sửa và thử lại)
CANCELLED → TODO (mở lại)
```

Điều cực kỳ quan trọng: **Khi bất kỳ task nào chuyển sang trạng thái thuộc nhóm DONE → hệ thống tự động kích hoạt quy trình đánh giá 360° bắt buộc** (xem Chương 7).

Bạn có thể xem task theo **2 giao diện chính:**

- **Kanban Board:** bảng cột, kéo thả task giữa các cột trạng thái — trực quan, nhanh gọn.
- **List View:** bảng danh sách, gom nhóm theo trạng thái, sửa nhanh ngay tại chỗ.

Việc **đổi trạng thái** của task được ưu tiên thực hiện qua Kanban hoặc panel chi tiết để luôn đi đúng workflow transition của tổ chức, thay vì sửa bừa trong một form generic.

> ⭐ _Cần nghiên cứu thêm: Giao diện Gantt Timeline (biểu đồ Gantt xem timeline theo ngày/tuần/tháng) đang được lên kế hoạch phát triển._

### Chương 6: Marketplace — nơi khám phá task công khai

Đây là cầu nối giữa các tổ chức và những người muốn đóng góp vào task công khai. Bất kỳ ai đã đăng nhập — dù là thành viên tổ chức khác hay contributor bên ngoài — đều có thể duyệt và gửi đề xuất tham gia.

Bất kỳ task nào trong một dự án có bật "Cho phép Contributor bên ngoài" cũng có thể được đưa lên Marketplace bằng cách thay đổi **Tầm nhìn (Visibility):**

| Tầm nhìn                | Ý nghĩa                                                  |
| ----------------------- | -------------------------------------------------------- |
| **Internal** (mặc định) | Chỉ người trong tổ chức thấy                             |
| **External**            | Chỉ hiện trên Marketplace, không hiện trong board nội bộ |
| **All**                 | Hiện cả hai nơi — nội bộ lẫn Marketplace                 |

Khi tạo task, các thông tin quan trọng phải đủ rõ để task có thể đi tiếp đến review và profile: **workflow status**, tiêu đề, mô tả đủ chi tiết, độ khó, deadline, thời gian ước tính, **ít nhất 1 kỹ năng yêu cầu cho từng nhóm canonical**, **acceptance criteria**, và **verification method**. Điều này đảm bảo cả người giao task lẫn người nhận task đều có đủ thông tin, và hệ thống có đủ dữ liệu để tính toán đánh giá sau này.

Khi task lên Marketplace, hệ thống tự động tính **hạn gửi đề xuất (Application Deadline)** = deadline - thời gian ước tính. Ví dụ:

- Task deadline: 30/01
- Thời gian ước tính: 5 ngày (40 giờ, quy đổi 1 ngày = 8 giờ)
- → Hạn gửi đề xuất: 25/01

Sau hạn gửi đề xuất, task vẫn hiện trên Marketplace nhưng nút gửi đề xuất bị khóa. Mọi người vẫn có thể xem task, chỉ không nhận đề xuất mới.

**Trải nghiệm trên Marketplace:**

Bạn mở Marketplace, và thấy danh sách các task công khai. Có thể lọc theo kỹ năng, độ khó, thời gian... Thấy task phù hợp? Nhấn **"Gửi đề xuất"**. Hồ sơ của bạn (kỹ năng, spider chart, điểm tin cậy) là evidence profile được đính kèm. Bạn có thể thêm lời nhắn nếu muốn, nhưng không bắt buộc.

Mỗi người chỉ được gửi **1 đề xuất tham gia cho mỗi task**. Và bạn có thể **rút đề xuất** bất cứ lúc nào.

Ngoài Marketplace task công khai, bạn cũng có thể duyệt hồ sơ người dùng khác. Thấy ai có profile ấn tượng? Có thể **mời họ vào tổ chức** hoặc **mời trực tiếp vào task** (tính năng invitation — đang trong lộ trình phát triển).

**Phía tổ chức đăng task:**

Người tạo task mở tab "Đề xuất tham gia", thấy danh sách người gửi đề xuất. Mỗi người hiện tên, rating, kỹ năng, spider chart, điểm tin cậy.

Nhấn **"Duyệt"** → Hệ thống tự động:

1. Gán người được duyệt vào task
2. Cập nhật người được giao
3. **Từ chối tất cả đề xuất tham gia còn lại** cho task đó
4. Thông báo cho người được duyệt

Nhấn **"Từ chối"** → Phải ghi lý do từ chối.

Hiện tại application qua Marketplace (`public_listing`) đã được triển khai. Tương lai sẽ có thêm luồng **mời trực tiếp (invitation)** — PM biết ai giỏi thì mời thẳng, không cần đợi application tự gửi.

Ngoài browse/apply flow, hệ thống hiện đã có **application match score** và **ranking list** cho từng task để người phụ trách so sánh người gửi đề xuất tham gia. Ở bề mặt sourcing, manager cũng đã có **org talent directory** và **talent bookmarks**: `/org/talents`, `/org/talents/:userId`, `/org/bookmarks`, cùng legacy redirects từ `/marketplace/talents` và `/marketplace/bookmarks`. Surface này là management-side workspace có current organization context, không phải public anonymous search.

### Chương 7: Đánh giá 360° — khoảnh khắc sự thật

Đây là **trái tim thật sự** của Suar. Khi một task đi qua completion/submission flow, review không còn chỉ là một form chấm điểm. Runtime hiện có hai lớp cần phân biệt:

1. **Review Session**: phiên đánh giá skill/performance cho assignment.
2. **Task Review Workflow Board**: board review riêng cho task delivery-done, tách khỏi task delivery status.

Task vẫn ở cột delivery `done` trong Task Board, nhưng Review Board có workflow riêng:

```text
awaiting_review -> in_review -> awaiting_response -> disputed -> reported -> done
```

Đây là board lane chính. Khi vụ việc đi vào admin/AI handling, workflow có thể tạm ghi thêm `ai_reviewing` hoặc `resolved`; sprint-close gate vẫn chỉ coi review debt xong khi workflow về `done`.

Điều này giúp project thấy task nào đã làm xong nhưng phần review/governance còn nợ.

Phiên đánh giá hoạt động ra sao?

Bắt đầu ở trạng thái **Pending** (chờ xử lý). Khi có người đầu tiên gửi đánh giá → chuyển sang **In Progress** (đang tiến hành).

Hai luồng đánh giá diễn ra **song song**:

- **Quản lý (Manager)** đánh giá từng kỹ năng của người được đánh giá, đồng thời có thêm bộ chỉ số tổng quan như chất lượng đầu ra, đúng hạn, bám yêu cầu, giao tiếp, chất lượng code, mức chủ động, và có muốn làm việc tiếp hay không
- **Đồng nghiệp (Peer)** cũng đánh giá — cần tối thiểu **2 peer reviews**

Mỗi reviewer chấm từng kỹ năng liên quan, mỗi kỹ năng chọn một mức proficiency theo ladder canonical `L0` → `L14` (hoặc broad band compatibility nếu flow cũ chưa migrate hết), kèm theo nhận xét bằng chữ. Ngoài phần chấm điểm, reviewer còn có thể đính kèm **evidence** để chứng minh nhận định của mình.

Song song với đó, người được đánh giá cũng có thể gửi **self-assessment** sau khi hoàn thành task: mức độ hài lòng, độ khó cảm nhận, confidence, điều làm tốt, điều sẽ làm khác đi, blocker, kỹ năng còn thiếu và kỹ năng thấy mình mạnh.

Khi đủ review (quản lý xong + ≥2 peer) → phiên tự động **hoàn thành (Completed)**.

Deadline review session mặc định hiện là khoảng **72 giờ** từ governance helper. Docs không nên claim có force-close 14 ngày nếu không đối chiếu lại code/test hiện tại.

### Chương 8: Xác nhận kết quả — bước cuối trước khi cập nhật hồ sơ

Khi phiên đánh giá hoàn thành (đủ review từ quản lý + ≥2 peer), **hệ thống chưa cập nhật hồ sơ ngay**. Trước tiên, người được đánh giá phải xem kết quả và đưa ra quyết định:

- Xem spider chart dự kiến (tính toán từ các review vừa nhận)
- Xem chi tiết ai chấm gì
- Có 2 lựa chọn:
  - **Xác nhận (Confirm):** Đồng ý với kết quả → Hệ thống tiến hành cập nhật hồ sơ.
  - **Tranh chấp (Dispute):** Không đồng ý, ghi lý do → Phiên chuyển sang trạng thái **Disputed**.

Nếu tranh chấp, **Admin hệ thống (System Admin)** sẽ xem xét và giải quyết — có thể yêu cầu đánh giá lại, ghi đè kết quả, hoặc bác bỏ tranh chấp.

Hiện tại backend/admin flow đã có **case file snapshot** và **AI evaluation bất đồng bộ** để hỗ trợ System Admin. AI chỉ trả về recommendation qua callback có xác thực request; **Admin vẫn là người ra quyết định cuối cùng** và AI không tự resolve dispute.

Về bề mặt UI, flow này không còn chỉ là backend-only: đã có **user dispute thread** ở `/reviews/disputes/:id` và **admin dispute queue/detail** ở `/admin/disputes` + `/admin/disputes/:id`. Phần còn thiếu là operator console chuyên biệt hơn cho AI/dispute analytics.

**Chỉ sau khi xác nhận (hoặc tranh chấp được giải quyết xong)**, hệ thống mới tổng hợp data và cập nhật hồ sơ:

**1. Spider Chart cập nhật:**
Biểu đồ kỹ năng radar được tính lại. Runtime hiện lưu `avg_percentage`, `verified_public_proficiency_code`, và `last_calculated_at` ngay trên `user_skills` cho các skill thuộc chart, rồi quy đổi về ladder chi tiết `L0` → `L14` (ví dụ `L4 · Junior Solid`, `L7 · Middle Solid`, `L10 · Senior Solid`). Kỹ năng chuyển từ `source = 'imported'` sang `source = 'reviewed'` khi đã có dữ liệu đánh giá thật.

Lưu ý: đây là aggregate phục vụ hiển thị/profile signal, không phải toàn bộ capability conclusion cuối cùng. Capability còn phụ thuộc context, confidence, evidence quality, dispute state, và governance.

**2. Điểm tin cậy (Trust Score) tính lại:**
Trust score được tính qua command riêng với nhiều tín hiệu như verified review volume, recency, reviewer credibility, evidence coverage, consistency, organization signal, và tier weight. Điểm này phản ánh mức độ đáng tin của hồ sơ, không nên đọc như trung bình đơn giản của spider chart.

**3. Cập nhật Credibility (Độ đáng tin của reviewer):**
Mỗi người review cũng có điểm credibility riêng. Công thức:

```
credibility_score = 50 + (confirmed/total) × 40 - (disputed/total) × 30
```

Reviewer đánh giá chính xác (được xác nhận) → credibility tăng. Đánh giá gian lận (bị tranh chấp) → credibility giảm.

**4. Rating và số task hoàn thành cập nhật.**

Sau khi hồ sơ đã được cập nhật, người dùng có thể **publish profile snapshot** để đóng gói trạng thái hồ sơ hiện tại thành một phiên bản chia sẻ được. Snapshot có:

- **Version**
- **Lịch sử snapshot**
- **Public/Private access**
- **Share link có thể rotate lại**

Điều này cho phép bạn chia sẻ một "bản hồ sơ tại thời điểm X" thay vì để profile public luôn biến động.

### Chương 9: Đánh giá ngược (Reverse Review) — hướng sản phẩm hiện tại

`Reverse review` vẫn là capability của Suar, nhưng **không còn chạy ở cấp từng task review session** nữa.

Quyết định sản phẩm cập nhật ngày `2026-07-09`:

- Task đi vào review chỉ xử lý **review xuôi** cho người làm task.
- Nếu có tranh chấp, hồ sơ tranh chấp sẽ ôm luôn **task + review + toàn bộ task comments + phần trao đổi dispute**.
- `Reverse review` sẽ được dời sang **mốc kết thúc sprint / kỳ tổng kết**, không phát sinh ngay sau từng task.

Runtime hiện tại đã có sprint-close flow:

1. Project owner/manager mở review cho sprint.
2. Hệ thống chặn nếu các `task_review_workflows` đã tồn tại cho task trong sprint còn chưa `done`.
3. Hệ thống chặn nếu reverse-review workflows của sprint trước chưa `done`.
4. Hệ thống tạo `sprint_review_packages`, mở two-lane reverse board cho `assigner` và `environment`, rồi tạo sprint kế tiếp.

Điều này giúp giảm tải thao tác ở mỗi task, tránh kéo dài flow xác nhận hoàn thành, và giữ `reverse review` ở đúng ngữ cảnh đánh giá môi trường làm việc dài hơi hơn.

### Chương 10: Phát hiện gian lận — giữ hệ thống sạch

Với hệ thống đánh giá mở, luôn có rủi ro bị lạm dụng. Suar dùng **hệ thống phát hiện bất thường tự động (DetectAnomalyCommand)** chạy sau **mỗi lượt đánh giá được gửi**:

**3 loại bất thường đã triển khai:**

| Loại bất thường                                     | Mô tả                                                                                                                 |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Đánh giá hàng loạt cùng level (bulk_same_level)** | Reviewer chấm cùng một level cho > 80% kỹ năng → đánh giá không nghiêm túc                                            |
| **Tài khoản mới nhận level cao (new_account_high)** | Tài khoản dưới 30 ngày được chấm ở vùng senior trở lên của ladder canonical (thường từ `L9` / Senior Low) → đáng nghi |
| **Đánh giá qua lại cao (mutual_high)**              | Hai người liên tục đánh giá cao lẫn nhau > 3 lần → nghi ngờ "trao đổi điểm"                                           |

**3 loại bất thường khai báo nhưng chưa triển khai:** sudden_spike, frequency_anomaly, ip_collusion.

Khi phát hiện bất thường, hệ thống tạo một **Flagged Review** với mức độ nghiêm trọng (low / medium / high / critical). System Admin sẽ điều tra:

- **Bỏ qua (Dismiss):** không có vấn đề, false positive.
- **Xác nhận (Confirm):** bất thường có thật → credibility_score của reviewer bị giảm.

### Chương 11: Hệ thống phân quyền 3 tầng — ai được làm gì

Suar có hệ thống phân quyền rõ ràng, chia thành 3 tầng:

**Tầng 1 — Hệ thống (System Level):**

- **Superadmin:** Toàn quyền tuyệt đối, bỏ qua mọi kiểm tra quyền.
- **System Admin:** Quản lý người dùng (duyệt, tạm ngưng, phân quyền), xem tất cả tổ chức, xem log, quản lý cài đặt hệ thống.
- **Registered User:** Người dùng bình thường — không có quyền ở tầng hệ thống.

**Tầng 2 — Tổ chức (Organization Level):**

- Org Owner > Org Admin > Org Member

**Tầng 3 — Dự án (Project Level):**

- Project Owner > Project Manager > Project Member > Project Viewer

Quyền kế thừa từ trên xuống. Superadmin tự động có mọi quyền. Org Admin/Owner có thể override quyền cấp project. Project Owner thừa hưởng quyền của Manager, v.v.

Riêng **Marketplace task công khai** hoạt động ngoài tầng tổ chức — bất kỳ ai đã đăng nhập đều có thể duyệt và gửi đề xuất tham gia.

**Trên frontend hiện tại, 3 tầng này cũng đã được tách thành 3 bề mặt giao diện rõ ràng:**

- **User workspace (`/`)**: task, marketplace, profile, review, notifications, settings tài khoản.
- **System Admin (`/admin`)**: dashboard hệ thống, user management, organization oversight, audit logs, flagged reviews.
- **Organization workspace (`/org`)**: dashboard tổ chức, thành viên, lời mời, yêu cầu tham gia, workflow, dự án, task board, review quality, talent directory, bookmarks.

Các màn legacy như `/organizations/*` hoặc `/users/*` vẫn còn tồn tại để tương thích luồng cũ, nhưng hướng chuẩn hiện tại là:

- dùng `/admin/*` cho quản trị hệ thống,
- dùng `/org/*` cho quản trị tổ chức,
- dùng các màn user-facing ở root cho trải nghiệm cá nhân.

### Chương 12: Thông báo và Nhật ký

Suar lưu các accountability records theo runtime mặc định **PostgreSQL-first**:

- **Audit Logs (`audit_events`):** ghi lại mọi hoạt động quan trọng — ai tạo task, ai thay đổi trạng thái, ai mời ai, ai duyệt đơn...
- **Notifications (`notifications`):** thông báo gửi cho người dùng khi có sự kiện liên quan đến họ.

`audit_events.source_occurred_at` giữ thời điểm producer quan sát sự kiện;
`audit_events.occurred_at` giữ thứ tự record/hash chain từ database. Generic
UserActivity runtime đã retired; bảng cũ chỉ còn archive read-only qua migration.

> _Lưu ý: Hiện tại hệ thống thông báo chưa có real-time (WebSocket/SSE chưa được kích hoạt — transport = null). Thông báo được tải khi người dùng truy cập trang._

### Chương 13: Gói đăng ký & Mức độ ưu tiên trên Marketplace

Đây là cơ chế kinh doanh cốt lõi của Suar.

**Vấn đề:** Một người mới tham gia hệ thống chưa có dữ liệu đánh giá nào — spider chart trống, trust score = 0, chưa hoàn thành task nào. Họ hoàn toàn có thể **import dữ liệu kỹ năng từ bên ngoài** vào hồ sơ, nhưng vì đây là dữ liệu tự khai báo (`source = 'imported'`), độ tin cậy = 0.

**Giải pháp — Gói đăng ký (User Subscriptions):**

Hiện tại có **2 gói trả phí cho tài khoản người dùng**: **Pro** và **Pro Max**. Nếu không mua gói, tài khoản vẫn ở mức cơ bản (`free/base`) và vẫn có thể dùng hệ thống bình thường.

> _Quan trọng:_ Đây là gói cho **user account**, không phải gói cho organization.
> Điều này cũng được phản ánh ở frontend: trang `Settings > Account` nói về gói của người dùng, còn các màn organization không nên quảng bá `organization billing` như một capability sản phẩm chính thức.

Gói đăng ký ảnh hưởng trực tiếp đến **ranking_priority** (mức ưu tiên sắp xếp) — đây là thứ tự hiển thị hồ sơ khi tổ chức tìm kiếm talent. Ai có ranking_priority cao hơn sẽ được hiện lên trước.

Cơ chế hoạt động:

| Trường hợp                                                             | Kết quả                                                                                                                          |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Người có dữ liệu hệ thống (đã review)** + **không mua gói**          | Có hồ sơ đáng tin cậy, ranking ở mức cơ bản                                                                                      |
| **Người có dữ liệu hệ thống** + **mua gói Pro**                        | Ranking tốt hơn — ưu tiên hiển thị cao hơn                                                                                       |
| **Người mới, không có data** + **mua gói Pro**                         | Ranking ngang bằng người có data hệ thống nhưng không mua gói                                                                    |
| **Người mới, không có data** + **muốn ngang bằng người có data + Pro** | Phải mua gói **đắt hơn** (**Pro Max**) hoặc nâng cấp gói — tức là phải trả nhiều tiền hơn để bù cho việc chưa có dữ liệu thực tế |

**Logic cốt lõi:** Dữ liệu đánh giá thực tế luôn có giá trị hơn tiền. Người không có data hệ thống muốn ngang bằng người có data phải chi nhiều hơn. Điều này tạo động lực: **cách tốt nhất (và rẻ nhất) để nâng hồ sơ là làm việc thật và nhận đánh giá thật.**

Mức ưu tiên (ranking_priority) ảnh hưởng trực tiếp đến thứ tự sắp xếp khi hiện hồ sơ trong talent discovery. Ngoài ra, người dùng còn có thể nhận **huy hiệu xác thực (is_verified_badge)** — dấu tick xanh trên hồ sơ, thể hiện sự đáng tin cậy ở mức cao.

---

## Hệ thống phân quyền — tổng quan nhanh

```
Tầng Hệ thống:   superadmin > system_admin > registered_user
Tầng Tổ chức:     org_owner  > org_admin    > org_member
Tầng Dự án:       project_owner > project_manager > project_member > project_viewer
Marketplace:      Bất kỳ ai đã đăng nhập (không cần thuộc tổ chức cụ thể)
```

---

## Các module nghiệp vụ chính

Nếu bỏ phần kể chuyện sang một bên, hệ thống hiện xoay quanh các module sau:

- **Auth & Account**: social login, thông tin tài khoản, vai trò hệ thống, external contributor flag
- **Organizations**: tạo tổ chức, join request, membership, role management, settings
- **Projects**: project lifecycle, project members, external contributor access
- **Tasks**: create/edit/detail, kanban/list/gantt, workflow status, applications, assignments, audit history
- **Marketplace**: public tasks, apply/withdraw/process applications, applicant ranking context
- **Reviews**: review session, task review board, sprint review packages, sprint reverse review board, skill rating, evidence, self-assessment, confirm/dispute, flagged review
- **Sprints**: Sprint Goal, project sprint lifecycle, backlog/sprint task split, close-review gate, sprint board queries, sprint review package/reverse-review integration
- **Profile**: profile completeness, spider charts, trust/performance, snapshots, public sharing
- **Notifications & Logs**: notifications, audit logs, activity logs
- **Admin**: user management, organization oversight, audit logs, flagged reviews, admin mode

---

## Lộ trình tương lai

Những tính năng đang được ấp ủ:

- **Capability profile v6** — tách claim/verified, level/confidence, capability/trust; không dùng skill-name spider chart làm truth cuối cùng.
- **Explainable matching sâu hơn** — dùng verified skill, confidence, evidence coverage, gap/risk explanation cho marketplace/talent search.
- **Messaging nâng cao** — chia sẻ file trong hội thoại.
- **Marketplace nâng cao** — ẩn danh organization khi đăng task.
- **Realtime notification & email** — SSE/WebSocket và email cho invitation/thông báo.
- **Dispute ops nâng cao** — collaborative dispute tooling, admin operator console sâu hơn, và AI operations console riêng.

---

## Cấu trúc mã nguồn

Suar hiện được tổ chức theo hướng tách rõ **business flow**, **delivery layer** và **UI layer**.

### Backend

```text
app/
├── modules/
│   ├── auth/
│   ├── authorization/
│   ├── organizations/
│   ├── projects/
│   ├── sprints/
│   ├── tasks/
│   ├── marketplace/
│   ├── reviews/
│   ├── users/
│   ├── notifications/
│   ├── audit/
│   ├── search/
│   ├── admin/
│   └── ...
├── controllers/    # remaining shared/framework entrypoints
├── contracts/      # shared framework contracts
└── seed/           # seed helpers/data

start/
├── routes/         # route namespaces: root, admin, org, API, compatibility, testing
└── kernel.ts       # app boot / middleware registration

config/             # Framework và infra config
```

**Luồng backend điển hình:**

1. `Controller` nhận request.
2. `DTO` validate và normalize input.
3. `Command/Query` trong `app/modules/<module>/actions` điều phối use case.
4. `Domain` xử lý rule và công thức nghiệp vụ.
5. `Infra/Repository` đọc ghi dữ liệu.
6. `Controller` trả về JSON hoặc `Inertia.render(...)`.

Các module nghiệp vụ giao tiếp qua public contracts và outer composition
adapters. Boundary đã tách rõ gồm Audit, Authorization, Notifications,
Organizations, Projects, Reviews, Skills, Sprints, Tasks và Users.

### Frontend

Frontend hiện dùng **Svelte + Inertia** và được tổ chức theo namespace màn hình.

```text
inertia/
├── apps/
│   ├── user/       # User workspace
│   ├── org/        # Organization workspace
│   └── admin/      # System admin workspace
├── bones/          # shared UI primitives/building blocks
├── types/
├── app.d.ts
└── tsconfig.json

docs/11-diagrams/   # Mermaid diagrams theo module và viewpoint
docs/               # Audit notes, kế hoạch, tài liệu kỹ thuật
```

### 3 bề mặt chính của sản phẩm

- **User workspace**: task, marketplace, profile, review, notifications, account settings
- **System Admin**: `/admin/*`
- **Organization workspace**: `/org/*`

Các route legacy như `/organizations/*` hay `/users/*` vẫn còn hiện diện để tương thích, nhưng hướng chuẩn hiện tại là `root / admin / org`.

### Frontend hiện đang bám những module nào

- `tasks/`: create, edit, detail, kanban, list, gantt, filters, applications
- `reviews/`: session detail, evidence, self-assessment, task review board, sprint reverse board, confirmation/dispute
- `profile/`: owner view, public view, snapshot controls
- `marketplace/`: browse public tasks và apply flow
- `admin/`: users, organizations, audit logs, permissions, disputes, flagged reviews, packages
- `org/`: dashboard, members, invitations, roles/permissions, workflow, projects, task review board, sprint reverse board, settings

---

## Chiến lược kiểm thử

Suar hiện chia test thành nhiều lớp độc lập:

- **Unit tests:** pure logic như formula, policy/permission, DTO validation, state machine, constants. Không phụ thuộc app boot, DB hay network.
- **Integration tests:** use case thật qua command/query/repository/app boot cho task, review, notification, organization, project, admin flows.
- **Contract tests:** request/response aliases, envelope, pagination, schema compatibility.
- **Component/UI tests:** Svelte component state/rendering với props hoặc fixtures.
- **E2E tests:** Playwright browser journey qua test server, auth/session bootstrap, routing, seeded DB state, và UI thật.

Không suy luận xuyên layer: `pnpm run test:integration` green không có nghĩa `pnpm run test:e2e` green.

### Lệnh chạy quan trọng

```bash
pnpm run test:unit
pnpm run test:integration
pnpm run test:integration:safe
pnpm run test:contract
pnpm run test:ui:runnable
pnpm run test:e2e
pnpm run test:quality:critical
pnpm run test:full-confidence
pnpm run typecheck
pnpm run lint:backend
pnpm run lint:frontend
pnpm run build
```

`pnpm run test:integration:safe` sẽ load `local runtime config`, migrate test DB, rồi chạy integration với `test database config`. `pnpm run test:all:safe` chỉ là aggregate backend-safe (`unit + integration:safe`), không bao gồm E2E. Dùng `pnpm run test:full-confidence` khi cần backend-safe cộng quality-critical/component/E2E evidence.

MongoDB không còn là requirement của test path mặc định hay CI integration job.
Nếu chạy trong sandbox chặn local socket, cần cho phép truy cập DB local để Postgres/Redis test runtime kết nối được.

---

## License

Suar is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.
