# 04-review hierarchy

## overview

- Chưa có diagram ở tầng này; bắt đầu từ high-level khi domain chỉ có scenario cụ thể.

## high-level

- [seq_04_review](high-level/seq_04_review.mmd)
- [seq_04b_review_confirm_pipeline](high-level/seq_04b_review_confirm_pipeline.mmd)

## low-level

- [seq_04b1_review_dispute_open](low-level/seq_04b1_review_dispute_open.mmd)
- [seq_04c_review_dispute_admin_resolution](low-level/seq_04c_review_dispute_admin_resolution.mmd)
- [seq_04d_ai_dispute_evaluation_dispatch](low-level/seq_04d_ai_dispute_evaluation_dispatch.mmd)
- [seq_04e_ai_dispute_callback](low-level/seq_04e_ai_dispute_callback.mmd)

### Dispute advisory reading path

1. Mở `arch_07_ai_dispute_integration` để thấy ownership và trust boundary.
2. Mở `logical_erd_04b_dispute_ai` để biết FK-backed case-file and advisory records.
3. Mở `cls_03k_ai_dispute_dispatch_runtime_design` rồi `seq_04d_ai_dispute_evaluation_dispatch` để thấy staging, audit, fencing và dispatch.
4. Mở `cls_03l_ai_dispute_callback_runtime_design` rồi `seq_04e_ai_dispute_callback` để thấy HMAC verification và atomic callback persistence.
5. Mở `seq_04c_review_dispute_admin_resolution` để thấy human decision và durable resolved event.

`dispute_id`, `case_file_id` và `evaluation_id` là handoff keys. Dispatch, callback và resolution
được tách vì có actor, trust boundary, transaction và failure semantics khác nhau; mỗi file chỉ
trả lời một scenario. Mỗi file high/low mô tả một scenario; combined fragment alt/opt/loop thuộc
chính scenario đó.
