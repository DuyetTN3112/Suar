# Review Classes

```text
03-review/
├── overview/    # Review domain map
├── high-level/  # Session, moderation, artifacts
└── low-level/   # Persistence, dispute, task-review và sprint-review records
```

| Overview | High level | Low level |
|---|---|---|
| `cls_03_review` | `cls_03a_review_session_skill_review`, `cls_03k_ai_dispute_dispatch_runtime_design`, `cls_03k1_ai_dispute_inbound_composition`, `cls_03k2_ai_dispute_source_context`, `cls_03k3_ai_dispute_gateway_dispatch` | `cls_03a1_review_persistence`, `cls_03a2_review_domain_entities` |
| `cls_03_review` | `cls_03c_review_moderation_feedback` | `cls_03d_review_mapping_dto` |
| `cls_03_review` | `cls_03e_review_artifacts` | — |
| `cls_03_review` | `cls_03c_review_moderation_feedback` | `cls_03f_review_dispute_case_file`, `cls_03l_ai_dispute_callback_runtime_design` |
| `cls_03_review` | — | `cls_03g_task_review_workflow` |
| `cls_03_review` | — | `cls_03h_sprint_review_package`, `cls_03i_sprint_reverse_review_workflow` |
| `cls_03_review` | `cls_03a_review_session_skill_review` | `cls_03j_review_session_reviewer_assignment` |

Workflow/message classes mang nghĩa review có kiểm soát, không phải generic conversation/message. AI evaluation được đánh dấu Partial vì external advisory execution chưa đầy đủ.

`cls_03k_ai_dispute_dispatch_runtime_design` is the compact relationship map that bridges UC 03b
to `seq_04d`. Its report-facing views split only at execution responsibilities: `cls_03k1` establishes
the boundary → factory → command construction; `cls_03k2` establishes the governed source-context
read; and `cls_03k3` establishes fenced staging and dispatch. The repeated
`StartAiDisputeEvaluationCommand` is their explicit handoff. `cls_03l_ai_dispute_callback_runtime_design`
is the separate callback trust-boundary design and bridges to `seq_04e`. The case-file data structure
remains in `cls_03f` and `logical_erd_04b`; it is deliberately not mixed with runtime collaboration.
