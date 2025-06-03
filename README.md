# SUAR — Nền tảng quản lý công việc & xác thực năng lực thực tế

---

## Suar là gì?

Hãy tưởng tượng bạn là một nhân viên hoặc một freelancer. Bạn đăng ký trên các nền tảng tuyển dụng, bạn ghi vào hồ sơ rằng mình "giỏi React", "có 5 năm kinh nghiệm Node.js", "thành thạo thiết kế UI/UX". Nhưng ai tin bạn? Bạn tự viết, tự chấm, tự khen mình. Không ai kiểm chứng được.

**Suar ra đời để giải quyết chính xác vấn đề đó.**

Suar không chỉ là một công cụ quản lý công việc như Jira hay Trello. Nó là một hệ sinh thái hoàn chỉnh nơi **năng lực của bạn được xác thực bằng dữ liệu thực tế** — từ những công việc bạn đã làm, từ những đánh giá của quản lý và đồng nghiệp, từ những con số không thể bịa đặt.

Triết lý cốt lõi của Suar được tóm gọn trong một vòng lặp:

> **Làm việc → Được đánh giá → Hồ sơ đẹp hơn → Được chọn nhiều hơn → Làm thêm việc → Lại được đánh giá → Hồ sơ càng mạnh → ...**

Đó là vòng lặp tích cực. Càng làm tốt, hồ sơ càng sáng. Càng sáng, càng được tin tưởng. Và điều này áp dụng cho **mọi người dùng** trên hệ thống — không phân biệt bạn là nhân viên trong tổ chức hay freelancer bên ngoài. Ai cũng có hồ sơ, ai cũng được đánh giá, ai cũng có spider chart và điểm tin cậy.

Một người thuộc tổ chức A vẫn hoàn toàn có thể ứng tuyển làm task ở tổ chức B qua Chợ việc. Không có ranh giới cứng nhắc nào ngăn cản điều đó.

---

## Trạng thái repo hiện tại

Đây là những sự thật quan trọng nhất của hệ thống ở thời điểm hiện tại:

- **Chỉ có social login**: đăng nhập bằng Google hoặc GitHub. Không dùng Firebase, không có email/password flow truyền thống.
- **Có 3 bề mặt chính**:
  - `User workspace`: làm việc, ứng tuyển, review, profile, notifications
  - `System Admin`: `/admin/*`
  - `Organization Admin`: `/org/*`
- **Subscription là của tài khoản người dùng**, không phải gói của organization. Hướng sản phẩm hiện tại là `Pro` và `Pro Max` cho **user account**.
- **Task workflow dùng `task_status_id` làm chuẩn**. Trường `status` chỉ còn mang vai trò legacy compatibility ở một số luồng.
- **Mỗi task bắt buộc thuộc đúng một project**. Quan hệ nghiệp vụ chuẩn là `organization -> project -> task`; không có luồng task đứng độc lập ở cấp organization.
- **Task creation hiện giàu metadata hơn trước**: required skills, acceptance criteria, verification method, task type, tech stack, learning objectives, domain tags...
- **Review flow hiện không chỉ có chấm skill** mà còn có evidence, self-assessment, confirmation/dispute, reverse review, anomaly detection.
- **Profile hiện có 3 spider charts**: `Technical`, `Soft Skills`, `Delivery`, và có flow snapshot publish / history / public-private / rotate share link.
- **Notification và audit logs đang dùng luồng storage riêng phù hợp runtime**, không còn là phần mô tả lý thuyết.
- **Test suite đã được thu gọn mạnh** để ưu tiên tín hiệu thay vì số lượng: `744 unit`, `179 integration`, `5 match`, tổng `928`.

---

## Câu chuyện của một người dùng

### Chương 1: Bước chân vào Suar

Bạn mở trình duyệt, truy cập Suar. Không có form đăng ký dài dòng, không cần nhớ mật khẩu. Bạn chỉ cần nhấn **"Đăng nhập bằng Google"** hoặc **"Đăng nhập bằng GitHub"** — chỉ hai lựa chọn, đơn giản và an toàn. Suar không hỗ trợ đăng ký bằng email/mật khẩu truyền thống.

