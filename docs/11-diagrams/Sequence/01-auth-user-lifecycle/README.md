# 01-auth-user-lifecycle hierarchy

## overview

- Chưa có diagram ở tầng này; bắt đầu từ high-level khi domain chỉ có scenario cụ thể.

## high-level

- [seq_01_auth](high-level/seq_01_auth.mmd)
- [seq_07_user_approval](high-level/seq_07_user_approval.mmd)

## low-level

- [seq_01b_testing_auth_context_bridge](low-level/seq_01b_testing_auth_context_bridge.mmd)
- [seq_01c_auth_session_evidence](low-level/seq_01c_auth_session_evidence.mmd)

`seq_01_auth` cho thấy callback Command sở hữu account/session/staging order.
`seq_01c_auth_session_evidence` tách durable consumer: listener gọi một Command; receipt và Audit
commit/rollback atomically.
