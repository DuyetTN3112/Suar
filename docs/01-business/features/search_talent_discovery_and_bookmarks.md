# Search, Talent Discovery, Và Talent Bookmarks

## Mục đích

Tài liệu này gom business truth đã được kiểm chứng cho domain search/talent discovery của Suar:

- searchable talent pool
- org talent directory
- engine-backed search và fallback behavior
- talent bookmarks
- search runtime health và incident caveats

Mục tiêu là để người đọc không có code vẫn hiểu được:

- đâu là page shell, đâu là JSON search surface
- lúc nào search engine thật sự tham gia
- lúc nào hệ thống fallback về query legacy
- đâu là canonical bookmark/talent API, đâu là compatibility alias

## Một Câu Tóm Tắt Ngắn

Talent discovery trong Suar không chỉ là một page liệt kê user.

Nó là lớp tìm kiếm và shortlist có gắn profile signals, match context, quyền org-admin shell, và runtime search integration có health check riêng.

## Nếu Bạn Chỉ Có 5 Phút

Chỉ cần nhớ bốn ý:

1. Talent chỉ thành candidate hợp lệ khi còn `active` và `is_searchable = true`.
2. Page runtime là `/org/talents` và `/org/bookmarks`; `/marketplace/talents` và `/marketplace/bookmarks` chỉ redirect legacy. JSON search/bookmark APIs mới là contract runtime quan trọng hơn.
3. Search engine không phải lúc nào cũng tham gia; thường chỉ được thử khi có keyword và runtime đang bật, còn lại hệ thống có thể fallback về query legacy.
4. Org talents và talent bookmarks là management-side workspace có current-organization context, không nên bị kể như public anonymous search.

Nếu đang gấp:

- lỗi search ra sai người hoặc không ra người: đọc phần `Search Engine, Fallback, Và Query Truth`
- lỗi org talents hoặc bookmark: đọc phần `Talent Directory Và Org Talent Shell` và `Talent Bookmarks`
- lỗi health nhưng UI vẫn có data: đọc phần `Search Runtime Health`

## Mental Model

Đọc domain này theo 5 nấc:

1. talent phải `active` và `is_searchable` mới có thể trở thành candidate hợp lệ
2. page shell như `/org/talents` và `/org/bookmarks` là điểm vào cho người dùng
3. JSON search surfaces mới là nơi search/bookmark contract sống rõ nhất
4. khi có keyword và search runtime bật, hệ thống có thể dùng search engine
5. nếu engine rỗng, disabled, hoặc lỗi, query còn có đường fallback về DB/query legacy

Một câu nhớ ngắn:

`Talent page là cửa vào. Search query mới là nơi quyết định engine, fallback, và ranking context.`

## Surface Runtime Đã Xác Nhận

### Page routes

- `GET /org/talents`
- `GET /org/talents/:userId`
- `GET /org/bookmarks`

Legacy redirects:

- `GET /marketplace/talents` → `/org/talents`
- `GET /marketplace/bookmarks` → `/org/bookmarks`

### Compatibility/API routes

- `GET /api/talents/search`
- `GET /api/talent-bookmarks`
- `POST /api/talent-bookmarks`
- `PATCH /api/talent-bookmarks/:bookmarkId`
- `DELETE /api/talent-bookmarks/:bookmarkId`

### Canonical routes

- `GET /api/v1/talents/search`
- `GET /api/v1/talent-bookmarks`
- `POST /api/v1/talent-bookmarks`
- `PATCH /api/v1/talent-bookmarks/:bookmarkId`
- `DELETE /api/v1/talent-bookmarks/:bookmarkId`
- `GET /api/v1/me/organizations/current/talents/search`
- `GET /api/v1/me/organizations/current/talents/:userId`
- `POST /api/v1/me/organizations/current/talents/:userId/bookmarks`
- `DELETE /api/v1/me/organizations/current/talents/:userId/bookmarks`

### Compatibility/deprecated aliases

- `GET /api/org/talents/search`
- `GET /api/org/talents/:userId`
- `POST /api/org/talents/:userId/bookmarks`
- `DELETE /api/org/talents/:userId/bookmarks`
- `GET /api/recruiter-bookmarks`
- `POST /api/recruiter-bookmarks`
- `PATCH /api/recruiter-bookmarks/:bookmarkId`
- `DELETE /api/recruiter-bookmarks/:bookmarkId`
- `GET /api/recruiters/bookmarks`
- `POST /api/recruiters/bookmarks`
- `PATCH /api/recruiters/bookmarks/:bookmarkId`
- `DELETE /api/recruiters/bookmarks/:bookmarkId`

Nguồn: `start/routes/users.ts`, `start/routes/marketplace.ts`, `app/modules/marketplace/controllers/marketplace_controller.ts`, `start/routes/deprecated/api_org_compat_aliases.ts`

## Talent Directory Và Org Talent Shell