Lần đầu tiên đăng nhập, hệ thống tự động tạo tài khoản cho bạn. Bạn trở thành một **registered_user** — một người dùng bình thường. Tài khoản của bạn ở trạng thái **active** (hoạt động), sẵn sàng để khám phá.

Ngay lập tức, bạn thấy trang hồ sơ cá nhân của mình. Nó khá trống trải — chưa có gì cả. Hệ thống hiện một thanh tiến độ **"Hoàn thiện hồ sơ"** nhắc nhở bạn: hãy thêm ảnh đại diện, viết một đoạn giới thiệu bản thân (bio), điền số điện thoại, địa chỉ, múi giờ, ngôn ngữ ưa thích...

Trang hồ sơ hiển thị cho mọi người dùng: rating, số task đã hoàn thành, điểm tin cậy (trust score), các biểu đồ kỹ năng spider chart, review nổi bật và các chỉ số delivery. Với chính chủ hồ sơ, còn có thêm khu vực **publish snapshot** để đóng gói hồ sơ thành một phiên bản chia sẻ được. Tất cả ban đầu đều bằng 0 — chưa có gì để khoe. Nhưng điều đó sẽ thay đổi khi bạn bắt đầu làm việc.

### Chương 2: Kỹ năng — xương sống của mọi thứ

Phần kỹ năng (Skills) là linh hồn của Suar. Bạn có thể thêm các kỹ năng mình có vào hồ sơ. Hệ thống chia kỹ năng thành **3 nhóm**:

- **Kỹ thuật (Technical):** React, TypeScript, Node.js, PostgreSQL, Docker... — những hard skills cụ thể.
- **Kỹ năng mềm (Soft Skills):** Giao tiếp, Làm việc nhóm, Tư duy phản biện...
- **Delivery:** Chất lượng code, Tài liệu hóa, Đúng deadline... — đo lường cách bạn hoàn thành và bàn giao công việc.

Khi thêm một kỹ năng, bạn tự đánh giá trình độ ban đầu của mình theo **8 cấp bậc**:

| Cấp bậc        | Ý nghĩa     | Kinh nghiệm tham khảo |
| -------------- | ----------- | --------------------- |
| **Beginner**   | Mới bắt đầu | 0–1 năm               |
| **Elementary** | Sơ cấp      | 1–2 năm               |
| **Junior**     | Junior      | 2–3 năm               |
| **Middle**     | Middle      | 3–5 năm               |
| **Senior**     | Senior      | 5–7 năm               |
| **Lead**       | Lead        | 7–10 năm              |
| **Principal**  | Principal   | 10–15 năm             |
| **Master**     | Bậc thầy    | 15+ năm               |

Nhưng đây mới chỉ là **tự khai báo** (source = `imported`). Kỹ năng tự khai báo có độ tin cậy bằng 0. Giá trị thật sự sẽ đến sau, khi người khác đánh giá bạn qua công việc thực tế — lúc đó kỹ năng sẽ chuyển source thành `reviewed` với dữ liệu từ đánh giá thật.

Kỹ năng được hiển thị dưới dạng **Spider Chart** (biểu đồ mạng nhện / biểu đồ radar). Hiện tại hồ sơ đã tách thành **3 chart riêng**:

- **Technical**
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

| Vai trò                   | Quyền hạn                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Chủ tổ chức (Owner)**   | Toàn quyền: quản lý thành viên, cài đặt, dự án, quy trình làm việc. Có thể chuyển quyền sở hữu cho người khác. |
| **Quản trị viên (Admin)** | Mời/xóa thành viên, tạo dự án, duyệt yêu cầu gia nhập.                                                         |
| **Thành viên (Member)**   | Xem và tham gia các dự án mình được phân công, chợ việc, nhắn tin, được đánh giá.                              |

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

