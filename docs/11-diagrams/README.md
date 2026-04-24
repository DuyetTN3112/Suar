# Diagram Guide

| Field | Value |
|---|---|
| Status | Active |
| Audience | Bất kỳ ai cần nhìn hình là hiểu nhanh: new joiner, manager, developer, tester, DevOps |
| Purpose | Định nghĩa diagram level cao/thấp, cách chọn diagram đúng, và quy tắc để diagram luôn dễ hiểu trong một khung nhìn |
| Source of Truth | `docs/11-diagrams/**/*.mmd`, verified code/schema/routes, documentation standards |
| Last Reviewed | 2026-07-10 |
| Review Cycle | Khi thêm diagram mới, đổi taxonomy diagram, hoặc scope capability đổi |
| Owner | Engineering |
| Stale Risk | Cao |

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

- một số diagram cần giữ lại physical table hoặc legacy shape để phục vụ report
- nhưng runtime flow thật có thể đã dịch sang truth mới hơn
- vì vậy diagram tốt không được giả vờ mọi shape cũ đều còn là source of truth chính
- tương tự, tên route hoặc prefix URL nhìn quen mắt cũng chưa đủ để suy ra actor boundary; một số surface như `/org/disputes` là ví dụ điển hình cần đọc caveat runtime trước khi kết luận
- cùng logic đó, nếu diagram nào đụng tới org task workspace thì nên nhớ `/org/tasks` có thể đang mang project-context filter từ `current_project_id`, không phải lúc nào cũng là org-wide board tuyệt đối

## Điều Phải Biết Ngay

Toàn bộ diagram source đang sống dưới:

- `docs/11-diagrams/`

Nếu bạn còn thấy doc nào trỏ sang thư mục sơ đồ cũ ngoài `docs/11-diagrams/`, ưu tiên path trong `docs/11-diagrams/`.

## Nếu Bạn Chỉ Có 5 Phút

Đừng mở ngẫu nhiên một file `.mmd`.

Đọc theo thứ tự này:

1. `Architecture/arch_01_system.mmd`
2. `Architecture/arch_02_layer.mmd`
3. `Package/pkg_01_overview.mmd`
4. action overview đúng domain đang quan tâm
5. chỉ khi cần mới xuống sequence/state/ERD detail

Mục tiêu là hiểu đúng mức cần thiết, không phải đọc hết sơ đồ.

Rule rất quan trọng:

- `level` là level của mục đích đọc và độ chi tiết của file
- `family` chỉ là họ diagram như Architecture, Action, Sequence, ERD, State
- không được suy máy móc rằng mọi file cùng một family đều cùng level

Ví dụ:

- `Action/*_overview.mmd` thường là level cao
- `Action/act_02b_marketplace_apply.mmd` là level thấp hơn
- `Architecture/arch_02a_request_flow.mmd` vẫn là overview kỹ thuật, không phải detail tận field/query
- `ERD/*` trong repo này đa số đang gần physical slice, nên gần level thấp hơn nếu so với architecture overview

## Nếu Bạn Chỉ Có Folder Zip Mang Ra Ngoài

Nếu bạn không có source code và chỉ được mang `docs/` cùng `docs/11-diagrams/` ra ngoài, hãy coi pack dưới đây là đường sống tối thiểu:

1. `Architecture/arch_01_system.mmd`
2. `Architecture/arch_02_layer.mmd`
3. `Package/pkg_01_overview.mmd`
4. `Action/*_overview.mmd` đúng domain đang trình bày
5. `Sequence/*` đúng đúng một scenario tiêu biểu của chapter
6. `ERD/*` đúng đúng một domain slice của chapter

Rule rất thực dụng:

- mỗi chapter chỉ nên có `1` high-level diagram mở đầu
- sau đó thêm tối đa `1-2` low-level diagrams để chứng minh flow hoặc data
- nếu cần hơn mức đó chỉ để người đọc hiểu chapter, thường là chapter đang chọn sai hình hoặc diagram đang quá tải

## Starter Packs Theo Mục Tiêu

### Nếu bạn là người mới hoàn toàn

