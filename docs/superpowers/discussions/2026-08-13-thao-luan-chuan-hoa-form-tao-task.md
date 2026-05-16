# Thảo luận: Chuẩn hoá form tạo task để giảm mơ hồ

**Trạng thái:** Đang thảo luận, chưa là đặc tả để triển khai  
**Cập nhật:** 13/08/2026  
**Phạm vi:** Form tạo, đọc và sửa task giao việc trong khu vực Project của người dùng.

## 1. Mục tiêu

Form phải giúp người tạo diễn đạt một task đủ rõ để:

- người thực hiện biết chính xác phần việc mình phải làm;
- reviewer biết cần kiểm tra điều gì;
- AI có đủ ngữ cảnh để phân tích sau review;
- dữ liệu cuối cùng có thể trở thành thông tin đáng tin cậy cho hồ sơ năng lực.

Mục tiêu **không phải** là biến task thành một tài liệu dự án thu nhỏ, bắt người tạo tự học rồi điền SMART, 5 Whys, MoSCoW, WBS… hoặc bắt người thực hiện tự nộp bằng chứng về mình.

Các phương pháp đó chỉ là chất liệu để Suar đặt câu hỏi, kiểm tra độ rõ và gợi ý đúng lúc.

## 2. Ranh giới đã chốt

### 2.1. Project, Organization và Sprint không phải field của Task trên giao diện người dùng

Người dùng đã chọn Organization rồi vào đúng Project trước khi mở Board task. Board cũng đang hiển thị theo Project. Vì vậy:

- không hiển thị và không cho sửa các field `Organization`, `Project`, `Sprint` trong form tạo task, chi tiết task hoặc sửa task của người dùng;
- Project/Organization vẫn được lưu trong dữ liệu nền để phân quyền, workflow, truy vết và đóng gói ngữ cảnh cho AI;
- Project chỉ cần xuất hiện ở giao diện quản trị hệ thống khi thật sự cần quản lý/truy vết liên Project;
- Sprint không được biến thành field lặp lại trên Task. Việc task thuộc/chạy qua sprint là dữ liệu vận hành của Board/Sprint, không phải câu hỏi creator phải trả lời mỗi lần tạo task.

Điều này **không** có nghĩa Project được dùng để thay thế những nội dung riêng của task. Việc dùng Project/Sprint để giảm bớt dữ liệu phải nhập sẽ được bàn ở phase khác.

### 2.2. Status được quyết định bởi cột Board, không phải bởi form

- Form task giao việc không có field `Trạng thái khởi tạo`.
- Người dùng bấm tạo từ cột nào thì item được tạo trong status của cột đó.
- Cột `DOCS` là nơi tạo/lưu tài liệu hoặc link sống lâu. Người dùng tạo Docs ngay tại cột này, không vào một cột task khác rồi chọn `DOCS` trong form.
- Một item ở `DOCS` không có assignee, không đi qua review task và không làm phát sinh hồ sơ năng lực.
- Task làm tài liệu vẫn là task bình thường: tạo trong cột workflow phù hợp, có người thực hiện và đi qua review nếu hoàn thành.

### 2.3. Mức kỹ năng của Project và Task

| Nơi cấu hình | Nghĩa đúng |
| --- | --- |
| **Kỹ năng của Project** | Project quy định khoảng level được phép **yêu cầu trên task**. Ví dụ Svelte L3–L8 nghĩa là task của Project chỉ được yêu cầu Svelte trong khoảng này. |
| **Kỹ năng của Task** | Một mức tối thiểu để được giao/ứng tuyển task. Task yêu cầu Svelte L4 thì người L4–L14 đều đủ điều kiện về Svelte. |

Các quy tắc phải giữ:

- L4 của task không phải mức thành tích đã hứa, không phải mức AI phải chấm và không tự ghi L4 vào hồ sơ.
- Cận trên L8 của Project chỉ giới hạn **mức task được phép yêu cầu**, không giới hạn năng lực của người L9–L14.
- AI/reviewer đánh giá công việc thực tế sau review; việc AI kết luận phần Svelte của task thực tế chỉ ở L2 hoặc là L6/L7, dù task ban đầu yêu cầu L4, đều có thể xảy ra.
- AI chỉ được chuyển hoá vào profile sau toàn bộ luồng review, phê duyệt và board review task `Done`.

#### Bốn dữ liệu không được gộp làm một

| Dữ liệu | Do ai đặt | Dùng để làm gì | Có được đổi dữ liệu khác không? |
| --- | --- | --- | --- |
| Khoảng của kỹ năng tại Project | Người quản lý Project | Chọn cả mức thấp nhất và mức cao nhất mà task trong Project được phép khai báo, ví dụ L2–L10. | Không nói lên độ khó thực tế của một task hay năng lực của người. |
| Mức tối thiểu của kỹ năng tại Task | Người tạo task | Lọc người đủ điều kiện nhận/ứng tuyển task. | Không phải điểm AI phải chấm. |
| Độ khó thực tế theo từng kỹ năng của task | AI đề xuất từ hợp đồng công việc, kết quả, review và dữ liệu hệ thống; quản trị viên phê duyệt khi cần | Giải thích bản chất, phạm vi và độ sâu thực tế của công việc đã làm. | Không tự bằng mức năng lực của người làm. |
| Mức năng lực quan sát được của người làm | AI đề xuất từ cách người đó thực hiện task và review; chỉ có hiệu lực sau toàn bộ luồng phê duyệt | Chuyển hoá thành năng lực/kinh nghiệm trên hồ sơ. | Không bị ép bằng mức task yêu cầu hay độ khó thực tế của task. |

Ví dụ: Project cho phép task Svelte khai báo từ L3 đến L8. Task đặt ngưỡng L4 để nhận việc. Sau review, AI có thể kết luận phần Svelte của công việc thực tế là L6, nhưng người thực hiện chỉ thể hiện L5; hoặc task thực tế chỉ là L2 nhưng người thực hiện cho thấy cách xử lý ở L7. Các kết luận này phải được lưu và hiển thị với đúng nhãn, không được lấy một con số thay cho ba con số còn lại.

### 2.4. Người thực hiện không có nghĩa vụ tự chứng minh

Người thực hiện làm công việc và di chuyển task theo workflow. Không có field hay điều kiện buộc họ tự viết báo cáo để chứng minh năng lực. Review là trách nhiệm của reviewer/hệ thống/quy trình đánh giá, không phải gánh nặng đặt lên assignee.

## 3. Phát hiện từ giao diện và code hiện tại

Đây là dữ kiện audit, chưa phải cách triển khai mới.

| Nội dung | Hiện trạng | Lệch so với mục tiêu |
| --- | --- | --- |
| Project/Organization/Sprint | Form tạo/sửa vẫn mang dữ liệu Project; task detail cũng hiển thị nhiều metadata theo task. | Lặp lại ngữ cảnh Board; người dùng có thể thấy/chỉnh những thứ không cần quyết định tại task. |
| Lĩnh vực | Hiện là dữ liệu tự do của từng task (`business_domain`, `domain_tags`). Project hiện **không có** cấu hình lĩnh vực nghiệp vụ tương ứng. | Nếu lĩnh vực là ngữ cảnh chung của Project thì không nên bắt creator gõ/chọn lại trên mỗi task. |
| Status | Form/luồng cũ coi status là dữ liệu phải chọn. | Sai với cách Board tạo item từ một cột đã xác định. |
| Vai trò thực hiện chính | Có luồng vai trò chuyên môn của Project, nhưng form task có thể hỏi/bắt chọn ngay cả khi Project chưa cấu hình vai trò. | Role đang bị dùng như metadata tự do thay vì bộ lọc phân công dựa trên cấu hình Project. |
| Hạn và ước tính | Là hai giá trị độc lập: số giờ và ngày hạn. | Có thể xuất hiện dữ liệu vô lý, như 5 giờ nhưng hạn hai ngày, vì không có quy tắc đồng bộ. |
| Mô tả/bối cảnh/đầu ra/nghiệm thu | Có nhiều ô tên lớn, phần lớn là textarea tự do. | Creator vẫn có thể điền chung chung, lặp ý, hoặc không biết cần nêu phần nào. |
| Tình huống kiểm tra | Không thể biết chắc task có phân quyền/bảo mật chỉ bằng suy đoán từ văn bản. | Không được dùng phán đoán tự động để bắt creator trả lời một câu hỏi chưa có dữ kiện đầu vào. |