Một tùy chọn quan trọng: **"Cho phép Freelancer"** (Allow Freelancer). Khi bật tùy chọn này, các task trong dự án có thể được đăng lên Chợ việc (Marketplace) để người ngoài tổ chức ứng tuyển.

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
- **Kỹ năng yêu cầu:** ít nhất 1 kỹ năng kèm level tối thiểu
- **Acceptance Criteria:** đầu ra nào được xem là đạt
- **Verification Method:** cách xác minh task đã hoàn thành đúng chưa
- **Task Type:** loại task để hệ thống hiểu ngữ cảnh công việc
- **Context Background / Tech Stack / Learning Objectives / Domain Tags:** metadata bổ sung để task rõ ràng hơn và dùng lại được cho review/profile
- **Tầm nhìn (Visibility):** Internal / External / All — quyết định task có hiện trên Chợ không
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

### Chương 6: Chợ việc (Marketplace) — nơi tìm và nhận công việc

Đây là cầu nối giữa các tổ chức và những người muốn nhận việc. Bất kỳ ai đã đăng nhập — dù là thành viên tổ chức khác hay freelancer — đều có thể duyệt và ứng tuyển.

Bất kỳ task nào trong một dự án có bật "Cho phép Freelancer" cũng có thể được đưa lên Chợ bằng cách thay đổi **Tầm nhìn (Visibility):**

| Tầm nhìn                | Ý nghĩa                                          |
| ----------------------- | ------------------------------------------------ |
| **Internal** (mặc định) | Chỉ người trong tổ chức thấy                     |
| **External**            | Chỉ hiện trên Chợ, không hiện trong board nội bộ |
| **All**                 | Hiện cả hai nơi — nội bộ lẫn Chợ                 |

Khi tạo task, các thông tin quan trọng phải đủ rõ để task có thể đi tiếp đến review và profile: **workflow status**, tiêu đề, mô tả đủ chi tiết, độ khó, deadline, thời gian ước tính, **ít nhất 1 kỹ năng yêu cầu**, **acceptance criteria**, và **verification method**. Điều này đảm bảo cả người giao task lẫn người nhận task đều có đủ thông tin, và hệ thống có đủ dữ liệu để tính toán đánh giá sau này.

Khi task lên Chợ, hệ thống tự động tính **hạn nộp đơn (Application Deadline)** = deadline - thời gian ước tính. Ví dụ:

- Task deadline: 30/01
- Thời gian ước tính: 5 ngày (40 giờ, quy đổi 1 ngày = 8 giờ)
- → Hạn nộp đơn: 25/01

Sau hạn nộp đơn, task vẫn hiện trên Chợ nhưng nút "Ứng tuyển" bị khóa — mọi người vẫn có thể xem task, chỉ không nhận đơn mới.

**Trải nghiệm trên Chợ:**

Bạn mở Chợ việc, và thấy danh sách các task. Có thể lọc theo kỹ năng, độ khó, thời gian... Thấy task phù hợp? Nhấn **"Ứng tuyển" — chỉ 1 click**. Hồ sơ của bạn (kỹ năng, spider chart, điểm tin cậy) chính là CV và portfolio của bạn, tự động được đính kèm. Bạn có thể thêm lời nhắn nếu muốn, nhưng không bắt buộc.

Mỗi người chỉ được ứng tuyển **1 lần cho mỗi task**. Và bạn có thể **rút đơn** bất cứ lúc nào.

Ngoài Chợ việc, bạn cũng có thể duyệt hồ sơ người dùng khác. Thấy ai có profile ấn tượng? Có thể **mời họ vào tổ chức** hoặc **mời trực tiếp vào task** (tính năng invitation — đang trong lộ trình phát triển).

**Phía tổ chức đăng task:**

Người tạo task mở tab "Đơn ứng tuyển", thấy danh sách ứng viên. Mỗi ứng viên hiện tên, rating, kỹ năng, spider chart, điểm tin cậy.

Nhấn **"Duyệt"** → Hệ thống tự động:

1. Gán người được duyệt vào task
2. Cập nhật người được giao
3. **Từ chối tất cả đơn ứng tuyển còn lại** cho task đó
4. Thông báo cho người được duyệt

Nhấn **"Từ chối"** → Phải ghi lý do từ chối.

Hiện tại ứng tuyển qua Chợ (public_listing) đã được triển khai. Tương lai sẽ có thêm luồng **mời trực tiếp (invitation)** — PM biết ai giỏi thì mời thẳng, không cần đợi ứng tuyển.

### Chương 7: Đánh giá 360° — khoảnh khắc sự thật

Đây là **trái tim thật sự** của Suar. Khi một task chuyển sang trạng thái thuộc nhóm DONE (hoàn thành), một chuỗi sự kiện tự động diễn ra:

1. **Phân công (assignment) đang active** → tự động đánh dấu completed.
2. **Tự động tạo Phiên đánh giá (Review Session)** cho assignment đã hoàn thành.
3. Deadline đánh giá = **14 ngày** kể từ khi task hoàn thành.
4. Thông báo gửi cho quản lý và đồng nghiệp.

**Đánh giá là BẮT BUỘC cho mọi task hoàn thành** — không tùy chọn.

Phiên đánh giá hoạt động ra sao?

Bắt đầu ở trạng thái **Pending** (chờ xử lý). Khi có người đầu tiên gửi đánh giá → chuyển sang **In Progress** (đang tiến hành).

Hai luồng đánh giá diễn ra **song song**:

- **Quản lý (Manager)** đánh giá từng kỹ năng của người được đánh giá, đồng thời có thêm bộ chỉ số tổng quan như chất lượng đầu ra, đúng hạn, bám yêu cầu, giao tiếp, chất lượng code, mức chủ động, và có muốn làm việc tiếp hay không
- **Đồng nghiệp (Peer)** cũng đánh giá — cần tối thiểu **2 peer reviews**

Mỗi reviewer chấm từng kỹ năng liên quan, mỗi kỹ năng chọn một cấp bậc (Beginner → Master), kèm theo nhận xét bằng chữ. Ngoài phần chấm điểm, reviewer còn có thể đính kèm **evidence** để chứng minh nhận định của mình.

Song song với đó, người được đánh giá cũng có thể gửi **self-assessment** sau khi hoàn thành task: mức độ hài lòng, độ khó cảm nhận, confidence, điều làm tốt, điều sẽ làm khác đi, blocker, kỹ năng còn thiếu và kỹ năng thấy mình mạnh.

Khi đủ review (quản lý xong + ≥2 peer) → phiên tự động **hoàn thành (Completed)**.

Nếu quá 14 ngày mà chưa đủ? Hệ thống **tự động đóng** phiên đánh giá với những review đã có — không để chờ mãi.

### Chương 8: Xác nhận kết quả — bước cuối trước khi cập nhật hồ sơ

Khi phiên đánh giá hoàn thành (đủ review từ quản lý + ≥2 peer), **hệ thống chưa cập nhật hồ sơ ngay**. Trước tiên, người được đánh giá phải xem kết quả và đưa ra quyết định:

- Xem spider chart dự kiến (tính toán từ các review vừa nhận)
- Xem chi tiết ai chấm gì
- Có 2 lựa chọn:
  - **Xác nhận (Confirm):** Đồng ý với kết quả → Hệ thống tiến hành cập nhật hồ sơ.
  - **Tranh chấp (Dispute):** Không đồng ý, ghi lý do → Phiên chuyển sang trạng thái **Disputed**.

Nếu tranh chấp, **Admin hệ thống (System Admin)** sẽ xem xét và giải quyết — có thể yêu cầu đánh giá lại, ghi đè kết quả, hoặc bác bỏ tranh chấp.

> ⭐ _Cần nghiên cứu thêm: Trong tương lai sẽ tích hợp AI vào quy trình phân xử tranh chấp để hỗ trợ System Admin đưa ra quyết định chính xác hơn._

**Chỉ sau khi xác nhận (hoặc tranh chấp được giải quyết xong)**, hệ thống mới tổng hợp data và cập nhật hồ sơ:

