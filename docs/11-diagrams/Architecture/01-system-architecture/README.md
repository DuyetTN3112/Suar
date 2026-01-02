# System Architecture

```text
01-system-architecture/
├── overview/    # Toàn cảnh hệ thống
├── high-level/  # Layer, deployment, security boundary
└── low-level/   # Request, composition, event, evidence, search, health, AI, file, Redis
```

| Overview         | High level                               | Low level                                                                                                             |
| ---------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `arch_01_system` | `arch_02_layer`                          | `arch_02a_request_flow`, `arch_02b_composition_boundary`                                                              |
| `arch_01_system` | —                                        | `arch_02c_event_side_effects`, `arch_02d_structured_telemetry`                                                        |
| `arch_01_system` | —                                        | `arch_03a_elasticsearch_query_runtime`, `arch_03b_elasticsearch_projection_sync`, `arch_03c_elasticsearch_operations` |
| `arch_01_system` | —                                        | `arch_04a_durable_observability`, `arch_04b_health_checks`, `arch_04c_auth_audit_evidence`                            |
| `arch_01_system` | `arch_05_deployment_topology`            | `arch_05a_core_runtime_storage`, `arch_05b_external_integrations`                                                     |
| `arch_01_system` | `arch_06_security_trust_boundaries`      | `arch_06a_request_authorization_boundary`, `arch_06b_privileged_callback_boundary`                                    |
| `arch_01_system` | `arch_10_realm_workspace_board_topology` | —                                                                                                                     |
| `arch_01_system` | —                                        | `arch_07_ai_dispute_integration`                                                                                      |
| `arch_01_system` | —                                        | `arch_08_file_attachment_storage_runtime`                                                                             |
| `arch_01_system` | —                                        | `arch_09_redis_runtime_separation`                                                                                    |

Mở overview trong report chính; dùng low-level khi giải thích một đường chạy cụ thể.

Dùng `arch_02_layer` để chốt ownership, `arch_02a_request_flow` để đọc execution path và
`arch_02b_composition_boundary` để phân biệt inbound factory contract với concrete composition
factory. Composition arrows là construction/injection, không phải runtime use-case call.

`arch_04c_auth_audit_evidence` là source chuẩn cho Auth evidence: receipt và Audit dùng chung
transaction; `source_occurred_at` khác `occurred_at`; activity archive là read-only và không còn
runtime writer.

Dùng `arch_10_realm_workspace_board_topology` khi cần chốt mental model sản phẩm: System Admin và User là hai principal/realm tách biệt; Organization Management không chứa delivery board; bốn Project board và một System board là năm Kanban canonical. Diagram chỉ rõ shared authentication transport và `users.system_role` là ràng buộc cho physical principal/session separation; trạng thái của boundary này là `Partial`.

Không giữ runtime/search/observability dashboard ghép nhiều panel. Mỗi runtime story có source và PNG riêng. Các container còn lại chỉ giữ khi quan hệ layer/stage là chính nội dung diagram.

`arch_08_file_attachment_storage_runtime` cố ý ghi trạng thái `Partial`: Drive local/public đã cấu hình, nhưng code không có đường ghi binary bằng `request.file`/`drive.use`; attachment command lưu `file_path` do caller gửi. Docker Compose cũng không khai báo named volume cho app-local storage.

`arch_05_deployment_topology` cũng là `Partial`: nó mô tả topology được khai báo trong repository, không phải production environment đã chạy với real-user traffic. UML node/artifact view tương ứng nằm tại [`Deployment/01-reference-topology`](../../Deployment/01-reference-topology/README.md).