## 4. Vai trò: chỉ là công cụ giảm tải phân công

Vai trò được cấu hình tại Project, không phải creator tự nghĩ và gõ lại ở từng task:

1. Project tạo các vai trò cần dùng.
2. Mỗi vai trò có các kỹ năng cần thiết.
3. Thành viên Organization được gán vào các vai trò đó trong Project.
4. Khi tạo task, creator có thể chọn một vai trò đã có để lọc danh sách người phù hợp.
5. Creator chọn assignee từ danh sách đã lọc; kỹ năng tối thiểu của task vẫn là điều kiện riêng cần kiểm tra.

Quy tắc UI cần có:

- Project chưa cấu hình vai trò: ẩn hoàn toàn field vai trò, không blocker, không giá trị mặc định.
- Project có vai trò: field là lựa chọn có điều kiện để lọc người, không phải một ô text và không phải field bắt buộc mặc định.
- Chọn role không tự phong năng lực, không thay thế kiểm tra mức kỹ năng tối thiểu, cũng không tự tạo thành tích trong profile.

## 5. Lĩnh vực phải thuộc Project, không thuộc form Task

Nếu Project có một hoặc nhiều lĩnh vực nghiệp vụ/phần sản phẩm mà tất cả task đều thuộc vào, chúng được cấu hình tại Project. Task dùng ngữ cảnh đó ngầm định; không hiển thị lại thành dropdown hay ô nhập trên form, detail hoặc edit của user.

Audit hiện tại xác nhận Project **chưa có** cấu hình dữ liệu này, trong khi Task lại có `business_domain` và `domain_tags` tự do. Đây là chỗ cần thiết kế/migration riêng sau khi chuẩn form được chốt; không được giả định rằng Project đã có sẵn chỉ vì giao diện task đang có field đó.

Nếu sau này một Project thật sự có nhiều domain và một task cần phân biệt domain, quyết định đó phải đến từ cấu hình Project và một cơ chế chọn có kiểm soát, không phải text tự do trên Task.

## 6. Hạn hoàn thành và ước tính là một cặp đồng bộ

Không cho creator nhập hai số độc lập rồi tạo dữ liệu mâu thuẫn.

Giao diện cần coi đây là một khối `Kế hoạch thời gian` gồm:

- **Ước tính số giờ làm việc**;
- **Ngày dự kiến hoàn thành**.

Hai chiều phải đồng bộ:

| Thao tác | Hành vi cần có |
| --- | --- |
| Nhập số giờ trước | Hệ thống tính ngày dự kiến hoàn thành theo quy tắc lịch/công suất đã công bố. Ví dụ bạn nêu: 5 giờ có thể nằm trong ngày hiện tại, 13 giờ sang ngày kế tiếp. |
| Chọn ngày trước | Hệ thống điền số giờ mặc định tương ứng với ngày đó. Ví dụ chọn 14/08 khi đang ở 13/08 thì hiện 24 giờ theo quy ước đã chọn. |
| Sửa số giờ sau khi đã chọn ngày | Hệ thống cập nhật lại ngày ngay khi số giờ vượt qua hoặc lùi lại dưới ngưỡng của ngày đó. Ví dụ 22/21/20 giờ vẫn ngày 14; giảm xuống 2 giờ thì trở về ngày 13. |

