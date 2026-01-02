# User, Authentication and Skills ERD

```text
01-user-auth-skills/
├── overview/    # Domain relationship map
├── high-level/  # Identity, skill rubric, profile evidence
└── low-level/   # Ba bounded physical inventory card
```

`logical_erd_01_user_auth_skills` → current logical slices `01a`, `01b`, `01c` → physical inventory `01a`, `01b`, `01c` tương ứng.

`logical_erd_01d_target_realm_identity_split` là target migration view, không phải current schema proof. Nó tách `SYSTEM_PRINCIPALS`/System role assignments khỏi `USER_ACCOUNTS`/Organization/Project memberships và cố ý không có quan hệ role chéo. Đọc nó cùng current `logical_erd_01a_identity_account`, nơi `USERS.system_role` được gắn nhãn LEGACY.