**1. Spider Chart cập nhật:**
Biểu đồ kỹ năng radar được tính lại. Hệ thống lấy trung bình điểm đánh giá (avg_percentage) của mỗi kỹ năng từ tất cả các review, rồi quy đổi thành level tương ứng. Kỹ năng chuyển từ `source = 'imported'` sang `source = 'reviewed'` — giờ đây nó có dữ liệu thực.

**2. Điểm tin cậy (Trust Score) tính lại:**
Trust Score = trung bình avg_percentage × trọng số. Điểm này phản ánh mức độ đáng tin của hồ sơ bạn, dựa trên khối lượng và chất lượng đánh giá bạn đã nhận.

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

### Chương 9: Đánh giá ngược (Reverse Review) — 360° thực sự

Suar không chỉ cho phép sếp đánh giá nhân viên. Sau khi phiên đánh giá hoàn thành, **người được đánh giá cũng có thể đánh giá ngược lại**:

- Đánh giá đồng nghiệp (peer)
- Đánh giá quản lý (manager)
- Đánh giá dự án (project tốt không? deadline hợp lý không?)
- Đánh giá tổ chức (môi trường làm việc thế nào?)

Mỗi reverse review gồm: rating (1-5 sao), nhận xét, và có thể đặt **ẩn danh** — bạn dám nói thật mà không sợ bị trù dập.

### Chương 10: Phát hiện gian lận — giữ hệ thống sạch

Với hệ thống đánh giá mở, luôn có rủi ro bị lạm dụng. Suar dùng **hệ thống phát hiện bất thường tự động (DetectAnomalyCommand)** chạy sau **mỗi lượt đánh giá được gửi**:

**3 loại bất thường đã triển khai:**

| Loại bất thường                                     | Mô tả                                                                       |
| --------------------------------------------------- | --------------------------------------------------------------------------- |
| **Đánh giá hàng loạt cùng level (bulk_same_level)** | Reviewer chấm cùng một level cho > 80% kỹ năng → đánh giá không nghiêm túc  |
| **Tài khoản mới nhận level cao (new_account_high)** | Tài khoản dưới 30 ngày được chấm ≥ Senior → đáng nghi                       |
| **Đánh giá qua lại cao (mutual_high)**              | Hai người liên tục đánh giá cao lẫn nhau > 3 lần → nghi ngờ "trao đổi điểm" |

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

Riêng **Chợ việc (Marketplace)** hoạt động ngoài tầng tổ chức — bất kỳ ai đã đăng nhập đều có thể duyệt và ứng tuyển.

**Trên frontend hiện tại, 3 tầng này cũng đã được tách thành 3 bề mặt giao diện rõ ràng:**

- **User workspace (`/`)**: task, marketplace, profile, review, notifications, settings tài khoản.
- **System Admin (`/admin`)**: dashboard hệ thống, user management, organization oversight, audit logs, flagged reviews.
- **Organization Admin (`/org`)**: dashboard tổ chức, thành viên, lời mời, yêu cầu tham gia, workflow, dự án, thông tin tổ chức.

Các màn legacy như `/organizations/*` hoặc `/users/*` vẫn còn tồn tại để tương thích luồng cũ, nhưng hướng chuẩn hiện tại là:

- dùng `/admin/*` cho quản trị hệ thống,
- dùng `/org/*` cho quản trị tổ chức,
- dùng các màn user-facing ở root cho trải nghiệm cá nhân.

### Chương 12: Thông báo và Nhật ký

Suar lưu **3 loại log** (trong MongoDB):

- **Audit Logs:** ghi lại mọi hoạt động quan trọng — ai tạo task, ai thay đổi trạng thái, ai mời ai, ai duyệt đơn...
- **Notifications:** thông báo gửi cho người dùng khi có sự kiện liên quan đến họ.
- **User Activity Logs:** ghi nhận hoạt động người dùng.

Tất cả đều minh bạch và có thể truy vết.

