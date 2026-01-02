# Presentation and Application Packages

```text
02-presentation-application/
├── overview/    # Application package map
├── high-level/  # Application package theo bounded context
└── low-level/   # Delivery, workspace và bounded-context drill-down
```

| Overview                   | High level                                                         | Low level                            |
| -------------------------- | ------------------------------------------------------------------ | ------------------------------------ |
| `pkg_02_application_layer` | `pkg_02a`, `pkg_02b1`, `pkg_02b2`, `pkg_02c`, `pkg_02d`, `pkg_02g` | —                                    |
| —                          | —                                                                  | `pkg_02e_http_delivery`              |
| —                          | —                                                                  | `pkg_02f_frontend_workspaces`        |
| —                          | —                                                                  | `pkg_02h_auth_authorization_session` |
| —                          | —                                                                  | `pkg_02i_review_governance`          |
| —                          | —                                                                  | `pkg_02j_profile_skill_capability`   |

`pkg_02_application_layer` là entry map sau boundary reset: inbound adapter → một Command/Query →
domain/outbound port; composition chỉ construct và bind. Bounded package diagrams không còn vẽ
service/public facade hoặc action-to-infra import như use-case path hợp lệ.

Marketplace có package map độc lập; auth/session, review governance, profile/skill được drill down
ở low-level. Multi-region chỉ giữ khi dependency xuyên package là chính nội dung.