`Ngày dự kiến hoàn thành` ở đây là kết quả vận hành được suy từ estimate, không phải một hạn độc lập để điền tuỳ ý.

### Điểm cần chốt trước khi viết thuật toán

Các ví dụ trên cho thấy cần một **quy ước công suất theo ngày** rõ ràng. Không được tự ý dùng một công thức thời gian thực rồi làm lệch ý nghĩa estimate:

- Nếu coi ước tính là số giờ lịch từ thời điểm hiện tại, 5 giờ lúc 20:00 sẽ rơi sang ngày hôm sau.
- Nếu coi ước tính là giờ làm việc theo công suất một ngày, phải công bố một ngày có bao nhiêu giờ và cách xử lý phần giờ còn lại của ngày hiện tại.
- Ví dụ “chọn ngày mai mặc định 24 giờ” cho thấy ngày ở đây có thể là ngày dự kiến theo dải công suất, không nhất thiết là timestamp chính xác.

Vì vậy implementation chưa được tự chọn `8 giờ`, `24 giờ` hoặc tự gán giờ kết thúc. Phải chốt trước: estimate là giờ lịch hay giờ làm việc, công suất một ngày là bao nhiêu, và ngày hiện tại còn bao nhiêu công suất. Sau đó cả giao diện lẫn máy chủ dùng chung một hàm tính.

## 7. Nguyên tắc tách nhỏ dữ liệu: không còn textarea mang tên chung chung

`Tóm tắt phần việc`, `Kết quả mong muốn`, `Tình trạng/vấn đề hiện tại`, phạm vi, đầu ra, chất lượng, giới hạn, phụ thuộc và nghiệm thu đều có thể mơ hồ nếu chỉ là một ô tự do.

Vì vậy các tên trên chỉ nên là **tên nhóm thông tin**, không phải kết thúc của thiết kế. Mỗi nhóm phải tách thành đơn vị dữ liệu trả lời một câu hỏi duy nhất.

| Nhóm ý nghĩa | Đơn vị thông tin cần tách | Không được chấp nhận |
| --- | --- | --- |
| Công việc cần làm | Mỗi phần việc: **đối tượng/phần bị tác động** + **hành động thay đổi** + **hành vi/thay đổi cụ thể cần tạo ra**. Có thể thêm nhiều dòng. | “Làm lịch sử task”, “Sửa API”, “Xử lý phần phân quyền”. |
| Tình trạng hiện tại | **Thực tế đang xảy ra/đang thiếu gì** + **xảy ra ở đâu, khi nào, với ai**. | “Chưa tốt”, “Có lỗi”, “Cần cải thiện”. |
| Ảnh hưởng | **Ai/phần nào chịu ảnh hưởng** + **hậu quả cụ thể nếu chưa xử lý**. | “Quan trọng”, “Ảnh hưởng người dùng”. |
| Phạm vi | Danh sách phần/hành vi **nằm trong task**. | “Task detail”, “Phần frontend”. |
| Ngoài phạm vi | Một ranh giới chủ động: phần nào không sửa trong task này và để đâu nếu đã biết. | Bỏ trống theo thói quen hoặc lặp lại phạm vi. |
| Đầu ra | Mỗi đầu ra: **thứ gì thay đổi/tạo ra**, **nằm ở đâu/được bàn giao cho ai**, **trạng thái tối thiểu phải đạt**. | “Giao diện”, “API”, “Code xong”. |
| Yêu cầu chất lượng | Mỗi yêu cầu: **thuộc tính cần giữ** + **đối tượng áp dụng** + **điều kiện kiểm tra được**. | “Bảo mật”, “Tối ưu”, “Responsive”. |
| Giới hạn | Một điều cấm/không được thay đổi cụ thể và lý do/ràng buộc nếu có. | “Cẩn thận”, “Không ảnh hưởng hệ thống”. |
| Phụ thuộc | Thành phần/quyết định cần có + chủ thể phụ trách + trạng thái sẵn sàng. | “Chờ backend”, “Có dependency”. |
| Tiêu chí nghiệm thu | Điều kiện ban đầu + hành động/đầu vào + kết quả quan sát được. Mỗi tiêu chí là một dòng. | “Chạy tốt”, “Đúng yêu cầu”, “Đã test”. |

