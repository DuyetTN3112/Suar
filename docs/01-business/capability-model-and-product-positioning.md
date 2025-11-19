# Capability Model Và Product Positioning

| Field | Value |
|---|---|
| Status | Active |
| Audience | Người mới, manager, product, developer, tester, DevOps, reviewer |
| Purpose | Giải thích Suar thực chất là hệ thống gì, mô hình năng lực được hiểu ra sao, và profile/review/evidence phải được đọc như thế nào |
| Source of Truth | routes, models, commands, queries, tests, SQL/schema evidence, bộ docs đã được đối chiếu trong taxonomy hiện tại, và `docs/12-evidence/legacy-source-retirement-audit.md` cho audit trail của legacy drafts |
| Last Reviewed | 2026-07-19 |
| Review Cycle | Khi capability model, review/profile pipeline, hoặc product framing đổi |
| Owner | Product + engineering |
| Stale Risk | Cao |

## File Này Dùng Để Làm Gì

Đây là file để trả lời dứt điểm các câu hỏi mà người đọc hay vướng nhất:

- Suar có phải chỉ là task management không
- vì sao task, review, dispute, profile, marketplace lại dính với nhau
- level kỹ năng trong Suar nên được hiểu như thế nào
- profile có phải chỉ là một bảng điểm không

Nếu một người đọc file này xong mà vẫn chưa hiểu Suar đang cố làm gì, thì file này thất bại.

## Nếu Dùng File Này Để Viết Report Bên Ngoài Repo

Bạn có thể dùng file này để viết:

- phần định vị đề tài
- phần capability model / conceptual model
- phần giải thích vì sao task, review, dispute, profile, marketplace liên kết với nhau
- phần giải thích vocabulary cốt lõi của hệ thống

Đây là file phù hợp để trả lời:

- Suar thực chất là loại hệ thống gì
- capability trong Suar được hiểu theo logic nào
- vì sao review/governance là lõi chứ không phải phần phụ

Bạn không nên dùng riêng file này để kết luận:

- mọi pipeline capability đã được hiện thực hoàn chỉnh end-to-end
- mọi metric/profile output đều đã đạt maturity như vision dài hạn
- mọi khái niệm trong mô hình đều đã có UI/runtime surface đầy đủ như nhau

Nếu cần nói chặt hơn về runtime hiện tại, đọc thêm:

- `./brd-prd-scope.md`
- `./feature-specification.md`
- `../06-data/metric-dashboard-report-analysis.md`
- `../12-evidence/workstream-status-audit.md`

## Safe External Summary

Nếu cần một câu tóm tắt an toàn cho report, có thể dùng:

`Ở mức định vị sản phẩm, Suar được mô tả tốt nhất như một hạ tầng biến công việc thực thành bằng chứng năng lực có cấu trúc, có review, có governance, và có thể tái sử dụng cho profile, staffing, và matching.`

## Một Câu Mô Tả Ngắn Gọn

Suar không nên được hiểu là task board có gắn thêm vài cột điểm.

Suar nên được hiểu là:

> hạ tầng biến công việc thật thành bằng chứng năng lực có cấu trúc, có review, có dispute governance, và có thể tái sử dụng cho hồ sơ, staffing, và matching.

Nói đơn giản hơn:

`Làm việc thật -> tạo evidence -> được review -> qua governance -> thành tín hiệu hồ sơ đáng tin hơn`

## Suar Khác Task Board Thông Thường Ở Đâu

Task board thông thường chủ yếu trả lời:

- ai đang làm
- task ở trạng thái nào
- đã xong chưa

Suar còn phải trả lời thêm:

- công việc đó chứng minh năng lực gì
- được chứng minh trong bối cảnh nào
- bằng chứng nào hỗ trợ kết luận đó
- ai review và review đó đáng tin tới đâu
- có dispute, stale, hoặc governance caveat gì không
- kết luận đó có đủ sạch để đưa lên profile và đem đi matching không

