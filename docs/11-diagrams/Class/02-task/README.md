# Task Classes

```text
02-task/
├── overview/    # Task domain map
├── high-level/  # Task entity và workflow status
└── low-level/   # Contract history, delivery evidence, collaboration, skill records
```

| Overview | High level | Low level |
|---|---|---|
| `cls_02_task_core` | `cls_02a_task_entity`, `cls_02l_task_submission_runtime_design`, `cls_02l1_task_submission_inbound_composition`, `cls_02l2_task_submission_command_collaborators`, `cls_02l3_task_submission_review_handoff`, `cls_02l4_task_submission_notification_staging` | `cls_02d_task_assignment_application`, `cls_02e_task_mapping_dto` |
| `cls_02_task_core` | — | `cls_02b1_skill_profile_records`, `cls_02b2_talent_discovery_records` |
| `cls_02_task_core` | `cls_02c_task_workflow_status` | — |
| `cls_02_task_core` | `cls_02a_task_entity` | `cls_02f_task_contract_history`, `cls_02g_task_submission_evidence`, `cls_02h_task_collaboration_records` |
| `cls_02_task_core` | — | `cls_02i_proficiency_skill_rubric` |
| `cls_02_task_core` | — | `cls_02j_professional_role_templates`, `cls_02k_skill_alias_normalization` |

Skill navigation composite đã bỏ; profile records và talent-discovery records đọc độc lập.

`cls_02l_task_submission_runtime_design` is the compact relationship map for the technical bridge
from UC 02b to `seq_02e_task_submission_review_handoff`; it is not a second entity model. The
report-facing views split that map only at responsibility boundaries: `cls_02l1` asks how the HTTP
boundary constructs `SubmitTaskSubmissionCommand`; `cls_02l2` asks how that command makes the
authoritative transaction and persistence write; `cls_02l3` asks how it creates governed review;
and `cls_02l4` asks how it stages durable notification work. The repeated command is the explicit
handoff between the views. `cls_02g` remains the separate persisted submission/evidence structure.