Đây là cấu trúc dữ liệu cần đạt; chưa mặc định rằng mỗi dòng ở trên phải xuất hiện như một field độc lập. Thiết kế UI tiếp theo phải chọn cách trình bày ít gây nặng nề nhất nhưng không đánh đổi ý nghĩa.

## 8. Kết quả mong muốn: không mặc định thêm một ô chung chung

Chưa chốt phải có một field tên `Kết quả mong muốn` trên mọi task.

Nếu dữ liệu này thực sự cần cho một loại task, nó phải có mục đích riêng, không trùng với đầu ra và tiêu chí nghiệm thu, đồng thời phải tách ít nhất thành:

1. **Đối tượng nhận lợi ích/thay đổi**: ai hoặc phần nào được cải thiện;
2. **Khả năng/trạng thái có giá trị sau hoàn thành**: họ có thể làm gì, hoặc điều gì được loại bỏ/cải thiện.

Ví dụ đạt:

```text
Đối tượng: Người có quyền xem task.
Thay đổi có ích: Có thể tự theo dõi lịch sử thay đổi được phép xem,
không phải hỏi lại người giao task qua kênh ngoài hệ thống.
```

Ví dụ chưa đạt:

```text
Kết quả mong muốn: Hoàn thành tốt tính năng.
```

Nếu hai dữ liệu này đã được diễn đạt đầy đủ ở `tình trạng hiện tại`, `ảnh hưởng`, `công việc cần làm` và `tiêu chí nghiệm thu`, không tạo thêm field chỉ để lặp lại chúng.

## 9. Nghiệm thu: không hỏi mù về “tình huống kiểm tra”

Câu hỏi “task này có phân quyền/bảo mật không?” không thể được hệ thống biết một cách chắc chắn trước khi creator cung cấp thông tin. Không được dùng suy đoán từ tiêu đề/mô tả để tự tạo blocker.

Vì vậy:

- không có một field chung chung tên `Tình huống cần kiểm tra` để hỏi thêm một cách mơ hồ;
- nếu task có quy tắc, creator phải nêu quy tắc đó bằng dữ liệu rõ: chủ thể, điều kiện, hành động được phép/không được phép và kết quả;
- từ các quy tắc, phạm vi và đầu ra đã được khai báo, creator/reviewer tạo các tiêu chí nghiệm thu tương ứng;
- hệ thống có thể gợi ý sau khi đã có dữ liệu (ví dụ có quy tắc về quyền truy cập nhưng chưa có tiêu chí nghiệm thu tương ứng), nhưng gợi ý không được dựa vào việc đoán nội dung văn bản;
- với task đơn giản không có quy tắc riêng, chỉ cần tiêu chí nghiệm thu đúng với phần việc, không ép viết một bộ kịch bản dài.

Người thực hiện không phải là người nộp những tình huống này để chứng minh mình đã làm; đó là phần contract do creator/reviewer dùng để kiểm tra công việc.

## 10. Bản form cụ thể để tiếp tục thảo luận

Đây là **form có thể đưa ra giao diện để người dùng điền**, không chỉ là danh sách nguyên tắc. Các mục có dấu `*` là dữ liệu cần có trước khi giao task; mức blocker chi tiết sẽ chốt sau.

Phía trên form không có Organization, Project, Sprint hoặc dropdown status. User đang tạo item từ đúng Board/cột đã chọn; dữ liệu đó đã có trong ngữ cảnh nền.

### 10.1. Phần `Tên và phần việc`

