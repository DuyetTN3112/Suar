# Evidence Folder Guide

| Field | Value |
|---|---|
| Status | Active |
| Audience | Maintainer, reviewer, doc owner, lead, người cần audit bộ docs thay vì chỉ đọc nội dung sản phẩm |
| Purpose | Làm điểm vào cho nhóm evidence/audit docs để người đọc biết file nào dùng để kiểm chứng nguồn, coverage, legacy retirement, hay workstream status |
| Source of Truth | `docs/12-evidence/*`, verified docs structure, và cited system evidence |
| Last Reviewed | 2026-07-19 |
| Review Cycle | Khi taxonomy đổi, source hierarchy đổi, hoặc coverage/audit boundary đổi |
| Owner | Engineering |
| Stale Risk | Cao |

## Folder Này Dùng Để Làm Gì

Đây không phải nơi người mới nên mở đầu để hiểu sản phẩm.

Đây là nơi dùng khi bạn cần biết:

- docs này đang dựa vào nguồn nào
- coverage hiện đã kín tới đâu
- legacy narrative files đã được hấp thụ và giữ boundary an toàn chưa
- raw draft, handoff, demo audit, plan, và spec phải được promote như thế nào trước khi thành docs chính thức
- workstream/handoff/spec nào còn stale

Một câu nhớ ngắn:

`Folder này kiểm chứng docs. Nó không thay docs nghiệp vụ hay docs vận hành.`

## Nếu Bạn Đang Audit Bộ Docs Để Mang Ra Ngoài

Folder này là nơi kiểm tra xem bộ docs có đủ đáng tin để đứng độc lập hay chưa.

Bạn nên dùng nó để trả lời:

1. claim nào đang bám vào source nào
2. concern nào đã có file chính thức, concern nào mới chỉ được cover ở mức context
3. legacy file, handoff, spec, plan nào chỉ nên xem như tư liệu phụ

## Mở File Nào Khi Nào

Nếu bạn đang:

- muốn biết docs đang tin vào nguồn nào: mở `source-register.md`
- muốn biết AI/human phải viết docs theo chuẩn nào: mở `../DOCUMENTATION_WRITING_STANDARD_FOR_AI.md`
- muốn biết cách chuyển raw working docs thành docs chính thức: mở `working-document-promotion-policy.md`
- muốn biết concern nào đã có artifact chính thức: mở `document-coverage-matrix.md`
- muốn biết diagram coverage đang map ra sao: mở `diagram-coverage-matrix.md`
- muốn biết 3 narrative root files cũ đã được hấp thụ vào đâu và có thể xóa chưa: mở `legacy-source-retirement-audit.md`
- muốn biết handoff/spec/plan nào còn stale: mở `workstream-status-audit.md`

## Reading Pack Ngắn Nhất Cho Người Audit Docs

Nếu bạn đang kiểm tra xem cả folder `docs/` đã đủ đáng tin để mang ra ngoài chưa, đọc theo thứ tự:

1. `document-coverage-matrix.md`
2. `diagram-coverage-matrix.md`
3. `source-register.md`
4. `working-document-promotion-policy.md`
5. `workstream-status-audit.md`

Mục tiêu của pack này:

- biết concern nào đã có file chính thức
- biết diagram corpus đã đủ họ sơ đồ chính hay chưa
- biết docs đang bám vào source nào
- biết raw working docs nào chỉ là input, không phải truth
- biết chỗ nào còn historical/stale/unverified

## Điều Không Được Hiểu Sai

- có file audit không có nghĩa mọi claim trong docs đã đúng mãi mãi
- evidence docs giúp giảm đoán mò, nhưng vẫn phải cập nhật khi code/routes/tests đổi
- người đọc cuối thường không cần bắt đầu từ folder này trừ khi đang audit chính bộ docs

Một rule rất thực dụng:

- muốn hiểu sản phẩm: quay lại business/architecture/operations docs
- muốn kiểm tra docs có đủ tin hay chưa: ở lại folder này

## Điểm Đọc Tiếp Theo

- `../README.md`
- `../01-business/README.md`
- `../11-diagrams/README.md`

## Khi Nào Dừng Ở Folder Này

Dừng ở folder này khi bạn đã biết:

1. nguồn nào đang chống lưng cho claim bạn quan tâm
2. concern đó đã có file chính thức hay mới chỉ ở mức context
3. có cần quay lại business, architecture, data, operations, hay diagrams để đọc nội dung chính hay không
