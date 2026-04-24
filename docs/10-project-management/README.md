# Management Folder Guide

| Field | Value |
|---|---|
| Status | Active |
| Audience | Manager, lead, PM, reviewer, maintainer |
| Purpose | Điểm vào cho tài liệu governance, roadmap, risk, change, meeting, và liên hệ với operations/security |
| Source of Truth | `docs/10-project-management/*`, linked operations/security/evidence docs |
| Last Reviewed | 2026-07-10 |
| Review Cycle | Khi governance artifact, roadmap, risk, hoặc operational dependency đổi |
| Owner | Product + engineering leadership |
| Stale Risk | Trung bình đến cao |

## Mục đích

Thư mục này là điểm vào cho các tài liệu quản trị dự án, vận hành, và bằng chứng coverage.

Nếu bạn đang:

- cần biết hệ thống hiện có artifact quản trị nào thật: mở `Governance And Delivery Pack`
- cần hiểu risk/roadmap/change ở mức thực dụng: mở `project-plan-roadmap-risk-change-minutes.md`
- chỉ cần xem rủi ro chính: mở `risk-log.md`
- cần biết bộ tài liệu còn thiếu artifact quản trị nào: mở `meeting-minutes-register.md` và `change-request-register.md`

## Fast Start By Situation

### Nếu bạn là manager / lead / PM

Đọc:

1. `./governance-and-delivery-pack.md`
2. `./project-plan-roadmap-risk-change-minutes.md`
3. `./risk-log.md`

### Nếu bạn đang viết report phần governance

Đọc:

1. `./governance-and-delivery-pack.md`
2. `./project-plan-roadmap-risk-change-minutes.md`
3. `../12-evidence/document-coverage-matrix.md`

### Nếu bạn đang audit xem bộ docs còn thiếu artifact quản trị gì

Đọc:

1. `./meeting-minutes-register.md`
2. `./change-request-register.md`
3. `../12-evidence/document-coverage-matrix.md`

## Tài liệu liên quan hiện có

- Project Plan / Roadmap / Risk / Change / Minutes: `./project-plan-roadmap-risk-change-minutes.md`
- Runbook / Monitoring / Maintenance: `../09-operations/runbook-monitoring-maintenance.md`
- User Manual / Admin Guide / FAQ / Training: `../09-operations/user-manual-admin-guide-faq-training.md`
- Source Register: `../12-evidence/source-register.md`
- Coverage Matrix: `../12-evidence/document-coverage-matrix.md`
- Governance And Delivery Pack: `./governance-and-delivery-pack.md`

## Ghi chú

Bộ tài liệu hiện chưa có standalone governance artifact riêng cho một số mục như roadmap hoặc meeting minutes. File `governance-and-delivery-pack.md` ghi rõ boundary này và ánh xạ chúng về evidence/runtime hiện có.

Một câu nhớ ngắn:

`Folder này không giả vờ bộ tài liệu đã có PM paperwork đầy đủ. Nó chỉ nói phần governance nào hệ thống đang chứng minh được.`

## What Not To Do

- không dùng riêng roadmap/risk context trong đây để kết luận team đã có full PM process enterprise
- không biến artifact tổng hợp thành bằng chứng rằng artifact nguồn độc lập chắc chắn đã tồn tại
- không bỏ qua evidence docs khi cần nói rõ chỗ nào còn thiếu hoặc chỉ mới là context

## Nếu Bạn Đang Viết Report Hoặc Audit Bộ Governance

Folder này nên được dùng để trả lời:

1. concern governance nào đã có file chính thức
2. phần nào là roadmap/risk/change context thật
3. phần nào mới chỉ được tổng hợp từ evidence hiện có chứ chưa có artifact nguồn độc lập

Không nên dùng riêng một file trong đây để suy ra team đã có đầy đủ PM process chuẩn doanh nghiệp nếu chính docs đang ghi rõ là chưa có.

## Khi Nào Dừng Ở Folder Này

Dừng ở folder này khi bạn đã biết:

1. concern của mình nằm ở governance pack, risk log, roadmap/change context, hay register
2. phần nào đang là evidence-backed context và phần nào chưa có artifact nguồn độc lập
3. có cần sang operations, security, hay evidence docs để kiểm tra thêm hay không