```text
Tiêu đề *
[ Hiển thị lịch sử thay đổi theo quyền xem task                    ]
  Gợi ý: dùng động từ + đối tượng + thay đổi chính.

Hạng mục công việc *                                        [+ Thêm hạng mục]
┌──────────────────────────────────────────────────────────────────────┐
│ 1. Phần bị tác động *                                                │
│    [ Chi tiết task / API lịch sử / Policy quyền xem                 ]│
│                                                                      │
│    Thay đổi phải thực hiện *                                         │
│    [ Bổ sung timeline chỉ đọc; kiểm tra quyền trước khi trả dữ liệu ]│
│                                                                      │
│    Hành vi sau thay đổi *                                            │
│    [ Người có quyền xem được lịch sử; người không có quyền bị từ chối]│
└──────────────────────────────────────────────────────────────────────┘
```

Không có ô tên `Tóm tắt phần việc`. Một task có thể có nhiều hạng mục; mỗi hạng mục buộc tách đối tượng, thay đổi và hành vi cần có.

### 10.2. Phần `Hiện trạng và ảnh hưởng`

```text
Hiện trạng *
[ Người có quyền xem task chưa có nơi xem lại các thay đổi quan trọng ]

Nơi/tình huống hiện trạng xảy ra *
[ Khi mở chi tiết task; áp dụng cho người có quyền xem task          ]

Ai/phần nào bị ảnh hưởng *
[ Project viewer, người giao task và luồng hỗ trợ qua bình luận       ]

Hậu quả nếu chưa xử lý *
[ Phải hỏi lại qua kênh ngoài; nếu API không kiểm tra quyền có thể lộ dữ liệu ]
```

Đây không còn là một textarea tên `Tình trạng/vấn đề hiện tại`. Với task không phải bug, `Hiện trạng` vẫn trả lời được điều đang thiếu hoặc điều chưa làm được.

### 10.3. Phần `Phạm vi và ràng buộc công việc`

```text
Phần nằm trong task *                                      [+ Thêm phần]
[ Timeline ở chi tiết task ]
[ API đọc lịch sử và kiểm tra quyền xem task ]

Phần không làm trong task                                  [+ Thêm phần]
[ Không thay đổi quyền chỉnh sửa task ]

Quy tắc nghiệp vụ (chỉ thêm khi task có rule)               [+ Thêm quy tắc]
┌ Chủ thể *        [ Người có quyền xem task                 ]
│ Điều kiện *      [ Có quyền xem chính task đó              ]
│ Được/không được *[ Được đọc lịch sử, không được chỉnh sửa  ]
│ Kết quả hệ thống*[ Chỉ trả các sự kiện được phép xem       ]
└────────────────────────────────────────────────────────────┘

Giới hạn riêng (nếu có)                                    [+ Thêm giới hạn]
[ Không thay đổi policy phân quyền hiện hữu ngoài phạm vi đọc lịch sử ]

Phụ thuộc (nếu có)                                         [+ Thêm phụ thuộc]
[ Audit log hiện có | Nhóm nền tảng | Sẵn sàng               ]
```

Không bắt creator khai “không có” vào ô trống. Các phần `không làm`, `giới hạn`, `phụ thuộc` chỉ có giá trị khi có một ranh giới/ràng buộc thật cần ghi nhận.

### 10.4. Phần `Đầu ra và chất lượng`

```text
Đầu ra bàn giao *                                          [+ Thêm đầu ra]
┌ Loại đầu ra *       [ API thay đổi                         ]
│ Vị trí/đối tượng *  [ Endpoint đọc lịch sử task            ]
│ Trạng thái tối thiểu*[ Kiểm tra quyền xem trước khi trả dữ liệu ]
└────────────────────────────────────────────────────────────┘

┌ Loại đầu ra *       [ Giao diện thay đổi                   ]
│ Vị trí/đối tượng *  [ Chi tiết task                        ]
│ Trạng thái tối thiểu*[ Có tải/rỗng/lỗi và timeline chỉ đọc ]
└────────────────────────────────────────────────────────────┘

Yêu cầu chất lượng (nếu áp dụng)                            [+ Thêm yêu cầu]
┌ Thuộc tính *        [ An toàn phân quyền                   ]
│ Áp dụng cho *       [ API và giao diện lịch sử              ]
│ Cách biết đã đạt *  [ Người không có quyền không nhận dữ liệu ]
└────────────────────────────────────────────────────────────┘
```