> _Lưu ý: Hiện tại hệ thống thông báo chưa có real-time (WebSocket/SSE chưa được kích hoạt — transport = null). Thông báo được tải khi người dùng truy cập trang._

### Chương 13: Gói đăng ký & Mức độ ưu tiên trên Marketplace

Đây là cơ chế kinh doanh cốt lõi của Suar.

**Vấn đề:** Một người mới tham gia hệ thống chưa có dữ liệu đánh giá nào — spider chart trống, trust score = 0, chưa hoàn thành task nào. Họ hoàn toàn có thể **import dữ liệu kỹ năng từ bên ngoài** vào hồ sơ, nhưng vì đây là dữ liệu tự khai báo (`source = 'imported'`), độ tin cậy = 0.

**Giải pháp — Gói đăng ký (User Subscriptions):**

Hiện tại có **2 gói trả phí cho tài khoản người dùng**: **Pro** và **Pro Max**. Nếu không mua gói, tài khoản vẫn ở mức cơ bản (`free/base`) và vẫn có thể dùng hệ thống bình thường.

> _Quan trọng:_ Đây là gói cho **user account**, không phải gói cho organization.
> Điều này cũng được phản ánh ở frontend: trang `Settings > Account` nói về gói của người dùng, còn các màn organization không nên quảng bá `organization billing` như một capability sản phẩm chính thức.

Gói đăng ký ảnh hưởng trực tiếp đến **ranking_priority** (mức ưu tiên sắp xếp) — đây là thứ tự hiển thị hồ sơ khi tổ chức tìm kiếm ứng viên trên Chợ việc. Ai có ranking_priority cao hơn sẽ được hiện lên trước.

Cơ chế hoạt động:

| Trường hợp                                                             | Kết quả                                                                                                                          |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Người có dữ liệu hệ thống (đã review)** + **không mua gói**          | Có hồ sơ đáng tin cậy, ranking ở mức cơ bản                                                                                      |
| **Người có dữ liệu hệ thống** + **mua gói Pro**                        | Ranking tốt hơn — ưu tiên hiển thị cao hơn                                                                                       |
| **Người mới, không có data** + **mua gói Pro**                         | Ranking ngang bằng người có data hệ thống nhưng không mua gói                                                                    |
| **Người mới, không có data** + **muốn ngang bằng người có data + Pro** | Phải mua gói **đắt hơn** (**Pro Max**) hoặc nâng cấp gói — tức là phải trả nhiều tiền hơn để bù cho việc chưa có dữ liệu thực tế |

**Logic cốt lõi:** Dữ liệu đánh giá thực tế luôn có giá trị hơn tiền. Người không có data hệ thống muốn ngang bằng người có data phải chi nhiều hơn. Điều này tạo động lực: **cách tốt nhất (và rẻ nhất) để nâng hồ sơ là làm việc thật và nhận đánh giá thật.**

Mức ưu tiên (ranking_priority) ảnh hưởng trực tiếp đến thứ tự sắp xếp khi hiện hồ sơ trên Chợ việc. Ngoài ra, người dùng còn có thể nhận **huy hiệu xác thực (is_verified_badge)** — dấu tick xanh trên hồ sơ, thể hiện sự đáng tin cậy ở mức cao.

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

- **Auth & Account**: social login, thông tin tài khoản, vai trò hệ thống, freelancer flag
- **Organizations**: tạo tổ chức, join request, membership, role management, settings
- **Projects**: project lifecycle, project members, allow freelancer
- **Tasks**: create/edit/detail, kanban/list/gantt, workflow status, applications, assignments, audit history
- **Marketplace**: public tasks, apply/withdraw/process applications, applicant ranking context
- **Reviews**: review session, skill rating, evidence, self-assessment, confirm/dispute, reverse review, flagged review
- **Profile**: profile completeness, spider charts, trust/performance, snapshots, public sharing
- **Notifications & Logs**: notifications, audit logs, activity logs
- **Admin**: user management, organization oversight, audit logs, flagged reviews, admin mode