Mở đúng 4 file này trước:

1. `Architecture/arch_01_system.mmd`
2. `Architecture/arch_02_layer.mmd`
3. `Package/pkg_01_overview.mmd`
4. một `Action/*_overview.mmd` đúng domain bạn quan tâm

Đừng mở ngay:

- `Class/*`
- `Sequence/*`
- `State/*`
- `ERD/*`

Lý do:

- các file đó không dành cho bước hiểu bức tranh đầu tiên
- mở quá sớm rất dễ khiến người mới tưởng hệ thống phức tạp hơn mức thật cần hiểu

### Nếu bạn đang viết report hoặc đồ án

Đi theo pack này:

1. `Architecture/arch_01_system.mmd`
2. `Architecture/arch_02_layer.mmd`
3. `Package/pkg_01_overview.mmd`
4. `Action/*_overview.mmd` đúng chapter nghiệp vụ
5. `ERD/*` đúng domain slice đang viết

Chỉ xuống `Sequence/*` khi bạn cần:

- kể một flow tiêu biểu
- giải thích một scenario cụ thể
- chứng minh pipeline xử lý theo thời gian

### Nếu bạn đang chữa production incident

Đi theo pack này:

1. `Architecture/arch_02a_request_flow.mmd`
2. `Architecture/arch_02b_runtime_support.mmd`
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

### Level High

Level cao dùng để trả lời:

- hệ thống gồm những khối nào
- capability nào tồn tại
- boundary nào quan trọng
- data hoặc request đi qua nhóm khối nào

Level cao phải:

- bao quát
- không đơn giản quá
- không đi vào route, repository, query, field-level detail
- đọc trong một khung nhìn

Ví dụ level cao trong hệ thống:

- `Architecture/*`
- `Package/pkg_01_overview.mmd`
- `Action/*_overview.mmd`
- `DFD/dfd_00_context.mmd`
- `DFD/dfd_01_main.mmd`

Khi nào nên dừng ở level cao:

- cần brief cho manager
- cần nắm mental model trước khi debug
- cần onboard người mới
- cần biết domain nào liên quan trước khi đào sâu

### Level Low

Level thấp dùng để trả lời:

- flow cụ thể diễn ra ra sao
- state chuyển như thế nào
- dữ liệu domain slice nào đang được lưu
- concern chi tiết nào gây lỗi hoặc cần triển khai

Level thấp phải:

- cụ thể hơn level cao
- chỉ giữ đúng một concern hoặc một flow
- vẫn đọc được trong một khung nhìn
- tách file mới ngay khi bắt đầu có hơn một nhánh lớn

Ví dụ level thấp trong hệ thống:

- detail action diagrams như `act_02b_marketplace_apply.mmd`
- sequence diagrams
- state diagrams
- ERD theo domain slice
- DFD detail diagrams
- class diagrams
- communication diagrams

Nhưng phải tránh hiểu cứng nhắc:

- không phải mọi `Action/*` đều là level cao
- không phải mọi `Sequence/*` đều luôn quá chi tiết cho mọi mục đích
- level thật phải được quyết định bằng câu hỏi: `người đọc cần mental model hay cần giải thích đúng một flow/state/data slice`

Khi nào mới nên xuống level thấp:

- đang debug một flow cụ thể
- đang sửa một capability cụ thể
- đang cần biết state/data nào thật sự đổi
- đang review test, route, hoặc implementation detail

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

Trong hệ thống này, ERD đang theo hướng `table/column first`, nên nhiều file gần với physical slice hơn. Nhưng vẫn phải chia theo domain slice, không được dồn mọi bảng vào một file.

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

- `Architecture/*`, `Package/*`, `RichPicture/*`: thường là level cao
- `Action/*_overview.mmd`, `DFD/dfd_00_context.mmd`, `DFD/dfd_01_main.mmd`: thường là level cao
- detail `Action/*`, `Sequence/*`, `State/*`, `Communication/*`, `Class/*`: thường là level thấp
- `ERD/*`: thường là level thấp hoặc trung gian tùy file, nhưng trong repo hiện tại nên đọc như low-level data slice trước

