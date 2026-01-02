# Administration User Flows

- Overview: `uf_10_admin_governance_journey`
- High level: —
- Low level: `uf_10a_admin_access_inspection`; `uf_10b_governed_action_result`; `uf_10c_admin_action_execution`

Journey đã cô lập System Admin principal/realm; không trộn Organization Management hoặc Project Workspace. Không có bước bật admin mode. Để đưa vào report, đọc `uf_10a` từ System access đến inspection-ready, `uf_10b` cho quyết định có tiếp tục action hay không, rồi `uf_10c` cho authorization, outcome và audit evidence. Handoff là thao tác đã được chọn và xác nhận ở `uf_10b`; `uf_10c` bắt đầu tại authorization để giữ cả hai detail flow gọn trong một khung đọc.