---

## Lộ trình tương lai

Những tính năng đang được ấp ủ:

- **Hệ thống mời trực tiếp (Invitation System)** — PM biết ai giỏi thì mời thẳng vào task, không cần đợi ứng tuyển. Hoặc thấy ai profile xịn trên Chợ thì mời họ vào tổ chức.
- **Tìm kiếm nhân tài trên Chợ (Talent Search)** — tích hợp vào Marketplace, tìm kiếm người dùng theo kỹ năng, rating, trust score, spider chart. Thấy ai phù hợp thì mời vào task hoặc mời vào tổ chức.
- **Thuật toán khớp kỹ năng (Skill Matching)** — tự động tính % phù hợp giữa ứng viên và task.
- **Bookmark ứng viên (Recruiter Bookmarks)** — lưu ứng viên yêu thích để mời lại sau. DB đã có bảng `recruiter_bookmarks` sẵn.
- **Chia sẻ file trong tin nhắn** — gửi ảnh, tài liệu trong cuộc trò chuyện.
- **Ẩn danh tổ chức trên Marketplace** — đăng task mà không tiết lộ tên công ty.
- **Thông báo real-time** — qua SSE/WebSocket.
- **Gantt Timeline** — giao diện xem task dạng biểu đồ Gantt.
- **Hoàn thiện hệ thống email** — gửi lời mời, thông báo qua email.
- **Tích hợp AI vào phân xử tranh chấp** — hỗ trợ System Admin giải quyết dispute.

---

## Cấu trúc mã nguồn

Suar hiện được tổ chức theo hướng tách rõ **business flow**, **delivery layer** và **UI layer**.

### Backend

```text
app/
├── actions/        # Use case theo CQRS: command, query, DTO, mapper
├── controllers/    # HTTP/Inertia entrypoints
├── domain/         # Business rules, entities, formulas, policies
├── infra/          # Repository, ORM adapter, persistence access
├── models/         # Lucid models + Mongo models
├── middleware/     # Shared request/session/inertia context
├── services/       # Cache, logger, permission, mail, integration services
├── constants/      # Enum, config constant, permission matrix
├── exceptions/     # Exception chuẩn hóa cho app
├── events/         # Domain/application events
└── types/          # Shared backend types

start/
├── routes/         # Route namespaces: root, admin, org, legacy compatibility
└── kernel.ts       # App boot / middleware registration

config/             # Framework và infra config
```

**Luồng backend điển hình:**

1. `Controller` nhận request.
2. `DTO` validate và normalize input.
3. `Command/Query` trong `app/actions` điều phối use case.
4. `Domain` xử lý rule và công thức nghiệp vụ.
5. `Infra/Repository` đọc ghi dữ liệu.
6. `Controller` trả về JSON hoặc `Inertia.render(...)`.

### Frontend

Frontend hiện dùng **Svelte + Inertia** và được tổ chức theo namespace màn hình.

```text
inertia/
├── layouts/        # Layout khung ứng dụng
├── components/     # UI component dùng lại
├── stores/         # Client state dùng chung
├── hooks/          # Logic UI dùng lại theo màn
├── pages/
│   ├── admin/      # Màn quản trị hệ thống
│   ├── org/        # Màn quản trị tổ chức
│   ├── tasks/      # Task list, detail, create/edit, board
│   ├── reviews/    # Review session, evidence, self-assessment
│   ├── profile/    # Hồ sơ, snapshot, public/private sharing
│   ├── marketplace/# Chợ việc
│   ├── notifications/
│   └── settings/
└── types/          # Shared frontend types

tests/
├── unit/           # Pure logic / contract
├── integration/    # Runtime behavior
└── match/          # High-signal static guards

diagram/            # Mermaid diagrams theo module và viewpoint
docs/               # Audit notes, kế hoạch, tài liệu kỹ thuật
```

### 3 bề mặt chính của sản phẩm

- **User workspace**: task, marketplace, profile, review, notifications, account settings
- **System Admin**: `/admin/*`
- **Organization Admin**: `/org/*`