Vì vậy task trong Suar không phải đích cuối. Task là đầu vào của một hệ thống năng lực có bằng chứng.

## Từ Vựng Cốt Lõi

### Skill

Một vùng năng lực cụ thể như React, PostgreSQL, testing, communication, DevOps.

### Competency

Năng lực ở mức có ngữ cảnh hơn skill. Nó không chỉ là biết một công cụ, mà là dùng nó để tạo ra kết quả đúng trong điều kiện công việc thật.

Ví dụ:

- skill: React
- competency: giao feature frontend bằng React theo cách maintainable, testable, và làm việc được với team

### Proficiency Level

Mức năng lực đã được mô tả bằng descriptor, không phải chỉ là nhãn cảm tính.

### Career Band

Giai đoạn nghề nghiệp rộng như Intern, Junior, Middle, Senior, Lead. Career band không tự động áp đặt lên từng skill.

Một người có thể:

- mạnh ở communication
- trung bình ở frontend
- yếu ở DevOps

### Project Role

Vai trò trong một project cụ thể, ví dụ frontend developer, QA tester, product owner, DevOps engineer.

### Task Role

Vai trò trong một task cụ thể. Cùng một người có thể là contributor, reviewer, coordinator, hoặc technical lead tùy task.

### Evidence

Mọi artefact giúp hỗ trợ hoặc phản biện kết luận năng lực: submission, attachment, comment, PR link, test result, demo, review note, dispute evidence, outcome.

### Confidence

Độ tin cậy của kết luận. Confidence khác level.

`Middle Solid, low confidence` và `Middle Solid, high confidence` không nên bị hiểu là giống nhau.

## Mô Hình Sáu Lớp

Suar dễ hiểu nhất khi nhìn qua sáu lớp sau:

1. Competency Framework Layer
2. Work Evidence Layer
3. Assessment Layer
4. Governance Layer
5. Profile Intelligence Layer
6. Matching And Recommendation Layer

### 1. Competency Framework Layer

Đây là lớp định nghĩa ngôn ngữ đánh giá năng lực.

Trong hệ thống hiện tại, lớp này đã có dấu vết thật ở:

- `proficiency_levels`
- `skill_rubric_versions`
- `skill_rubric_levels`
- `task_required_skills`
- `skills.category_code` với bốn category canonical: `technology`, `engineering`, `soft_skill`, `delivery`

Ý nghĩa:

- Suar không chỉ giữ tên skill
- hệ thống có descriptor, rubric, kỳ vọng level, và requirement context
- `technical` không còn là category persisted canonical; migration mới chuyển phần lớn technical cũ sang `technology` và tách một số practice như `testing`, `code_review` sang `engineering`
- các nguồn legacy `KB v4/v5` và `Capability v6` đúng ở nguyên tắc này, nhưng docs hiện hành chỉ coi những phần đã khớp schema/model/query là runtime truth

### 2. Work Evidence Layer

Đây là lớp ghi lại công việc thật.

Trong hệ thống hiện tại, lớp này đã có dấu vết thật ở:

- `tasks`
- `project_sprints`
- `task_submissions`
- `task_submission_evidences`
- `task_comments`
- `task_attachments`
- `task_review_workflows`
- `sprint_review_packages`

Task trong hệ thống hiện tại đã có nhiều field cho context đánh giá như:

- acceptance criteria
- verification method
- expected deliverables
- tech stack
- measurable outcomes
- business domain
- autonomy
- minimum level
- target level
- assessment ceiling

### 3. Assessment Layer

Đây là lớp biến evidence thành review có cấu trúc.

Trong hệ thống hiện tại, lớp này đã có dấu vết thật ở:

- `review_sessions`
- `task_review_workflows`
- `task_review_reviewers`
- `task_review_messages`
- `sprint_review_packages`
- `sprint_manager_reviews`
- `sprint_environment_reviews`
- `sprint_reverse_review_workflows`
- `sprint_reverse_review_messages`
- command xác nhận review
- query/repository đọc review metrics
- reverse-review reading surfaces