`Đầu ra bàn giao` không còn là một ô viết “API, giao diện, test”. Mỗi đầu ra phải chỉ ra thứ được thay đổi, nơi áp dụng và trạng thái tối thiểu.

### 10.5. Phần `Nghiệm thu`

```text
Tiêu chí nghiệm thu *                                     [+ Thêm tiêu chí]
┌ Điều kiện *       [ Người dùng có quyền xem task           ]
│ Hành động/đầu vào*[ Mở chi tiết task                        ]
│ Kết quả quan sát*[ Hiển thị timeline; không có thao tác sửa ]
└────────────────────────────────────────────────────────────┘

┌ Điều kiện *       [ Người dùng không có quyền xem task     ]
│ Hành động/đầu vào*[ Gọi API đọc lịch sử                     ]
│ Kết quả quan sát*[ Bị từ chối, không nhận dữ liệu lịch sử   ]
└────────────────────────────────────────────────────────────┘

Cách nghiệm thu *
[x] Rà soát mã   [x] Kiểm thử tự động   [x] Kiểm thử thủ công

Người/nhóm nghiệm thu *
[ Chọn người hoặc nhóm có quyền và đủ ngữ cảnh               ]
```

Không có field `Tình huống kiểm tra` tách riêng. Khi creator khai báo một quy tắc, form kiểm tra xem quy tắc đó đã có tiêu chí nghiệm thu phù hợp chưa; đây là đối chiếu dữ liệu đã có, không phải đoán task có bảo mật hay phân quyền.

### 10.6. Phần `Phân công, kỹ năng và thời gian`

```text
Vai trò Project (chỉ hiện khi Project đã cấu hình vai trò)
[ Người phát triển ứng dụng                                  v ]
  Chọn vai trò để lọc người thực hiện; không có role thì không hiện dòng này.

Người thực hiện *
[ Chọn từ danh sách phù hợp với vai trò đã chọn               v ]

Kỹ năng tối thiểu để nhận task *                            [+ Thêm kỹ năng]
┌ Kỹ năng *          [ Svelte                                v ]
│ Mức tối thiểu *    [ L4                                    v ]
│ Hạng mục liên quan*[ Timeline ở chi tiết task              v ]
└────────────────────────────────────────────────────────────┘
  Chỉ hiện các mức nằm trong khoảng Svelte của Project.
  L4 là điều kiện nhận task, không phải mức sẽ đánh giá hồ sơ.

Ước tính làm việc *             Ngày dự kiến hoàn thành *
[ 13 ] giờ                      [ 14/08/2026 ]
  Hai input đồng bộ hai chiều theo quy ước công suất đã chốt.

Mức độ ưu tiên
[ Trung bình                                                     v ]

Quyền hiển thị
[ Theo cấu hình Board/Project                                   v ]
```

Vai trò chỉ lọc người ở Project. Kỹ năng vẫn là điều kiện bắt buộc riêng: người được giao/ứng tuyển phải đạt tối thiểu tất cả skill của task.

### 10.7. Phần `Giá trị mong muốn` — chỉ hiện khi thực sự có dữ liệu riêng

Không hiện mặc định trên mọi task. Nếu creator chọn thêm phần này, giao diện không cho một textarea chung chung:

```text
Đối tượng được hưởng lợi *
[ Người có quyền xem task                                      ]

Khả năng/trạng thái có ích sau hoàn thành *
[ Tự theo dõi được các thay đổi được phép xem, không phải hỏi lại ]
```

Nếu nội dung đã lặp với hiện trạng, ảnh hưởng và tiêu chí nghiệm thu thì form cảnh báo bỏ phần này, không lưu thêm một bản diễn đạt khác.

