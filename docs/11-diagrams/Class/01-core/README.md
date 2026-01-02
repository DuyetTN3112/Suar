# Core Classes

```text
01-core/
├── overview/    # Core type map
├── high-level/  # User/auth và organization/project
└── low-level/   # Ports, profile evidence, auth/session, project records
```

| Overview | High level | Low level |
|---|---|---|
| `cls_01_core` | `cls_01a_user_auth_core` | `cls_01a1_user_domain_port` |
| `cls_01_core` | `cls_01b_org_project_core` | `cls_01b1_org_project_domain_ports` |
| `cls_01_core` | `cls_01a_user_auth_core` | `cls_01c_user_profile_evidence`, `cls_01d1_auth_identity_persistence`, `cls_01d2_session_token_runtime` |
| `cls_01_core` | `cls_01b_org_project_core` | `cls_01e_project_professional_roles` |
| `cls_01_core` | `cls_01b_org_project_core` | `cls_01f_project_attachment` |

`cls_01d1` chỉ chứa persistence records. `cls_01d2` chỉ chứa service/interface/Redis boundary. `SessionTokenService` thể hiện Redis token runtime; không giả định bảng session chưa tồn tại.

`cls_01f` là Evidence Partial: model, migration và demo seed tồn tại; chưa có active write route hoặc binary Drive path.