Điều phải hiểu đúng:

- surface đọc reverse review vẫn còn là dấu vết assessment history
- nhưng flow tạo reverse review mới ở level từng task hiện không còn active như trước
- task review board là projection/governance workflow riêng, không thay thế `review_sessions`
- sprint reverse review board là sprint-close workflow, không phải task-level reverse review cũ đổi tên

Reader nên nhớ:

- review trong Suar không chỉ là “điểm trung bình”
- runtime đang lưu nhiều chiều như quality, timeliness, requirement adherence, communication, code quality, proactiveness

### 4. Governance Layer

Đây là lớp chặn kết luận thiếu an toàn trước khi nó đi vào profile.

Trong hệ thống hiện tại, lớp này đã có dấu vết thật ở:

- dispute routes
- dispute comments/evidences
- AI dispute callback
- audit trail
- flagged review/admin moderation surfaces
- task review board lanes: `awaiting_review`, `in_review`, `awaiting_response`, `disputed`, `reported`, `done`; admin/AI handling can also persist `ai_reviewing` and `resolved`
- sprint reverse review workflow statuses: `awaiting_review`, `in_review`, `awaiting_response`, `disputed`, `reported`, `ai_reviewing`, `resolved`, `done`
- database workflow tables mới giữ storage/index; relationship, duplicate prevention, transition, quorum, và report permission được validate ở application commands/queries

Điều này rất quan trọng vì profile của Suar không được phép chỉ dựa vào một review chưa sạch.

### 5. Profile Intelligence Layer

Đây là lớp gom evidence hợp lệ thành tín hiệu hồ sơ có thể đọc và chia sẻ.

Trong hệ thống hiện tại, lớp này đã có dấu vết thật ở:

- `users.trust_data`
- `users.credibility_data`
- `user_profile_snapshots`
- publish/current/history snapshot routes
- các command tính trust, spider chart, aggregate profile
- spider/profile skill surfaces hiện đọc bốn nhóm `Technology`, `Engineering`, `Soft Skills`, `Delivery`

### 6. Matching And Recommendation Layer

Đây là lớp tái sử dụng tín hiệu hồ sơ và task requirement cho staffing, sourcing, và ranking.

Trong hệ thống hiện tại, lớp này đã có dấu vết thật ở:

- marketplace task browse/apply
- application ranking
- match score surfaces
- talent search
- talent bookmarks

## Cách Hiểu L0-L14 Cho Đúng

L0-L14 vẫn hữu ích vì đó là ngôn ngữ public dễ đọc. Nhưng nó không đủ nếu đứng một mình.

Một kết luận level tốt phải được đọc cùng với các lớp bên dưới nó:

- skill dimension
- task context
- responsibility scope
- observable behaviour
- evidence quality
- reviewer credibility
- confidence
- dispute/governance state
- explanation

Nói ngắn:

- không nên chia con người thành ngày càng nhiều nhãn
- nên chia kết luận năng lực thành nhiều lớp có thể quan sát, kiểm tra, và giải thích

Pass audit legacy capability v6 đã được hấp thụ ở đây như quyết định ngữ nghĩa:

- `L0-L14` là conclusion public, không phải measurement thô
- `claim`, `observation`, `verified skill state`, và `profile capability shape` phải tách lớp
- imported/self-declared skill không được trộn vào verified average
- disputed/fraud/superseded review không được cập nhật verified profile
- trust score nói về độ đáng tin của hồ sơ, không phải “người này giỏi bao nhiêu”

Những điểm này là product model chính thức. Nhưng các đề xuất sâu hơn trong file nguồn như `skill_dimensions`, `user_skill_dimension_states`, capability overview radar mới, hoặc robust aggregation service vẫn là hướng thiết kế/roadmap nếu code hiện tại chưa có table/API/UI tương ứng.

## Nguyên Tắc Đọc Profile Cho Đúng