Các route legacy như `/organizations/*` hay `/users/*` vẫn còn hiện diện để tương thích, nhưng hướng chuẩn hiện tại là `root / admin / org`.

### Frontend hiện đang bám những module nào

- `tasks/`: create, edit, detail, kanban, list, gantt, filters, applications
- `reviews/`: session detail, evidence, self-assessment, confirmation, reverse review
- `profile/`: owner view, public view, snapshot controls
- `marketplace/`: browse public tasks và apply flow
- `admin/`: users, organizations, audit logs, flagged reviews
- `org/`: dashboard, members, invitations, requests, workflow, projects, settings

---

## Chiến lược kiểm thử

Suar hiện chia test thành **3 lớp**:

### 1. Unit tests

- Mục tiêu: test pure logic
- Bao gồm:
  - formulas
  - policy / permission
  - DTO validation
  - state machine
  - constants
- Không nên phụ thuộc app boot, DB hay network

### 2. Integration tests

- Mục tiêu: test use case thật qua command/query/repository/app boot
- Bao gồm:
  - task
  - review
  - notification
  - organization
  - project
  - admin flows
- Đây là lớp quan trọng nhất để bắt regression hành vi thật

### 3. Match tests

- Mục tiêu: kiểm tra guard giữa backend, frontend và contract tĩnh
- Lưu ý quan trọng:
  - `match` **không phải** lớp chứng minh correctness mạnh nhất
  - nó chỉ là lớp guard phụ
  - khi có xung đột, phải tin `unit + integration` hơn `match`

### Trạng thái hiện tại của test strategy

- Bộ suite hiện tại đã được **giảm mạnh số lượng** để ưu tiên tín hiệu:
  - `unit`: `744`
  - `integration`: `179`
  - `match`: `5`
  - tổng: `928`
- `unit` tập trung vào formula, rules, contract DTO gộp, và invariants thật sự quan trọng
- `integration` là lớp chính để bắt regression hành vi thật
- `match` chỉ giữ vài contract tĩnh có giá trị cao, không còn ôm hàng trăm check kiểu quét string/file

### Lệnh chạy quan trọng

```bash
npm run test:unit
npm run test:integration
npm run test:match
npm run typecheck
npm run lint:backend
npm run lint:frontend
npm run build
```

### Runtime cần có để test/integration chạy đúng

- PostgreSQL được cấu hình đúng qua biến môi trường
- MongoDB local khả dụng cho audit logs và notifications
- Các service phụ trợ như Redis nên được cấu hình đúng nếu muốn test đầy đủ luồng cache
- Dùng DB test riêng để tránh đụng dữ liệu dev:
  - `PG_TEST_DATABASE=suar_test`
  - `MONGODB_TEST_URL=mongodb://127.0.0.1:27017/suar_test`
- Chạy integration theo chế độ an toàn:
  - `npm run test:integration:safe`

### Nguyên tắc test của repo từ thời điểm này

- Không thêm test kiểu “pass cho có”
- Không âm thầm `skip` một feature mà runtime thật đang phụ thuộc
- Integration test nên đi qua command/query/controller thật
- Nếu frontend đổi contract, test phải fail đúng vào contract đó thay vì chỉ kiểm tra string xuất hiện trong file
- Không test mọi thứ nếu thứ đó không tăng confidence
- Ưu tiên một test mạnh có thể bắt lỗi thật hơn mười test lặp enum/field vụn

---

## Ghi chú kỹ thuật quan trọng

- Xác thực hiện tại đi theo social login, không dùng Firebase.
- Notification và audit logs đang đi theo storage phù hợp với pattern truy cập của từng loại dữ liệu.
- Task workflow chuẩn hiện tại xoay quanh `task_status_id`, còn `status` chỉ giữ vai trò tương thích legacy ở một số luồng.
- Subscription hiện là của **user account** (`Pro` / `Pro Max`), không phải gói của organization.

---

_Suar — nơi năng lực thực sự được lên tiếng._