### Điều phải hiểu đúng

Talent sourcing hiện là org recruiting surface, không còn page runtime riêng trong marketplace module.

Code hiện tại:

- `/org/talents` là admin-shell surface cho người quản lý trong tổ chức
- `/org/bookmarks` là talent shortlist workspace
- `/marketplace/talents` và `/marketplace/bookmarks` là legacy redirects sang `/org/*`, không phải duplicate marketplace UI
- org recruiting pages yêu cầu current organization
- yêu cầu user có quyền admin/manager shell trong organization
- đọc talent list qua `GetTalentDirectoryPageQuery`

Nguồn: `app/modules/users/controllers/org_talents_page_controller.ts`, `app/modules/users/actions/queries/get_talent_directory_page_query.ts`

### Proof mạnh đã thấy

Org talent surface hiện đã có:

- route thật
- controller thật
- UI page thật trong `inertia/apps/org/modules/talents/index.svelte` và `show.svelte`
- E2E listing/search/empty-state safety
- E2E detail navigation
- E2E bookmark flow
- component tests cho filter/search/sort/bookmark/pagination

Nguồn: `start/routes/users.ts`, `inertia/apps/org/modules/talents/index.svelte`, `inertia/apps/org/modules/talents/show.svelte`, `inertia/apps/org/tests/e2e/org/org_talent_pages.spec.ts`, `inertia/apps/org/tests/e2e/org/talent_bookmarks.spec.ts`, `inertia/apps/user/tests/e2e/marketplace/talent_directory_bookmarks.spec.ts`, `inertia/apps/org/tests/modules/talents/index.test.ts`, `inertia/apps/org/tests/modules/talents/show.test.ts`

## Search Engine, Fallback, Và Query Truth

### Điều quan trọng nhất

Talent search hiện không phải lúc nào cũng đi qua search engine.

`SearchTalentsQuery` hiện có logic:

- chỉ thử search engine khi có `q` và search runtime đang bật
- nếu engine trả rỗng, fallback về query legacy
- nếu engine lỗi, fallback về query legacy
- nếu không có `q`, đi thẳng vào query legacy

Điều này rất quan trọng vì:

- search runtime chết chưa chắc làm talent directory “mất trắng”
- page shell vẫn có thể còn dữ liệu qua fallback path
- incident search phải phân biệt lỗi engine và lỗi dữ liệu nền

Nguồn: `app/modules/users/actions/queries/search_talents_query.ts`

### Engine-backed user directory signals

Code hiện cho thấy user-directory search index:

- có index repository riêng
- search theo `username` và `email`
- loại trừ user đã `deleted_at`

Nguồn: `app/modules/search/actions/queries/search_users_via_engine_query.ts`, `app/modules/search/infra/users/user_directory_search_index_repository.ts`, `app/modules/users/tests/backend/integration/user_directory_search_engine.spec.ts`

## Talent Search Và Ranking Context

### Hai mode chính

#### 1. Search/list mode

Khi không có `task_id`:

- trả simple talent list
- dùng trust/performance signals và explainability summary
- có pagination logic ở page layer

#### 2. Ranked task-fit mode

Khi có `task_id`:

- query lấy task context thật
- đọc `task_required_skills`
- đọc user skills + work history + trust score
- chạy `calculateApplicantMatch`
- sắp xếp theo `match_score`

Điều này có nghĩa:

- cùng một talent surface có thể vừa là directory, vừa là task-fit shortlist
- muốn viết report đúng, phải phân biệt mode browse với mode task-context ranking

Nguồn: `app/modules/users/actions/queries/search_talents_query.ts`

## Talent Bookmarks

### Mục tiêu

Cho phép người quản lý lưu shortlist talent cùng với:

- notes
- folder
- rating

### Rule quyền hiện tại

Bookmark access không mở cho mọi authenticated user.

Controller hiện kiểm tra:

- current organization
- membership context
- quyền `canAccessAdminShell`

Nói ngắn:

- bookmark talent là quản lý-side workspace
- không phải feature chung cho mọi member

Nguồn: `app/modules/users/controllers/recruiter_bookmarks_controller.ts`

### Data/runtime anchors

- `recruiter_bookmarks`
- `recruiter_user_id`
- `talent_user_id`
- `notes`
- `folder`
- `rating`

## Search Runtime Health

### Health truth đã xác nhận

Search có health check riêng:

- nếu search runtime disabled hợp lệ: health không coi đó là fail hạ tầng
- nếu ping Elasticsearch fail: trả warning
- nếu ensure index fail: trả warning

Health check hiện đụng trực tiếp:

- `searchPublicApi.isEnabled()`
- `searchPublicApi.ping()`
- `searchPublicApi.ensureTalentIndex()`

Điều này có nghĩa:

- incident search phải đọc `warning` cẩn thận, không chỉ nhìn `ok/fail`
- kết quả health `ok` vẫn có thể chỉ mang nghĩa `enabled: false`, tức search engine đang disabled hợp lệ chứ không phải đang phục vụ query thật
- search issue có thể là enable-state, reachability, hoặc index readiness
- health check này cũng không hoàn toàn là phép đo read-only thuần túy; khi search runtime đang enabled và ping pass, nó còn gọi `ensureTalentIndex()`
- vì vậy nếu ai mô tả search health như một “probe chỉ đọc” tuyệt đối thì chưa đúng với runtime hiện tại

Nguồn: `app/modules/http/health_checks/search_health_check.ts`, `app/modules/search/public_contracts/search_public_api.ts`

## Nếu Production Lỗi Ở Domain Này

Khoanh nhanh theo dấu hiệu:

- talent page rỗng bất thường nhưng app vẫn sống: kiểm tra search runtime, fallback query path, và `is_searchable`
- keyword search sai hoặc không ra đúng người: kiểm tra engine index, user-directory projection, và fallback behavior
- org talents vào được nhưng không thấy data: kiểm tra current organization và admin-shell permission
- bookmark lưu không được: kiểm tra quyền sourcing/admin-shell trước, rồi mới kiểm tra mutation logic
- health warning ở `search`: kiểm tra `isEnabled`, `ping`, và `ensureTalentIndex`

Một rule thực dụng:

- đừng kết luận “Elasticsearch chết nên talent directory chết”
- trước hết phải xác định flow đang ở engine-backed mode hay legacy fallback mode

## Test Evidence

### Integration

- engine search trả active users theo username/email keyword
- deleted users không được trả về dù keyword match
- talent search API giữ wrapped camelCase contract
- canonical v1 talent search giữ contract shape
- canonical org talent search giữ contract shape
- talent bookmark APIs có create/list/update/delete proof ở cả compatibility và canonical v1
- deprecated talent bookmark dialect còn trả deprecation headers đúng

Nguồn: `app/modules/users/tests/backend/integration/user_directory_search_engine.spec.ts`, `app/modules/users/tests/backend/integration/user_marketplace_api_standardization.spec.ts`

### E2E

- org talents page render shell ổn định
- mở detail từ org talents được
- bookmark talent từ detail page được
- empty search result render rõ

Nguồn: `inertia/apps/org/tests/e2e/org/org_talent_pages.spec.ts`, `inertia/apps/org/tests/e2e/org/talent_bookmarks.spec.ts`, `inertia/apps/user/tests/e2e/marketplace/talent_directory_bookmarks.spec.ts`, `inertia/apps/user/tests/e2e/tasks/match_score_explainability.spec.ts`

## Related Diagrams

- `docs/11-diagrams/Action/02-marketplace/README.md`
- `docs/11-diagrams/Action/02-marketplace/high-level/act_02d_marketplace_triage_ranking.mmd`
- `docs/11-diagrams/Action/07-profile-skills/README.md`
- `docs/11-diagrams/Sequence/09-profile-skills/high-level/seq_09_skill_profile.mmd`

## What Not To Do

- Đừng nhìn page shell có data rồi kết luận chắc chắn search engine đang chạy; có thể bạn đang ở fallback path.
- Đừng mô tả `/marketplace/*` như public anonymous surface nếu chưa kiểm tra current organization và admin-shell guard.
- Đừng đọc health `ok` rồi suy ra Elasticsearch đang phục vụ traffic; có trường hợp `ok` chỉ vì runtime đang disabled hợp lệ.
- Đừng bỏ qua deprecated aliases khi audit API, vì người dùng cũ hoặc test compatibility vẫn có thể còn đi qua chúng.

## Boundary

Tài liệu này không khẳng định:

- mọi talent/profile pages luôn dùng search engine ở mọi tình huống
- search runtime failure luôn kéo theo user-facing page failure hoàn toàn
- mọi bookmark/search surfaces đã loại bỏ hết compatibility aliases

File này chỉ khẳng định những gì đã có route, controller, query, health-check, hoặc test proof đủ mạnh trong hệ thống hiện tại.

## Khi Nào Dừng Ở File Này

Bạn có thể dừng ở file này nếu mục tiêu của bạn là:

- hiểu domain search/talent discovery của Suar mà không mở code
- viết report phần searchable talent, bookmark, và search-runtime behavior
- khoanh vùng nhanh incident liên quan talent search, org talents, hoặc talent bookmarks
- phân biệt đúng giữa engine-backed search, fallback query, canonical API, và deprecated alias

Bạn nên đọc thêm file khác chỉ khi:

- cần business pipeline rộng hơn với profile/matching: mở `./profile_pipeline_and_marketplace.md`
- cần API inventory đầy đủ hơn theo namespace: mở `../../06-data/api-specification.md`
- cần runbook/incident framing: mở `../../09-operations/production-incident-first-response.md`