### 10.8. Phần `Kiểm tra trước khi giao`

Đây không phải nơi nhập thêm thông tin. Hệ thống hiển thị bản đọc của task cho assignee/reviewer và các lỗi cụ thể, ví dụ:

```text
[!] Hạng mục “API đọc lịch sử” chưa có đầu ra bàn giao tương ứng.
[!] Rule “người không có quyền không được đọc lịch sử” chưa có tiêu chí nghiệm thu.
[!] Assignee hiện chưa đạt Svelte L4.
[✓] Estimate 13 giờ và ngày dự kiến 14/08 đang đồng bộ.
```

Creator chỉ xác nhận phiên bản cuối sau khi các blocker thật đã được giải quyết.

Những thứ **không nằm trong form/chi tiết/sửa task của user**: Organization, Project, Sprint, dropdown status khởi tạo và lĩnh vực tự do cấp Task.

## 11. Đối chiếu ngắn với task mẫu về lịch sử thay đổi và phân quyền

| Nhóm | Dữ liệu được viết theo khung mới |
| --- | --- |
| Công việc cần làm | `Chi tiết task` + `bổ sung` + `timeline lịch sử thay đổi chỉ đọc`; `API lịch sử` + `kiểm tra` + `quyền xem task trước khi trả dữ liệu`. |
| Tình trạng hiện tại | Người có quyền xem task chưa tự xem được thay đổi; dữ liệu lịch sử có nguy cơ bị lộ nếu API chỉ kiểm tra định danh mà không kiểm tra quyền xem task. |
| Quy tắc | Viewer có quyền xem task được đọc timeline; viewer không có quyền sửa; người không có quyền xem task không nhận dữ liệu lịch sử qua giao diện lẫn API. |
| Đầu ra | API đọc lịch sử có kiểm tra quyền; khu vực timeline có trạng thái tải/rỗng/lỗi; bộ kiểm thử quyền được bổ sung. |
| Tiêu chí nghiệm thu | Khi viewer có quyền xem mở task, timeline hiển thị và không có thao tác sửa. Khi người không có quyền gọi API, hệ thống từ chối và không trả dữ liệu. |
| Kỹ năng | Svelte L4 là ngưỡng tối thiểu để nhận task. Không phải mức AI sẽ ghi cho người hoàn thành. |

Task mẫu vẫn có thể dài vì bản chất có nhiều quy tắc. Điểm cần thay đổi là creator không phải tự nghĩ ra một tài liệu A–M hay nhét mọi ý vào ô `Mô tả`.

## 12. Các quyết định còn cần chốt

1. **Cấu hình công suất để đồng bộ estimate và ngày:** estimate là giờ lịch hay giờ làm việc; công suất/ngày và quy tắc cho ngày hiện tại.
2. **Lĩnh vực Project:** Project chỉ có một lĩnh vực hay có danh sách lĩnh vực để task chọn từ đó khi thật sự cần phân biệt.
3. **Loại đóng góp/lý do khởi tạo:** audit tiếp để quyết định giữ thành dữ liệu cấu trúc hay bỏ vì trùng với phần việc/bối cảnh.
4. **Giá trị/kết quả mong muốn:** chỉ thêm khi chứng minh được không trùng với các phần còn lại và dùng cấu trúc hai phần ở mục 8.
5. **Cách UI biểu diễn các đơn vị dữ liệu ở mục 7:** danh sách dòng, wizard ngắn hay section mở rộng; không được quay lại textarea tên chung chung.

## 13. Không thuộc phạm vi tài liệu này

- Dán/upload/import tài liệu và AI tự trích xuất field.
- Giảm tải task bằng Project Context, Sprint, Work Package hay template.
- Thay đổi workflow Board Done → Review Board Done → Profile.
- Thuật toán AI đánh giá skill sau review.

Các phần này phải tương thích với contract task sau khi chốt, nhưng không được dùng làm lý do để form hiện tại tiếp tục mơ hồ.
