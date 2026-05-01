# Organization Join Request Notification Detail

## Goal

Khi owner/admin nhận thông báo có người xin tham gia tổ chức, họ phải biết người gửi là ai và có thể mở đúng màn hình để xem chi tiết, duyệt hoặc từ chối yêu cầu.

## Current gap

Join-request notification hiện lưu `requesterId` nhưng renderer không dùng nó. Deep-link chỉ resolve trong organization shell, nên click từ `/notifications` không điều hướng được. Màn `/org/invitations/requests` đã có sẵn username, email, thời gian và các hành động xử lý.

## Design

- Khi tạo notification, thêm `requesterName` từ user snapshot vào parameters cùng với `requesterId`.
- Renderer hiển thị `requesterName` trong message; notification cũ không có tên vẫn dùng câu fallback hiện tại.
- Deep-link của `organization_join_request` luôn dẫn tới `/org/invitations/requests`, kể cả khi click từ personal notification shell.
- Màn yêu cầu tham gia hiện có tiếp tục là nơi hiển thị email/thời gian và thực hiện Duyệt/Từ chối; không tạo modal/panel trùng logic.
- Không expose requester email trong notification payload; email chỉ xuất hiện ở màn organization đã được authorize.

## Data flow

`CreateJoinRequestCommand` → notification parameters (`organizationName`, `requesterId`, `requesterName`) → rendered notification → `/org/invitations/requests` → authorized pending-request query → approve/reject.

## Compatibility and errors

- Existing notifications without `requesterName` remain renderable.
- Existing notification data without a resolvable subject still shows the existing unresolved reason.
- Organization route authorization remains the source of truth; the deep-link must not bypass it.

## Tests

- Renderer includes requester name and preserves the legacy fallback.
- Join-request deep-link resolves from both user and organization shells.
- Existing organization join-request creation test verifies requester identity metadata.
- Existing notification page/deep-link tests cover click navigation behavior.