### Detail Diagrams

- đúng `1` flow hoặc `1` concern
- cho phép alternate branch nếu vẫn cùng scenario
- nếu thêm một branch lớn mới, tạo file mới
- detail diagram không được biến thành “toàn bộ subsystem trong một file”
- nếu người đọc phải zoom mới theo nổi flow chính, file đã quá tải

## Rules By Diagram Type

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

### State

- states, events, transitions, guards
- side effects chỉ nên là ghi chú phụ ngắn
- nếu state diagram bắt đầu kể cả luồng dữ liệu, route, và actor UI, file đã sai level

### DFD

- external entity, process, data store, data flow
- không trộn controller hoặc repository internals

### ERD

- một domain slice mỗi file
- ghi actual stored columns
- không mặc định vẽ mọi relationship edge
- không đánh dấu `FK` nếu physical constraint không phải point của file
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

1. `Architecture/arch_01_system.mmd`
2. `Architecture/arch_02_layer.mmd`
3. `Architecture/arch_02a_request_flow.mmd`
4. `Package/pkg_01_overview.mmd`
5. action overview đúng domain
6. sequence/state/ERD detail đúng concern

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

- `Architecture/arch_01_system.mmd`
- `Architecture/arch_02_layer.mmd`
- `Package/pkg_01_overview.mmd`

### External Reader / Report Writer

Đọc:

- `docs/00-overview/external-reader-report-writing-guide.md`
- `Architecture/arch_01_system.mmd`
- `Architecture/arch_02_layer.mmd`
- `Package/pkg_01_overview.mmd`
- ERD hoặc sequence đúng chapter đang viết

Nếu chapter đang nói về task delivery, submission, comment, attachment, hoặc completion proof:

- ưu tiên thêm `DFD/dfd_02c_task_completion_package.mmd` thay vì cố nhồi hết ý này vào workflow diagram.

Nếu chapter đang nói về review governance hiện tại:

- dùng `State/state_02_review_session.mmd` cho review session cũ
- dùng `State/state_02b_task_review_workflow.mmd` cho task review board
- dùng `State/state_08b_project_sprint_review.mmd` cho sprint close/review-open gate
- dùng `State/state_02c_sprint_reverse_review_workflow.mmd` cho sprint reverse board
- dùng `ERD/logical_erd_04_review_messaging.mmd` để thấy bảng review workflow/package liên quan

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

## Current Backend Context

- backend là modular monolith với `app/modules/*`
- cross-module access nên đi qua `public_contracts/*`, `actions/services/*`, bootstrap adapter, hoặc boundary rõ ràng trong module
- realtime transport vẫn nên giữ trạng thái inactive nếu transport hiện tại là `null`
- diagram không được vẽ route-confirmed behavior nếu repo mới chỉ có page artifact mà chưa xác nhận route binding
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

## Current Dense Files To Open Carefully

Một số file hiện vẫn đúng scope nhưng khá dày. Chúng không phải diagram tệ, nhưng không nên là điểm vào đầu tiên cho external reader:

- `ERD/logical_erd_01_user_auth_skills.mmd`
- `ERD/logical_erd_03_task_marketplace.mmd`
- `ERD/logical_erd_04_review_messaging.mmd`
- `Action/act_01b_task_workflow.mmd`
- `State/state_08b_project_sprint_review.mmd`
- `Action/act_06_user_registration_approval.mmd`
- `Action/act_07b_skill_management.mmd`

Rule đọc an toàn:

- mở overview đúng domain trước
- chỉ xuống các file trên khi bạn đã biết mình đang điều tra flow/data slice nào
- nếu cần đưa chúng vào report, phải có một hình level cao hoặc một đoạn narrative mở đường trước
- riêng `act_01b_task_workflow.mmd` hiện đã được làm gọn hơn để chỉ giữ workflow state concern, nhưng vẫn là file low-level nên không nên dùng làm điểm vào đầu tiên
- riêng review governance, đừng chỉ dùng `state_02_review_session.mmd`; task review board và sprint reverse board giờ có state riêng

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