### 1. Tách `claim` khỏi `verified`

Skill tự khai, imported, hoặc mới khai báo không được đọc như skill đã được xác thực.

### 2. Tách `level` khỏi `confidence`

Level cho biết kết luận đang nghiêng về đâu. Confidence cho biết có nên tin mạnh kết luận đó hay không.

### 3. Tách `capability` khỏi `trust`

Một người có thể có capability signal tốt ở một số skill nhưng trust hoặc governance signal chưa mạnh tương ứng.

### 4. Tách `coverage` khỏi `quality`

Nhiều evidence hơn không tự động nghĩa là kết luận tốt hơn. Cần nhìn cả chất lượng evidence, reviewer, recency, consistency, và dispute state.

### 5. Không đọc profile như bảng điểm tuyệt đối

Profile Suar nên được đọc như:

- kết luận năng lực có hỗ trợ bởi evidence
- có context
- có caveat
- có khả năng thay đổi khi có review mới, dispute mới, hoặc evidence tốt hơn

## Những Điều Đã Có Dấu Vết Runtime Khá Mạnh

- task đang được model như assessment opportunity, không chỉ là việc để đóng trạng thái
- review/dispute đang là luồng thật, không phải phần phụ trang trí
- task review workflow board đã có route/page/action/schema evidence
- sprint review package và sprint reverse review board đã có route/page/action/query/schema evidence
- profile snapshot là surface thật để đóng gói tín hiệu hồ sơ
- skill taxonomy bốn nhóm đã có runtime evidence ở `SkillCategoryCode`, migration `20260718150000_migrate_skill_categories_to_four_groups.ts`, task required skill rules, profile skill DTOs, và frontend task/profile rule files
- marketplace và talent sourcing đang tái sử dụng tín hiệu từ profile/review/task requirement

## Những Điều Không Nên Nói Quá Tay

- không nói rằng Suar “đo con người tuyệt đối”
- không nói rằng một con số đơn lẻ đủ đại diện toàn bộ năng lực
- không nói rằng mọi ý tưởng chiến lược đã được triển khai hết trong runtime hiện tại
- không nói rằng dimension-level capability aggregation đã hoàn chỉnh nếu đang chỉ thấy spider chart/avg percentage runtime
- không nói rằng task-level reverse review create flow còn active như trước; hướng hiện tại là sprint-close reverse review board
- không dùng nguyên claim trong các legacy draft ở root repo nếu chưa đối chiếu lại route/model/schema/test hiện tại

## Quan Hệ Với Các Tài Liệu Khác

Đọc tiếp:

1. `./brd-prd-scope.md` nếu cần hiểu phạm vi sản phẩm theo ngôn ngữ business
2. `./feature-specification.md` nếu cần biết feature nào là surface runtime thật
3. `./features/profile_pipeline_and_marketplace.md` nếu cần đi sâu profile, talent sourcing, matching
4. `./features/review_dispute_and_governance.md` nếu cần đi sâu task review board, sprint review package, sprint reverse review, dispute, và AI governance
5. `../03-architecture/architecture-overview.md` nếu cần map các lớp trên sang kiến trúc hệ thống
6. `../12-evidence/legacy-source-retirement-audit.md` nếu cần biết legacy root drafts đã được hấp thụ, phần nào stale, và giới hạn ra sao

## Boundary

File này là bản đã hấp thụ và rút gọn lại từ các narrative nguồn cũ, nhưng chỉ giữ những ý còn dùng được sau khi đối chiếu với hệ thống hiện tại.

Người đọc không nên phải mở các file narrative legacy ở thư mục gốc để hiểu capability model nữa. Nếu còn cần mở chúng để hiểu ý chính, bộ docs hiện tại vẫn chưa đạt.

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. Suar nên được hiểu là loại hệ thống gì
2. vì sao task, review, dispute, profile, và marketplace đi cùng nhau
3. lúc nào cần sang scope, feature spec, metric/data docs, hay evidence docs để đọc sâu hơn
