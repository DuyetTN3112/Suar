# Platform Support Classes

```text
04-platform-support/
├── overview/    # Platform support map
├── high-level/  # Admin surfaces
└── low-level/   # Notification/settings/admin queries, audit và authorization records
```

| Overview                  | High level                       | Low level                                                |
| ------------------------- | -------------------------------- | -------------------------------------------------------- |
| `cls_04_platform_support` | —                                | `cls_04a1_notification_center`, `cls_04a2_user_settings` |
| `cls_04_platform_support` | `cls_04b_system_admin_console`   | —                                                        |
| `cls_04_platform_support` | `cls_04c_admin_read_surface`     | `cls_04c1`, `cls_04c2`, `cls_04c3` admin query views     |
| `cls_04_platform_support` | `cls_04d_admin_mutation_surface` | —                                                        |
| `cls_04_platform_support` | —                                | `cls_04e_audit_activity_records`                         |
| `cls_04_platform_support` | —                                | `cls_04f_custom_system_role`                             |

Notification/settings navigation composite đã bỏ; hai runtime class graph đọc độc lập.

`cls_04f` chỉ mô tả persistence model `CustomSystemRole`; không trộn service boundary vào record graph.

`cls_04e` chỉ giữ types/records đang tồn tại: Auth receipt, canonical Audit evidence, scopes,
System Audit UI projection và retired activity archive. Nó không trình bày một Activity service
hay một Audit export service không tồn tại.
